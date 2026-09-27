# 01-setup.md: Development Environment & Tooling Setup
## AWS Certified Developer - Associate (DVA-C02) Masterclass

This course requires a real local development environment that can compile Java 21, package serverless artifacts, and deploy to your real AWS account.

---

## 1. Pinned Tool Requirements

| Tool | Required Version | Verification Command | Purpose |
|---|---|---|---|
| **Java JDK** | **21 LTS** (Oracle / OpenJDK / Corretto) | `java -version` | Compiling backend Lambda bytecode with modern language features |
| **Apache Maven** | **3.9.x+** | `mvn -v` | Build lifecycle, dependency resolution, shade packaging |
| **AWS CLI** | **2.x+** | `aws --version` | Direct AWS service interaction, credentials configuration |
| **AWS SAM CLI** | **1.120.x+** | `sam --version` | Local API Gateway emulation, CloudFormation transformation, deployment |
| **Node.js** | **20.x+ LTS** | `node -v` | Running Playwright end-to-end integration tests |
| **Docker Desktop** | Latest | `docker --version` | Emulating Lambda execution environments for `sam local` |

---

## 2. Installation & Verification Commands

### Step 1: Verify Java 21
Your machine must run Java 21:

```powershell
java -version
```
*Expected Output:*
```text
java version "21.0.9" ... (or OpenJDK 21)
```

### Step 2: Verify Apache Maven
```powershell
mvn -v
```
*Expected Output:*
```text
Apache Maven 3.9.x ...
Java version: 21.0.x
```

### Step 3: Verify AWS CLI v2
```powershell
aws --version
```
*Expected Output:*
```text
aws-cli/2.x.x Python/3.x Windows/...
```

### Step 4: Configure AWS Credentials
Ensure your local environment has active credentials configured for your real AWS account:

```powershell
aws sts get-caller-identity
```
*Expected Output:*
```json
{
    "UserId": "AIDAXXXXXXXXXXXXXXXXX",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/developer"
}
```

If not configured, run:
```powershell
aws configure
```

### Step 5: Install and Verify AWS SAM CLI
If `sam --version` is not recognized, install AWS SAM CLI using Chocolatey or the official Windows MSI installer:

```powershell
choco install aws-sam-cli
```
*Or download MSI*: [AWS SAM CLI 64-bit Windows Installer](https://github.com/aws/aws-sam-cli/releases/latest)

Verify installation:
```powershell
sam --version
```
*Expected Output:*
```text
SAM CLI, version 1.120.0 (or newer)
```

### Step 6: Verify Docker Desktop (Optional for Local Emulation)
```powershell
docker ps
```
*Required for `sam local start-api` and `sam local invoke`.*

---

## 3. Environment Sanity Check Script

Run this PowerShell command to verify your entire toolchain at once:

```powershell
Write-Host "=== CloudOrder Environment Verification ===" -ForegroundColor Cyan
try { $j = java -version 2>&1 | Select-Object -First 1; Write-Host "✓ Java: $j" -ForegroundColor Green } catch { Write-Host "✗ Java Missing" -ForegroundColor Red }
try { $m = mvn -v | Select-Object -First 1; Write-Host "✓ Maven: $m" -ForegroundColor Green } catch { Write-Host "✗ Maven Missing" -ForegroundColor Red }
try { $a = aws --version; Write-Host "✓ AWS CLI: $a" -ForegroundColor Green } catch { Write-Host "✗ AWS CLI Missing" -ForegroundColor Red }
try { $s = sam --version; Write-Host "✓ SAM CLI: $s" -ForegroundColor Green } catch { Write-Host "✗ SAM CLI Missing" -ForegroundColor Yellow }
try { $d = docker --version; Write-Host "✓ Docker: $d" -ForegroundColor Green } catch { Write-Host "! Docker Missing (Required only for local container testing)" -ForegroundColor Yellow }
```
