package com.taskflow.db;

import org.testcontainers.mysql.MySQLContainer;
import org.testcontainers.utility.MountableFile;

/**
 * PROVIDED test support (S36): ONE real MySQL 8.4 for the whole test run, in Docker (Testcontainers).
 * Initialised exactly like docker-compose (28.09): db/01 → 04 from /docker-entrypoint-initdb.d, utf8mb4, UTC.
 * The application connects as taskflow_app (least privilege, 36.10), never as root: the grants are tested too.
 * The container is removed when the JVM exits. Requires Docker to be running.
 */
public final class TestDatabase {

  private static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.4")
      .withCopyFileToContainer(MountableFile.forHostPath("db"), "/docker-entrypoint-initdb.d")
      .withEnv("TZ", "UTC")
      .withCommand("--character-set-server=utf8mb4", "--collation-server=utf8mb4_0900_ai_ci");

  private static boolean started;

  private TestDatabase() {}

  /** Starts the database once, and points DataSourceProvider at it through system properties. */
  public static synchronized void start() {
    if (started) return;
    MYSQL.start();
    System.setProperty("taskflow.db.url",
        "jdbc:mysql://" + MYSQL.getHost() + ":" + MYSQL.getMappedPort(3306) + "/taskflow?serverTimezone=UTC");
    System.setProperty("taskflow.db.user", "taskflow_app");
    System.setProperty("taskflow.db.password", "taskflow_dev_pw");
    started = true;
  }
}
