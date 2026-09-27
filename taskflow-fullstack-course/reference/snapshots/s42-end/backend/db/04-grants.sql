-- S28 (28.07) · PROVIDED. Run as root after 02-schema.sql.

-- Only DATA rights (no CREATE/DROP/ALTER/GRANT): a SQL injection can't drop tables or read other databases.
GRANT SELECT, INSERT, UPDATE, DELETE ON taskflow.users      TO 'taskflow_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON taskflow.categories TO 'taskflow_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON taskflow.tasks      TO 'taskflow_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON taskflow.comments   TO 'taskflow_app'@'%';
-- The audit log is APPEND-ONLY for the app: it can write and read events, never change or erase them (S45).
GRANT SELECT, INSERT ON taskflow.audit_events TO 'taskflow_app'@'%';
