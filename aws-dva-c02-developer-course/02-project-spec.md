# 02-project-spec.md: CloudOrder System Specification
## AWS Certified Developer - Associate (DVA-C02) Masterclass

---

## 1. System Overview

**CloudOrder** is a cloud-native, distributed order ingestion, processing, and fulfillment platform. The system is designed to handle high-velocity order events with zero server management, sub-millisecond read caching, guaranteed event fan-out, idempotent distributed transaction orchestration, and zero-trust security.

---

## 2. Domain Data Model & Single-Table Schema

The core persistence layer uses a **Single DynamoDB Table** (`CloudOrderTable`) supporting multi-entity storage through composite partition keys (`PK`) and sort keys (`SK`), with Global Secondary Index (`GSI1`) overloading.

### Entity Schemas

| Entity | Partition Key (`PK`) | Sort Key (`SK`) | GSI1 Partition Key (`GSI1PK`) | GSI1 Sort Key (`GSI1SK`) | Attributes |
|---|---|---|---|---|---|
| **Customer** | `CUST#<customerId>` | `METADATA` | `EMAIL#<email>` | `CUST#<customerId>` | `name`, `tier`, `createdAt` |
| **Order** | `ORDER#<orderId>` | `ORDER#<orderId>` | `CUST#<customerId>` | `STATUS#<status>#<timestamp>` | `totalAmount`, `status`, `shippingAddress`, `@version` |
| **OrderItem** | `ORDER#<orderId>` | `ITEM#<itemId>` | `ITEM#<itemId>` | `ORDER#<orderId>` | `quantity`, `unitPrice`, `title` |
| **PaymentRecord** | `ORDER#<orderId>` | `PAYMENT` | `TX#<transactionId>` | `ORDER#<orderId>` | `amount`, `paymentMethod`, `encryptedCardToken` |

### Key Access Patterns

1. **Get Order and all its Items in ONE network query**:
   - `QueryRequest`: `PK = "ORDER#123" AND begins_with(SK, "")`
   - *Result*: Returns the parent Order record and every OrderItem child record in a single round-trip.
2. **Find all Orders for a specific Customer sorted by date**:
   - `QueryRequest` on `GSI1`: `GSI1PK = "CUST#456" AND begins_with(GSI1SK, "STATUS#")`
3. **Lookup Customer by Email**:
   - `QueryRequest` on `GSI1`: `GSI1PK = "EMAIL#alice@example.com"`

---

## 3. API Contract (REST Ingress)

### POST `/orders/{category}`
Ingests a new order into the platform.

* **Path Parameters**:
  - `category`: Category slug (e.g., `electronics`, `books`).
* **Query Parameters**:
  - `region`: Geographic fulfillment center (`us-east-1`, `eu-west-1`).
  - `priority`: Optional routing flag (`HIGH`, `STANDARD`).
* **Headers**:
  - `Authorization`: `Bearer <cognito-jwt-token>` (Module 5 onwards)
  - `Content-Type`: `application/json`
* **Request Payload**:
  ```json
  {
    "itemId": "ITEM-902",
    "quantity": 2,
    "customerEmail": "customer@cloudorder.internal",
    "notes": "Deliver before 5 PM"
  }
  ```
* **Response Payload (201 Created)**:
  ```json
  {
    "orderId": "ORD-55f284e3-3b68-4509-90bc-4672bb7e594d",
    "status": "PENDING_PAYMENT",
    "itemId": "ITEM-902",
    "quantity": 2,
    "totalPrice": 199.98,
    "categoryPath": "electronics",
    "regionFilter": "us-east-1",
    "createdAt": "2026-09-27T08:00:00Z"
  }
  ```

---

## 4. What You Write vs. What Is Provided

To respect your time and focus 100% on the core services tested on the DVA-C02 exam, infrastructural boilerplate is provided:

| Component | What You Write (Learner Focus) | What Is Provided / Pre-Configured |
|---|---|---|
| **API Gateway** | Route mapping, CORS definitions, Stage variables, Authorizer integrations | Base HTTP API definitions, default gateway responses |
| **AWS Lambda** | Request handlers, event mapping, Jackson bindings, business logic, error responses | Base POM templates, logger facade configuration |
| **AWS SDK v2** | Explicit client instantiation, client builders, API requests (`publish`, `query`, `startExecution`) | Dependency BOMs in Maven |
| **IAM Security** | Raw JSON IAM policies, SAM policy templates, least-privilege scoping | Default CloudWatch log group creation |
| **Step Functions** | Amazon States Language (ASL) definition, Retry/Catch policies, Saga compensating logic | Mock external payment gateway stub |
| **DynamoDB** | KeyConditionExpressions, Single-table access patterns, Optimistic locking attributes | Initial table schema definitions in SAM |
| **CI/CD** | `buildspec.yml` lifecycle phases, CodeDeploy Canary shifting configuration | Sample GitHub repository hook templates |
| **Observability** | Custom X-Ray subsegments, trace context propagation headers, Logs Insights queries | Default CloudWatch log stream handlers |
