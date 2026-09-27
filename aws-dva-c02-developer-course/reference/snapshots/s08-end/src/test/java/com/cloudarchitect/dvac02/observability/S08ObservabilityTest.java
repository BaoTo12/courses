package com.cloudarchitect.dvac02.observability;

import com.cloudarchitect.dvac02.observability.service.CloudWatchLogsInsightsHelper;
import com.cloudarchitect.dvac02.observability.service.EmfMetricsEmitter;
import com.cloudarchitect.dvac02.observability.service.XRayTracingService;
import com.cloudarchitect.dvac02.observability.service.XRayTracingService.SubsegmentSummary;
import com.cloudarchitect.dvac02.observability.service.XRayTracingService.TraceContext;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

public class S08ObservabilityTest {

    private EmfMetricsEmitter emfEmitter;
    private XRayTracingService tracingService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        emfEmitter = new EmfMetricsEmitter("CloudOrder/Production");
        tracingService = new XRayTracingService();
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("08.03 · CloudWatch EMF: Emits Compliant Schema with Dimensions and Metrics")
    void testEmfMetricsEmitter_generatesValidJsonWithAwsMetadata() throws Exception {
        Map<String, String> dimensions = Map.of(
                "Service", "OrderCheckout",
                "Environment", "prod",
                "PaymentMethod", "CREDIT_CARD"
        );
        Map<String, Number> metrics = Map.of(
                "OrderProcessingLatencyMs", 145.2,
                "OrderSuccessCount", 1
        );
        Map<String, Object> context = Map.of(
                "OrderId", "ord-9001",
                "CustomerId", "cust-101"
        );

        String emfJson = emfEmitter.generateEmfJson(dimensions, metrics, context);

        assertThat(emfJson).isNotNull();
        JsonNode root = objectMapper.readTree(emfJson);

        // Verify _aws envelope
        JsonNode awsNode = root.get("_aws");
        assertThat(awsNode).isNotNull();
        assertThat(awsNode.get("Timestamp").asLong()).isGreaterThan(0);

        JsonNode metricDirective = awsNode.get("CloudWatchMetrics").get(0);
        assertThat(metricDirective.get("Namespace").asText()).isEqualTo("CloudOrder/Production");

        // Verify low-cardinality dimensions list
        JsonNode dimensionSets = metricDirective.get("Dimensions").get(0);
        assertThat(dimensionSets).hasSize(3);

        // Verify numeric values
        assertThat(root.get("OrderProcessingLatencyMs").asDouble()).isEqualTo(145.2);
        assertThat(root.get("OrderSuccessCount").asInt()).isEqualTo(1);
    }

    @Test
    @DisplayName("08.03 · CloudWatch EMF: Preserves High-Cardinality Metadata Outside Dimensions")
    void testEmfMetricsEmitter_preservesHighCardinalityFieldsOutsideDimensions() throws Exception {
        Map<String, String> dimensions = Map.of("Service", "OrderService");
        Map<String, Number> metrics = Map.of("LatencyMs", 50);
        Map<String, Object> context = Map.of("OrderId", "ord-12345", "UserIp", "192.168.1.1");

        String emfJson = emfEmitter.generateEmfJson(dimensions, metrics, context);
        JsonNode root = objectMapper.readTree(emfJson);

        // High cardinality fields MUST be in top-level JSON for Logs Insights
        assertThat(root.get("OrderId").asText()).isEqualTo("ord-12345");
        assertThat(root.get("UserIp").asText()).isEqualTo("192.168.1.1");

        // High cardinality fields MUST NOT be in the CloudWatchMetrics Dimensions array!
        JsonNode dimensionList = root.get("_aws").get("CloudWatchMetrics").get(0).get("Dimensions").get(0);
        for (JsonNode dim : dimensionList) {
            assertThat(dim.asText()).isNotEqualTo("OrderId");
            assertThat(dim.asText()).isNotEqualTo("UserIp");
        }
    }

    @Test
    @DisplayName("08.03 · AWS X-Ray: Parses and Formats X-Amzn-Trace-Id Headers")
    void testTraceHeaderParsingAndFormatting() {
        String rawHeader = "Root=1-5759e988-bd862e3fe1be46a994272793;Parent=53995cbe4196f34e;Sampled=1";

        TraceContext context = tracingService.parseTraceHeader(rawHeader);

        assertThat(context.rootTraceId()).isEqualTo("1-5759e988-bd862e3fe1be46a994272793");
        assertThat(context.parentId()).isEqualTo("53995cbe4196f34e");
        assertThat(context.sampled()).isTrue();

        String formatted = tracingService.formatTraceHeader(context);
        assertThat(formatted).isEqualTo(rawHeader);
    }

    @Test
    @DisplayName("08.03 · AWS X-Ray: Subsegment Execution Measures Duration & Tags Annotations")
    void testSubsegmentExecution_recordsAnnotationsAndMeasuresDuration() {
        Map<String, Object> annotations = Map.of("orderId", "ord-5001", "paymentStatus", "CONFIRMED");
        Map<String, Object> metadata = Map.of("payloadBytes", 1024, "retryAttempts", 0);

        SubsegmentSummary summary = tracingService.executeSubsegment(
                "DynamoDbPutOrder",
                () -> {
                    try {
                        Thread.sleep(20); // Simulate work
                    } catch (InterruptedException ignored) {}
                },
                annotations,
                metadata
        );

        assertThat(summary.name()).isEqualTo("DynamoDbPutOrder");
        assertThat(summary.durationMs()).isGreaterThanOrEqualTo(15);
        assertThat(summary.isFault()).isFalse();
        assertThat(summary.annotations()).containsEntry("orderId", "ord-5001");
        assertThat(summary.metadata()).containsEntry("payloadBytes", 1024);
    }

    @Test
    @DisplayName("08.03 · CloudWatch Logs Insights: Generates Valid Percentile and Cold Start Queries")
    void testLogsInsightsHelper_generatesQueriesWithValidSyntax() {
        String p95Query = CloudWatchLogsInsightsHelper.generatePercentileLatencyQuery();
        assertThat(p95Query).contains("percentile(@duration, 95)");
        assertThat(p95Query).contains("by bin(5m)");

        String coldStartQuery = CloudWatchLogsInsightsHelper.generateColdStartAnalysisQuery();
        assertThat(coldStartQuery).contains("ispresent(@initDuration)");
        assertThat(coldStartQuery).contains("avg(@initDuration)");

        String emfQuery = CloudWatchLogsInsightsHelper.generateEmfHighCardinalityQuery();
        assertThat(emfQuery).contains("filter OrderProcessingLatencyMs > 200");
    }
}
