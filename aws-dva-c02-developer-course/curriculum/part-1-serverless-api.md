# Part 1: Serverless Compute & Synchronous API Foundations
> DVA-C02 Domain 1: Development with AWS Services (32% of exam)

---

## S01 · API Gateway & Java 21 Lambda Deep Dive

**Project Feature**: High-velocity synchronous Order Ingestion REST API with greedy path variables (`/orders/{proxy+}`), query string filtering, CORS configuration, and raw JSON IAM execution roles.

### Lectures

| # | Type | Lecture | Track |
|---|:---:|---|:---:|
| 01.01 | 📖 | **Mechanical Sympathy: API Gateway REST vs. HTTP APIs & Lambda Execution Environments** (MicroVM cold start physics, freeze/thaw, vCPU allocation, SnapStart CRaC). | ★ |
| 01.02 | 📇 | **API Card: `RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent>`** (Payload contracts, query parameter maps, CORS header requirements). | ★ |
| 01.03 | 🛠 | **Build: Core Order Ingestion Handler with Greedy Path Variable & Query String Parsing** (Java 21, Jackson POJO deserializer, Maven shade packaging). | ★ |
| 01.04 | 🛠 | **Provisioning: SAM Template with Explicit Raw JSON IAM Policies** (Authoring `AWS::IAM::Role` without managed shortcuts; strict CloudWatch logging actions). | ★ |
| 01.05 | 🎯 | **Your Turn: Local Testing with `sam local start-api` & Guided AWS Account Deployment** (Local emulation with Docker; live deployment via `sam deploy --guided`). | ★ |
| 01.06 | 🧩 | **Live Verification: Inspecting Cold Starts & Latency in CloudWatch Logs Insights** (P50/P90/P99 duration queries, memory utilization, and init duration analysis). | ★ |
| 01.07 | 🐞 | **Debug Lab: Missing Proxy Integration Response Mapping & CORS Pre-flight `OPTIONS` Failure** (Diagnose 502 Bad Gateway and browser CORS pre-flight 403 blocks). | ★ |
| 01.08 | 🔓 | **Attack Lab: Memory Exhaustion & OOM Crash via Unbounded Greedy Proxy Ingestion** (Exploiting unvalidated JSON payloads; implementing memory defense boundaries in Java). | ★ |
| 01.09 | ＋ | **Extended: Lambda Versioning, Aliases & Weighted Canary Traffic Routing (90/10 Split)** (CloudFormation `AWS::Lambda::Alias` routing configurations and traffic shifting mechanics). | ＋ |
| 01.99 | ✅ | **DVA-C02 Knowledge Check: API Gateway Integrations & Lambda Execution Models** (5 high-yield DVA-C02 scenarios covering proxy integration, CORS, and alias routing). | ★ |

### ✅ Knowledge Check Preview
- **Concept**: Explain why allocating 1,769 MB of RAM to a Lambda function can cut billing cost compared to 512 MB for CPU-bound tasks.
- **Code Reading**: Given an `APIGatewayProxyResponseEvent`, predict the exact HTTP error code returned by API Gateway if `statusCode` is null.
- **Debugging**: An API Gateway call fails with `504 Gateway Timeout` after exactly 29 seconds while Lambda CloudWatch logs show execution completed in 31 seconds. What is the root cause?
- **Design**: When should an engineer choose an API Gateway HTTP API over a REST API?
- **Implementation**: Write the SAM YAML snippet to enable CORS headers allowing `GET, POST, OPTIONS` from any origin.

**Checkpoint**: `s01-end`
