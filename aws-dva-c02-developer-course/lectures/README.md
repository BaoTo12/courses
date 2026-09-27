# Course Lectures Index & Progress Tracker
## CloudOrder: AWS Developer Associate (DVA-C02) Masterclass

---

## Progress Overview

| Section | Title | Target Services | Status | Checkpoint |
|:---:|---|---|:---:|:---:|
| **S01** | **API Gateway & Java 21 Lambda Deep Dive** | **Amazon API Gateway · AWS Lambda** | ✅ Written | `s01-end` |
| **S02** | **SNS Fan-Out to SQS & Batch Failure Resilience** | **Amazon SQS · Amazon SNS** | ✅ Written | `s02-end` |
| **S03** | **Stateful Microservice Orchestration & Saga Pattern** | **AWS Step Functions** | ✅ Written | `s03-end` |
| **S04** | **DynamoDB Single-Table Design, GSI & Optimistic Locking** | **Amazon DynamoDB · DAX** | ✅ Written | `s04-end` |
| **S05** | **S3 Event Notifications & ElastiCache Redis Caching** | **Amazon S3 · Amazon ElastiCache** | ✅ Written | `s05-end` |
| **S06** | **Cognito Auth, Lambda Authorizers & KMS Envelope Encryption** | **Amazon Cognito · AWS KMS · Secrets Manager** | ✅ Written | `s06-end` |
| **S07** | **Automated CI/CD, Beanstalk & Playwright Testing** | **CodePipeline · CodeBuild · CodeDeploy · Beanstalk** | ✅ Written | `s07-end` |
| **S08** | **Distributed Tracing & CloudWatch Observability Tuning** | **AWS X-Ray · CloudWatch EMF & Insights** | ✅ Written | `s08-end` |

---

## S08 · Distributed Tracing & CloudWatch Observability Tuning (✅ Complete)

* **Directory**: [`lectures/S08-observability-xray/`](./S08-observability-xray/)
* **Lectures**:
  - [08.01 · 📖 Mechanical Sympathy: Distributed Tracing Protocols, Sampling Math & Embedded Metric Format](./S08-observability-xray/08.01-mechanical-sympathy-xray-sampling-emf.md)
  - [08.02 · 📇 API Card: AWS X-Ray SDK, Subsegments & CloudWatch EMF Specification](./S08-observability-xray/08.02-api-card-xray-sdk-emf-specification.md)
  - [08.03 · 🛠 Build: High-Cardinality EMF Metrics Emitter, Trace Context Propagator & Insights Query Generator](./S08-observability-xray/08.03-build-emf-metrics-emitter-and-xray-tracing.md)
  - [08.04 · 🛠 Provisioning: Active Tracing, Sampling Rules, Metric Filters & Composite Alarms SAM](./S08-observability-xray/08.04-provisioning-xray-sampling-composite-alarms-sam.md)
  - [08.05 · 🎯 Your Turn: Generating Distributed Traces, Querying CloudWatch Logs Insights & Triggering Composite Alarms](./S08-observability-xray/08.05-your-turn-cli-xray-traces-insights-alarms.md)
  - [08.06 · 🧩 Live Verification: Inspecting Service Maps, Subsegment Latencies & EMF Metric Dashboards](./S08-observability-xray/08.06-live-verification-xray-service-map-emf-dashboard.md)
  - [08.07 · 🐞 Debug Lab: Missing Subsegment in Multi-Threaded Execution & High-Cardinality Metric Explosion](./S08-observability-xray/08.07-debug-unpropagated-trace-context-metric-explosion.md)
  - [08.08 · 🔓 Attack Lab: Trace Injection Tampering & Metric Denial-of-Service via High-Volume Logging](./S08-observability-xray/08.08-attack-lab-trace-injection-dos-logging.md)
  - [08.09 · ＋ Extended: AWS Distro for OpenTelemetry (ADOT) & Application Signals Integration](./S08-observability-xray/08.09-extended-adot-opentelemetry-application-signals.md)
  - [08.99 · ✅ DVA-C02 Knowledge Check: AWS X-Ray, CloudWatch EMF, Logs Insights & Alarms](./S08-observability-xray/08.99-knowledge-check.md)
* **Solutions**:
  - [Solution 08.05 · Generating Traces, Querying Insights & Composite Alarms Walkthrough](../solutions/S08-observability-xray/08.05-solution.md)
* **Code Snapshot**: `reference/snapshots/s08-end/`


---

## S01 · API Gateway & Java 21 Lambda Deep Dive (✅ Complete)

