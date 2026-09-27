package com.taskflow.security;

import org.mindrot.jbcrypt.BCrypt;

/**
 * PROVIDED (S41, explained in 41.06): password hashing with BCrypt (jBCrypt).
 *   - hash(): a new random SALT each time, then 2^12 rounds (cost 12, ~0.25 s): slow on purpose, so guessing is slow.
 *     The result "$2a$12$<22-char salt><31-char hash>" stores the algorithm, the cost and the salt with the hash.
 *   - matches(): re-hashes the candidate with the salt and cost read from the stored hash, compares.
 *   - burnTime(): the same work for an unknown username, so the response time doesn't reveal whether it exists (41.14).
 */
public final class PasswordHasher {

  private static final int COST = 12;
  private static final String DUMMY_HASH = BCrypt.hashpw("no-such-user-dummy-password", BCrypt.gensalt(COST));

  public String hash(String password) {
    return BCrypt.hashpw(password, BCrypt.gensalt(COST));
  }

  public boolean matches(String password, String storedHash) {
    try {
      return BCrypt.checkpw(password, storedHash);
    } catch (IllegalArgumentException malformedHash) {
      return false;
    }
  }

  public void burnTime(String password) {
    BCrypt.checkpw(password, DUMMY_HASH);
  }
}
