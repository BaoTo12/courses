package com.cloudarchitect.dvac02.persistence.repository;

import com.cloudarchitect.dvac02.persistence.model.OrderEntity;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.*;

/**
 * Production Single-Table repository demonstrating composite key queries,
 * GSI index lookups, and optimistic locking conditional updates.
 */
public class OrderRepository {

    private final DynamoDbClient dynamoDbClient;
    private final String tableName;

    public OrderRepository(DynamoDbClient dynamoDbClient, String tableName) {
        this.dynamoDbClient = Objects.requireNonNull(dynamoDbClient, "dynamoDbClient cannot be null");
        this.tableName = Objects.requireNonNull(tableName, "tableName cannot be null");
    }

    /**
     * Persists an order entity into the single-table design.
     */
    public void putOrder(OrderEntity order) {
        Map<String, AttributeValue> item = new HashMap<>();
        item.put("PK", AttributeValue.fromS(order.getPk()));
        item.put("SK", AttributeValue.fromS(order.getSk()));
        item.put("GSI1PK", AttributeValue.fromS(order.getGsi1pk()));
        item.put("GSI1SK", AttributeValue.fromS(order.getGsi1sk()));
        item.put("orderId", AttributeValue.fromS(order.getOrderId()));
        item.put("customerId", AttributeValue.fromS(order.getCustomerId()));
        item.put("amount", AttributeValue.fromN(String.valueOf(order.getAmount())));
        item.put("status", AttributeValue.fromS(order.getStatus()));
        item.put("version", AttributeValue.fromN(String.valueOf(order.getVersion())));
        item.put("createdAt", AttributeValue.fromS(order.getCreatedAt()));

        if (order.getTtl() != null) {
            item.put("ttl", AttributeValue.fromN(String.valueOf(order.getTtl())));
        }

        PutItemRequest request = PutItemRequest.builder()
                .tableName(tableName)
                .item(item)
                .build();

        dynamoDbClient.putItem(request);
    }

    /**
     * Retrieves an order by composite primary key (CUST#customerId + ORDER#orderId).
     */
    public Optional<OrderEntity> getOrder(String customerId, String orderId) {
        Map<String, AttributeValue> key = Map.of(
                "PK", AttributeValue.fromS("CUST#" + customerId),
                "SK", AttributeValue.fromS("ORDER#" + orderId)
        );

        GetItemRequest request = GetItemRequest.builder()
                .tableName(tableName)
                .key(key)
                .consistentRead(true) // Strongly consistent read (1 RCU per 4KB)
                .build();

        GetItemResponse response = dynamoDbClient.getItem(request);
        if (!response.hasItem() || response.item().isEmpty()) {
            return Optional.empty();
        }

        return Optional.of(mapToEntity(response.item()));
    }

    /**
     * Updates an order's status using Optimistic Locking.
     * Prevents the "Lost Update" anomaly by asserting that #version equals expectedVersion.
     * Throws ConditionalCheckFailedException if another thread updated the order first.
     */
    public void updateOrderStatusWithOptimisticLock(String customerId, String orderId, String newStatus, long expectedVersion) {
        Map<String, AttributeValue> key = Map.of(
                "PK", AttributeValue.fromS("CUST#" + customerId),
                "SK", AttributeValue.fromS("ORDER#" + orderId)
        );

        long newVersion = expectedVersion + 1;

        UpdateItemRequest request = UpdateItemRequest.builder()
                .tableName(tableName)
                .key(key)
                .updateExpression("SET #status = :newStatus, #version = :newVersion, #gsi1pk = :newGsi1Pk")
                .conditionExpression("attribute_exists(PK) AND #version = :expectedVersion")
                .expressionAttributeNames(Map.of(
                        "#status", "status",   // ⚡ Avoids DynamoDB reserved keyword collision
                        "#version", "version",
                        "#gsi1pk", "GSI1PK"
                ))
                .expressionAttributeValues(Map.of(
                        ":newStatus", AttributeValue.fromS(newStatus),
                        ":newVersion", AttributeValue.fromN(String.valueOf(newVersion)),
                        ":newGsi1Pk", AttributeValue.fromS("STATUS#" + newStatus),
                        ":expectedVersion", AttributeValue.fromN(String.valueOf(expectedVersion))
                ))
                .build();

        dynamoDbClient.updateItem(request);
    }

    /**
     * Queries all orders belonging to a customer using the single-table composite range key.
     */
    public List<OrderEntity> queryOrdersByCustomer(String customerId) {
        QueryRequest request = QueryRequest.builder()
                .tableName(tableName)
                .keyConditionExpression("PK = :pk AND begins_with(SK, :skPrefix)")
                .expressionAttributeValues(Map.of(
                        ":pk", AttributeValue.fromS("CUST#" + customerId),
                        ":skPrefix", AttributeValue.fromS("ORDER#")
                ))
                .build();

        QueryResponse response = dynamoDbClient.query(request);
        List<OrderEntity> orders = new ArrayList<>();
        for (Map<String, AttributeValue> item : response.items()) {
            orders.add(mapToEntity(item));
        }
        return orders;
    }

    /**
     * Queries all orders across all customers in a given status using Global Secondary Index 1 (GSI1).
     */
    public List<OrderEntity> queryOrdersByStatus(String status) {
        QueryRequest request = QueryRequest.builder()
                .tableName(tableName)
                .indexName("GSI1")
                .keyConditionExpression("GSI1PK = :gsi1pk")
                .expressionAttributeValues(Map.of(
                        ":gsi1pk", AttributeValue.fromS("STATUS#" + status)
                ))
                .build();

        QueryResponse response = dynamoDbClient.query(request);
        List<OrderEntity> orders = new ArrayList<>();
        for (Map<String, AttributeValue> item : response.items()) {
            orders.add(mapToEntity(item));
        }
        return orders;
    }

    private OrderEntity mapToEntity(Map<String, AttributeValue> item) {
        OrderEntity entity = new OrderEntity();
        entity.setPk(item.get("PK").s());
        entity.setSk(item.get("SK").s());
        entity.setGsi1pk(item.get("GSI1PK").s());
        entity.setGsi1sk(item.get("GSI1SK").s());
        entity.setOrderId(item.get("orderId").s());
        entity.setCustomerId(item.get("customerId").s());
        entity.setAmount(Double.parseDouble(item.get("amount").n()));
        entity.setStatus(item.get("status").s());
        entity.setVersion(Long.parseLong(item.get("version").n()));
        entity.setCreatedAt(item.get("createdAt").s());

        if (item.containsKey("ttl") && item.get("ttl").n() != null) {
            entity.setTtl(Long.parseLong(item.get("ttl").n()));
        }

        return entity;
    }
}
