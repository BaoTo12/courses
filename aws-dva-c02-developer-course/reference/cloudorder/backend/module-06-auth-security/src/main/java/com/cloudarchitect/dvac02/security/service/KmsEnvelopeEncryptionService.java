package com.cloudarchitect.dvac02.security.service;

import com.cloudarchitect.dvac02.security.model.EncryptedPayload;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.kms.KmsClient;
import software.amazon.awssdk.services.kms.model.DataKeySpec;
import software.amazon.awssdk.services.kms.model.DecryptRequest;
import software.amazon.awssdk.services.kms.model.DecryptResponse;
import software.amazon.awssdk.services.kms.model.GenerateDataKeyRequest;
import software.amazon.awssdk.services.kms.model.GenerateDataKeyResponse;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Objects;

/**
 * Enterprise AWS KMS Envelope Encryption Service.
 * Implements client-side AES-256-GCM authenticated encryption using KMS-generated Data Encryption Keys (DEKs).
 * Ensures zero plaintext data key retention in JVM memory by zeroing out byte arrays.
 */
public class KmsEnvelopeEncryptionService {

    private static final String AES_ALGORITHM = "AES";
    private static final String CIPHER_TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final int GCM_IV_LENGTH_BYTES = 12;

    private final KmsClient kmsClient;
    private final SecureRandom secureRandom;

    public KmsEnvelopeEncryptionService(KmsClient kmsClient) {
        this.kmsClient = Objects.requireNonNull(kmsClient, "kmsClient must not be null");
        this.secureRandom = new SecureRandom();
    }

    /**
     * Encrypts plaintext data using AWS KMS Envelope Encryption:
     * 1. Calls KMS GenerateDataKey to obtain a plaintext DEK and an encrypted DEK.
     * 2. Encrypts plaintext data locally using AES-256-GCM with a random 12-byte IV.
     * 3. Wipes the plaintext DEK byte array from memory immediately.
     * 4. Returns EncryptedPayload containing ciphertext, encrypted DEK, IV, and Key ID.
     */
    public EncryptedPayload encrypt(byte[] plaintext, String kmsKeyId) {
        Objects.requireNonNull(plaintext, "plaintext must not be null");
        Objects.requireNonNull(kmsKeyId, "kmsKeyId must not be null");

        // 1. Request a 256-bit AES Data Encryption Key from AWS KMS
        GenerateDataKeyRequest request = GenerateDataKeyRequest.builder()
                .keyId(kmsKeyId)
                .keySpec(DataKeySpec.AES_256)
                .build();

        GenerateDataKeyResponse response = kmsClient.generateDataKey(request);

        byte[] plaintextDek = response.plaintext().asByteArray();
        byte[] encryptedDek = response.ciphertextBlob().asByteArray();
        byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
        secureRandom.nextBytes(iv);

        byte[] ciphertext;
        try {
            SecretKey secretKey = new SecretKeySpec(plaintextDek, AES_ALGORITHM);
            Cipher cipher = Cipher.getInstance(CIPHER_TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
            ciphertext = cipher.doFinal(plaintext);
        } catch (GeneralSecurityException e) {
            throw new RuntimeException("Failed to envelope encrypt payload", e);
        } finally {
            // Critical Security Invariant: Zero out plaintext key material from JVM heap
            Arrays.fill(plaintextDek, (byte) 0);
        }

        return new EncryptedPayload(ciphertext, encryptedDek, iv, kmsKeyId);
    }

    /**
     * Decrypts an envelope-encrypted payload:
     * 1. Sends the encrypted DEK to AWS KMS for decryption.
     * 2. Uses the decrypted plaintext DEK and IV to decrypt ciphertext locally via AES-GCM.
     * 3. Wipes the plaintext DEK byte array from memory immediately.
     * 4. Returns original plaintext bytes.
     */
    public byte[] decrypt(EncryptedPayload payload) {
        Objects.requireNonNull(payload, "payload must not be null");

        // 1. Request KMS to decrypt the Data Encryption Key
        DecryptRequest decryptRequest = DecryptRequest.builder()
                .ciphertextBlob(SdkBytes.fromByteArray(payload.encryptedDataKey()))
                .keyId(payload.kmsKeyId())
                .build();

        DecryptResponse decryptResponse = kmsClient.decrypt(decryptRequest);
        byte[] plaintextDek = decryptResponse.plaintext().asByteArray();

        try {
            SecretKey secretKey = new SecretKeySpec(plaintextDek, AES_ALGORITHM);
            Cipher cipher = Cipher.getInstance(CIPHER_TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, payload.iv()));
            return cipher.doFinal(payload.ciphertext());
        } catch (GeneralSecurityException e) {
            throw new RuntimeException("Failed to decrypt envelope payload (integrity or tag verification failed)", e);
        } finally {
            // Wipe plaintext DEK from memory
            Arrays.fill(plaintextDek, (byte) 0);
        }
    }
}
