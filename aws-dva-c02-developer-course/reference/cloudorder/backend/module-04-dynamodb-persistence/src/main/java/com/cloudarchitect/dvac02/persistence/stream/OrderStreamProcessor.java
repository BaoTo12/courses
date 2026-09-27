package com.cloudarchitect.dvac02.persistence.stream;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.DynamodbEvent;
import com.amazonaws.services.lambda.runtime.events.models.dynamodb.AttributeValue;
import com.amazonaws.services.lambda.runtime.events.models.dynamodb.Record;

import java.util.Map;

/**
 * Lambda event source mapping consumer for DynamoDB Streams.
 * Demonstrates Change Data Capture (CDC) processing with NEW_AND_OLD_IMAGES.
 */
public class OrderStreamProcessor implements RequestHandler<DynamodbEvent, Void> {

    @Override
    public Void handleRequest(DynamodbEvent dynamodbEvent, Context context) {
        if (context != null && context.getLogger() != null) {
            context.getLogger().log("[DDB-STREAM] Received stream batch with "
                    + dynamodbEvent.getRecords().size() + " records.");
        }

        for (DynamodbEvent.DynamodbStreamRecord record : dynamodbEvent.getRecords()) {
            String eventName = record.getEventName(); // INSERT, MODIFY, REMOVE
            Map<String, AttributeValue> keys = record.getDynamodb().getKeys();
            String pk = keys.containsKey("PK") ? keys.get("PK").getS() : "UNKNOWN";
            String sk = keys.containsKey("SK") ? keys.get("SK").getS() : "UNKNOWN";

            if (context != null && context.getLogger() != null) {
                context.getLogger().log("[DDB-STREAM] Event: " + eventName + " | Keys: " + pk + " / " + sk);
            }

            if ("MODIFY".equals(eventName)) {
                Map<String, AttributeValue> oldImage = record.getDynamodb().getOldImage();
                Map<String, AttributeValue> newImage = record.getDynamodb().getNewImage();

                String oldStatus = oldImage != null && oldImage.containsKey("status") ? oldImage.get("status").getS() : "N/A";
                String newStatus = newImage != null && newImage.containsKey("status") ? newImage.get("status").getS() : "N/A";

                if (context != null && context.getLogger() != null) {
                    context.getLogger().log("[DDB-STREAM-CDC] Status transition detected: " + oldStatus + " -> " + newStatus);
                }
            }
        }

        return null;
    }
}
