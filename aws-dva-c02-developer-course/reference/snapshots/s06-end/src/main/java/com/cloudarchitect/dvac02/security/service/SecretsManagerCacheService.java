package com.cloudarchitect.dvac02.security.service;

import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueResponse;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Enterprise Secrets Manager Cache Service.
 * Implements in-memory TTL caching for AWS Secrets Manager to reduce API calls,
 * prevent rate-limiting throttles, and eliminate per-call costs ($0.05 per 10,000 requests).
 */
public class SecretsManagerCacheService {

    private record CachedSecret(String value, Instant expiresAt) {
        boolean isExpired() {
            return Instant.now().isAfter(expiresAt);
        }
    }

    private final SecretsManagerClient secretsManagerClient;
    private final Duration cacheTtl;
    private final Map<String, CachedSecret> secretCache = new ConcurrentHashMap<>();

    private final AtomicLong apiCallCount = new AtomicLong(0);
    private final AtomicLong cacheHitCount = new AtomicLong(0);

    public SecretsManagerCacheService(SecretsManagerClient secretsManagerClient, Duration cacheTtl) {
        this.secretsManagerClient = Objects.requireNonNull(secretsManagerClient, "secretsManagerClient must not be null");
        this.cacheTtl = Objects.requireNonNull(cacheTtl, "cacheTtl must not be null");
    }

    /**
     * Retrieves secret value from cache if fresh, otherwise fetches from AWS Secrets Manager.
     */
    public String getSecret(String secretId) {
        Objects.requireNonNull(secretId, "secretId must not be null");

        CachedSecret cached = secretCache.get(secretId);
        if (cached != null && !cached.isExpired()) {
            cacheHitCount.incrementAndGet();
            return cached.value();
        }

        // Cache Miss / Expired: Invoke AWS Secrets Manager API
        apiCallCount.incrementAndGet();
        GetSecretValueRequest request = GetSecretValueRequest.builder()
                .secretId(secretId)
                .build();

        GetSecretValueResponse response = secretsManagerClient.getSecretValue(request);
        String secretString = response.secretString();

        secretCache.put(secretId, new CachedSecret(secretString, Instant.now().plus(cacheTtl)));
        return secretString;
    }

    /**
     * Invalidates a secret in cache (e.g. called upon rotation completion).
     */
    public void invalidate(String secretId) {
        secretCache.remove(secretId);
    }

    public long getApiCallCount() {
        return apiCallCount.get();
    }

    public long getCacheHitCount() {
        return cacheHitCount.get();
    }
}
