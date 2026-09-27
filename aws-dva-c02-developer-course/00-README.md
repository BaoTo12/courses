# CloudOrder: AWS Developer Associate (DVA-C02) Masterclass
## AWS SDK for Java v2 · Java 21 · AWS SAM CLI · API Gateway · Lambda · SNS · SQS · Step Functions · DynamoDB · S3 · ElastiCache · Cognito · KMS · Secrets Manager · CodePipeline · Playwright · X-Ray · CloudWatch

> One evolving, enterprise-grade distributed project. Zero analogies. Pure mechanical sympathy, architectural justification ("the why"), compilable Java 21 code, raw JSON IAM policies transitioning to SAM policy templates, live AWS deployment, and real-world CloudWatch/X-Ray operational observability.

---

## 1. Course Description

You will build **CloudOrder**, an enterprise-grade distributed order orchestration and fulfillment engine, from an empty directory to a secured, decoupled, observable, and fully automated production serverless system running in your real AWS account.

The curriculum is built for engineers who already hold the AWS Cloud Practitioner certification with a perfect score and demand **deep architectural execution without introductory hand-waving**.

The project is the vehicle; the goal is **deep understanding and complete mastery of all 32 AWS services tested on the DVA-C02 exam**. For every service and concept, the course answers the exact nine mechanical questions:

1. **What problem does it solve?** (The distributed system failure mode or scaling bottleneck).
2. **Why does it exist?** (Why simple compute/database primitives fail at scale).
3. **How does it work?** (The runtime protocol, wire format, and thread model).
4. **What happens internally?** (AWS internal mechanics, partition management, pollers, hyperplanes).
5. **How does it interact with other technologies?** (Context propagation, IAM boundaries, payload wrapping).
6. **What are the alternatives?** (Direct point-to-point integration vs. decoupled brokering).
7. **What are the trade-offs?** (Latency vs. durability, consistency vs. availability, cost vs. throughput).
8. **When should I use it?** (Concrete production criteria and traffic profiles).
9. **When should I avoid it?** (Anti-patterns and costly design mistakes).

---

## 2. Final System Architecture You Will Build and Explain

```text
                                  ┌─────────────────── Clients (Web / Mobile / CLI) ──────────────────┐
                                  │                                                                    │
                                  │ HTTPS Requests + JWT Bearer Token                                  │
                                  ↓                                                                    │
                 ┌───────────────────────────────── API Gateway (REST API) ─────────────────────────────────┐
                 │  • greedy proxy: /orders/{proxy+}   • query filtering: ?region=&priority=                │
                 │  • CORS configuration               • Lambda Token Authorizer (Cognito JWT Validation)   │
                 └───────────────────┬─────────────────────────────────────────────────┬────────────────────┘
                                     │ invoke (AWS_PROXY)                              │ custom policy
                                     ↓                                                 ↓
                       ┌───────────────────────────┐                     ┌───────────────────────────┐
                       │  OrderApiHandler (Lambda) │                     │   AuthHandler (Lambda)    │
                       │  Java 21 · Jackson POJO   │                     │   Cognito JWT Verifier    │
                       └─────────────┬─────────────┘                     └─────────────┬─────────────┘
                                     │                                                 │
                                     │ SnsClient.publish()                             │ Authenticate
                                     ↓                                                 ↓
                       ┌───────────────────────────┐                     ┌───────────────────────────┐
                       │   OrderEventsTopic (SNS)  │                     │ Amazon Cognito User Pool  │
                       └──────┬─────────────┬──────┘                     └───────────────────────────┘
         Message Filter       │             │ Message Filter
     priority = "HIGH"        │             │ eventType = "CREATED"
                              ↓             ↓
               ┌─────────────────────┐   ┌─────────────────────┐
               │ PriorityQueue (SQS) │   │ BillingQueue (SQS)  │ ──── DLQ (redrive policy)
               └──────────┬──────────┘   └──────────┬──────────┘
                          │                         │
                          │ EventSourceMapping      │ EventSourceMapping (ReportBatchItemFailures)
                          ↓                         ↓
               ┌─────────────────────┐   ┌────────────────────────────────────────────────────────┐
               │ PriorityProcessor   │   │ BillingProcessor (Lambda Java 21)                      │
               │ (Lambda Java 21)    │   │ • SfnClient.startExecution()                           │
               └─────────────────────┘   └───────────────────────────┬────────────────────────────┘
                                                                     │
                                                                     ↓
                               ┌──────────────────────────────────────────────────────────────────┐
                               │           Step Functions: OrderCheckoutStateMachine (Saga)       │
                               │  ReserveInventory (Task) ──Retry──> ProcessPayment (Task)        │
                               │       │ Catch                               │ Catch              │
                               │       ↓                                     ↓                    │
                               │  CancelOrder (Compensate)             RefundPayment / Unreserve  │
                               └───────────────┬──────────────────────────────────┬───────────────┘
                                               │                                  │
                                               ↓                                  ↓
                 ┌──────────────────────────────────────────────┐   ┌─────────────────────────────┐
                 │       DynamoDB: CloudOrderTable              │   │   S3 Invoices Bucket        │
                 │  • Single-Table Design (PK/SK)               │   │   • Event Notification      │
                 │  • GSI1 Overloading (Customer / Order State) │   │   • S3Presigner URLs        │
                 │  • Optimistic Locking (@Version)             │   └──────────────┬──────────────┘
                 └───────────────────────┬──────────────────────┘                  │
                                         │                                         │
                                         │ Cache Aside                             │
                                         ↓                                         ↓
                 ┌──────────────────────────────────────────────┐   ┌─────────────────────────────┐
                 │        Amazon ElastiCache Redis              │   │ AWS KMS & Secrets Manager   │
                 │  • Sub-millisecond order state reads         │   │ • Envelope Encryption       │
                 │  • VPC Private Subnet Cluster                │   │ • Runtime credential rot.   │
                 └──────────────────────────────────────────────┘   └─────────────────────────────┘
                                                 │
               ══════════════════════════════════╪════════════════════════════════════════════════════════
               CI/CD & Observability: CodePipeline · CodeBuild · CodeDeploy (Canary) · Playwright E2E
               Distributed Tracing: AWS X-Ray Subsegments & TracingInterceptor · CloudWatch Logs Insights
```

