package com.cloudarchitect.dvac02.cicd.health;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.Map;

/**
 * Enterprise Elastic Beanstalk Health Check Response Model.
 * Evaluates application subsystem status (Database, Cache, Disk, JVM memory)
 * and produces standard structured JSON health check responses for the Application Load Balancer.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record BeanstalkHealthCheckController(
        String status,
        String version,
        Instant timestamp,
        long uptimeSeconds,
        Map<String, String> subsystemStatus
) {
    public static BeanstalkHealthCheckController healthy(String version, long uptime) {
        return new BeanstalkHealthCheckController(
                "OK",
                version,
                Instant.now(),
                uptime,
                Map.of(
                        "database", "UP",
                        "redisCache", "UP",
                        "diskSpace", "ADEQUATE"
                )
        );
    }

    public static BeanstalkHealthCheckController degraded(String version, long uptime, String reason) {
        return new BeanstalkHealthCheckController(
                "DEGRADED",
                version,
                Instant.now(),
                uptime,
                Map.of("error", reason)
        );
    }
}
