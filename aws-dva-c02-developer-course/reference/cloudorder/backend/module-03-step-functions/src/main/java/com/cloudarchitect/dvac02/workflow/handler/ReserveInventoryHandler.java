package com.cloudarchitect.dvac02.workflow.handler;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.cloudarchitect.dvac02.workflow.exception.InventoryUnavailableException;
import com.cloudarchitect.dvac02.workflow.model.OrderCheckoutState;
import java.util.UUID;

/**
 * Step Functions Task 1: Reserve physical inventory items for an order.
 */
public class ReserveInventoryHandler implements RequestHandler<OrderCheckoutState, OrderCheckoutState> {

    @Override
    public OrderCheckoutState handleRequest(OrderCheckoutState state, Context context) {
        if (context != null && context.getLogger() != null) {
            context.getLogger().log("[SAGA-INVENTORY] Reserving inventory for order: " + state.getOrderId());
        }

        if (state.getItems() == null || state.getItems().isEmpty()) {
            throw new InventoryUnavailableException("Cannot reserve inventory: order contains no items");
        }

        if (state.getItems().contains("OUT_OF_STOCK")) {
            throw new InventoryUnavailableException("Item OUT_OF_STOCK is unavailable in warehouse");
        }

        String reservationId = "RES-" + UUID.randomUUID().toString().substring(0, 8);
        state.setReservationId(reservationId);
        state.setStatus("INVENTORY_RESERVED");

        if (context != null && context.getLogger() != null) {
            context.getLogger().log("[SAGA-INVENTORY] Reserved successfully with ReservationId: " + reservationId);
        }

        return state;
    }
}
