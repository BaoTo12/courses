# Part 5: Object Storage, Caching Tiers & Content Delivery
> DVA-C02 Domain 1, Domain 2 & Domain 4: Development with AWS Services, Security & Troubleshooting

---

## S05 · S3 Event Notifications & ElastiCache Redis Caching

**Project Feature**: Object storage and distributed in-memory caching backbone for CloudOrder. PDF/JSON customer invoices and static receipts are stored in private Amazon S3 buckets with SSE-KMS encryption and delivered securely via time-limited S3 Presigned URLs (`S3Presigner`). Object creations trigger asynchronous `S3Event` notifications to Lambda for invoice indexing. A high-throughput ElastiCache Redis caching cluster deployed across private VPC subnets implements the Cache-Aside (Lazy-Loading) pattern with Time-To-Live (TTL) expiration, dropping DynamoDB read load and delivering sub-millisecond query latencies. Amazon S3 Gateway VPC Endpoints eliminate internet NAT Gateway charges, while CloudFront with Origin Access Control (OAC) protects public web delivery.

### Lectures

| # | Type | Lecture | Track |
|---|:---:|---|:---:|
| 05.01 | 📖 | **Mechanical Sympathy: S3 Strong Read-After-Write Consistency, Redis Memory Architecture & Cache-Aside Semantics** (S3 flat namespace and partition hash prefixes, PUT/DELETE consistency model, Redis single-threaded event loop, Cache-Aside vs. Write-Through, TTL jitter). | ★ |
| 05.02 | 📇 | **API Card: `S3Client`, `S3Presigner` & ElastiCache Redis Commands** (`presignGetObject`, `presignPutObject`, signature V4 duration constraints, Redis `GET`/`SETEX`/`DEL`, connection pooling). | ★ |
| 05.03 | 🛠 | **Build: S3 Invoice Storage, Presigned URL Generator & Redis Cache-Aside Service** (Java 21 `InvoiceStorageService`, `S3Presigner`, `OrderCacheService` with TTL, and `S3InvoiceNotificationHandler` event consumer). | ★ |
| 05.04 | 🛠 | **Provisioning: S3 Bucket, Event Notifications, ElastiCache Redis in Private VPC & SAM Template** (`AWS::S3::Bucket`, `AWS::ElastiCache::CacheCluster`, VPC private subnets, S3 Gateway VPC Endpoint, raw JSON IAM). | ★ |
| 05.05 | 🎯 | **Your Turn: Generating Presigned Upload/Download URLs & Benchmarking Cache Hits via CLI** (Using AWS CLI to generate and curl presigned URLs, inspecting Redis keys with `redis-cli`, validating TTL expiry). | ★ |
| 05.06 | 🧩 | **Live Verification: Measuring Cache Hit Ratio & S3 Request Metrics in CloudWatch** (`CacheHits`, `CacheMisses`, `EngineCPUUtilization`, S3 4xx/5xx metrics, CloudWatch alarms). | ★ |
| 05.07 | 🐞 | **Debug Lab: Missing S3 Gateway VPC Endpoint & S3 Bucket CORS Signature Mismatch** (Diagnosing Lambda connection timeouts to S3 inside private VPC, resolving CORS pre-flight HTTP 403 errors). | ★ |
| 05.08 | 🔓 | **Attack Lab: Cache Stampede (Thundering Herd) & Presigned URL Expiration Tampering** (Simulating concurrent cache invalidation storm, testing manipulated SigV4 timestamps and expired signatures). | ★ |
| 05.09 | ＋ | **Extended: CloudFront Distribution with Origin Access Control (OAC) & Signed URLs vs. Signed Cookies** (Migrating from legacy OAI to modern OAC, serving private assets, multi-file media distribution). | ＋ |
| 05.99 | ✅ | **DVA-C02 Knowledge Check: S3 Security, Presigned URLs, ElastiCache Strategies & CloudFront** (5 scenario questions covering SigV4 URL limits, Cache-Aside cache stampede mitigation, VPC endpoints, and OAC). | ★ |

**Checkpoint**: `s05-end`