* **Directory**: [`lectures/S01-api-gateway/`](./S01-api-gateway/)
* **Lectures**:
  - [01.01 · 📖 Mechanical Sympathy: API Gateway REST vs. HTTP APIs & Lambda Execution Environments](./S01-api-gateway/01.01-mechanical-sympathy-api-gateway-lambda.md)
  - [01.02 · 📇 API Card: `RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent>`](./S01-api-gateway/01.02-api-card-requesthandler.md)
  - [01.03 · 🛠 Build: Core Order Ingestion Handler with Greedy Path Variable & Query String Parsing](./S01-api-gateway/01.03-build-order-api-handler.md)
  - [01.04 · 🛠 Provisioning: SAM Template with Explicit Raw JSON IAM Policies](./S01-api-gateway/01.04-provisioning-sam-template.md)
  - [01.05 · 🎯 Your Turn: Local Testing with `sam local start-api` & Guided AWS Account Deployment](./S01-api-gateway/01.05-your-turn-local-test-deploy.md)
  - [01.06 · 🧩 Live Verification: Inspecting Cold Starts & Latency in CloudWatch Logs Insights](./S01-api-gateway/01.06-live-verification-cloudwatch-insights.md)
  - [01.07 · 🐞 Debug Lab: Missing Proxy Integration Response Mapping (502 Bad Gateway)](./S01-api-gateway/01.07-debug-malformed-proxy-response.md)
  - [01.08 · 🔓 Attack Lab: Memory Exhaustion via Unbounded Greedy Ingestion](./S01-api-gateway/01.08-attack-lab-unbounded-payload-oom.md)
  - [01.09 · ＋ Extended: Lambda Versioning, Aliases & Weighted Canary Traffic Routing](./S01-api-gateway/01.09-extended-lambda-versioning-aliases.md)
  - [01.99 · ✅ DVA-C02 Knowledge Check: API Gateway Integrations & Lambda Execution Models](./S01-api-gateway/01.99-knowledge-check.md)
* **Solutions**:
  - [Solution 01.05 · Local Emulation & Live Deployment Walkthrough](../solutions/S01-api-gateway/01.05-solution.md)
* **Code Snapshot**: `reference/snapshots/s01-end/`

---

## S02 · SNS Fan-Out to SQS & Batch Failure Resilience (✅ Complete)

* **Directory**: [`lectures/S02-fanout-sqs/`](./S02-fanout-sqs/)
* **Lectures**:
  - [02.01 · 📖 Mechanical Sympathy: Fan-Out Topology, Polling Models & SQS Visibility Timeouts](./S02-fanout-sqs/02.01-mechanical-sympathy-fanout-queues-visibility.md)
  - [02.02 · 📇 API Card: `SnsClient.publish()` & `SQSBatchResponse` (AWS SDK Java v2)](./S02-fanout-sqs/02.02-api-card-sns-sqs-batch-response.md)
  - [02.03 · 🛠 Build: Order Event Publisher & SQS Batch Consumer with `ReportBatchItemFailures`](./S02-fanout-sqs/02.03-build-event-publisher-batch-consumer.md)
  - [02.04 · 🛠 Provisioning: SNS Topic, Subscriptions with Filter Policies & SQS Dead Letter Queues](./S02-fanout-sqs/02.04-provisioning-sns-sqs-sam-template.md)
  - [02.05 · 🎯 Your Turn: Publishing Events via AWS CLI & Simulating DLQ Poison Pill Routing](./S02-fanout-sqs/02.05-your-turn-cli-fanout-dlq.md)
  - [02.06 · 🧩 Live Verification: Tracing Message Lag & DeadLetterQueue Delivery in CloudWatch](./S02-fanout-sqs/02.06-live-verification-cloudwatch-sqs.md)
  - [02.07 · 🐞 Debug Lab: Visibility Timeout Race Condition Causing Duplicate Lambda Executions](./S02-fanout-sqs/02.07-debug-visibility-timeout-race.md)
  - [02.08 · 🔓 Attack Lab: Message Storm & Ingestion Poisoning via Unfiltered SQS Payloads](./S02-fanout-sqs/02.08-attack-lab-poison-pill-batch-isolation.md)
  - [02.09 · ＋ Extended: SQS FIFO Message Deduplication & Group ID Ordering](./S02-fanout-sqs/02.09-extended-sqs-fifo-deduplication.md)
  - [02.99 · ✅ DVA-C02 Knowledge Check: SQS Batching, DLQ Redrive Policies & SNS Attribute Filtering](./S02-fanout-sqs/02.99-knowledge-check.md)
