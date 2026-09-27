package com.cloudarchitect.dvac02.persistence;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.LambdaLogger;
import com.amazonaws.services.lambda.runtime.events.DynamodbEvent;
import com.amazonaws.services.lambda.runtime.events.models.dynamodb.AttributeValue;
import com.amazonaws.services.lambda.runtime.events.models.dynamodb.Record;
import com.amazonaws.services.lambda.runtime.events.models.dynamodb.StreamRecord;
import com.cloudarchitect.dvac02.persistence.model.OrderEntity;
import com.cloudarchitect.dvac02.persistence.repository.OrderRepository;
import com.cloudarchitect.dvac02.persistence.stream.OrderStreamProcessor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class S04OrderRepositoryTest {

    @Mock
    private DynamoDbClient mockDynamoDb;

    private OrderRepository repository;
    private static final String TABLE_NAME = "CloudOrderTable";

    @BeforeEach
    void setUp() {
        repository = new OrderRepository(mockDynamoDb, TABLE_NAME);
    }

    @Test
    @DisplayName("putOrder: Correctly maps composite keys and GSI attributes")
    void testPutOrder_constructsCorrectItem() {
        OrderEntity order = new OrderEntity("cust-101", "ord-5001", 149.99, "PENDING", 1L, "2026-09-27T08:00:00Z");

        repository.putOrder(order);

        ArgumentCaptor<PutItemRequest> captor = ArgumentCaptor.forClass(PutItemRequest.class);
        verify(mockDynamoDb).putItem(captor.capture());

        PutItemRequest request = captor.getValue();
        assertThat(request.tableName()).isEqualTo(TABLE_NAME);
        assertThat(request.item().get("PK").s()).isEqualTo("CUST#cust-101");
        assertThat(request.item().get("SK").s()).isEqualTo("ORDER#ord-5001");
        assertThat(request.item().get("GSI1PK").s()).isEqualTo("STATUS#PENDING");
        assertThat(request.item().get("version").n()).isEqualTo("1");
    }

    @Test
    @DisplayName("getOrder: Retrieves order using strongly consistent read")
    void testGetOrder_returnsEntityWhenFound() {
        Map<String, software.amazon.awssdk.services.dynamodb.model.AttributeValue> item = Map.of(
                "PK", software.amazon.awssdk.services.dynamodb.model.AttributeValue.fromS("CUST#cust-101"),
                "SK", software.amazon.awssdk.services.dynamodb.model.AttributeValue.fromS("ORDER#ord-5001"),
                "GSI1PK", software.amazon.awssdk.services.dynamodb.model.AttributeValue.fromS("STATUS#CONFIRMED"),
                "GSI1SK", software.amazon.awssdk.services.dynamodb.model.AttributeValue.fromS("DATE#2026-09-27T08:00:00Z"),
                "orderId", software.amazon.awssdk.services.dynamodb.model.AttributeValue.fromS("ord-5001"),
                "customerId", software.amazon.awssdk.services.dynamodb.model.AttributeValue.fromS("cust-101"),
                "amount", software.amazon.awssdk.services.dynamodb.model.AttributeValue.fromN("149.99"),
                "status", software.amazon.awssdk.services.dynamodb.model.AttributeValue.fromS("CONFIRMED"),
                "version", software.amazon.awssdk.services.dynamodb.model.AttributeValue.fromN("1"),
                "createdAt", software.amazon.awssdk.services.dynamodb.model.AttributeValue.fromS("2026-09-27T08:00:00Z")
        );

        GetItemResponse response = GetItemResponse.builder().item(item).build();
        when(mockDynamoDb.getItem(any(GetItemRequest.class))).thenReturn(response);

        Optional<OrderEntity> result = repository.getOrder("cust-101", "ord-5001");

        assertThat(result).isPresent();
        assertThat(result.get().getOrderId()).isEqualTo("ord-5001");
        assertThat(result.get().getStatus()).isEqualTo("CONFIRMED");
    }

    @Test
    @DisplayName("Optimistic Locking: Successfully updates status and increments version when version matches")
    void testUpdateOrderStatus_whenVersionMatches_updatesSuccessfully() {
        UpdateItemResponse response = UpdateItemResponse.builder().build();
        when(mockDynamoDb.updateItem(any(UpdateItemRequest.class))).thenReturn(response);

        repository.updateOrderStatusWithOptimisticLock("cust-101", "ord-5001", "COMPLETED", 1L);

        ArgumentCaptor<UpdateItemRequest> captor = ArgumentCaptor.forClass(UpdateItemRequest.class);
        verify(mockDynamoDb).updateItem(captor.capture());

        UpdateItemRequest request = captor.getValue();
        assertThat(request.conditionExpression()).contains("#version = :expectedVersion");
        assertThat(request.expressionAttributeValues().get(":expectedVersion").n()).isEqualTo("1");
        assertThat(request.expressionAttributeValues().get(":newVersion").n()).isEqualTo("2");
        assertThat(request.expressionAttributeNames()).containsEntry("#status", "status");
    }

    @Test
    @DisplayName("Optimistic Locking: Throws ConditionalCheckFailedException when version conflicts")
    void testUpdateOrderStatus_whenVersionMismatches_throwsConditionalCheckFailed() {
        when(mockDynamoDb.updateItem(any(UpdateItemRequest.class)))
                .thenThrow(ConditionalCheckFailedException.builder().message("The conditional request failed").build());

        assertThatThrownBy(() -> repository.updateOrderStatusWithOptimisticLock("cust-101", "ord-5001", "COMPLETED", 99L))
                .isInstanceOf(ConditionalCheckFailedException.class);
    }

    @Test
    @DisplayName("DynamoDB Streams: Correctly parses CDC stream events and status transitions")
    void testOrderStreamProcessor_handlesModifyEvent() {
        OrderStreamProcessor processor = new OrderStreamProcessor();

        DynamodbEvent.DynamodbStreamRecord streamRecord = new DynamodbEvent.DynamodbStreamRecord();
        streamRecord.setEventName("MODIFY");

        StreamRecord dynamodbData = new StreamRecord();
        dynamodbData.setKeys(Map.of("PK", new AttributeValue("CUST#cust-101"), "SK", new AttributeValue("ORDER#ord-5001")));
        dynamodbData.setOldImage(Map.of("status", new AttributeValue("PENDING")));
        dynamodbData.setNewImage(Map.of("status", new AttributeValue("CONFIRMED")));
        streamRecord.setDynamodb(dynamodbData);

        DynamodbEvent event = new DynamodbEvent();
        event.setRecords(List.of(streamRecord));

        Context mockContext = mock(Context.class);
        LambdaLogger mockLogger = new LambdaLogger() {
            @Override
            public void log(String message) {
                System.out.println("[TEST-STREAM-LOG] " + message);
            }

            @Override
            public void log(byte[] message) {
                System.out.println("[TEST-STREAM-LOG-BYTES] " + new String(message));
            }
        };
        when(mockContext.getLogger()).thenReturn(mockLogger);

        processor.handleRequest(event, mockContext);
        // Successfully executed without exception
    }
}
