package com.cloudarchitect.dvac02.caching.service;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;
import software.amazon.awssdk.services.s3.model.ServerSideEncryption;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.util.Map;
import java.util.Objects;

/**
 * Enterprise S3 Document Storage Service for CloudOrder Invoices.
 * Encapsulates direct S3 uploads with Server-Side Encryption (SSE-S3 / SSE-KMS)
 * and generates time-limited SigV4 Presigned URLs for secure client-side upload and download.
 */
public class InvoiceStorageService {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final String bucketName;

    public InvoiceStorageService(S3Client s3Client, S3Presigner s3Presigner, String bucketName) {
        this.s3Client = Objects.requireNonNull(s3Client, "s3Client must not be null");
        this.s3Presigner = Objects.requireNonNull(s3Presigner, "s3Presigner must not be null");
        this.bucketName = Objects.requireNonNull(bucketName, "bucketName must not be null");
    }

    /**
     * Generates a time-limited AWS SigV4 Presigned URL allowing authorized clients
     * to download invoice documents directly from S3 without passing bytes through Lambda.
     *
     * @param objectKey S3 object key (e.g., "invoices/2026/09/invoice-ord-5001.pdf")
     * @param duration  Time-to-live for the signed URL before expiration
     * @return Complete HTTPS presigned URL with SigV4 query authentication parameters
     */
    public String generatePresignedDownloadUrl(String objectKey, Duration duration) {
        Objects.requireNonNull(objectKey, "objectKey must not be null");
        Objects.requireNonNull(duration, "duration must not be null");

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(duration)
                .getObjectRequest(getObjectRequest)
                .build();

        PresignedGetObjectRequest presigned = s3Presigner.presignGetObject(presignRequest);
        return presigned.url().toString();
    }

    /**
     * Generates a time-limited AWS SigV4 Presigned URL allowing clients
     * to upload invoice attachments directly to S3 with strict Content-Type enforcement.
     *
     * @param objectKey   Target S3 key
     * @param contentType Required MIME type (e.g. "application/pdf")
     * @param duration    Signature validity window
     * @return Complete HTTPS presigned PUT URL
     */
    public String generatePresignedUploadUrl(String objectKey, String contentType, Duration duration) {
        Objects.requireNonNull(objectKey, "objectKey must not be null");
        Objects.requireNonNull(contentType, "contentType must not be null");
        Objects.requireNonNull(duration, "duration must not be null");

        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(duration)
                .putObjectRequest(putObjectRequest)
                .build();

        PresignedPutObjectRequest presigned = s3Presigner.presignPutObject(presignRequest);
        return presigned.url().toString();
    }

    /**
     * Server-side invoice upload using S3Client with default Server-Side Encryption (AES256).
     */
    public PutObjectResponse uploadInvoiceDocument(String objectKey, byte[] data, String contentType, Map<String, String> metadata) {
        Objects.requireNonNull(objectKey, "objectKey must not be null");
        Objects.requireNonNull(data, "data must not be null");

        PutObjectRequest.Builder requestBuilder = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .contentType(contentType != null ? contentType : "application/pdf")
                .serverSideEncryption(ServerSideEncryption.AES256);

        if (metadata != null && !metadata.isEmpty()) {
            requestBuilder.metadata(metadata);
        }

        return s3Client.putObject(requestBuilder.build(), RequestBody.fromBytes(data));
    }

    public String getBucketName() {
        return bucketName;
    }
}
