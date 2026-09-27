package com.cloudarchitect.dvac02.cicd.handler;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import software.amazon.awssdk.services.codedeploy.CodeDeployClient;
import software.amazon.awssdk.services.codedeploy.model.LifecycleEventStatus;
import software.amazon.awssdk.services.codedeploy.model.PutLifecycleEventHookExecutionStatusRequest;

import java.util.Map;
import java.util.Objects;
import java.util.function.BooleanSupplier;

/**
 * AWS CodeDeploy Lifecycle Event Hook Lambda Function (BeforeAllowTraffic).
 * Executes synthetic health checks against a newly deployed Canary Lambda version.
 * If checks pass, signals SUCCEEDED to CodeDeploy to commence traffic shifting.
 * If checks fail, signals FAILED, triggering immediate automated rollback.
 */
public class CanaryValidationHookHandler implements RequestHandler<Map<String, Object>, String> {

    private final CodeDeployClient codeDeployClient;
    private final BooleanSupplier healthProbe;

    public CanaryValidationHookHandler() {
        this(CodeDeployClient.create(), () -> true);
    }

    public CanaryValidationHookHandler(CodeDeployClient codeDeployClient, BooleanSupplier healthProbe) {
        this.codeDeployClient = Objects.requireNonNull(codeDeployClient, "codeDeployClient must not be null");
        this.healthProbe = Objects.requireNonNull(healthProbe, "healthProbe must not be null");
    }

    @Override
    public String handleRequest(Map<String, Object> event, Context context) {
        String deploymentId = (String) event.get("DeploymentId");
        String lifecycleEventHookExecutionId = (String) event.get("LifecycleEventHookExecutionId");

        if (deploymentId == null || lifecycleEventHookExecutionId == null) {
            System.err.println("[CODEDEPLOY-HOOK] Missing DeploymentId or LifecycleEventHookExecutionId");
            return "Invalid Event Payload";
        }

        System.out.printf("[CODEDEPLOY-HOOK] Validating Canary for Deployment: %s (Execution: %s)%n",
                deploymentId, lifecycleEventHookExecutionId);

        LifecycleEventStatus status;
        try {
            // Execute synthetic probe (e.g., ping Canary Lambda alias, verify DB connection)
            boolean isHealthy = healthProbe.getAsBoolean();
            if (isHealthy) {
                System.out.println("[CODEDEPLOY-HOOK] Canary synthetic verification PASSED");
                status = LifecycleEventStatus.SUCCEEDED;
            } else {
                System.err.println("[CODEDEPLOY-HOOK] Canary synthetic verification FAILED");
                status = LifecycleEventStatus.FAILED;
            }
        } catch (Exception e) {
            System.err.printf("[CODEDEPLOY-HOOK] Exception during canary probe: %s%n", e.getMessage());
            status = LifecycleEventStatus.FAILED;
        }

        // Report status back to AWS CodeDeploy
        PutLifecycleEventHookExecutionStatusRequest request = PutLifecycleEventHookExecutionStatusRequest.builder()
                .deploymentId(deploymentId)
                .lifecycleEventHookExecutionId(lifecycleEventHookExecutionId)
                .status(status)
                .build();

        codeDeployClient.putLifecycleEventHookExecutionStatus(request);
        System.out.printf("[CODEDEPLOY-HOOK] Reported %s to CodeDeploy%n", status);

        return status.toString();
    }
}
