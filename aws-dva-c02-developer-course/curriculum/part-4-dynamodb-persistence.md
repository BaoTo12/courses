# Part 4: High-Performance Persistence, Single-Table Design & Caching
> DVA-C02 Domain 1 & Domain 4: Development with AWS Services & Troubleshooting (44% combined)

---

## S04 · DynamoDB Single-Table Design, GSI & Optimistic Locking

**Project Feature**: High-performance persistence backbone for CloudOrder. Relational entities (Customers, Orders, OrderItems) are modeled into a single Amazon DynamoDB table (`CloudOrderTable`) using composite primary keys (`PK`/`SK`), Global Secondary Index (`GSI1`) overloading for multi-attribute access patterns, and atomic optimistic locking (`version` conditional writes). Change Data Capture (CDC) is streamed via DynamoDB Streams.

### Lectures

| # | Type | Lecture | Track |
|---|:---:|---|:---:|
| 04.01 | 📖 | **Mechanical Sympathy: Hash-Range Partitions, RCU/WCU Math & Single-Table Design** (Physical partition splitting, 10 GB / 1,000 WCU / 3,000 RCU limits, strongly consistent vs. eventually consistent read math). | ★ |
| 04.02 | 📇 | **API Card: `DynamoDbClient`, `QueryRequest` & Optimistic Locking Expressions** (`KeyConditionExpression`, `ExpressionAttributeNames`, `attribute_exists`, conditional checks). | ★ |
| 04.03 | 🛠 | **Build: Single-Table Repository, Composite Keys & Optimistic Locking Handler** (Java 21 `OrderRepository`, `OrderEntity`, atomic version checks preventing lost updates). | ★ |
| 04.04 | 🛠 | **Provisioning: SAM Table with GSI Overloading, Streams & Raw JSON IAM** (`AWS::DynamoDB::Table`, `GSI1`, TTL, `StreamSpecification`, raw IAM least-privilege). | ★ |
| 04.05 | 🎯 | **Your Turn: Seeding Single-Table Records, Multi-Entity Querying & Testing Version Clashes** (Using AWS CLI to insert items, execute composite queries, and force `ConditionalCheckFailedException`). | ★ |
| 04.06 | 🧩 | **Live Verification: Benchmarking RCU/WCU Consumption & Throttles in CloudWatch** (`ConsumedReadCapacityUnits`, `ProvisionedThroughputExceededException`, CloudWatch metrics). | ★ |
| 04.07 | 🐞 | **Debug Lab: Reserved Keyword Collision (`#status`) & Hot Partition Bottlenecks** (Diagnosing `ValidationException: Query condition not valid`, resolving with expression attribute names). | ★ |
| 04.08 | 🔓 | **Attack Lab: Unbounded Scan DoS & Capacity Depletion vs. Efficient Index Query** (Comparing RCU consumption of `Scan` vs. `Query`, proving full-table scan vulnerability). | ★ |
| 04.09 | ＋ | **Extended: DynamoDB Streams CDC, Batch Bisection & DAX In-Memory Acceleration** (`NEW_AND_OLD_IMAGES`, `BisectBatchOnFunctionError`, microsecond read cache). | ＋ |
| 04.99 | ✅ | **DVA-C02 Knowledge Check: DynamoDB Capacity Math, Single-Table Modeling & Streams** (5 scenario questions covering RCU/WCU calculations, GSI projections, and optimistic locking). | ★ |

**Checkpoint**: `s04-end`
