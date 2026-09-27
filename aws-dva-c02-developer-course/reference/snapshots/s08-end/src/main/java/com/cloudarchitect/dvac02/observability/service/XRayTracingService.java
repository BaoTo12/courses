package com.cloudarchitect.dvac02.observability.service;

import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Enterprise AWS X-Ray Distributed Tracing Service.
 * Encapsulates X-Amzn-Trace-Id header propagation, trace context parsing,
 * subsegment timing, and strict separation between indexed Annotations and non-indexed Metadata.
 */
public class XRayTracingService {

    public record TraceContext(
            String rootTraceId,
            String parentId,
            boolean sampled
    ) {}

    public record SubsegmentSummary(
            String name,
            long durationMs,
            boolean isFault,
            Map<String, Object> annotations,
            Map<String, Object> metadata
    ) {}

    private static final Pattern ROOT_PATTERN = Pattern.compile("Root=([^;]+)");
    private static final Pattern PARENT_PATTERN = Pattern.compile("Parent=([^;]+)");
    private static final Pattern SAMPLED_PATTERN = Pattern.compile("Sampled=([01])");

    /**
     * Parses the incoming HTTP 'X-Amzn-Trace-Id' header into structured TraceContext.
     */
    public TraceContext parseTraceHeader(String traceHeader) {
        if (traceHeader == null || traceHeader.isBlank()) {
            return new TraceContext("unknown", null, false);
        }

        String root = null;
        String parent = null;
        boolean sampled = false;

        Matcher rootMatcher = ROOT_PATTERN.matcher(traceHeader);
        if (rootMatcher.find()) {
            root = rootMatcher.group(1);
        }

        Matcher parentMatcher = PARENT_PATTERN.matcher(traceHeader);
        if (parentMatcher.find()) {
            parent = parentMatcher.group(1);
        }

        Matcher sampledMatcher = SAMPLED_PATTERN.matcher(traceHeader);
        if (sampledMatcher.find()) {
            sampled = "1".equals(sampledMatcher.group(1));
        }

        return new TraceContext(root != null ? root : "unknown", parent, sampled);
    }

    /**
     * Serializes a TraceContext back into the standard HTTP 'X-Amzn-Trace-Id' header format.
     */
    public String formatTraceHeader(TraceContext context) {
        Objects.requireNonNull(context, "context must not be null");
        StringBuilder sb = new StringBuilder();
        sb.append("Root=").append(context.rootTraceId());
        if (context.parentId() != null) {
            sb.append(";Parent=").append(context.parentId());
        }
        sb.append(";Sampled=").append(context.sampled() ? "1" : "0");
        return sb.toString();
    }

    /**
     * Measures an operation, generating a subsegment with indexed annotations and non-indexed metadata.
     */
    public SubsegmentSummary executeSubsegment(
            String name,
            Runnable operation,
            Map<String, Object> annotations,
            Map<String, Object> metadata
    ) {
        Objects.requireNonNull(name, "name must not be null");
        Objects.requireNonNull(operation, "operation must not be null");

        long start = System.currentTimeMillis();
        boolean fault = false;

        try {
            operation.run();
        } catch (Exception e) {
            fault = true;
            throw e;
        } finally {
            long duration = System.currentTimeMillis() - start;
            System.out.printf("[XRAY-SUBSEGMENT] Name: %s | Duration: %d ms | Fault: %s | Annotations: %s%n",
                    name, duration, fault, annotations != null ? annotations : Collections.emptyMap());
        }

        return new SubsegmentSummary(
                name,
                System.currentTimeMillis() - start,
                fault,
                annotations != null ? new HashMap<>(annotations) : Collections.emptyMap(),
                metadata != null ? new HashMap<>(metadata) : Collections.emptyMap()
        );
    }
}
