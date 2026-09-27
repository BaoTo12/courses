package com.cloudarchitect.dvac02.security.model;

import java.util.Arrays;
import java.util.Objects;

/**
 * Encapsulates an envelope-encrypted payload.
 * Plaintext data is encrypted using AES-GCM-256 with a unique Data Encryption Key (DEK).
 * The DEK itself is encrypted under an AWS KMS Customer Master Key (CMK).
 */
public record EncryptedPayload(
        byte[] ciphertext,
        byte[] encryptedDataKey,
        byte[] iv,
        String kmsKeyId
) {
    public EncryptedPayload {
        Objects.requireNonNull(ciphertext, "ciphertext must not be null");
        Objects.requireNonNull(encryptedDataKey, "encryptedDataKey must not be null");
        Objects.requireNonNull(iv, "iv must not be null");
        Objects.requireNonNull(kmsKeyId, "kmsKeyId must not be null");
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof EncryptedPayload that)) return false;
        return Arrays.equals(ciphertext, that.ciphertext) &&
                Arrays.equals(encryptedDataKey, that.encryptedDataKey) &&
                Arrays.equals(iv, that.iv) &&
                Objects.equals(kmsKeyId, that.kmsKeyId);
    }

    @Override
    public int hashCode() {
        int result = Objects.hash(kmsKeyId);
        result = 31 * result + Arrays.hashCode(ciphertext);
        result = 31 * result + Arrays.hashCode(encryptedDataKey);
        result = 31 * result + Arrays.hashCode(iv);
        return result;
    }
}
