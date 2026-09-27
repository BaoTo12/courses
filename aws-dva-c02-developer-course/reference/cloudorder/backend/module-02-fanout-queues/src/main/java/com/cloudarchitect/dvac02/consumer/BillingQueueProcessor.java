package com.cloudarchitect.dvac02.consumer;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.LambdaLogger;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.SQSBatchResponse;
import com.amazonaws.services.lambda.runtime.events.SQSEvent;
import com.cloudarchitect.dvac02.model.OrderEvent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;

public class BillingQueueProcessor implements RequestHandler<SQSEvent, SQSBatchResponse> {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Override
    public SQSBatchResponse handleRequest(SQSEvent event, Context context) {
        LambdaLogger logger = context.getLogger();
        List<SQSBatchResponse.BatchItemFailure> batchItemFailures = new ArrayList<>();

        logger.log("Received SQS batch with " + event.getRecords().size() + " messages.");

        for (SQSEvent.SQSMessage message : event.getRecords()) {
            String messageId = message.getMessageId();
            try {
                processSingleMessage(message, logger);
                logger.log("Successfully processed billing for message ID: " + messageId);
            } catch (Exception e) {
                logger.log("Failed to process message ID " + messageId + ": " + e.getMessage());
                // CRITICAL: Report ONLY this failed message ID back to SQS
                batchItemFailures.add(new SQSBatchResponse.BatchItemFailure(messageId));
            }
        }

        logger.log("Batch processing complete. Total failed items reported: " + batchItemFailures.size());
        return new SQSBatchResponse(batchItemFailures);
    }

    private void processSingleMessage(SQSEvent.SQSMessage message, LambdaLogger logger) throws Exception {
        String rawBody = message.getBody();

        // Handle SNS Envelope if SQS subscription is not raw message delivery
        String payloadJson = rawBody;
        if (rawBody.contains("\"Type\" : \"Notification\"") || rawBody.contains("\"TopicArn\"")) {
            JsonNode rootNode = OBJECT_MAPPER.readTree(rawBody);
            if (rootNode.has("Message")) {
                payloadJson = rootNode.get("Message").asText();
            }
        }

        OrderEvent event = OBJECT_MAPPER.readValue(payloadJson, OrderEvent.class);

        // Simulated validation rule / poison pill detection
        if (event.getTotalPrice() < 0) {
            throw new IllegalArgumentException("Invalid negative order amount: " + event.getTotalPrice());
        }
        if ("POISON_PILL".equalsIgnoreCase(event.getItemId())) {
            throw new RuntimeException("Simulated catastrophic failure for poison pill item");
        }

        // Business logic: process billing record
        logger.log("Billed order " + event.getOrderId() + " for customer " + event.getCustomerEmail() +
            " [Amount: $" + event.getTotalPrice() + "]");
    }
}
