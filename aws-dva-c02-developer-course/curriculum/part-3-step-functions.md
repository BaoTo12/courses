# Part 3: Stateful Microservice Orchestration & The Saga Pattern
> DVA-C02 Domain 1 & Domain 4: Development with AWS Services & Troubleshooting (44% combined)

---

## S03 · Stateful Microservice Orchestration & Saga Pattern

**Project Feature**: Distributed multi-step order checkout saga. When an order event is consumed from SQS, a state machine orchestrates inventory reservation, payment authorization, and order status updates. If payment fails, automated compensating transactions roll back inventory reservation.

### Lectures

| # | Type | Lecture | Track |
|---|:---:|---|:---:|
| 03.01 | 📖 | **Mechanical Sympathy: Orchestration vs. Choreography, Standard vs. Express Workflows & The Saga Pattern** (ASL state transitions, exactly-once vs. at-least-once, compensating rollbacks). | ★ |
| 03.02 | 📇 | **API Card: `SfnClient.startExecution()` & Amazon States Language (ASL)** (`Task`, `Choice`, `Retry` backoff rate, `Catch`, and JSONPath transformations). | ★ |
| 03.03 | 🛠 | **Build: Order Checkout Saga Tasks & Compensating Handlers** (Java 21 handlers: `ReserveInventoryHandler`, `ProcessPaymentHandler`, `CompensateInventoryHandler`). | ★ |
| 03.04 | 🛠 | **Provisioning: SAM State Machine with ASL Payload Transformations & Exponential Backoff** (`AWS::Serverless::StateMachine`, `InputPath`, `ResultPath`, `OutputPath`, raw JSON IAM role). | ★ |
| 03.05 | 🎯 | **Your Turn: Executing Workflows via AWS CLI & Simulating Compensating Saga Rollbacks** (Running happy-path execution and testing rollback branch with `failPayment: true`). | ★ |
| 03.06 | 🧩 | **Live Verification: Tracing Execution State Transitions & Error Payloads in CloudWatch Logs** (Visual execution graph analysis, state transition events). | ★ |
| 03.07 | 🐞 | **Debug Lab: The Context Obliteration Bug (`ResultPath: "$"` Overwrite)** (Diagnosing why downstream tasks fail when task output overwrites root execution state). | ★ |
| 03.08 | 🔓 | **Attack Lab: Workflow Concurrency Starvation & Standard vs. Express Pricing Collapse** (Simulating execution backlogs, analyzing state transition costs under high TPS). | ★ |
| 03.09 | ＋ | **Extended: Synchronous Express Workflows with Direct API Gateway HTTP Ingress** (Sub-second Express executions returning synchronous responses without polling). | ＋ |
| 03.99 | ✅ | **DVA-C02 Knowledge Check: Step Functions Workflows, ASL Syntax, and Error Handling** (5 high-yield DVA-C02 scenario questions with detailed mechanical rationales). | ★ |

**Checkpoint**: `s03-end`