---

## 3. Prerequisites

| Required | Assumed from Perfect Cloud Practitioner Score |
|---|---|
| Core Java (OOP, interfaces, collections, exceptions) | Basic AWS Cloud concepts (regions, availability zones) |
| Comfortable with terminal / PowerShell | High-level service roles (what S3, EC2, Lambda are) |
| Basic Maven / build concepts | Shared responsibility model |
| Basic HTTP knowledge (methods, headers, status codes) | Cloud economics & pricing models |

---

## 4. Learning Outcomes Grouped by DVA-C02 Domain

### Domain 1: Development with AWS Services (32%)
* Implement synchronous REST APIs with greedy paths (`/orders/{proxy+}`) and query filtering on Amazon API Gateway.
* Author high-throughput serverless microservices using AWS Lambda (Java 21 managed runtime) and optimize cold starts via memory allocation and SnapStart.
* Architect decoupled asynchronous fan-out pipelines using Amazon SNS message filter attributes and Amazon SQS queues with `ReportBatchItemFailures`.
* Orchestrate distributed transactions using AWS Step Functions (Standard vs. Express) implementing the Saga Pattern with compensating rollbacks.
* Model relational data into a Single DynamoDB Table with GSI overloading, optimistic locking (`@DynamoDbVersionAttribute`), and SDK backoff policies.
* Integrate Amazon S3 Event Notifications, generate presigned URLs using `S3Presigner`, and implement sub-millisecond caching via ElastiCache Redis.

### Domain 2: Security (26%)
* Master the 5-step AWS SDK Default Credentials Provider Chain and implement least-privilege IAM policies.
* Secure REST APIs using Amazon Cognito User Pools, JWT signature verification, and custom Lambda Token Authorizers.
* Implement Client-Side Envelope Encryption using AWS KMS (`KmsClient.generateDataKey`) and local AES-256-GCM.
* Inject credentials dynamically at runtime using AWS Secrets Manager and AWS SSM Parameter Store with local memory caching.

### Domain 3: Deployment (22%)
* Author declarative Infrastructure as Code using AWS SAM CLI transitioning from raw JSON IAM to SAM Policy Templates.
* Construct multi-stage continuous delivery pipelines using AWS CodePipeline, CodeBuild, and CodeDeploy.
* Implement safe Canary and Linear traffic shifting with automated CloudWatch rollback alarms.
* Understand Elastic Beanstalk deployment policies (All at once, Rolling, Rolling with additional batch, Immutable, Traffic splitting) and CloudFormation intrinsic functions.
* Author deterministic Playwright end-to-end integration test suites derived from Java execution paths.

### Domain 4: Troubleshooting and Optimization (20%)
* Instrument Java v2 SDK clients with the AWS X-Ray SDK and propagate trace context across asynchronous SQS boundaries.
* Author operational CloudWatch Logs Insights queries to benchmark P90/P99 latency, cold start `Init Duration`, and error clusters.
* Generate high-cardinality asynchronous metrics using CloudWatch Embedded Metric Format (EMF).
* Troubleshoot real-world broken states (visibility timeout races, IAM denials, payload overwrites, reserved keyword collisions).

---

## 5. Technology Stack & Pinned Versions

| Component | Technology | Version | Purpose |
|---|---|---|---|
| **Language** | Java (OpenJDK / Oracle JDK) | **21 LTS** | Core backend language utilizing virtual threads & records |
| **Cloud SDK** | AWS SDK for Java v2 | **2.29.50+** | Non-blocking, modular AWS service client interfaces |
| **Serverless Runtime** | AWS Lambda Managed Runtime | `java21` | High-throughput serverless compute with SnapStart |
| **IaC & Tooling** | AWS SAM CLI | **1.120+** | Local emulation, packaging, and CloudFormation generation |
| **Build Tool** | Apache Maven | **3.9.x** | Dependency management, shade packaging, compilation |
| **JSON Serialization** | Jackson Databind | **2.18.2** | High-performance POJO serialization & event mapping |
| **End-to-End Testing** | Playwright (Node/TypeScript) | **1.48+** | Deterministic E2E tests derived from Java execution paths |
| **Distributed Tracing** | AWS X-Ray SDK for Java v2 | **2.16+** | Subsegment instrumentation & trace context propagation |

