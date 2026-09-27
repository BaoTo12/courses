package com.cloudarchitect.dvac02.caching.service;

import com.cloudarchitect.dvac02.caching.model.CachedOrder;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.lettuce.core.RedisClient;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.api.sync.RedisCommands;

import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;

/**
 * Enterprise ElastiCache Redis Service implementing the Cache-Aside (Lazy-Loading) pattern.
 * Caches serialized Order entities with explicit TTL expiration to offload DynamoDB read partitions
 * and provide sub-millisecond query responses.
 */
public class OrderCacheService {

    private static final String KEY_PREFIX = "order:";
    private final RedisCommands<String, String> redisCommands;
    private final ObjectMapper objectMapper;

    private final AtomicLong cacheHits = new AtomicLong(0);
    private final AtomicLong cacheMisses = new AtomicLong(0);

    public OrderCacheService(RedisCommands<String, String> redisCommands, ObjectMapper objectMapper) {
        this.redisCommands = Objects.requireNonNull(redisCommands, "redisCommands must not be null");
        this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper must not be null");
    }

    /**
     * Factory constructor connecting to an ElastiCache Redis cluster via Lettuce.
     */
    public static OrderCacheService createFromEndpoint(String host, int port) {
        String uri = String.format("redis://%s:%d", host, port);
        RedisClient client = RedisClient.create(uri);
        StatefulRedisConnection<String, String> connection = client.connect();
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        return new OrderCacheService(connection.sync(), mapper);
    }

    /**
     * Cache-Aside (Lazy-Loading) Order Fetcher.
     * 1. Query ElastiCache Redis for key "order:{orderId}".
     * 2. Cache HIT: Deserialize JSON and return cached entity immediately (sub-millisecond).
     * 3. Cache MISS: Query underlying database fallback supplier, populate Redis with TTL, and return entity.
     *
     * @param orderId    Unique order identifier
     * @param dbFallback Database query supplier invoked only on cache miss
     * @param ttlSeconds Time-to-live expiration in seconds
     * @return Optional containing Order if found in cache or DB
     */
    public Optional<CachedOrder> getOrder(String orderId, Supplier<Optional<CachedOrder>> dbFallback, long ttlSeconds) {
        Objects.requireNonNull(orderId, "orderId must not be null");
        String cacheKey = KEY_PREFIX + orderId;

        // 1. Check Redis Cache
        String cachedJson = redisCommands.get(cacheKey);
        if (cachedJson != null && !cachedJson.isBlank()) {
            cacheHits.incrementAndGet();
            try {
                CachedOrder order = objectMapper.readValue(cachedJson, CachedOrder.class);
                return Optional.of(order);
            } catch (JsonProcessingException e) {
                // Invalidate corrupted cache entry
                redisCommands.del(cacheKey);
            }
        }

        // 2. Cache Miss - Query Source of Truth
        cacheMisses.incrementAndGet();
        Optional<CachedOrder> dbResult = dbFallback.get();

        // 3. Populate Cache with TTL
        dbResult.ifPresent(order -> putOrder(order, ttlSeconds));

        return dbResult;
    }

    /**
     * Saves or overwrites an order in Redis with a specified TTL.
     */
    public void putOrder(CachedOrder order, long ttlSeconds) {
        Objects.requireNonNull(order, "order must not be null");
        String cacheKey = KEY_PREFIX + order.orderId();
        try {
            String json = objectMapper.writeValueAsString(order);
            redisCommands.setex(cacheKey, ttlSeconds, json);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize CachedOrder for Redis key: " + cacheKey, e);
        }
    }

    /**
     * Cache Invalidation: Evicts the order from Redis on update/cancellation.
     */
    public void evictOrder(String orderId) {
        Objects.requireNonNull(orderId, "orderId must not be null");
        String cacheKey = KEY_PREFIX + orderId;
        redisCommands.del(cacheKey);
    }

    public long getCacheHits() {
        return cacheHits.get();
    }

    public long getCacheMisses() {
        return cacheMisses.get();
    }

    /**
     * Computes the Cache Hit Ratio for CloudWatch metric reporting.
     */
    public double getCacheHitRatio() {
        long hits = cacheHits.get();
        long total = hits + cacheMisses.get();
        if (total == 0) {
            return 0.0;
        }
        return (double) hits / total;
    }
}
