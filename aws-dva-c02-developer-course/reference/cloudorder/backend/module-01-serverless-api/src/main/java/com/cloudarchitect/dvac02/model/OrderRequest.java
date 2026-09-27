package com.cloudarchitect.dvac02.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public class OrderRequest {

    @JsonProperty("itemId")
    private String itemId;

    @JsonProperty("quantity")
    private int quantity;

    @JsonProperty("customerEmail")
    private String customerEmail;

    @JsonProperty("notes")
    private String notes;

    public OrderRequest() {
    }

    public OrderRequest(String itemId, int quantity, String customerEmail, String notes) {
        this.itemId = itemId;
        this.quantity = quantity;
        this.customerEmail = customerEmail;
        this.notes = notes;
    }

    public String getItemId() { return itemId; }
    public void setItemId(String itemId) { this.itemId = itemId; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
