package com.cloudarchitect.dvac02.consumer;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.LambdaLogger;
import com.amazonaws.services.lambda.runtime.events.SQSBatchResponse;
import com.amazonaws.services.lambda.runtime.events.SQSEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class S02BillingQueueProcessorTest {

    private BillingQueueProcessor processor;
    private Context mockContext;

    @BeforeEach
    public void setUp() {
        processor = new BillingQueueProcessor();
        mockContext = new MockLambdaContext();
    }

    @Test
    public void testHandleBatch_whenAllMessagesValid_returnsZeroFailures() {
        SQSEvent.SQSMessage msg1 = new SQSEvent.SQSMessage();
        msg1.setMessageId("msg-101");
        msg1.setBody("{\"orderId\":\"ORD-1\",\"totalPrice\":49.99,\"itemId\":\"ITEM-1\",\"customerEmail\":\"a@example.com\"}");

        SQSEvent.SQSMessage msg2 = new SQSEvent.SQSMessage();
        msg2.setMessageId("msg-102");
        msg2.setBody("{\"orderId\":\"ORD-2\",\"totalPrice\":149.99,\"itemId\":\"ITEM-2\",\"customerEmail\":\"b@example.com\"}");

        SQSEvent event = new SQSEvent();
        event.setRecords(List.of(msg1, msg2));

        SQSBatchResponse response = processor.handleRequest(event, mockContext);

        assertNotNull(response);
        assertEquals(0, response.getBatchItemFailures().size(), "All valid messages must result in zero reported failures");
    }

    @Test
    public void testHandleBatch_whenOneMessageFails_returnsOnlyFailedMessageId() {
        SQSEvent.SQSMessage validMsg = new SQSEvent.SQSMessage();
        validMsg.setMessageId("msg-valid");
        validMsg.setBody("{\"orderId\":\"ORD-VALID\",\"totalPrice\":99.99,\"itemId\":\"ITEM-OK\",\"customerEmail\":\"ok@example.com\"}");

        SQSEvent.SQSMessage poisonMsg = new SQSEvent.SQSMessage();
        poisonMsg.setMessageId("msg-poison");
        poisonMsg.setBody("{\"orderId\":\"ORD-BAD\",\"totalPrice\":99.99,\"itemId\":\"POISON_PILL\",\"customerEmail\":\"bad@example.com\"}");

        SQSEvent event = new SQSEvent();
        event.setRecords(List.of(validMsg, poisonMsg));

        SQSBatchResponse response = processor.handleRequest(event, mockContext);

        assertNotNull(response);
        assertEquals(1, response.getBatchItemFailures().size(), "Only the single corrupted message must be reported as a failure");
        assertEquals("msg-poison", response.getBatchItemFailures().get(0).getItemIdentifier());
    }

    @Test
    public void testHandleBatch_withSnsEnvelopeUnwrapping_processesSuccessfully() {
        String snsWrapped = "{" +
            "\"Type\" : \"Notification\"," +
            "\"MessageId\" : \"sns-123\"," +
            "\"TopicArn\" : \"arn:aws:sns:us-east-1:123456789012:OrderEventsTopic\"," +
            "\"Message\" : \"{\\\"orderId\\\":\\\"ORD-SNS\\\",\\\"totalPrice\\\":25.0,\\\"itemId\\\":\\\"ITEM-SNS\\\",\\\"customerEmail\\\":\\\"sns@example.com\\\"}\"" +
            "}";

        SQSEvent.SQSMessage msg = new SQSEvent.SQSMessage();
        msg.setMessageId("msg-sns-wrapped");
        msg.setBody(snsWrapped);

        SQSEvent event = new SQSEvent();
        event.setRecords(List.of(msg));

        SQSBatchResponse response = processor.handleRequest(event, mockContext);

        assertEquals(0, response.getBatchItemFailures().size());
    }

    private static class MockLambdaContext implements Context {
        @Override public String getAwsRequestId() { return "test-sqs-req-123"; }
        @Override public String getLogGroupName() { return "/aws/lambda/BillingProcessor"; }
        @Override public String getLogStreamName() { return "2026/09/27/[$LATEST]"; }
        @Override public String getFunctionName() { return "BillingQueueProcessor"; }
        @Override public String getFunctionVersion() { return "$LATEST"; }
        @Override public String getInvokedFunctionArn() { return "arn:aws:lambda:us-east-1:123456789012:function:BillingQueueProcessor"; }
        @Override public com.amazonaws.services.lambda.runtime.CognitoIdentity getIdentity() { return null; }
        @Override public com.amazonaws.services.lambda.runtime.ClientContext getClientContext() { return null; }
        @Override public int getRemainingTimeInMillis() { return 30000; }
        @Override public int getMemoryLimitInMB() { return 1769; }
        @Override public LambdaLogger getLogger() {
            return new LambdaLogger() {
                @Override public void log(String message) { System.out.println("[SQS-LAMBDA] " + message); }
                @Override public void log(byte[] message) { System.out.println("[SQS-LAMBDA] " + new String(message)); }
            };
        }
    }
}
