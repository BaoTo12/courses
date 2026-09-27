package com.cloudarchitect.dvac02.cicd;

import com.cloudarchitect.dvac02.cicd.handler.CanaryValidationHookHandler;
import com.cloudarchitect.dvac02.cicd.health.BeanstalkHealthCheckController;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.codedeploy.CodeDeployClient;
import software.amazon.awssdk.services.codedeploy.model.LifecycleEventStatus;
import software.amazon.awssdk.services.codedeploy.model.PutLifecycleEventHookExecutionStatusRequest;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
public class S07DeploymentValidationTest {

    @Mock
    private CodeDeployClient codeDeployClient;

    @Test
    @DisplayName("07.03 · Canary Validation Hook: Successful Probe Reports SUCCEEDED to CodeDeploy")
    void testCanaryHook_whenSyntheticCheckPasses_reportsSucceeded() {
        CanaryValidationHookHandler handler = new CanaryValidationHookHandler(codeDeployClient, () -> true);

        Map<String, Object> event = Map.of(
                "DeploymentId", "d-ABC12345",
                "LifecycleEventHookExecutionId", "e-XYZ67890"
        );

        String result = handler.handleRequest(event, null);

        assertThat(result).isEqualTo("Succeeded");

        ArgumentCaptor<PutLifecycleEventHookExecutionStatusRequest> captor =
                ArgumentCaptor.forClass(PutLifecycleEventHookExecutionStatusRequest.class);
        verify(codeDeployClient).putLifecycleEventHookExecutionStatus(captor.capture());

        PutLifecycleEventHookExecutionStatusRequest captured = captor.getValue();
        assertThat(captured.deploymentId()).isEqualTo("d-ABC12345");
        assertThat(captured.lifecycleEventHookExecutionId()).isEqualTo("e-XYZ67890");
        assertThat(captured.status()).isEqualTo(LifecycleEventStatus.SUCCEEDED);
    }

    @Test
    @DisplayName("07.03 · Canary Validation Hook: Failed Probe Reports FAILED to Halt Deployment")
    void testCanaryHook_whenSyntheticCheckFails_reportsFailed() {
        CanaryValidationHookHandler handler = new CanaryValidationHookHandler(codeDeployClient, () -> false);

        Map<String, Object> event = Map.of(
                "DeploymentId", "d-FAIL9999",
                "LifecycleEventHookExecutionId", "e-HOOK8888"
        );

        String result = handler.handleRequest(event, null);

        assertThat(result).isEqualTo("Failed");

        ArgumentCaptor<PutLifecycleEventHookExecutionStatusRequest> captor =
                ArgumentCaptor.forClass(PutLifecycleEventHookExecutionStatusRequest.class);
        verify(codeDeployClient).putLifecycleEventHookExecutionStatus(captor.capture());

        assertThat(captor.getValue().status()).isEqualTo(LifecycleEventStatus.FAILED);
    }

    @Test
    @DisplayName("07.03 · Canary Validation Hook: Probe Exception Caught and Reports FAILED")
    void testCanaryHook_whenProbeThrowsException_reportsFailed() {
        CanaryValidationHookHandler handler = new CanaryValidationHookHandler(codeDeployClient, () -> {
            throw new RuntimeException("Database ping timed out on canary port 5432");
        });

        Map<String, Object> event = Map.of(
                "DeploymentId", "d-EXCP5555",
                "LifecycleEventHookExecutionId", "e-HOOK4444"
        );

        String result = handler.handleRequest(event, null);

        assertThat(result).isEqualTo("Failed");

        ArgumentCaptor<PutLifecycleEventHookExecutionStatusRequest> captor =
                ArgumentCaptor.forClass(PutLifecycleEventHookExecutionStatusRequest.class);
        verify(codeDeployClient).putLifecycleEventHookExecutionStatus(captor.capture());

        assertThat(captor.getValue().status()).isEqualTo(LifecycleEventStatus.FAILED);
    }

    @Test
    @DisplayName("07.03 · Elastic Beanstalk Health Check: Healthy Controller Returns OK Status")
    void testBeanstalkHealth_whenHealthy_producesValidOkModel() {
        BeanstalkHealthCheckController health = BeanstalkHealthCheckController.healthy("2.0.0", 3600);

        assertThat(health.status()).isEqualTo("OK");
        assertThat(health.version()).isEqualTo("2.0.0");
        assertThat(health.uptimeSeconds()).isEqualTo(3600);
        assertThat(health.subsystemStatus()).containsEntry("database", "UP");
        assertThat(health.subsystemStatus()).containsEntry("redisCache", "UP");
    }

    @Test
    @DisplayName("07.03 · Elastic Beanstalk Health Check: Degraded Controller Reports Error Reason")
    void testBeanstalkHealth_whenDegraded_reportsDegradedWithReason() {
        BeanstalkHealthCheckController health = BeanstalkHealthCheckController.degraded(
                "2.0.0",
                120,
                "Database pool exhausted"
        );

        assertThat(health.status()).isEqualTo("DEGRADED");
        assertThat(health.subsystemStatus()).containsEntry("error", "Database pool exhausted");
    }
}
