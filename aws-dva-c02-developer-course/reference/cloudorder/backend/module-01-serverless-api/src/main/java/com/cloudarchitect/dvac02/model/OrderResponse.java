package com.cloudarchitect.dvac02.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;

public class OrderResponse {

    @JsonProperty("orderId")
    private String orderId;

    @JsonProperty("status")
    private String status;

    @JsonProperty("itemId")
    private String itemId;

    @JsonProperty("quantity")
    private int quantity;

    @JsonProperty("totalPrice")
    private double totalPrice;

    @JsonProperty("categoryPath")
    private String categoryPath;

    @JsonProperty("regionFilter")
    private String regionFilter;

    @JsonProperty("createdAt")
    private String createdAt;

    public OrderResponse() {
    }

    public OrderResponse(String orderId, String status, String itemId, int quantity,
                         double totalPrice, String categoryPath, String regionFilter) {
        this.orderId = orderId;
        this.status = status;
        this.itemId = itemId;
        this.quantity = quantity;
        this.totalPrice = totalPrice;
        this.categoryPath = categoryPath;
        this.regionFilter = regionFilter;
        this.createdAt = Instant.now().toString();
    }

    public String getOrderId() { return orderId; }
    public String getStatus() { return status; }
    public String getItemId() { return itemId; }
    public int getQuantity() { return quantity; }
    public double getTotalPrice() { return totalPrice; }
    public String getCategoryPath() { return categoryPath; }
    public String getRegionFilter() { return regionFilter; }
    public String getCreatedAt() { return createdAt; }
}
