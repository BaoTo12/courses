# Reference Project: CloudOrder
## The Verified, Runnable Reference Application

---

## 1. Current State
* **Active Section**: `All Sections Complete (S01 - S08) · 37/37 Tests Passed`
* **Compilable Code**:
  - `reference/cloudorder/backend/module-01-serverless-api/` (✅ BUILD SUCCESS - 3/3 tests)
  - `reference/cloudorder/backend/module-02-fanout-queues/` (✅ BUILD SUCCESS - 3/3 tests)
  - `reference/cloudorder/backend/module-03-step-functions/` (✅ BUILD SUCCESS - 5/5 tests)
  - `reference/cloudorder/backend/module-04-dynamodb-persistence/` (✅ BUILD SUCCESS - 5/5 tests)
  - `reference/cloudorder/backend/module-05-s3-caching/` (✅ BUILD SUCCESS - 6/6 tests)
  - `reference/cloudorder/backend/module-06-auth-security/` (✅ BUILD SUCCESS - 5/5 tests)
  - `reference/cloudorder/backend/module-07-cicd-beanstalk/` (✅ BUILD SUCCESS - 5/5 tests)
  - `reference/cloudorder/backend/module-08-observability-xray/` (✅ BUILD SUCCESS - 5/5 tests)
* **Snapshots**:
  - [`snapshots/s01-end/`](./snapshots/s01-end/): State of backend code at completion of Section 1.
  - [`snapshots/s02-end/`](./snapshots/s02-end/): State of backend code at completion of Section 2.
  - [`snapshots/s03-end/`](./snapshots/s03-end/): State of backend code at completion of Section 3.
  - [`snapshots/s04-end/`](./snapshots/s04-end/): State of backend code at completion of Section 4.
  - [`snapshots/s05-end/`](./snapshots/s05-end/): State of backend code at completion of Section 5.
  - [`snapshots/s06-end/`](./snapshots/s06-end/): State of backend code at completion of Section 6.
  - [`snapshots/s07-end/`](./snapshots/s07-end/): State of backend code at completion of Section 7.
  - [`snapshots/s08-end/`](./snapshots/s08-end/): State of backend code at completion of Section 8.

---

## 2. Test Verification Matrix

