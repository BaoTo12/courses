# Part 2: Asynchronous Event-Driven Architectures & Error Handling
> DVA-C02 Domain 1 & Domain 4: Development with AWS Services & Troubleshooting (44% combined)

---

## S02 · SNS Fan-Out to SQS & Partial Batch Failure Resilience

**Project Feature**: Decoupled asynchronous order processing. The synchronous Order API now publishes order events to an Amazon SNS Topic (`OrderEventsTopic`), which fans out messages across multiple Amazon SQS queues (`BillingQueue` and `PriorityQueue`) based on SNS subscription message attributes. Java Lambda batch consumers process messages with `ReportBatchItemFailures` and route poisoned messages to Dead Letter Queues (DLQ).

### Lectures

| # | Type | Lecture | Track |
|---|:---:|---|:---:|
| 02.01 | 📖 | **Mechanical Sympathy: Fan-Out Topology, Polling Models & SQS Visibility Timeouts** (Push vs. pull, long-polling vs. short-polling, the $V \ge 6 \times L$ rule). | ★ |
| 02.02 | 📇 | **API Card: `SnsClient.publish()` & `SQSBatchResponse` (AWS SDK Java v2)** (Message attributes, batch item failure response contract, queue attributes). | ★ |
| 02.03 | 🛠 | **Build: Order Event Publisher & SQS Batch Consumer with `ReportBatchItemFailures`** (Java 21, item-level batch failure reporting, avoiding whole-batch rollbacks). | ★ |
| 02.04 | 🛠 | **Provisioning: SNS Topic, Subscriptions with Filter Policies & SQS Dead Letter Queues** (Authoring SAM template with SNS filter policies, redrive policy, raw JSON IAM). | ★ |
| 02.05 | 🎯 | **Your Turn: Publishing Events via AWS CLI & Simulating DLQ Poison Pill Routing** (Emitting events with message attributes, observing DLQ routing after 3 retries). | ★ |
| 02.06 | 🧩 | **Live Verification: Tracing Message Lag & DeadLetterQueue Delivery in CloudWatch** (`ApproximateNumberOfMessagesVisible`, `ApproximateAgeOfOldestMessage`). | ★ |
| 02.07 | 🐞 | **Debug Lab: Visibility Timeout Race Condition Causing Duplicate Lambda Executions** (Symptom: duplicated processing; diagnose $V < 6 \times L$ race condition). | ★ |
| 02.08 | 🔓 | **Attack Lab: Message Storm & Ingestion Poisoning via Unfiltered SQS Payloads** (Injecting malformed payloads; isolating poisoned items via `ReportBatchItemFailures`). | ★ |
| 02.09 | ＋ | **Extended: SQS FIFO Message Deduplication (`MessageDeduplicationId`) & Group ID Ordering** (High-throughput FIFO vs. Standard FIFO, partition ordering). | ＋ |
| 02.99 | ✅ | **DVA-C02 Knowledge Check: SQS Batching, DLQ Redrive Policies & SNS Attribute Filtering** (5 high-yield DVA-C02 scenarios covering queues, fan-out, and timeouts). | ★ |

**Checkpoint**: `s02-end`
