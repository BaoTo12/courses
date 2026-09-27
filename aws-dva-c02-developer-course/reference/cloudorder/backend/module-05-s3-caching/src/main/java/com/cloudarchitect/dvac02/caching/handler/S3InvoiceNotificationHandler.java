package com.cloudarchitect.dvac02.caching.handler;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.S3Event;
import com.amazonaws.services.lambda.runtime.events.models.s3.S3EventNotification.S3EventNotificationRecord;
import com.cloudarchitect.dvac02.caching.service.OrderCacheService;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * AWS Lambda Event Handler for Amazon S3 ObjectCreated Notifications.
 * Consumes asynchronous S3 notifications, safely URL-decodes the object key,
 * extracts order metadata, and triggers cache synchronization / invalidation.
 */
public class S3InvoiceNotificationHandler implements RequestHandler<S3Event, String> {

    private static final Pattern ORDER_ID_PATTERN = Pattern.compile("invoice-([a-zA-Z0-9_-]+)\\.(pdf|json)");
    private final OrderCacheService cacheService;

    public S3InvoiceNotificationHandler() {
        this(null);
    }

    public S3InvoiceNotificationHandler(OrderCacheService cacheService) {
        this.cacheService = cacheService;
    }

    @Override
    public String handleRequest(S3Event s3Event, Context context) {
        if (s3Event == null || s3Event.getRecords() == null || s3Event.getRecords().isEmpty()) {
            return "No S3 records received";
        }

        int processedRecords = 0;

        for (S3EventNotificationRecord record : s3Event.getRecords()) {
            String eventName = record.getEventName();
            String bucket = record.getS3().getBucket().getName();
            
            // Critical DVA-C02 Gotcha: S3 Object Keys in S3Event are URL-encoded (+ for spaces, %XX for special chars)
            String rawKey = record.getS3().getObject().getKey();
            String decodedKey = URLDecoder.decode(rawKey.replace("+", "%20"), StandardCharsets.UTF_8);
            Long size = record.getS3().getObject().getSizeAsLong();
            String eTag = record.getS3().getObject().geteTag();

            System.out.printf("[S3-EVENT] Event: %s | Bucket: %s | Key: %s | Size: %d bytes | ETag: %s%n",
                    eventName, bucket, decodedKey, size != null ? size : 0, eTag);

            // Extract Order ID from invoice path if present (e.g. invoices/2026/09/invoice-ord-5001.pdf)
            Matcher matcher = ORDER_ID_PATTERN.matcher(decodedKey);
            if (matcher.find()) {
                String orderId = matcher.group(1);
                System.out.printf("[S3-EVENT] Ingested invoice for orderId: %s%n", orderId);

                // Evict cache if order cache service is wired
                if (cacheService != null) {
                    cacheService.evictOrder(orderId);
                    System.out.printf("[S3-EVENT-CACHE] Evicted cached order: %s%n", orderId);
                }
            }

            processedRecords++;
        }

        return String.format("Successfully processed %d S3 notification record(s)", processedRecords);
    }
}