---

## 6. Course Map (The 8 Service Sections)

| Section | Service Group | Target AWS Services | Primary Deliverable | Status |
|:---:|---|---|---|:---:|
| **S01** | Core Compute & Synchronous Ingestion | **Amazon API Gateway · AWS Lambda** | Synchronous Order Ingestion API (`/orders/{proxy+}`), CORS, Raw JSON IAM, 29s limit handling | ✅ Complete |
| **S02** | Asynchronous Messaging & Queues | **Amazon SQS · Amazon SNS** | Fan-out order event pipeline, FIFO deduplication, `ReportBatchItemFailures`, DLQ redrive | ✅ Complete |
| **S03** | Stateful Microservice Orchestration | **AWS Step Functions** | Distributed E-commerce Checkout Saga state machine with ASL, Retry/Catch, compensating rollbacks | ✅ Complete |
| **S04** | High-Performance Persistence & Locking | **Amazon DynamoDB · DAX** | Single-Table Design (PK/SK, GSI overloading), Optimistic Locking, CDC Streams | ✅ Complete |
| **S05** | Object Storage & In-Memory Caching | **Amazon S3 · Amazon ElastiCache Redis** | S3 Event Notifications, `S3Presigner` SigV4 URLs, Redis sub-ms cache-aside in private VPC | ✅ Complete |
| **S06** | Zero-Trust Security & Identity | **Amazon Cognito · AWS KMS · Secrets Manager** | SDK Credential Chain, JWT Token Authorizer, KMS Envelope Encryption, runtime secret rotation | ✅ Complete |
| **S07** | Automated CI/CD & Deployments | **CodePipeline · CodeBuild · CodeDeploy · Beanstalk** | `buildspec.yml`, CodeDeploy Canary shifting (`Canary10Percent5Minutes`), Beanstalk, Playwright | ✅ Complete |
| **S08** | Distributed Tracing & Telemetry | **AWS X-Ray · CloudWatch EMF & Logs Insights** | X-Ray subsegments, `X-Amzn-Trace-Id` propagation, CloudWatch EMF zero-cost metrics, P95 tuning | ✅ Complete |

---

## 7. How Each Module Works: The 6-Phase Pedagogical Engine

Every module is delivered as an **Interactive Combined Master Guide** progressing through 3 interactive checkpoints:

1. **Phase 1: Deep Theory (The "Udemy Lecture")**:
   - Internal mechanics, wire protocols, and the 9 questions.
   - 📇 **API Cards** for every AWS SDK v2 client and CloudFormation resource.
2. **Phase 2: Guided Code-Along**:
   - Step-by-step milestones (`pom.xml` architecture $\to$ domain models $\to$ core handler $\to$ SAM template).
   - In-flight callouts: ⚙️ Mechanical Sympathy, ⏱️ Latency/Cold-Start Note, ⚠️ DVA-C02 Exam Trap.
3. **Phase 3: Real-World Deployment**:
   - Local emulation (`sam local start-api`), packaging (`sam build`), and live deployment (`sam deploy --guided`).
   - Physical CLI invocation commands (`curl`, `aws sns publish`, `aws sqs send-message`).
4. **Phase 4: Live Observability & Verification**:
   - AWS Console navigation (X-Ray Service Map, Subsegments).
   - Production CloudWatch Logs Insights query recipes.
5. **Phase 5: "Broken State" Troubleshooting Challenge**:
   - An intentionally injected defect (IAM access denial, visibility timeout race, payload wipe).
   - You inspect live error logs, identify root cause, and apply the fix.
6. **Phase 6: DVA-C02 Exam Knowledge Verification**:
   - 5 scenario-based exam questions mapped directly to the deployed services with mechanical explanations.

---

## 8. Repository Layout

```text
aws-dva-c02-developer-course/
├── 00-README.md                 # Master course specification (this file)
├── 01-setup.md                  # Developer environment setup & verification
├── 02-project-spec.md           # CloudOrder system specification & data contracts
├── 03-security-scope.md         # IAM progression, encryption & attack-lab rules
├── 04-study-plan.md             # Intensive vs. Full study track schedules
├── curriculum/                  # Detailed syllabus tables for Parts 1 to 8
├── lectures/                    # Formatted lecture guides (S01 to S08)
├── solutions/                   # Solution walkthroughs for exercises (S01 to S08)
├── provided/                    # Shared schemas, postman collections & scripts
└── reference/
    ├── authoring/render.mjs     # Template rendering script
    ├── cloudorder/              # Full compilable reference project across 8 modules (37/37 tests passed)
    └── snapshots/               # Frozen code snapshots at each section end (s01-end to s08-end)
```