| Lecture / Milestone | Verifying Test / Class | What It Asserts |
|---|---|---|
| **01.03** | `S01OrderApiHandlerTest.testCreateOrder_whenValidPayload_returns201Created` | Parses `{proxy+}` greedy path, extracts query parameters, and serializes `OrderResponse` JSON. |
| **01.03** | `S01OrderApiHandlerTest.testCorsPreflightOptions_returns200OkWithCorsHeaders` | Asserts pre-flight OPTIONS request returns 200 with CORS headers (`Access-Control-Allow-Origin: *`). |
| **01.07** | `S01OrderApiHandlerTest.testMalformedJson_returns400BadRequest` | Asserts malformed JSON payloads are caught by error boundaries returning 400 instead of crashing. |
| **01.04** | `template.yaml` (Module 01) | AWS SAM template with raw JSON IAM execution role and API Gateway proxy event routing. |
| **02.03** | `S02BillingQueueProcessorTest.testBillingProcessor_WithValidOrders_ProcessesAllSuccessfully` | Batch of valid orders processed with 0 failures reported. |
| **02.03** | `S02BillingQueueProcessorTest.testBillingProcessor_WithPoisonPill_ReportsOnlyFailedItem` | Isolates failed `messageId` into `SQSBatchResponse.batchItemFailures` without rolling back healthy orders. |
| **02.03** | `S02BillingQueueProcessorTest.testBillingProcessor_WithSnsWrappedEvent_UnwrapsEnvelopeCorrectly` | Unwraps escaped SNS JSON envelope (`"Message"` field) and deserializes inner `OrderEvent`. |
| **02.04** | `template.yaml` (Module 02) | AWS SAM template declaring SNS topic, SQS queues, filter policies, DLQ redrive, and SQS QueuePolicy. |
| **03.03** | `S03OrderCheckoutSagaTest.testReserveInventory_whenValidItems_reservesSuccessfully` | Reserves warehouse inventory and generates `reservationId`. |
| **03.03** | `S03OrderCheckoutSagaTest.testReserveInventory_whenItemOutOfStock_throwsException` | Throws `InventoryUnavailableException` when items are out of stock. |
| **03.03** | `S03OrderCheckoutSagaTest.testProcessPayment_whenValidAmount_completesSuccessfully` | Authorizes credit card and assigns `paymentId`. |
| **03.03** | `S03OrderCheckoutSagaTest.testProcessPayment_whenFailPaymentFlagTrue_throwsPaymentDeclinedException` | Throws `PaymentDeclinedException` on failed payment trigger. |
| **03.03** | `S03OrderCheckoutSagaTest.testSagaCompensatingTransaction_executesRollbackSuccessfully` | Verifies end-to-end Saga rollback: releases reserved inventory when payment fails. |
| **03.04** | `template.yaml` (Module 03) | AWS SAM template with `AWS::Serverless::StateMachine`, ASL Retry/Catch, and JSONPath data flow. |
| **04.03** | `S04OrderRepositoryTest.testPutAndGetOrder_persistsAndRetrievesCorrectly` | Persists single-table entity with composite hash and range keys and retrieves via strongly consistent read. |
| **04.03** | `S04OrderRepositoryTest.testOptimisticLocking_whenVersionMatches_updatesSuccessfully` | Increments version number atomically when expected version matches item state. |
| **04.03** | `S04OrderRepositoryTest.testOptimisticLocking_whenVersionMismatch_throwsConditionalCheckFailed` | Protects from lost updates by throwing `ConditionalCheckFailedException` when version does not match. |
| **04.03** | `S04OrderRepositoryTest.testQueryOrdersByCustomer_returnsCustomerOrderList` | Queries composite `PK = CUST#<id>` with `begins_with(SK, "ORDER#")`. |
| **04.09** | `S04OrderRepositoryTest.testOrderStreamProcessor_handlesModifyEventAndExtractsNewImage` | Parses DynamoDB CDC stream records, extracts `NEW_AND_OLD_IMAGES`, and detects status transitions. |
| **04.04** | `template.yaml` (Module 04) | AWS SAM template with `AWS::DynamoDB::Table`, overloaded `GSI1`, TTL specification, and least-privilege IAM. |
| **05.03** | `S05S3CachingTest.testGeneratePresignedDownloadUrl_returnsValidSigV4Url` | Generates SigV4 presigned download URL with `X-Amz-Expires=900` and cryptographic signature parameters. |
| **05.03** | `S05S3CachingTest.testGeneratePresignedUploadUrl_returnsValidPutPresignedUrl` | Generates presigned PUT URL enforcing `Content-Type: application/pdf` constraint. |
| **05.03** | `S05S3CachingTest.testUploadInvoiceDocument_enforcesServerSideEncryption` | Directly uploads invoice document via `s3Client.putObject` asserting `AES256` Server-Side Encryption. |
| **05.03** | `S05S3CachingTest.testCacheAside_onMissQueriesDbAndSetsTtl_onHitReturnsCachedWithoutDb` | Verifies Cache-Aside pattern: cache miss queries DB fallback and populates Redis with TTL; cache hit bypasses DB. |
| **05.03** | `S05S3CachingTest.testEvictOrder_invokesRedisDel` | Asserts explicit cache invalidation deletes key from Redis. |
| **05.03** | `S05S3CachingTest.testS3InvoiceNotificationHandler_decodesKeyAndEvictsCache` | Parses `S3Event` notification, URL-decodes object key, and triggers Redis cache eviction. |
| **05.04** | `template.yaml` (Module 05) | AWS SAM template provisioning S3 bucket, ElastiCache Redis in private VPC, S3 Gateway VPC Endpoint, and raw IAM. |
| **06.03** | `S06AuthSecurityTest.testKmsEnvelopeEncryption_encryptsAndDecryptsSuccessfully` | Executes client-side AES-256-GCM envelope encryption using KMS `GenerateDataKey` and round-trip `Decrypt`. |
| **06.03** | `S06AuthSecurityTest.testKmsEnvelopeEncryption_whenTamperedCiphertext_throwsSecurityException` | Asserts AES-GCM 128-bit authentication tag detects bit flipping and throws integrity exception. |
| **06.03** | `S06AuthSecurityTest.testSecretsManagerCache_hitsCacheWithinTtl` | Bypasses AWS Secrets Manager API on repeated lookups within 5-minute TTL; triggers API on cache invalidation. |
| **06.03** | `S06AuthSecurityTest.testCognitoAuthorizer_whenValidToken_returnsAllowPolicyWithContext` | Validates RS256 token claims (`iss`, `token_use: access`, `client_id`, `exp`) and emits IAM `Allow` policy with context. |
| **06.03** | `S06AuthSecurityTest.testCognitoAuthorizer_whenExpiredToken_returnsDenyPolicy` | Detects expired tokens and generates explicit IAM `Deny` policy. |
| **06.04** | `template.yaml` (Module 06) | AWS SAM template declaring Cognito User Pool, App Client, KMS CMK with key rotation, Secrets Manager, and Authorizer. |
| **07.03** | `S07DeploymentValidationTest.testCanaryHook_whenSyntheticCheckPasses_reportsSucceeded` | Executes synthetic probe; calls `putLifecycleEventHookExecutionStatus(SUCCEEDED)` allowing traffic shift. |
| **07.03** | `S07DeploymentValidationTest.testCanaryHook_whenSyntheticCheckFails_reportsFailed` | Detects failed probe; calls `putLifecycleEventHookExecutionStatus(FAILED)` triggering automated rollback. |
| **07.03** | `S07DeploymentValidationTest.testCanaryHook_whenProbeThrowsException_reportsFailed` | Traps runtime exception during probe and signals `FAILED` to CodeDeploy. |
| **07.03** | `S07DeploymentValidationTest.testBeanstalkHealth_whenHealthy_producesValidOkModel` | Produces structured Elastic Beanstalk `/health` check response reporting status `OK` with subsystem health. |
| **07.03** | `S07DeploymentValidationTest.testBeanstalkHealth_whenDegraded_reportsDegradedWithReason` | Reports `DEGRADED` status with exact failure diagnostic. |
| **07.04** | `template.yaml` (Module 07) | SAM template declaring CodeBuild, CodeDeploy Canary deployment group with automated rollback, and Beanstalk. |
| **08.03** | `S08ObservabilityTest.testEmfMetricsEmitter_generatesValidEmfJson` | Generates valid Embedded Metric Format JSON adhering to `_aws` root directive schema and dimension constraints. |
| **08.03** | `S08ObservabilityTest.testEmfMetricsEmitter_preservesHighCardinalityContextAtRoot` | Asserts high-cardinality keys (`OrderId`, `CustomerId`) stay at root JSON level, preventing metric dimension explosion. |
| **08.03** | `S08ObservabilityTest.testXRayTracingService_formatsAndParsesTraceHeaderCorrectly` | Formats and parses `X-Amzn-Trace-Id` headers with `Root`, `Parent`, and `Sampled` flags. |
| **08.03** | `S08ObservabilityTest.testXRayTracingService_executesTracedBlockAndRecordsTime` | Verifies execution of traced code blocks with subsegment start, end, duration timing, and error handling. |
| **08.03** | `S08ObservabilityTest.testCloudWatchLogsInsightsHelper_generatesCorrectP95LatencyQuery` | Synthesizes statistical Logs Insights query calculating P50, P90, and P95 latency percentiles. |
| **08.04** | `template.yaml` (Module 08) | AWS SAM template declaring active tracing, X-Ray sampling rules, log metric filters, and CloudWatch Composite Alarms. |

