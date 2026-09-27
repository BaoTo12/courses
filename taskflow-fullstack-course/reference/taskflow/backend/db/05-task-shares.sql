-- S51 · PROVIDED. Task sharing (read-only): which users may SEE a task they don't own.
-- Runs after 01–04 on a NEW database. On an existing Docker volume (scripts only run once), apply it by hand:
--   docker compose exec -T mysql mysql -uroot -proot_dev_only < backend/db/05-task-shares.sql
USE taskflow;

CREATE TABLE task_shares (
  task_id    BIGINT    NOT NULL,
  user_id    BIGINT    NOT NULL,                    -- the user the task is shared WITH (never the owner)
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id, user_id),
  CONSTRAINT fk_shares_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
  CONSTRAINT fk_shares_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  INDEX ix_shares_user (user_id)
);

-- The app may add and remove shares; nothing else (least privilege, 28.07).
GRANT SELECT, INSERT, DELETE ON taskflow.task_shares TO 'taskflow_app'@'%';

-- Demo: bob's "renew passport" task (24) is shared with alice.
INSERT INTO task_shares (task_id, user_id) VALUES (24, 1);
