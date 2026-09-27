# 04-study-plan.md: Study Tracks & Roadmap
## AWS Certified Developer - Associate (DVA-C02) Masterclass

---

## 1. Why This Order?

The 7-module progression is designed around architectural dependencies:

1. **Module 1 (API Gateway + Lambda)**: Establishes the synchronous compute and ingestion baseline. You cannot build event-driven systems without first mastering handler execution environments and payload contracts.
2. **Module 2 (SNS + SQS)**: Introduces asynchronous decoupling and batch resilience (`ReportBatchItemFailures`). You move from synchronous request-response to event-driven fan-out.
3. **Module 3 (Step Functions)**: Takes decoupled components and orchestrates them into stateful workflows with compensating Saga rollbacks.
4. **Module 4 (DynamoDB + S3 + ElastiCache)**: Introduces the persistence tier, single-table design, GSI overloading, and caching to support high-throughput state storage.
5. **Module 5 (Cognito + KMS + Secrets Manager)**: Hardens the entire platform with zero-trust token authentication, envelope encryption, and dynamic secret rotation.
6. **Module 6 (CI/CD + Playwright)**: Automates the entire stack with CodePipeline, CodeDeploy canary releases, and deterministic integration tests.
7. **Module 7 (X-Ray + CloudWatch)**: Deeply instruments the complete distributed architecture, tracing requests across asynchronous boundaries and tuning P99 latency.

---

## 2. The Two Study Tracks

| Metric | Track 1: Intensive Sprint (★ Core Only) | Track 2: Masterclass Track (★ Core + ＋ Extended) |
|---|---|---|
| **Target Audience** | Engineers taking DVA-C02 within 7–14 days | Engineers targeting deep production mastery |
| **Scope** | Core build labs, Broken State challenges, and Knowledge Checks | All core labs + extended topics (DAX clusters, VPC peering, ADOT, mTLS) |
| **Total Time Budget** | **~18 to 22 Hours** | **~35 to 40 Hours** |
| **Checkpoint Focus** | Complete Checkpoints 1, 2, and 3 for each module | Complete all checkpoints and extended exploration labs |

---

## 3. Intensive Sprint (10-Day Exam Readiness Schedule)

| Day | Focus Module | Hands-on Labs & Deliverables | If Behind (Catch-up Rule) |
|:---:|---|---|---|
| **Day 1** | **M01: API Gateway & Lambda** | Deploy synchronous Order API (`/orders/{proxy+}`), CORS, raw JSON IAM. | Skip local Docker testing; deploy directly to AWS. |
| **Day 2** | **M02: SNS Fan-Out to SQS** | Deploy SNS topic, SQS queues, filter policies, `ReportBatchItemFailures`. | Focus on SQS Visibility Timeout formula. |
| **Day 3** | **M03: Step Functions Saga** | Deploy state machine with ASL, Retry/Catch exponential backoff, rollback task. | Test happy path + 1 rollback path. |
| **Day 4** | **M04A: DynamoDB Single-Table** | Single-table modeling (PK/SK, GSI overloading), Optimistic Locking `@Version`. | Verify Query vs. Scan RCU difference. |
| **Day 5** | **M04B: S3 & ElastiCache** | S3 Event Notifications, `S3Presigner` URLs, Redis read-through caching. | Skip VPC Redis; deploy S3 Presigner lab. |
| **Day 6** | **M05: Cognito & KMS** | Custom Lambda Token Authorizer, Cognito JWT verification, KMS Envelope Encryption. | Master Envelope Encryption data key handling. |
| **Day 7** | **M06: CI/CD & Deployments** | `buildspec.yml`, CodeDeploy Canary shifting (`Canary10Percent5Minutes`), Playwright E2E. | Review Beanstalk deployment policies table. |
| **Day 8** | **M07: Observability & X-Ray** | X-Ray subsegments, trace context propagation across SQS, CloudWatch Logs Insights. | Memorize Annotations vs. Metadata rules. |
| **Day 9** | **Full Practice Exams 1–5** | Timed DVA-C02 practice exams (focusing on wrong answers). | Review error explanations and AWS docs. |
| **Day 10** | **Full Practice Exams 6–10** | Final timed exam simulations and service limit review. | Rest and final mental model review. |

> [!IMPORTANT]
> **The Golden Rule**: *Never skip a Phase 6 Knowledge Check.* The scenario questions test nuanced edge cases and distractor options that make the difference between passing and failing.
