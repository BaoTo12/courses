package com.cloudarchitect.dvac02.observability.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Enterprise CloudWatch Embedded Metric Format (EMF) Emitter.
 * Formats structured high-cardinality log events complying with the AWS EMF specification.
 * Generates custom metrics asynchronously via stdout without making synchronous PutMetricData API calls,
 * while preserving high-cardinality contextual fields for CloudWatch Logs Insights.
 */
public class EmfMetricsEmitter {

    private final ObjectMapper objectMapper;
    private final String namespace;

    public EmfMetricsEmitter(String namespace) {
        this.namespace = Objects.requireNonNull(namespace, "namespace must not be null");
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    /**
     * Builds and serializes an EMF-compliant JSON payload.
     *
     * @param dimensions       Low-cardinality metric dimensions (e.g. Service, Environment, PaymentMethod)
     * @param metrics          Map of metric names to numeric values and units
     * @param contextualFields High-cardinality contextual metadata (e.g. OrderId, CustomerId, IP)
     * @return Formatted JSON string ready for stdout emission
     */
    public String generateEmfJson(
            Map<String, String> dimensions,
            Map<String, Number> metrics,
            Map<String, Object> contextualFields
    ) {
        Objects.requireNonNull(dimensions, "dimensions must not be null");
        Objects.requireNonNull(metrics, "metrics must not be null");

        Map<String, Object> root = new LinkedHashMap<>();

        // 1. Build _aws Metadata Envelope
        Map<String, Object> awsMetadata = new LinkedHashMap<>();
        awsMetadata.put("Timestamp", Instant.now().toEpochMilli());

        List<Map<String, Object>> cloudWatchMetrics = new ArrayList<>();
        Map<String, Object> metricDirective = new LinkedHashMap<>();
        metricDirective.put("Namespace", namespace);

        // Dimensions array: [["Service", "Environment", "PaymentMethod"]]
        List<List<String>> dimensionSets = new ArrayList<>();
        dimensionSets.add(new ArrayList<>(dimensions.keySet()));
        metricDirective.put("Dimensions", dimensionSets);

        // Metrics definition list
        List<Map<String, String>> metricDefinitions = new ArrayList<>();
        for (String metricName : metrics.keySet()) {
            Map<String, String> def = new LinkedHashMap<>();
            def.put("Name", metricName);
            def.put("Unit", metricName.toLowerCase().endsWith("ms") ? "Milliseconds" : "Count");
            metricDefinitions.add(def);
        }
        metricDirective.put("Metrics", metricDefinitions);

        cloudWatchMetrics.add(metricDirective);
        awsMetadata.put("CloudWatchMetrics", cloudWatchMetrics);
        root.put("_aws", awsMetadata);

        // 2. Add Low-Cardinality Dimension Values
        root.putAll(dimensions);

        // 3. Add Numeric Metric Values
        root.putAll(metrics);

        // 4. Add High-Cardinality Contextual Fields (Searchable in Logs Insights, not in Dimensions)
        if (contextualFields != null) {
            root.putAll(contextualFields);
        }

        try {
            return objectMapper.writeValueAsString(root);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize EMF payload", e);
        }
    }

    /**
     * Emits the EMF payload directly to stdout for CloudWatch Logs daemon ingestion.
     */
    public void emit(Map<String, String> dimensions, Map<String, Number> metrics, Map<String, Object> contextualFields) {
        String json = generateEmfJson(dimensions, metrics, contextualFields);
        System.out.println(json);
    }

    public String getNamespace() {
        return namespace;
    }
}
