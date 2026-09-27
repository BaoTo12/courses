# 03-security-scope.md: Security Architecture & Attack-Lab Guidelines
## AWS Certified Developer - Associate (DVA-C02) Masterclass

---

## 1. Security Progression in This Course

Security is woven directly into every module rather than treated as an afterthought. You will follow a strict security progression:

```text
Modules 1–3: Raw, Explicit JSON IAM Policies
             ├── Hand-crafting AWS::IAM::Role resources in SAM
             ├── Defining exact Action, Effect, and Resource ARNs
             └── Bypassing managed policies to build deep mechanical understanding of least-privilege
                    │
                    ▼
Modules 4–7: Official SAM Policy Templates & Resource-Based Policies
             ├── DynamoDBCrudPolicy, SQSPollerPolicy, KMSSignPolicy
             ├── S3 Bucket Policies & KMS Key Policies
             └── Cognito User Pool Authorizers & dynamic IAM evaluation logic
```

---

## 2. DVA-C02 Security Topics Covered

| Service / Topic | Technical Focus | Core Mechanics Tested |
|---|---|---|
| **AWS SDK Credential Chain** | `DefaultCredentialsProvider` resolution order | Env vars $\to$ System props $\to$ Web Identity Token (STS/OIDC) $\to$ Profile $\to$ IMDSv2. |
| **Amazon Cognito User Pools** | Authentication (AuthN) & User Directory | JWT token hierarchy (ID, Access, Refresh tokens), custom claims, Lambda triggers. |
| **Amazon Cognito Identity Pools** | Authorization (AuthZ) & Federation | Exchanging JWTs for temporary AWS STS credentials; unauthenticated guest access. |
| **AWS KMS** | Envelope Encryption pattern | Calling `kms:GenerateDataKey`, local AES-256-GCM cipher encryption, storing ciphertext DEK. |
| **AWS Secrets Manager** | Database credentials & secret rotation | In-memory caching, rotation Lambdas, CloudFormation dynamic referencing. |
| **SSM Parameter Store** | Secure configuration management | `String` vs. `SecureString` (KMS-backed), parameter hierarchy (`/app/env/...`). |
| **IAM Policy Evaluation** | Authorization decision algorithm | Explicit DENY > Explicit ALLOW > Default DENY. |

---

## 3. The Attack-Lab Rules of Engagement (Phase 5)

Every module contains an **Attack Lab / Broken State Challenge** designed to teach defensive engineering through controlled failure:

> [!CAUTION]
> **Strict Operational Rules for Attack Labs:**
> 1. **Own Local App Only**: All attack simulations and broken-state tests MUST target ONLY your own deployed CloudFormation stack in your isolated AWS account.
> 2. **Never Target Third-Party Systems**: Never point exploit scripts, stress tools, or malformed payloads at external domains or endpoints.
> 3. **Defense-Focused**: The objective of every attack lab is to observe the failure mode, understand the vulnerability, and implement the permanent defensive fix.
