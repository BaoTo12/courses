package com.cloudarchitect.dvac02.event;

import com.cloudarchitect.dvac02.model.OrderEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import software.amazon.awssdk.services.sns.SnsClient;
import software.amazon.awssdk.services.sns.model.MessageAttributeValue;
import software.amazon.awssdk.services.sns.model.PublishRequest;
import software.amazon.awssdk.services.sns.model.PublishResponse;

import java.util.HashMap;
import java.util.Map;

public class OrderEventPublisher {

    private final SnsClient snsClient;
    private final String topicArn;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    public OrderEventPublisher(SnsClient snsClient, String topicArn) {
        this.snsClient = snsClient;
        this.topicArn = topicArn;
    }

    public String publishOrderCreated(OrderEvent event) {
        try {
            String jsonPayload = OBJECT_MAPPER.writeValueAsString(event);

            // Construct SNS Message Attributes for Subscription Filter Policies
            Map<String, MessageAttributeValue> attributes = new HashMap<>();

            // 1. Priority Attribute (String)
            attributes.put("priority", MessageAttributeValue.builder()
                .dataType("String")
                .stringValue(event.getPriority() != null ? event.getPriority() : "STANDARD")
                .build());

            // 2. Event Type Attribute (String)
            attributes.put("eventType", MessageAttributeValue.builder()
                .dataType("String")
                .stringValue(event.getEventType() != null ? event.getEventType() : "ORDER_CREATED")
                .build());

            // 3. Amount Attribute (Number) for numeric range filters
            attributes.put("amount", MessageAttributeValue.builder()
                .dataType("Number")
                .stringValue(String.valueOf(event.getTotalPrice()))
                .build());

            PublishRequest request = PublishRequest.builder()
                .topicArn(topicArn)
                .message(jsonPayload)
                .messageAttributes(attributes)
                .build();

            PublishResponse response = snsClient.publish(request);
            return response.messageId();

        } catch (Exception e) {
            throw new RuntimeException("Failed to publish order event to SNS Topic: " + topicArn, e);
        }
    }
}
