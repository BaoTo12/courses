package com.cloudarchitect.dvac02.workflow.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/**
 * Distributed State representation passed between Step Functions tasks in the Saga.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class OrderCheckoutState {

    private String orderId;
    private String customerId;
    private Double amount;
    private List<String> items;
    private Boolean failPayment;
    private String reservationId;
    private String paymentId;
    private String status;
    private String failureReason;

    public OrderCheckoutState() {
    }

    public OrderCheckoutState(String orderId, String customerId, Double amount, List<String> items) {
        this.orderId = orderId;
        this.customerId = customerId;
        this.amount = amount;
        this.items = items;
        this.status = "INITIALIZED";
    }

    public String getOrderId() {
        return orderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public String getCustomerId() {
        return customerId;
    }

    public void setCustomerId(String customerId) {
        this.customerId = customerId;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }

    public List<String> getItems() {
        return items;
    }

    public void setItems(List<String> items) {
        this.items = items;
    }

    public Boolean getFailPayment() {
        return failPayment;
    }

    public void setFailPayment(Boolean failPayment) {
        this.failPayment = failPayment;
    }

    public String getReservationId() {
        return reservationId;
    }

    public void setReservationId(String reservationId) {
        this.reservationId = reservationId;
    }

    public String getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(String paymentId) {
        this.paymentId = paymentId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }

    @Override
    public String toString() {
        return "OrderCheckoutState{" +
                "orderId='" + orderId + '\'' +
                ", customerId='" + customerId + '\'' +
                ", amount=" + amount +
                ", reservationId='" + reservationId + '\'' +
                ", paymentId='" + paymentId + '\'' +
                ", status='" + status + '\'' +
                '}';
    }
}
