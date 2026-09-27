# Part 7: Automated CI/CD Pipelines, Zero-Downtime Deployment & Health Checks
> DVA-C02 Domain 3 & Domain 4: Deployment & Troubleshooting (42% combined)

---

## S07 · Automated CI/CD, Beanstalk & Playwright Testing

**Project Feature**: Enterprise deployment automation and continuous delivery pipeline for CloudOrder. Implements an automated CI/CD pipeline using AWS CodePipeline orchestrating source integration, AWS CodeBuild for compilable Java 21 artifacts and automated testing with caching (`buildspec.yml`), and AWS CodeDeploy for automated traffic shifting with rollback alarms (`appspec.yml`). Deploys web microservices to AWS Elastic Beanstalk using Immutable and Blue/Green deployment strategies with automated health checks (`.ebextensions`). Safety gates include automated CodeDeploy lifecycle hooks (`BeforeAllowTraffic`) executing synthetic API probes, and browser-driven end-to-end integration tests using Playwright.

### Lectures

| # | Type | Lecture | Track |
|---|:---:|---|:---:|
| 07.01 | 📖 | **Mechanical Sympathy: CI/CD Pipeline Topologies, Deployment Strategies & Rollback Mechanics** (CodePipeline phases, CodeBuild caching and artifacts, All-at-Once vs. Rolling vs. Rolling-with-Additional-Batch vs. Immutable vs. Blue/Green, CodeDeploy deployment configurations). | ★ |
| 07.02 | 📇 | **API Card: `buildspec.yml`, `appspec.yml` & CodeDeploy Lifecycle Hooks** (CodeBuild phases, environment variables, CodeDeploy `BeforeAllowTraffic`/`AfterAllowTraffic`, `PutLifecycleEventHookExecutionStatus`). | ★ |
| 07.03 | 🛠 | **Build: CodeDeploy Pre-Traffic Canary Hook, Health Check Controller & Buildspec Pipeline** (Java 21 `CanaryValidationHookHandler`, `BeanstalkHealthCheckController`, `buildspec.yml`, and `appspec.yaml`). | ★ |
| 07.04 | 🛠 | **Provisioning: CodePipeline, CodeBuild, CodeDeploy Deployment Group & Elastic Beanstalk SAM** (`AWS::CodePipeline::Pipeline`, `AWS::CodeBuild::Project`, `AWS::CodeDeploy::DeploymentGroup`, `AWS::ElasticBeanstalk::Environment`, raw JSON IAM). | ★ |
| 07.05 | 🎯 | **Your Turn: Triggering Pipeline Executions via CLI, Observing Canary Shifting & Simulating Rollback** (Using AWS CLI to trigger CodePipeline releases, tracking CodeDeploy linear traffic shifts, and forcing synthetic failures to trigger automatic rollbacks). | ★ |
| 07.06 | 🧩 | **Live Verification: Monitoring Deployment Metrics & Beanstalk Enhanced Health in CloudWatch** (CodeDeploy `DeploymentStatus`, Elastic Beanstalk `EnvironmentHealth` metrics, CloudWatch rollback alarms). | ★ |
| 07.07 | 🐞 | **Debug Lab: CodeBuild Cache Miss Latency, AppSpec Hook Execution Timeout & Beanstalk 502 Bad Gateway** (Diagnosing un-cached maven builds, hook execution timeouts, and nginx port forwarding mismatch in Beanstalk). | ★ |
| 07.08 | 🔓 | **Attack Lab: Poison Pipeline Execution & Premature Canary Promotion via Tampered Health Checks** (Injecting failing test binaries to test pipeline build gates, testing hook failure detection). | ★ |
| 07.09 | ＋ | **Extended: Elastic Beanstalk `.ebextensions` Configuration & Playwright End-to-End Test Suite** (Customizing Linux environment with `.ebextensions`, running headless Playwright browser tests in CodeBuild). | ＋ |
| 07.99 | ✅ | **DVA-C02 Knowledge Check: CodePipeline, CodeBuild, CodeDeploy Strategies & Beanstalk** (5 scenario questions covering deployment configurations, lifecycle hooks, buildspec syntax, and Beanstalk health). | ★ |

**Checkpoint**: `s07-end`
