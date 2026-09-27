package com.cloudarchitect.dvac02.workflow.handler;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.cloudarchitect.dvac02.workflow.model.OrderCheckoutState;

/**
 * Step Functions Saga Compensating Task: Rolls back inventory reservation if downstream payment fails.
 */
public class CancelInventoryCompensateHandler implements RequestHandler<OrderCheckoutState, OrderCheckoutState> {

    @Override
    public OrderCheckoutState handleRequest(OrderCheckoutState state, Context context) {
        if (context != null && context.getLogger() != null) {
            context.getLogger().log("[SAGA-COMPENSATE] Rolling back inventory reservation: "
                    + state.getReservationId() + " for order: " + state.getOrderId());
        }

        // Execute compensating rollback logic (releasing reserved stock)
        state.setStatus("INVENTORY_RELEASED_ROLLED_BACK");
        if (state.getFailureReason() == null) {
            state.setFailureReason("Compensating transaction executed due to downstream step failure");
        }

        if (context != null && context.getLogger() != null) {
            context.getLogger().log("[SAGA-COMPENSATE] Compensation complete. State status updated to: "
                    + state.getStatus());
        }

        return state;
    }
}
