package com.cloudarchitect.dvac02.workflow.service;

import com.cloudarchitect.dvac02.workflow.model.OrderCheckoutState;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import software.amazon.awssdk.services.sfn.SfnClient;
import software.amazon.awssdk.services.sfn.model.StartExecutionRequest;
import software.amazon.awssdk.services.sfn.model.StartExecutionResponse;

/**
 * Service encapsulating AWS Step Functions execution triggering with idempotency keys.
 */
public class OrderCheckoutService {

    private final SfnClient sfnClient;
    private final String stateMachineArn;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    public OrderCheckoutService(SfnClient sfnClient, String stateMachineArn) {
        this.sfnClient = sfnClient;
        this.stateMachineArn = stateMachineArn;
    }

    /**
     * Starts a state machine execution idempotently.
     * Setting {@code name} ensures duplicate requests with the same execution name return the existing execution
     * without creating a second run (standard Step Functions idempotency guarantee).
     */
    public String startOrderCheckoutSaga(OrderCheckoutState state) throws JsonProcessingException {
        String inputJson = OBJECT_MAPPER.writeValueAsString(state);

        StartExecutionRequest request = StartExecutionRequest.builder()
                .stateMachineArn(stateMachineArn)
                .name("order-exec-" + state.getOrderId()) // Idempotency key
                .input(inputJson)
                .build();

        StartExecutionResponse response = sfnClient.startExecution(request);
        return response.executionArn();
    }
}
