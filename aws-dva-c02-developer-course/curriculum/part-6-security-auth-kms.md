# Part 6: Identity Federation, API Gateway Authorization & Cryptographic Envelope Encryption
> DVA-C02 Domain 1 & Domain 2: Development with AWS Services & Security (58% combined)

---

## S06 · Cognito Auth, Lambda Authorizers & KMS Envelope Encryption

**Project Feature**: Authentication, authorization, and cryptographic envelope encryption security suite for CloudOrder. User authentication is managed via Amazon Cognito User Pools, issuing RS256-signed JWTs (Access Tokens, ID Tokens, and Refresh Tokens). API Gateway routes are protected using high-performance Java 21 Lambda Custom Authorizers that validate JWT claims, token usage (`token_use`), and issue least-privilege IAM authorization policies (`Allow`/`Deny`) with principal context caching. Sensitive customer payment instruments (credit card tokens, billing details) are protected using AWS KMS Envelope Encryption (`GenerateDataKey` with AES-256-GCM), ensuring plaintext data keys never touch persistent storage and are wiped from JVM heap memory. Third-party payment credentials are dynamically fetched and cached in-memory via AWS Secrets Manager.

### Lectures

| # | Type | Lecture | Track |
|---|:---:|---|:---:|
| 06.01 | 📖 | **Mechanical Sympathy: OAuth2/OIDC, JWT Claims Verification & KMS Envelope Encryption Math** (User Pools vs. Identity Pools, Access vs. ID tokens, JWKS public keys, KMS master keys vs. data keys, AES-GCM auth tags). | ★ |
| 06.02 | 📇 | **API Card: `KmsClient.generateDataKey()`, `SecretsManagerClient` & APIGateway Authorizer Events** (`DataKeySpec.AES_256`, zeroing byte arrays, `GetSecretValueRequest`, `AuthPolicyBuilder`). | ★ |
| 06.03 | 🛠 | **Build: KMS Envelope Encryption Service, Secrets Cache & JWT Lambda Authorizer** (Java 21 `KmsEnvelopeEncryptionService`, `SecretsManagerCacheService`, and `CognitoJwtAuthorizerHandler`). | ★ |
| 06.04 | 🛠 | **Provisioning: Cognito User Pool, App Client, KMS CMK, Secrets Manager & SAM Authorizer** (`AWS::Cognito::UserPool`, `AWS::KMS::Key`, `AWS::SecretsManager::Secret`, API Gateway `TOKEN` Authorizer, raw JSON IAM). | ★ |
| 06.05 | 🎯 | **Your Turn: Authenticating with Cognito via CLI, Generating JWTs & Testing Authorizer Policies** (Using AWS CLI to initiate auth, obtaining JWTs, calling authorized endpoints, and inspecting IAM policies). | ★ |
| 06.06 | 🧩 | **Live Verification: Auditing KMS Decrypt Calls & CloudTrail Authorization Logs** (`kms:Decrypt` invocation metrics, CloudTrail `AccessDenied` events, authorizer latency in CloudWatch). | ★ |
| 06.07 | 🐞 | **Debug Lab: Token Use Mismatch (`id` vs. `access`), Authorizer Caching Black Hole & KMS CMK Key Policy Denial** (Resolving 401 Unauthorized, authorizer policy caching collisions across different methods, and missing KMS key policy grants). | ★ |
| 06.08 | 🔓 | **Attack Lab: Signature Forgery (`alg: none`), Replay Attacks & Plaintext Data Key Heap Leakage** (Exploiting unverified JWTs, replay past expiration, memory dumping byte arrays vs. String immutability). | ★ |
| 06.09 | ＋ | **Extended: Secrets Manager Automated Rotation with Lambda & Cognito Pre-Token Generation Triggers** (Zero-downtime secret rotation schedule, injecting custom claims into JWT tokens via Lambda triggers). | ＋ |
| 06.99 | ✅ | **DVA-C02 Knowledge Check: Cognito Tokens, Authorizer Caching, KMS Envelope Encryption & Secrets Manager** (5 scenario questions covering token verification, authorizer TTL caching, and KMS key policies). | ★ |

**Checkpoint**: `s06-end`
