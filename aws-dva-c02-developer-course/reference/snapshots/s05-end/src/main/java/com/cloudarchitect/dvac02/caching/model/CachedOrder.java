package com.cloudarchitect.dvac02.caching.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * High-performance serialized order representation cached in Amazon ElastiCache (Redis).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CachedOrder(
        String orderId,
        String customerId,
        BigDecimal totalAmount,
        String status,
        List<String> itemIds,
        Instant cachedAt
) {
}