* **Solutions**:
  - [Solution 02.05 · CLI Fan-Out Publishing & DLQ Redrive Verification Walkthrough](../solutions/S02-fanout-sqs/02.05-solution.md)
* **Code Snapshot**: `reference/snapshots/s02-end/`

---

## S03 · Stateful Microservice Orchestration & Saga Pattern (✅ Complete)

* **Directory**: [`lectures/S03-step-functions/`](./S03-step-functions/)
* **Lectures**:
  - [03.01 · 📖 Mechanical Sympathy: Orchestration vs. Choreography, Standard vs. Express Workflows & The Saga Pattern](./S03-step-functions/03.01-mechanical-sympathy-orchestration-saga-standard-vs-express.md)
  - [03.02 · 📇 API Card: `SfnClient.startExecution()` & Amazon States Language (ASL)](./S03-step-functions/03.02-api-card-sfn-client-asl-jsonpath.md)
  - [03.03 · 🛠 Build: Order Checkout Saga Tasks & Compensating Handlers](./S03-step-functions/03.03-build-saga-tasks-compensating-handlers.md)
  - [03.04 · 🛠 Provisioning: SAM State Machine with ASL Payload Transformations & Exponential Backoff](./S03-step-functions/03.04-provisioning-step-functions-asl-sam.md)
  - [03.05 · 🎯 Your Turn: Executing Workflows via AWS CLI & Simulating Compensating Saga Rollbacks](./S03-step-functions/03.05-your-turn-cli-executions-compensating-rollback.md)
  - [03.06 · 🧩 Live Verification: Visualizing Workflow Transitions & Execution History in CloudWatch](./S03-step-functions/03.06-live-verification-cloudwatch-visual-workflow.md)
  - [03.07 · 🐞 Debug Lab: The ResultPath Context Obliteration Defect ("ResultPath": "$")](./S03-step-functions/03.07-debug-resultpath-state-obliteration.md)
  - [03.08 · 🔓 Attack Lab: Workflow Concurrency Starvation & Standard vs. Express Pricing Collapse](./S03-step-functions/03.08-attack-lab-standard-vs-express-pricing-collapse.md)
  - [03.09 · ＋ Extended: Synchronous Express Workflows with Direct API Gateway HTTP Ingress](./S03-step-functions/03.09-extended-synchronous-express-workflows.md)
  - [03.99 · ✅ DVA-C02 Knowledge Check: Step Functions Workflows, ASL Syntax, and Error Handling](./S03-step-functions/03.99-knowledge-check.md)
* **Solutions**:
  - [Solution 03.05 · CLI Saga Execution & Compensating Rollback Transcript](../solutions/S03-step-functions/03.05-solution.md)
* **Code Snapshot**: `reference/snapshots/s03-end/`

---

## S04 · DynamoDB Single-Table Design, GSI & Optimistic Locking (✅ Complete)

* **Directory**: [`lectures/S04-dynamodb-persistence/`](./S04-dynamodb-persistence/)
* **Lectures**:
  - [04.01 · 📖 Mechanical Sympathy: Hash-Range Partitions, RCU/WCU Math & Single-Table Design](./S04-dynamodb-persistence/04.01-mechanical-sympathy-hash-partitions-rcu-wcu.md)
  - [04.02 · 📇 API Card: `DynamoDbClient`, `QueryRequest` & Optimistic Locking Expressions](./S04-dynamodb-persistence/04.02-api-card-dynamodb-client-enhanced-client.md)
  - [04.03 · 🛠 Build: Single-Table Repository, Composite Keys & Optimistic Locking Handler](./S04-dynamodb-persistence/04.03-build-single-table-repository-optimistic-locking.md)
  - [04.04 · 🛠 Provisioning: SAM Table with GSI Overloading, Streams & Raw JSON IAM](./S04-dynamodb-persistence/04.04-provisioning-dynamodb-sam-template.md)
  - [04.05 · 🎯 Your Turn: Seeding Single-Table Records, Multi-Entity Querying & Testing Version Clashes](./S04-dynamodb-persistence/04.05-your-turn-cli-seeding-querying-optimistic-locking.md)
  - [04.06 · 🧩 Live Verification: Benchmarking RCU/WCU Consumption & Throttles in CloudWatch](./S04-dynamodb-persistence/04.06-live-verification-cloudwatch-rcu-wcu-throttling.md)
  - [04.07 · 🐞 Debug Lab: Reserved Keyword Collision ("#status") & Hot Partition Bottlenecks](./S04-dynamodb-persistence/04.07-debug-reserved-keyword-collision-and-hot-partition.md)
  - [04.08 · 🔓 Attack Lab: Unbounded Scan DoS & Capacity Depletion vs. Efficient Index Query](./S04-dynamodb-persistence/04.08-attack-lab-unbounded-scan-rcu-exhaustion.md)
  - [04.09 · ＋ Extended: DynamoDB Streams CDC, Batch Bisection & DAX In-Memory Acceleration](./S04-dynamodb-persistence/04.09-extended-dynamodb-streams-cdc-and-dax.md)
  - [04.99 · ✅ DVA-C02 Knowledge Check: DynamoDB Capacity Math, Single-Table Modeling & Streams](./S04-dynamodb-persistence/04.99-knowledge-check.md)
