package com.taskflow.db;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

/**
 * PROVIDED (S36): the application's connection pool (HikariCP), configured from the environment.
 * Where the settings come from, first match wins:
 *   1. a system property (tests: TestDatabase sets them)      taskflow.db.url / taskflow.db.user / taskflow.db.password
 *   2. an environment variable (docker-compose sets them, 28.09) TASKFLOW_DB_URL / TASKFLOW_DB_USER / TASKFLOW_DB_PASSWORD
 *   3. the development defaults below (MySQL on localhost, the S28 app user). ⚠️ Never ship real passwords in code.
 * Create ONE pool per application (AppContextListener, 36.04) and close it at shutdown.
 */
public final class DataSourceProvider {

  private DataSourceProvider() {}

  public static HikariDataSource create() {
    HikariConfig config = new HikariConfig();
    config.setPoolName("taskflow");
    config.setDriverClassName("com.mysql.cj.jdbc.Driver"); // load it through the web app's class loader (not DriverManager's)
    config.setJdbcUrl(setting("taskflow.db.url", "TASKFLOW_DB_URL", "jdbc:mysql://localhost:3306/taskflow?serverTimezone=UTC"));
    config.setUsername(setting("taskflow.db.user", "TASKFLOW_DB_USER", "taskflow_app"));
    config.setPassword(setting("taskflow.db.password", "TASKFLOW_DB_PASSWORD", "taskflow_dev_pw"));
    config.setMaximumPoolSize(10);       // at most 10 connections at the same time (36.13)
    config.setConnectionTimeout(5_000);  // wait at most 5 s for a free connection, then fail (default: 30 s)
    config.addDataSourceProperty("cachePrepStmts", "true");    // Connector/J: reuse parsed PreparedStatements
    config.addDataSourceProperty("useServerPrepStmts", "true");
    return new HikariDataSource(config);
  }

  static String setting(String property, String environmentVariable, String developmentDefault) {
    String value = System.getProperty(property);
    if (value == null || value.isBlank()) value = System.getenv(environmentVariable);
    return value == null || value.isBlank() ? developmentDefault : value;
  }
}
