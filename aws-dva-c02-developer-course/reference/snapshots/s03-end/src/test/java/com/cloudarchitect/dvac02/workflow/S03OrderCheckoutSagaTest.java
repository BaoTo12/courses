package com.cloudarchitect.dvac02.workflow;

import com.amazonaws.services.lambda.runtime.ClientContext;
import com.amazonaws.services.lambda.runtime.CognitoIdentity;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.LambdaLogger;
import com.cloudarchitect.dvac02.workflow.exception.InventoryUnavailableException;
import com.cloudarchitect.dvac02.workflow.exception.PaymentDeclinedException;
import com.cloudarchitect.dvac02.workflow.handler.CancelInventoryCompensateHandler;
import com.cloudarchitect.dvac02.workflow.handler.ProcessPaymentHandler;
import com.cloudarchitect.dvac02.workflow.handler.ReserveInventoryHandler;
import com.cloudarchitect.dvac02.workflow.model.OrderCheckoutState;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class S03OrderCheckoutSagaTest {

    private ReserveInventoryHandler inventoryHandler;
    private ProcessPaymentHandler paymentHandler;
    private CancelInventoryCompensateHandler compensateHandler;
    private Context mockContext;

    @BeforeEach
    void setUp() {
        inventoryHandler = new ReserveInventoryHandler();
        paymentHandler = new ProcessPaymentHandler();
        compensateHandler = new CancelInventoryCompensateHandler();

        mockContext = new Context() {
            @Override
            public String getAwsRequestId() {
                return "test-request-uuid-s03";
            }

            @Override
            public String getLogGroupName() {
                return "/aws/lambda/test-s03-saga";
            }

            @Override
            public String getLogStreamName() {
                return "2026/09/27/[$LATEST]s03";
            }

            @Override
            public String getFunctionName() {
                return "S03SagaFunction";
            }

            @Override
            public String getFunctionVersion() {
                return "$LATEST";
            }

            @Override
            public String getInvokedFunctionArn() {
                return "arn:aws:lambda:us-east-1:123456789012:function:S03SagaFunction";
            }

            @Override
            public CognitoIdentity getIdentity() {
                return null;
            }

            @Override
            public ClientContext getClientContext() {
                return null;
            }

            @Override
            public int getRemainingTimeInMillis() {
                return 15000;
            }

            @Override
            public int getMemoryLimitInMB() {
                return 1769;
            }

            @Override
            public LambdaLogger getLogger() {
                return new LambdaLogger() {
                    @Override
                    public void log(String message) {
                        System.out.println("[TEST-LOG] " + message);
                    }

                    @Override
                    public void log(byte[] message) {
                        System.out.println("[TEST-LOG-BYTES] " + new String(message));
                    }
                };
            }
        };
    }

    @Test
    @DisplayName("ReserveInventory: Successfully reserves inventory when items are available")
    void testReserveInventory_whenValidItems_reservesSuccessfully() {
        OrderCheckoutState state = new OrderCheckoutState("ORD-001", "cust-1@example.com", 99.99, List.of("ITEM-A", "ITEM-B"));

        OrderCheckoutState result = inventoryHandler.handleRequest(state, mockContext);

        assertThat(result.getReservationId()).isNotNull().startsWith("RES-");
        assertThat(result.getStatus()).isEqualTo("INVENTORY_RESERVED");
    }

    @Test
    @DisplayName("ReserveInventory: Throws InventoryUnavailableException when out of stock")
    void testReserveInventory_whenItemOutOfStock_throwsException() {
        OrderCheckoutState state = new OrderCheckoutState("ORD-002", "cust-2@example.com", 49.99, List.of("ITEM-A", "OUT_OF_STOCK"));

        assertThatThrownBy(() -> inventoryHandler.handleRequest(state, mockContext))
                .isInstanceOf(InventoryUnavailableException.class)
                .hasMessageContaining("OUT_OF_STOCK is unavailable in warehouse");
    }

    @Test
    @DisplayName("ProcessPayment: Successfully processes valid payment amount")
    void testProcessPayment_whenValidAmount_completesSuccessfully() {
        OrderCheckoutState state = new OrderCheckoutState("ORD-003", "cust-3@example.com", 199.50, List.of("ITEM-A"));
        state.setReservationId("RES-abc12345");

        OrderCheckoutState result = paymentHandler.handleRequest(state, mockContext);

        assertThat(result.getPaymentId()).isNotNull().startsWith("PAY-");
        assertThat(result.getStatus()).isEqualTo("PAYMENT_COMPLETED");
    }

    @Test
    @DisplayName("ProcessPayment: Throws PaymentDeclinedException when failPayment flag is true")
    void testProcessPayment_whenFailPaymentFlagTrue_throwsPaymentDeclinedException() {
        OrderCheckoutState state = new OrderCheckoutState("ORD-004", "cust-4@example.com", 299.00, List.of("ITEM-B"));
        state.setFailPayment(true);

        assertThatThrownBy(() -> paymentHandler.handleRequest(state, mockContext))
                .isInstanceOf(PaymentDeclinedException.class)
                .hasMessageContaining("simulated rejection");
    }

    @Test
    @DisplayName("Saga Workflow Simulation: When payment fails, compensating handler rolls back inventory")
    void testSagaCompensatingTransaction_executesRollbackSuccessfully() {
        // Step 1: Inventory successfully reserved
        OrderCheckoutState state = new OrderCheckoutState("ORD-SAGA-FAIL", "cust-5@example.com", 450.00, List.of("ITEM-X"));
        state.setFailPayment(true); // Will trigger payment failure downstream

        OrderCheckoutState step1Result = inventoryHandler.handleRequest(state, mockContext);
        assertThat(step1Result.getReservationId()).isNotNull();
        assertThat(step1Result.getStatus()).isEqualTo("INVENTORY_RESERVED");

        // Step 2: Payment fails
        assertThatThrownBy(() -> paymentHandler.handleRequest(step1Result, mockContext))
                .isInstanceOf(PaymentDeclinedException.class);

        // Step 3: Catch block routes to Compensating Transaction
        OrderCheckoutState compensateResult = compensateHandler.handleRequest(step1Result, mockContext);

        assertThat(compensateResult.getStatus()).isEqualTo("INVENTORY_RELEASED_ROLLED_BACK");
        assertThat(compensateResult.getReservationId()).isEqualTo(step1Result.getReservationId());
        assertThat(compensateResult.getFailureReason()).contains("Compensating transaction executed");
    }
}
