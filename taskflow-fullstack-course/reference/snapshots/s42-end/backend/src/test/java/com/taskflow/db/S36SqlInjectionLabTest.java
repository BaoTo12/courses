package com.taskflow.db;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.zaxxer.hikari.HikariDataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.SQLSyntaxErrorException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * S36 (36.08, 36.09): the lab's claims, pinned. The VULNERABLE query below exists only in this test (and in the
 * lab branch): it is exactly what 36.08 asks you to write, run as taskflow_app against the real schema and seed.
 */
class S36SqlInjectionLabTest {

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

  /** ❌ 36.08's searchByTitle: the search text is CONCATENATED into the SQL. */
  private static List<String> vulnerableSearch(String q) throws SQLException {
    String sql = "SELECT id, title, description, status, priority, due_date, category_id, owner_id, created_at, updated_at"
        + " FROM tasks WHERE title LIKE '%" + q + "%' ORDER BY id";
    try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement();
         ResultSet rs = statement.executeQuery(sql)) {
      List<String> titles = new ArrayList<>();
      while (rs.next()) titles.add(rs.getString("title"));
      return titles;
    }
  }

  /** ✅ 36.09: the same search with a parameter (and LIKE wildcards escaped). */
  private static List<String> safeSearch(String q) throws SQLException {
    try (Connection connection = dataSource.getConnection();
         PreparedStatement statement = connection.prepareStatement("SELECT title FROM tasks WHERE title LIKE ? ESCAPE '!' ORDER BY id")) {
      statement.setString(1, "%" + q.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%");
      try (ResultSet rs = statement.executeQuery()) {
        List<String> titles = new ArrayList<>();
        while (rs.next()) titles.add(rs.getString(1));
        return titles;
      }
    }
  }

  private static int taskCount() throws SQLException {
    try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement();
         ResultSet rs = statement.executeQuery("SELECT COUNT(*) FROM tasks")) {
      rs.next();
      return rs.getInt(1);
    }
  }

  @Test
  void orTrueReturnsEveryRow() throws SQLException {
    assertEquals(taskCount(), vulnerableSearch("' OR '1'='1").size());
    assertEquals(0, safeSearch("' OR '1'='1").size());
  }

  @Test
  void unionReadsTheUsersTable() throws SQLException {
    String attack = "zzz' UNION SELECT id, CONCAT(username, ':', password_hash), '', 'TODO', 'LOW', NULL, NULL, 1, NOW(), NOW()"
        + " FROM users -- ";
    List<String> leaked = vulnerableSearch(attack);
    assertTrue(leaked.stream().anyMatch(t -> t.startsWith("admin:$2a$12$")), leaked.toString());
    assertEquals(0, safeSearch(attack).size());
  }

  @Test
  void aWrongColumnCountIsAnErrorThatTeachesTheAttacker() {
    SQLException e = assertThrows(SQLException.class, () -> vulnerableSearch("zzz' UNION SELECT username FROM users -- "));
    assertTrue(e.getMessage().contains("different number of columns"), e.getMessage());
  }

  @Test
  void stackedQueriesAreRejectedByTheDriver() throws SQLException {
    int before = taskCount();
    // Connector/J's allowMultiQueries is false by default: "; DROP TABLE …" is a syntax error, not a second statement.
    assertThrows(SQLSyntaxErrorException.class, () -> vulnerableSearch("'; DELETE FROM tasks; -- "));
    assertEquals(before, taskCount());
  }
}