* **Solutions**:
  - [Solution 04.05 · Single-Table Seeding & Optimistic Locking Transcript](../solutions/S04-dynamodb-persistence/04.05-solution.md)
* **Code Snapshot**: `reference/snapshots/s04-end/`

---

## S05 · S3 Event Notifications & ElastiCache Redis Caching (✅ Complete)

* **Directory**: [`lectures/S05-s3-caching/`](./S05-s3-caching/)
* **Lectures**:
  - [05.01 · 📖 Mechanical Sympathy: S3 Strong Consistency, Redis Memory Architecture & Cache-Aside](./S05-s3-caching/05.01-mechanical-sympathy-s3-consistency-redis-cache-aside.md)
  - [05.02 · 📇 API Card: `S3Client`, `S3Presigner` & Redis Commands](./S05-s3-caching/05.02-api-card-s3-presigner-elasticache-redis.md)
  - [05.03 · 🛠 Build: S3 Invoice Storage, Presigned URL Generator & Redis Cache-Aside Service](./S05-s3-caching/05.03-build-s3-presigner-and-redis-cache.md)
  - [05.04 · 🛠 Provisioning: S3 Bucket, Event Notifications, ElastiCache Redis in Private VPC & SAM Template](./S05-s3-caching/05.04-provisioning-s3-elasticache-vpc-sam.md)
  - [05.05 · 🎯 Your Turn: Generating Presigned Upload/Download URLs & Benchmarking Cache Hits via CLI](./S05-s3-caching/05.05-your-turn-presigned-urls-redis-cache.md)
  - [05.06 · 🧩 Live Verification: Measuring Cache Hit Ratio & S3 Request Metrics in CloudWatch](./S05-s3-caching/05.06-live-verification-cache-hit-ratio-cloudwatch.md)
  - [05.07 · 🐞 Debug Lab: Missing S3 Gateway VPC Endpoint & S3 Bucket CORS Denial](./S05-s3-caching/05.07-debug-s3-vpc-endpoint-and-cors-denial.md)
  - [05.08 · 🔓 Attack Lab: Cache Stampede (Thundering Herd) & Presigned URL Expiration Tampering](./S05-s3-caching/05.08-attack-lab-cache-stampede-and-presigned-tampering.md)
  - [05.09 · ＋ Extended: CloudFront Distribution with Origin Access Control (OAC) & Signed Cookies](./S05-s3-caching/05.09-extended-cloudfront-oac-and-signed-cookies.md)
  - [05.99 · ✅ DVA-C02 Knowledge Check: S3 Security, Presigned URLs, ElastiCache Strategies & CloudFront](./S05-s3-caching/05.99-knowledge-check.md)
* **Solutions**:
  - [Solution 05.05 · S3 Presigned URLs & Redis Cache-Aside Verification Transcript](../solutions/S05-s3-caching/05.05-solution.md)
* **Code Snapshot**: `reference/snapshots/s05-end/`

---

## S06 · Cognito Auth, Lambda Authorizers & KMS Envelope Encryption (✅ Complete)

