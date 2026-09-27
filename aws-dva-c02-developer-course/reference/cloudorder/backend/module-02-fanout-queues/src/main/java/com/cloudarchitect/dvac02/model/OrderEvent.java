package com.cloudarchitect.dvac02.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;

@JsonIgnoreProperties(ignoreUnknown = true)
public class OrderEvent {

    @JsonProperty("orderId")
    private String orderId;

    @JsonProperty("eventType")
    private String eventType; // e.g. "ORDER_CREATED", "ORDER_CANCELLED"

    @JsonProperty("itemId")
    private String itemId;

    @JsonProperty("quantity")
    private int quantity;

    @JsonProperty("totalPrice")
    private double totalPrice;

    @JsonProperty("priority")
    private String priority; // "HIGH" vs "STANDARD"

    @JsonProperty("customerEmail")
    private String customerEmail;

    @JsonProperty("timestamp")
    private String timestamp;

    public OrderEvent() {
    }

    public OrderEvent(String orderId, String eventType, String itemId, int quantity,
                      double totalPrice, String priority, String customerEmail) {
        this.orderId = orderId;
        this.eventType = eventType;
        this.itemId = itemId;
        this.quantity = quantity;
        this.totalPrice = totalPrice;
        this.priority = priority;
        this.customerEmail = customerEmail;
        this.timestamp = Instant.now().toString();
    }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getItemId() { return itemId; }
    public void setItemId(String itemId) { this.itemId = itemId; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public double getTotalPrice() { return totalPrice; }
    public void setTotalPrice(double totalPrice) { this.totalPrice = totalPrice; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
}
