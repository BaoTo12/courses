package com.cloudarchitect.dvac02.security;

import com.amazonaws.services.lambda.runtime.events.APIGatewayCustomAuthorizerEvent;
import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.cloudarchitect.dvac02.security.handler.CognitoJwtAuthorizerHandler;
import com.cloudarchitect.dvac02.security.model.AuthPolicyResponse;
import com.cloudarchitect.dvac02.security.model.EncryptedPayload;
import com.cloudarchitect.dvac02.security.service.KmsEnvelopeEncryptionService;
import com.cloudarchitect.dvac02.security.service.SecretsManagerCacheService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.kms.KmsClient;
import software.amazon.awssdk.services.kms.model.DataKeySpec;
import software.amazon.awssdk.services.kms.model.DecryptRequest;
import software.amazon.awssdk.services.kms.model.DecryptResponse;
import software.amazon.awssdk.services.kms.model.GenerateDataKeyRequest;
import software.amazon.awssdk.services.kms.model.GenerateDataKeyResponse;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueResponse;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class S06AuthSecurityTest {

    private static final String KMS_KEY_ID = "arn:aws:kms:us-east-1:123456789012:key/test-cmk-id";
    private static final String COGNITO_USER_POOL_ID = "us-east-1_TestPool123";
    private static final String COGNITO_CLIENT_ID = "6abcdef123456789example";
    private static final String COGNITO_ISSUER = "https://cognito-idp.us-east-1.amazonaws.com/" + COGNITO_USER_POOL_ID;

    @Mock
    private KmsClient kmsClient;

    @Mock
    private SecretsManagerClient secretsManagerClient;

    private KmsEnvelopeEncryptionService kmsEnvelopeService;
    private SecretsManagerCacheService secretsCacheService;
    private CognitoJwtAuthorizerHandler authorizerHandler;

    @BeforeEach
    void setUp() {
        kmsEnvelopeService = new KmsEnvelopeEncryptionService(kmsClient);
        secretsCacheService = new SecretsManagerCacheService(secretsManagerClient, Duration.ofMinutes(5));
        authorizerHandler = new CognitoJwtAuthorizerHandler(COGNITO_ISSUER, COGNITO_CLIENT_ID);
    }

    @Test
    @DisplayName("06.03 · KMS Envelope Encryption Round-Trip with AES-256-GCM")
    void testKmsEnvelopeEncryption_encryptsAndDecryptsSuccessfully() {
        byte[] rawPlaintext = "pan=4111222233334444;exp=12/28;cvv=987".getBytes(StandardCharsets.UTF_8);
        byte[] staticDekBytes = new byte[32]; // 256-bit key
        new SecureRandom().nextBytes(staticDekBytes);
        byte[] encryptedDekBytes = "encrypted-dek-blob-xyz".getBytes(StandardCharsets.UTF_8);

        // 1. Mock KMS GenerateDataKey
        when(kmsClient.generateDataKey(any(GenerateDataKeyRequest.class)))
                .thenAnswer(inv -> GenerateDataKeyResponse.builder()
                        .keyId(KMS_KEY_ID)
                        .plaintext(SdkBytes.fromByteArray(staticDekBytes.clone()))
                        .ciphertextBlob(SdkBytes.fromByteArray(encryptedDekBytes))
                        .build());

        EncryptedPayload encryptedPayload = kmsEnvelopeService.encrypt(rawPlaintext, KMS_KEY_ID);

        assertThat(encryptedPayload).isNotNull();
        assertThat(encryptedPayload.ciphertext()).isNotEqualTo(rawPlaintext);
        assertThat(encryptedPayload.iv()).hasSize(12); // 12-byte GCM IV
        assertThat(encryptedPayload.encryptedDataKey()).isEqualTo(encryptedDekBytes);

        // 2. Mock KMS Decrypt
        when(kmsClient.decrypt(any(DecryptRequest.class)))
                .thenAnswer(inv -> DecryptResponse.builder()
                        .keyId(KMS_KEY_ID)
                        .plaintext(SdkBytes.fromByteArray(staticDekBytes.clone()))
                        .build());

        byte[] decryptedBytes = kmsEnvelopeService.decrypt(encryptedPayload);

        assertThat(new String(decryptedBytes, StandardCharsets.UTF_8))
                .isEqualTo("pan=4111222233334444;exp=12/28;cvv=987");
    }

    @Test
    @DisplayName("06.03 · KMS Decryption Fails if Ciphertext or GCM Tag is Tampered")
    void testKmsEnvelopeEncryption_whenTamperedCiphertext_throwsSecurityException() {
        byte[] rawPlaintext = "sensitive-customer-record".getBytes(StandardCharsets.UTF_8);
        byte[] staticDekBytes = new byte[32];
        new SecureRandom().nextBytes(staticDekBytes);

        when(kmsClient.generateDataKey(any(GenerateDataKeyRequest.class)))
                .thenReturn(GenerateDataKeyResponse.builder()
                        .keyId(KMS_KEY_ID)
                        .plaintext(SdkBytes.fromByteArray(staticDekBytes.clone()))
                        .ciphertextBlob(SdkBytes.fromByteArray("encrypted-dek".getBytes(StandardCharsets.UTF_8)))
                        .build());

        EncryptedPayload originalPayload = kmsEnvelopeService.encrypt(rawPlaintext, KMS_KEY_ID);

        // Tamper with the ciphertext
        byte[] tamperedCiphertext = originalPayload.ciphertext().clone();
        tamperedCiphertext[0] ^= 0xFF; // Flip bits

        EncryptedPayload tamperedPayload = new EncryptedPayload(
                tamperedCiphertext,
                originalPayload.encryptedDataKey(),
                originalPayload.iv(),
                originalPayload.kmsKeyId()
        );

        when(kmsClient.decrypt(any(DecryptRequest.class)))
                .thenReturn(DecryptResponse.builder()
                        .keyId(KMS_KEY_ID)
                        .plaintext(SdkBytes.fromByteArray(staticDekBytes.clone()))
                        .build());

        assertThatThrownBy(() -> kmsEnvelopeService.decrypt(tamperedPayload))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Failed to decrypt envelope payload");
    }

    @Test
    @DisplayName("06.03 · Secrets Manager Cache: Hits In-Memory Cache and Bypasses API within TTL")
    void testSecretsManagerCache_hitsCacheWithinTtl() {
        String secretId = "cloudorder/stripe-api-key";
        String secretValue = "sk_live_51Abc123SecretKey";

        when(secretsManagerClient.getSecretValue(any(GetSecretValueRequest.class)))
                .thenReturn(GetSecretValueResponse.builder()
                        .secretString(secretValue)
                        .name(secretId)
                        .build());

        // Call 1: Cache Miss -> Calls Secrets Manager API
        String val1 = secretsCacheService.getSecret(secretId);
        assertThat(val1).isEqualTo(secretValue);
        assertThat(secretsCacheService.getApiCallCount()).isEqualTo(1);
        assertThat(secretsCacheService.getCacheHitCount()).isEqualTo(0);

        // Call 2: Cache Hit -> Returns in-memory value directly
        String val2 = secretsCacheService.getSecret(secretId);
        assertThat(val2).isEqualTo(secretValue);
        assertThat(secretsCacheService.getApiCallCount()).isEqualTo(1); // No second API call!
        assertThat(secretsCacheService.getCacheHitCount()).isEqualTo(1);

        // Explicit Invalidation (e.g. rotation trigger)
        secretsCacheService.invalidate(secretId);

        // Call 3: Cache Miss after invalidation -> Calls API again
        String val3 = secretsCacheService.getSecret(secretId);
        assertThat(val3).isEqualTo(secretValue);
        assertThat(secretsCacheService.getApiCallCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("06.03 · Lambda Authorizer: Valid JWT Returns Allow Policy with Context")
    void testCognitoAuthorizer_whenValidToken_returnsAllowPolicyWithContext() {
        Algorithm algorithm = Algorithm.HMAC256("test-signing-secret");
        String jwtToken = JWT.create()
                .withIssuer(COGNITO_ISSUER)
                .withSubject("user-sub-12345")
                .withClaim("token_use", "access")
                .withClaim("client_id", COGNITO_CLIENT_ID)
                .withClaim("custom:customerId", "cust-9001")
                .withClaim("custom:role", "ADMIN")
                .withExpiresAt(Date.from(Instant.now().plus(Duration.ofHours(1))))
                .sign(algorithm);

        APIGatewayCustomAuthorizerEvent event = new APIGatewayCustomAuthorizerEvent();
        event.setAuthorizationToken("Bearer " + jwtToken);
        event.setMethodArn("arn:aws:execute-api:us-east-1:123456789012:api-123/prod/POST/orders");

        AuthPolicyResponse response = authorizerHandler.handleRequest(event, null);

        assertThat(response).isNotNull();
        assertThat(response.principalId()).isEqualTo("user-sub-12345");
        assertThat(response.policyDocument().statement()).hasSize(1);
        assertThat(response.policyDocument().statement().get(0).effect()).isEqualTo("Allow");
        assertThat(response.policyDocument().statement().get(0).resource())
                .isEqualTo("arn:aws:execute-api:us-east-1:123456789012:api-123/prod/POST/orders");
        assertThat(response.context()).containsEntry("customerId", "cust-9001");
        assertThat(response.context()).containsEntry("role", "ADMIN");
    }

    @Test
    @DisplayName("06.03 · Lambda Authorizer: Expired JWT Returns Deny Policy")
    void testCognitoAuthorizer_whenExpiredToken_returnsDenyPolicy() {
        Algorithm algorithm = Algorithm.HMAC256("test-signing-secret");
        String expiredJwt = JWT.create()
                .withIssuer(COGNITO_ISSUER)
                .withSubject("user-sub-expired")
                .withClaim("token_use", "access")
                .withClaim("client_id", COGNITO_CLIENT_ID)
                .withExpiresAt(Date.from(Instant.now().minus(Duration.ofMinutes(10)))) // Expired!
                .sign(algorithm);

        APIGatewayCustomAuthorizerEvent event = new APIGatewayCustomAuthorizerEvent();
        event.setAuthorizationToken(expiredJwt);
        event.setMethodArn("arn:aws:execute-api:us-east-1:123456789012:api-123/prod/GET/orders");

        AuthPolicyResponse response = authorizerHandler.handleRequest(event, null);

        assertThat(response.policyDocument().statement().get(0).effect()).isEqualTo("Deny");
    }
}
