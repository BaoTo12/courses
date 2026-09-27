package com.taskflow.db;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.mindrot.jbcrypt.BCrypt;

/**
 * S28: the PROVIDED seed data is checked, not trusted. Every demo user's bcrypt hash must match the demo password
 * documented in the file header; otherwise S41's login would fail with a confusing "invalid credentials".
 */
class SeedDataTest {

  private static final Pattern USER_ROW = Pattern.compile("\\(\\d+, '(\\w+)', '[^']+', '(\\$2a\\$12\\$[./A-Za-z0-9]{53})'");

  @Test
  void demoPasswordsMatchTheirHashes() throws IOException {
    String seed = Files.readString(Path.of("db", "03-seed.sql"), StandardCharsets.UTF_8);
    Map<String, String> hashes = new LinkedHashMap<>();
    Matcher m = USER_ROW.matcher(seed);
    while (m.find()) hashes.put(m.group(1), m.group(2));

    assertEquals(Map.of("alice", "alice123", "bob", "bob123", "admin", "admin123").keySet(), hashes.keySet());
    hashes.forEach((user, hash) -> assertTrue(BCrypt.checkpw(user + "123", hash), "hash of " + user));
  }

  @Test
  void theAppUserGetsNoSchemaRightsAndAnAppendOnlyAuditLog() throws IOException {
    String grants = Files.readString(Path.of("db", "04-grants.sql"), StandardCharsets.UTF_8);
    assertTrue(grants.contains("GRANT SELECT, INSERT ON taskflow.audit_events"));
    for (String forbidden : new String[] {"ALL PRIVILEGES", "CREATE", "DROP", "ALTER", "GRANT OPTION", "*.*"}) {
      assertTrue(!grants.replaceAll("--.*", "").contains(forbidden), "must not grant " + forbidden);
    }
  }
}
