package com.cloudarchitect.dvac02.observability.service;

/**
 * Helper generating production CloudWatch Logs Insights query expressions.
 */
public class CloudWatchLogsInsightsHelper {

    /**
     * Query calculating P50, P90, P95, and P99 execution latency over 5-minute bins.
     */
    public static String generatePercentileLatencyQuery() {
        return """
                filter @type = "REPORT"
                | stats percentile(@duration, 50) as p50,
                        percentile(@duration, 90) as p90,
                        percentile(@duration, 95) as p95,
                        percentile(@duration, 99) as p99
                  by bin(5m)
                """;
    }

    /**
     * Query isolating Lambda cold starts by checking for the presence of '@initDuration'.
     */
    public static String generateColdStartAnalysisQuery() {
        return """
                filter @type = "REPORT"
                | filter ispresent(@initDuration)
                | stats count(*) as coldStarts,
                        avg(@initDuration) as avgInitDurationMs,
                        max(@initDuration) as maxInitDurationMs
                  by bin(15m)
                """;
    }

    /**
     * Query extracting high-cardinality order metadata from Embedded Metric Format logs.
     */
    public static String generateEmfHighCardinalityQuery() {
        return """
                fields @timestamp, Service, Environment, PaymentMethod, OrderProcessingLatencyMs, OrderId, CustomerId
                | filter ispresent(OrderProcessingLatencyMs)
                | filter OrderProcessingLatencyMs > 200
                | sort @timestamp desc
                | limit 50
                """;
    }
}
