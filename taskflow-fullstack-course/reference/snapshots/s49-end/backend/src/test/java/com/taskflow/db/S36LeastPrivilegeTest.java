package com.taskflow.db;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.zaxxer.hikari.HikariDataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * S36 (36.10): what the application's database user (taskflow_app, db/04-grants.sql) can and can't do, checked
 * against a real MySQL. This is what an attacker gets after a successful SQL injection: exactly these rights.
 */
class S36LeastPrivilegeTest {

  private static final int ACCESS_DENIED_FOR_TABLE = 1142; // ER_TABLEACCESS_DENIED_ERROR

  private static HikariDataSource dataSource;

  @BeforeAll
  static void connect() {
    TestDatabase.start();
    dataSource = DataSourceProvider.create();
  }

  @AfterAll
  static void close() {
    dataSource.close();
  }

  private static void execute(String sql) throws SQLException {
    try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement()) {
      statement.execute(sql);
    }
  }

  private static void assertDenied(String sql) {
    SQLException e = assertThrows(SQLException.class, () -> execute(sql), sql);
    assertEquals(ACCESS_DENIED_FOR_TABLE, e.getErrorCode(), e.getMessage());
  }

  @Test
  void theSchemaIsReadOnlyForTheApp() {
    assertDenied("DROP TABLE comments");
    assertDenied("CREATE TABLE stolen (id INT)");
    assertDenied("ALTER TABLE tasks ADD COLUMN x INT");
  }

  @Test
  void theAuditLogIsAppendOnly() throws SQLException {
    execute("INSERT INTO audit_events (type, username, ip) VALUES ('TEST', NULL, '127.0.0.1')");
    assertDenied("UPDATE audit_events SET details = 'covered my tracks'");
    assertDenied("DELETE FROM audit_events");
  }

  @Test
  void otherDatabasesAreOutOfReach() {
    assertDenied("SELECT user, authentication_string FROM mysql.user");
  }

  @Test
  void butEverythingInTheAppsTablesIsReadable() throws SQLException { // 36.10: least privilege limits, it doesn't prevent
    try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement();
         ResultSet rs = statement.executeQuery("SELECT password_hash FROM users WHERE username = 'admin'")) {
      assertTrue(rs.next());
      assertTrue(rs.getString(1).startsWith("$2a$12$"));
    }
  }

  @Test
  void utf8mb4SurvivesTheRoundTrip() throws SQLException { // S28 (28.07): utf8mb4, not MySQL's 3-byte "utf8"
    try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement();
         ResultSet rs = statement.executeQuery("SELECT 'Việt Nam 🚀' AS text, @@character_set_database, @@collation_database")) {
      rs.next();
      assertEquals("Việt Nam 🚀", rs.getString(1));
      assertEquals("utf8mb4", rs.getString(2));
      assertEquals("utf8mb4_0900_ai_ci", rs.getString(3));
    }
  }
}
