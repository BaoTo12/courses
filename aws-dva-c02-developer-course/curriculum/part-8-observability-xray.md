# Part 8: Distributed Tracing, High-Cardinality Metrics & Observability Tuning
> DVA-C02 Domain 1 & Domain 4: Development with AWS Services & Troubleshooting (50% combined)

---

## S08 · Distributed Tracing & CloudWatch Observability Tuning

**Project Feature**: Enterprise observability, distributed tracing, and high-cardinality telemetry suite for CloudOrder. Implements end-to-end distributed tracing across API Gateway, Lambda, Step Functions, DynamoDB, SQS, and S3 using AWS X-Ray with active tracing, subsegments, indexed annotations, and metadata payloads. Replaces costly and synchronous `PutMetricData` API calls with the CloudWatch Embedded Metric Format (EMF), generating custom metrics asynchronously via stdout while preserving high-cardinality contextual metadata for CloudWatch Logs Insights forensic queries. Configures CloudWatch Metric Filters, P90/P99 latency dashboards, and Composite Alarms to prevent alert fatigue.

### Lectures

| # | Type | Lecture | Track |
|---|:---:|---|:---:|
| 08.01 | 📖 | **Mechanical Sympathy: Distributed Tracing Protocols, Sampling Math & Embedded Metric Format** (`X-Amzn-Trace-Id` propagation, sampling rules [reservoir vs. fixed rate], X-Ray daemon UDP 2000, PutMetricData costs vs. EMF asynchronous generation, Annotations vs. Metadata). | ★ |
| 08.02 | 📇 | **API Card: AWS X-Ray SDK, Subsegments & CloudWatch EMF Specification** (`AWSXRay.beginSubsegment()`, `putAnnotation()`, `putMetadata()`, EMF JSON root schema, MetricDirective). | ★ |
| 08.03 | 🛠 | **Build: High-Cardinality EMF Metrics Emitter, Trace Context Propagator & Insights Query Generator** (Java 21 `EmfMetricsEmitter`, `XRayTracingService`, and `CloudWatchLogsInsightsHelper`). | ★ |
| 08.04 | 🛠 | **Provisioning: Active Tracing, Sampling Rules, Metric Filters & Composite Alarms SAM** (`Tracing: Active`, `AWS::XRay::SamplingRule`, CloudWatch Metric Filter, `AWS::CloudWatch::CompositeAlarm`, raw JSON IAM). | ★ |
| 08.05 | 🎯 | **Your Turn: Generating Distributed Traces, Querying CloudWatch Logs Insights & Triggering Composite Alarms** (Generating end-to-end traces via curl, executing P95/P99 latency queries in Logs Insights, and testing composite alarm boolean state). | ★ |
| 08.06 | 🧩 | **Live Verification: Inspecting Service Maps, Subsegment Latencies & EMF Metric Dashboards** (X-Ray Service Map dependency graphs, bottleneck detection, EMF CloudWatch metric graphing). | ★ |
| 08.07 | 🐞 | **Debug Lab: Missing Subsegment in Multi-Threaded Execution & High-Cardinality Metric Filter Explosion** (Resolving un-propagated X-Ray trace context across worker threads, and preventing metric explosion using EMF dimensions). | ★ |
| 08.08 | 🔓 | **Attack Lab: Trace Injection Tampering & Metric Denial-of-Service via High-Volume Logging** (Testing forged trace IDs, measuring logging throughput limits, and cost optimization). | ★ |
| 08.09 | ＋ | **Extended: AWS Distro for OpenTelemetry (ADOT) & Application Signals Integration** (Migrating to OpenTelemetry standards, automatic instrumentation, and Service Level Objectives [SLOs]). | ＋ |
| 08.99 | ✅ | **DVA-C02 Knowledge Check: AWS X-Ray, CloudWatch EMF, Logs Insights & Alarms** (5 scenario questions covering X-Ray sampling rules, annotations vs. metadata, EMF syntax, and composite alarms). | ★ |

**Checkpoint**: `s08-end`
