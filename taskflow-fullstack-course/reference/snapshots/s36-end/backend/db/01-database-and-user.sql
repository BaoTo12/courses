-- S28 (28.07) · PROVIDED. Run as an ADMIN account (root) ONCE. Docker runs it automatically on first start.
-- Creates the database and the LEAST-PRIVILEGE account the application uses. The app never connects as root.

CREATE DATABASE IF NOT EXISTS taskflow
  CHARACTER SET utf8mb4            -- real UTF-8: Vietnamese, emoji (MySQL's old 'utf8' is 3-byte, no emoji)
  COLLATE utf8mb4_0900_ai_ci;      -- accent- and case-INsensitive comparisons (see the unique title rule, 02-schema)

-- ⚠️ Development password. Production: a generated secret, passed by the environment, never committed.
CREATE USER IF NOT EXISTS 'taskflow_app'@'%' IDENTIFIED BY 'taskflow_dev_pw';
-- Its rights are granted in 04-grants.sql, once the tables exist.
