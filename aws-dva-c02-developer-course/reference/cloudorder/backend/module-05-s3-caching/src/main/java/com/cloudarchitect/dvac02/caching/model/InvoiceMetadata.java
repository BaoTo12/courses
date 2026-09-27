package com.cloudarchitect.dvac02.caching.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

/**
 * Metadata record for customer invoice documents stored in Amazon S3.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record InvoiceMetadata(
        String orderId,
        String customerId,
        String s3Bucket,
        String s3Key,
        String contentType,
        long contentLengthBytes,
        String eTag,
        Instant uploadedAt,
        String downloadUrl
) {
}
