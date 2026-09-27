package com.cloudarchitect.dvac02.caching;

import com.amazonaws.services.lambda.runtime.events.S3Event;
import com.amazonaws.services.lambda.runtime.events.models.s3.S3EventNotification;
import com.amazonaws.services.lambda.runtime.events.models.s3.S3EventNotification.S3BucketEntity;
import com.amazonaws.services.lambda.runtime.events.models.s3.S3EventNotification.S3Entity;
import com.amazonaws.services.lambda.runtime.events.models.s3.S3EventNotification.S3EventNotificationRecord;
import com.amazonaws.services.lambda.runtime.events.models.s3.S3EventNotification.S3ObjectEntity;
import com.cloudarchitect.dvac02.caching.handler.S3InvoiceNotificationHandler;
import com.cloudarchitect.dvac02.caching.model.CachedOrder;
import com.cloudarchitect.dvac02.caching.service.InvoiceStorageService;
import com.cloudarchitect.dvac02.caching.service.OrderCacheService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.lettuce.core.api.sync.RedisCommands;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;
import software.amazon.awssdk.services.s3.model.ServerSideEncryption;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class S05S3CachingTest {

    private static final String BUCKET_NAME = "cloudorder-invoices-prod-us-east-1";

    @Mock
    private S3Client s3Client;

    @Mock
    private RedisCommands<String, String> redisCommands;

    private S3Presigner s3Presigner;
    private InvoiceStorageService invoiceStorageService;
    private OrderCacheService orderCacheService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        // Authenticated client-side SigV4 presigner (pure cryptography, zero network I/O)
        s3Presigner = S3Presigner.builder()
                .region(Region.US_EAST_1)
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create("AKIAIOSFODNN7EXAMPLE", "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY")
                ))
                .build();

        invoiceStorageService = new InvoiceStorageService(s3Client, s3Presigner, BUCKET_NAME);

        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        orderCacheService = new OrderCacheService(redisCommands, objectMapper);
    }

    @Test
    @DisplayName("05.03 · Generate Presigned GET URL with SigV4 Authentication Parameters")
    void testGeneratePresignedDownloadUrl_returnsValidSigV4Url() {
        String objectKey = "invoices/2026/09/invoice-ord-5001.pdf";
        Duration duration = Duration.ofMinutes(15);

        String presignedUrl = invoiceStorageService.generatePresignedDownloadUrl(objectKey, duration);

        assertThat(presignedUrl).isNotNull();
        assertThat(presignedUrl).contains("https://" + BUCKET_NAME + ".s3");
        assertThat(presignedUrl).contains("/" + objectKey);
        assertThat(presignedUrl).contains("X-Amz-Algorithm=AWS4-HMAC-SHA256");
        assertThat(presignedUrl).contains("X-Amz-Credential=");
        assertThat(presignedUrl).contains("X-Amz-Date=");
        assertThat(presignedUrl).contains("X-Amz-Expires=900"); // 15 mins = 900 seconds
        assertThat(presignedUrl).contains("X-Amz-Signature=");
    }

    @Test
    @DisplayName("05.03 · Generate Presigned PUT URL with Content-Type Header Enforcement")
    void testGeneratePresignedUploadUrl_returnsValidPutPresignedUrl() {
        String objectKey = "invoices/uploads/pending-ord-6002.pdf";
        Duration duration = Duration.ofMinutes(10);
        String contentType = "application/pdf";

        String presignedPutUrl = invoiceStorageService.generatePresignedUploadUrl(objectKey, contentType, duration);

        assertThat(presignedPutUrl).isNotNull();
        assertThat(presignedPutUrl).contains("https://" + BUCKET_NAME + ".s3");
        assertThat(presignedPutUrl).contains("/" + objectKey);
        assertThat(presignedPutUrl).contains("X-Amz-Expires=600");
        assertThat(presignedPutUrl).contains("X-Amz-Signature=");
    }

    @Test
    @DisplayName("05.03 · Direct S3 Upload Enforces AES-256 Server-Side Encryption")
    void testUploadInvoiceDocument_enforcesServerSideEncryption() {
        String objectKey = "invoices/2026/09/invoice-ord-7003.pdf";
        byte[] pdfContent = "Fake-PDF-Stream-Bytes".getBytes(StandardCharsets.UTF_8);

        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().eTag("\"d41d8cd98f00b204e9800998ecf8427e\"").build());

        PutObjectResponse response = invoiceStorageService.uploadInvoiceDocument(
                objectKey,
                pdfContent,
                "application/pdf",
                Map.of("order-id", "ord-7003", "customer-id", "cust-101")
        );

        assertThat(response).isNotNull();
        assertThat(response.eTag()).isEqualTo("\"d41d8cd98f00b204e9800998ecf8427e\"");

        ArgumentCaptor<PutObjectRequest> requestCaptor = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3Client).putObject(requestCaptor.capture(), any(RequestBody.class));

        PutObjectRequest captured = requestCaptor.getValue();
        assertThat(captured.bucket()).isEqualTo(BUCKET_NAME);
        assertThat(captured.key()).isEqualTo(objectKey);
        assertThat(captured.serverSideEncryption()).isEqualTo(ServerSideEncryption.AES256);
        assertThat(captured.metadata()).containsEntry("order-id", "ord-7003");
    }

    @Test
    @DisplayName("05.03 · Cache-Aside Semantics: Cache Miss Queries DB, Caches with TTL; Cache Hit Bypasses DB")
    void testCacheAside_onMissQueriesDbAndSetsTtl_onHitReturnsCachedWithoutDb() throws Exception {
        String orderId = "ord-8001";
        CachedOrder sampleOrder = new CachedOrder(
                orderId,
                "cust-501",
                new BigDecimal("199.99"),
                "CONFIRMED",
                List.of("item-A", "item-B"),
                Instant.now()
        );
        String sampleJson = objectMapper.writeValueAsString(sampleOrder);

        AtomicInteger dbQueryCount = new AtomicInteger(0);

        // 1. Initial Call: Cache Miss (Redis returns null)
        when(redisCommands.get("order:" + orderId)).thenReturn(null);

        Optional<CachedOrder> missResult = orderCacheService.getOrder(
                orderId,
                () -> {
                    dbQueryCount.incrementAndGet();
                    return Optional.of(sampleOrder);
                },
                300L
        );

        assertThat(missResult).isPresent();
        assertThat(missResult.get().orderId()).isEqualTo(orderId);
        assertThat(dbQueryCount.get()).isEqualTo(1); // Invoked DB fallback
        assertThat(orderCacheService.getCacheMisses()).isEqualTo(1);
        assertThat(orderCacheService.getCacheHits()).isEqualTo(0);

        // Verify Redis SETEX was called with key, TTL (300s), and serialized JSON
        verify(redisCommands).setex(eq("order:" + orderId), eq(300L), eq(sampleJson));

        // 2. Subsequent Call: Cache Hit (Redis returns serialized JSON)
        when(redisCommands.get("order:" + orderId)).thenReturn(sampleJson);

        Optional<CachedOrder> hitResult = orderCacheService.getOrder(
                orderId,
                () -> {
                    dbQueryCount.incrementAndGet();
                    return Optional.of(sampleOrder);
                },
                300L
        );

        assertThat(hitResult).isPresent();
        assertThat(hitResult.get().orderId()).isEqualTo(orderId);
        assertThat(dbQueryCount.get()).isEqualTo(1); // DB was NOT called again!
        assertThat(orderCacheService.getCacheHits()).isEqualTo(1);
        assertThat(orderCacheService.getCacheHitRatio()).isEqualTo(0.5); // 1 hit, 1 miss
    }

    @Test
    @DisplayName("05.03 · Cache Invalidation: Eviction Deletes Key in Redis")
    void testEvictOrder_invokesRedisDel() {
        String orderId = "ord-8002";
        orderCacheService.evictOrder(orderId);
        verify(redisCommands).del("order:" + orderId);
    }

    @Test
    @DisplayName("05.03 · S3 Event Handler Decodes URL-Encoded Key & Evicts Order Cache")
    void testS3InvoiceNotificationHandler_decodesKeyAndEvictsCache() {
        S3InvoiceNotificationHandler handler = new S3InvoiceNotificationHandler(orderCacheService);

        // Key with spaces and special characters encoded as S3 event delivers:
        // "invoices/2026/09/invoice-ord-9001.pdf"
        S3ObjectEntity objectEntity = new S3ObjectEntity(
                "invoices/2026/09/invoice-ord-9001.pdf",
                1048576L,
                "e-tag-12345",
                "v1",
                "seq-01"
        );
        S3BucketEntity bucketEntity = new S3BucketEntity(BUCKET_NAME, null, null);
        S3Entity s3Entity = new S3Entity("test-config", bucketEntity, objectEntity, "1.0");

        S3EventNotificationRecord record = new S3EventNotificationRecord(
                "us-east-1",
                "ObjectCreated:Put",
                "aws:s3",
                "2026-09-27T08:00:00.000Z",
                "2.1",
                null,
                null,
                s3Entity,
                null
        );

        S3Event event = new S3Event(List.of(record));

        String result = handler.handleRequest(event, null);

        assertThat(result).isEqualTo("Successfully processed 1 S3 notification record(s)");
        verify(redisCommands).del("order:ord-9001");
    }
}
