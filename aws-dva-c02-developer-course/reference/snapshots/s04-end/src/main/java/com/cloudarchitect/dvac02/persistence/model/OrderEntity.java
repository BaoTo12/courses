package com.cloudarchitect.dvac02.persistence.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Single-Table DynamoDB entity representation for CloudOrder.
 * Demonstrates composite keys, GSI overloading, and optimistic locking versions.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class OrderEntity {

    // Primary Hash & Range Keys
    private String pk; // Partition Key: e.g. "CUST#cust-101"
    private String sk; // Sort Key: e.g. "ORDER#ord-5001"

    // Global Secondary Index 1 (GSI1 Overloading)
    private String gsi1pk; // Inverted / Status Partition Key: e.g. "STATUS#PENDING"
    private String gsi1sk; // Date Sort Key: e.g. "DATE#2026-09-27T08:00:00Z"

    // Domain Attributes
    private String orderId;
    private String customerId;
    private Double amount;
    private String status;
    private Long version; // Optimistic locking version attribute
    private String createdAt;
    private Long ttl; // Time to Live in epoch seconds

    public OrderEntity() {
    }

    public OrderEntity(String customerId, String orderId, Double amount, String status, Long version, String createdAt) {
        this.customerId = customerId;
        this.orderId = orderId;
        this.amount = amount;
        this.status = status;
        this.version = version != null ? version : 1L;
        this.createdAt = createdAt;
        this.pk = "CUST#" + customerId;
        this.sk = "ORDER#" + orderId;
        this.gsi1pk = "STATUS#" + status;
        this.gsi1sk = "DATE#" + createdAt;
    }

    public String getPk() {
        return pk;
    }

    public void setPk(String pk) {
        this.pk = pk;
    }

    public String getSk() {
        return sk;
    }

    public void setSk(String sk) {
        this.sk = sk;
    }

    public String getGsi1pk() {
        return gsi1pk;
    }

    public void setGsi1pk(String gsi1pk) {
        this.gsi1pk = gsi1pk;
    }

    public String getGsi1sk() {
        return gsi1sk;
    }

    public void setGsi1sk(String gsi1sk) {
        this.gsi1sk = gsi1sk;
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
        this.gsi1pk = "STATUS#" + status;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
        this.gsi1sk = "DATE#" + createdAt;
    }

    public Long getTtl() {
        return ttl;
    }

    public void setTtl(Long ttl) {
        this.ttl = ttl;
    }

    @Override
    public String toString() {
        return "OrderEntity{" +
                "pk='" + pk + '\'' +
                ", sk='" + sk + '\'' +
                ", gsi1pk='" + gsi1pk + '\'' +
                ", orderId='" + orderId + '\'' +
                ", amount=" + amount +
                ", status='" + status + '\'' +
                ", version=" + version +
                '}';
    }
}