* **Directory**: [`lectures/S06-cognito-kms/`](./S06-cognito-kms/)
* **Lectures**:
  - [06.01 · 📖 Mechanical Sympathy: OAuth2/OIDC, JWT Claims Verification & KMS Envelope Encryption Math](./S06-cognito-kms/06.01-mechanical-sympathy-oauth-jwt-kms.md)
  - [06.02 · 📇 API Card: `KmsClient.generateDataKey()`, `SecretsManagerClient` & APIGateway Authorizer Events](./S06-cognito-kms/06.02-api-card-kms-secrets-manager-authorizer-events.md)
  - [06.03 · 🛠 Build: KMS Envelope Encryption Service, Secrets Cache & JWT Lambda Authorizer](./S06-cognito-kms/06.03-build-kms-envelope-encryption-authorizer.md)
  - [06.04 · 🛠 Provisioning: Cognito User Pool, App Client, KMS CMK, Secrets Manager & SAM Authorizer](./S06-cognito-kms/06.04-provisioning-cognito-kms-secrets-sam.md)
  - [06.05 · 🎯 Your Turn: Authenticating with Cognito via CLI, Generating JWTs & Testing Authorizers](./S06-cognito-kms/06.05-your-turn-cognito-cli-jwt-authorizer.md)
  - [06.06 · 🧩 Live Verification: Auditing KMS Decrypt Calls & CloudTrail Authorization Logs](./S06-cognito-kms/06.06-live-verification-cloudtrail-kms-auth.md)
  - [06.07 · 🐞 Debug Lab: Token Use Mismatch, Authorizer Caching Collision & KMS Key Policy Denial](./S06-cognito-kms/06.07-debug-token-use-authorizer-caching-kms-policy.md)
  - [06.08 · 🔓 Attack Lab: Signature Forgery, Replay Attacks & Plaintext Key Heap Leakage](./S06-cognito-kms/06.08-attack-lab-jwt-tampering-heap-dump-leak.md)
  - [06.09 · ＋ Extended: Secrets Manager Automated Rotation with Lambda & Cognito Pre-Token Triggers](./S06-cognito-kms/06.09-extended-secrets-rotation-lambda-triggers.md)
  - [06.99 · ✅ DVA-C02 Knowledge Check: Cognito, KMS Envelope Encryption & Authorizers](./S06-cognito-kms/06.99-knowledge-check.md)
* **Solutions**:
  - [Solution 06.05 · Cognito Authentication & Lambda Authorizer CLI Walkthrough](../solutions/S06-cognito-kms/06.05-solution.md)
* **Code Snapshot**: `reference/snapshots/s06-end/`

---

## S07 · Automated CI/CD, Beanstalk & Playwright Testing (✅ Complete)

* **Directory**: [`lectures/S07-cicd-beanstalk/`](./S07-cicd-beanstalk/)
* **Lectures**:
  - [07.01 · 📖 Mechanical Sympathy: CI/CD Pipeline Topologies, Deployment Strategies & Rollback Mechanics](./S07-cicd-beanstalk/07.01-mechanical-sympathy-cicd-blue-green-canary.md)
  - [07.02 · 📇 API Card: buildspec.yml, appspec.yaml & CodeDeploy Lifecycle Hooks](./S07-cicd-beanstalk/07.02-api-card-buildspec-appspec-codedeploy-hooks.md)
  - [07.03 · 🛠 Build: CodeDeploy Pre-Traffic Canary Hook, Health Check Controller & Buildspec Pipeline](./S07-cicd-beanstalk/07.03-build-codedeploy-canary-hook-and-buildspec.md)
  - [07.04 · 🛠 Provisioning: CodePipeline, CodeBuild, CodeDeploy Deployment Group & Elastic Beanstalk SAM](./S07-cicd-beanstalk/07.04-provisioning-codepipeline-codedeploy-beanstalk-sam.md)
  - [07.05 · 🎯 Your Turn: Triggering Pipeline Executions via CLI, Observing Canary Shifting & Simulating Rollback](./S07-cicd-beanstalk/07.05-your-turn-cli-pipeline-canary-rollback.md)
  - [07.06 · 🧩 Live Verification: Monitoring Deployment Metrics & Beanstalk Enhanced Health in CloudWatch](./S07-cicd-beanstalk/07.06-live-verification-cloudwatch-beanstalk-health.md)
  - [07.07 · 🐞 Debug Lab: CodeBuild Cache Miss Latency, AppSpec Hook Timeout & Beanstalk 502 Bad Gateway](./S07-cicd-beanstalk/07.07-debug-buildspec-cache-appspec-hook-timeout.md)
  - [07.08 · 🔓 Attack Lab: Poison Pipeline Execution & Premature Canary Promotion via Tampered Health Checks](./S07-cicd-beanstalk/07.08-attack-lab-poison-pipeline-synthetic-tampering.md)
  - [07.09 · ＋ Extended: Elastic Beanstalk .ebextensions Configuration & Playwright End-to-End Test Suite](./S07-cicd-beanstalk/07.09-extended-ebextensions-playwright-testing.md)
  - [07.99 · ✅ DVA-C02 Knowledge Check: CodePipeline, CodeBuild, CodeDeploy Strategies & Beanstalk](./S07-cicd-beanstalk/07.99-knowledge-check.md)
* **Solutions**:
  - [Solution 07.05 · CodePipeline Execution & CodeDeploy Rollback Walkthrough](../solutions/S07-cicd-beanstalk/07.05-solution.md)
* **Code Snapshot**: `reference/snapshots/s07-end/`



