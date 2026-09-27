package com.cloudarchitect.dvac02.workflow.handler;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.cloudarchitect.dvac02.workflow.exception.PaymentDeclinedException;
import com.cloudarchitect.dvac02.workflow.model.OrderCheckoutState;
import java.util.UUID;

/**
 * Step Functions Task 2: Process payment authorization and settlement.
 */
public class ProcessPaymentHandler implements RequestHandler<OrderCheckoutState, OrderCheckoutState> {

    @Override
    public OrderCheckoutState handleRequest(OrderCheckoutState state, Context context) {
        if (context != null && context.getLogger() != null) {
            context.getLogger().log("[SAGA-PAYMENT] Processing payment for order: " + state.getOrderId()
                    + " [Amount: $" + state.getAmount() + "]");
        }

        // Simulating explicit decline trigger or business rule violations
        if (Boolean.TRUE.equals(state.getFailPayment())) {
            if (context != null && context.getLogger() != null) {
                context.getLogger().log("[SAGA-PAYMENT] Simulated payment failure triggered for order: " + state.getOrderId());
            }
            throw new PaymentDeclinedException("Credit card authorization declined: simulated rejection");
        }

        if (state.getAmount() == null || state.getAmount() <= 0.0) {
            throw new PaymentDeclinedException("Invalid payment amount: $" + state.getAmount());
        }

        if (state.getAmount() > 5000.0) {
            throw new PaymentDeclinedException("Transaction exceeds maximum single-order threshold of $5000.00");
        }

        String paymentId = "PAY-" + UUID.randomUUID().toString().substring(0, 8);
        state.setPaymentId(paymentId);
        state.setStatus("PAYMENT_COMPLETED");

        if (context != null && context.getLogger() != null) {
            context.getLogger().log("[SAGA-PAYMENT] Payment successful. PaymentId: " + paymentId);
        }

        return state;
    }
}
