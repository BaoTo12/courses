-- S28 (28.07) · PROVIDED. Demo data: the SAME users, categories, tasks and comments as the mock API (db.seed.json).
-- Demo passwords (development only!): alice / alice123 · bob / bob123 · admin / admin123 — stored as bcrypt hashes (cost 12).
-- Timestamps are UTC (S36 sets the JDBC connection to UTC).
USE taskflow;

INSERT INTO users (id, username, email, password_hash, display_name, role, locale, enabled) VALUES
  (1, 'alice', 'alice@taskflow.test', '$2a$12$oBJehHL5IKGFtEJ6oSSbnukwArGKvDnY7XMcjrHk4ztBXI91vcn62', 'Alice Nguyen', 'USER', 'en', TRUE),
  (2, 'bob', 'bob@taskflow.test', '$2a$12$vPEHWy6g..WRXjfX18Ujye/2mO0TL8Jlbi9s4Ng79CB6Vyut1DIoG', 'Bob Tran', 'USER', 'vi', TRUE),
  (3, 'admin', 'admin@taskflow.test', '$2a$12$yeYcTJ1t7pnPI9l5FYbeku3A4Miz8M30NBlVn.nuGBt.vGweo.2xi', 'Admin', 'ADMIN', 'en', TRUE);

INSERT INTO categories (id, name, color) VALUES
  (1, 'Work', '#2563eb'),
  (2, 'Engineering', '#7c3aed'),
  (3, 'Team', '#059669'),
  (4, 'Personal', '#d97706');

INSERT INTO tasks (id, title, description, status, priority, due_date, category_id, owner_id, created_at, updated_at) VALUES
  (1, 'Write quarterly report', 'Summarise Q3 results for the steering meeting.', 'IN_PROGRESS', 'HIGH', '2026-10-03', 1, 1, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (2, 'Fix login redirect bug', 'Users land on 404 after session timeout.', 'TODO', 'MEDIUM', '2026-09-20', 2, 1, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (3, 'Plan team offsite', 'Shortlist three venues.', 'DONE', 'LOW', NULL, 3, 1, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (4, 'Review <img src=x onerror="alert(1)"> onboarding doc', 'Deliberately malicious title: React renders it as text.', 'TODO', 'LOW', '2026-10-10', 2, 1, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (5, 'Prepare sprint demo', 'Record a 3-minute walkthrough.', 'TODO', 'HIGH', '2026-09-29', 1, 1, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (6, 'Update dependency versions', 'Run npm outdated and review changelogs.', 'TODO', 'MEDIUM', '2026-10-06', 2, 1, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (7, 'Write onboarding checklist', 'For the two new joiners in October.', 'IN_PROGRESS', 'MEDIUM', '2026-10-01', 3, 1, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (8, 'Book dentist appointment', 'Before the end of the month.', 'DONE', 'LOW', '2026-09-28', 4, 1, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (9, 'Renew SSL certificate', 'Staging cert expires mid-October.', 'TODO', 'HIGH', '2026-10-12', 2, 1, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (10, 'Draft Q4 roadmap', 'Collect input from product and support.', 'IN_PROGRESS', 'HIGH', '2026-10-15', 1, 1, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (11, 'Clean up feature flags', 'Remove flags older than two releases.', 'TODO', 'LOW', NULL, 2, 1, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (12, 'Order team T-shirts', 'Sizes survey is in the shared drive.', 'DONE', 'LOW', '2026-09-15', 3, 1, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (13, 'Migrate CI to Node 24', 'Node 20 is end-of-life.', 'IN_PROGRESS', 'MEDIUM', '2026-10-08', 2, 1, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (14, 'Write blog post on caching', 'Hashed assets vs index.html.', 'TODO', 'MEDIUM', '2026-10-20', 1, 1, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (15, 'Pay electricity bill', 'Autopay failed last month.', 'TODO', 'HIGH', '2026-09-30', 4, 1, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (16, 'Interview frontend candidate', 'Prepare the React exercise.', 'TODO', 'MEDIUM', '2026-10-02', 3, 1, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (17, 'Archive old Jira epics', 'Anything closed before 2025.', 'DONE', 'LOW', NULL, 1, 1, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (18, 'Load-test the search endpoint', 'Target: p95 below 300 ms.', 'TODO', 'HIGH', '2026-10-18', 2, 1, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (19, 'Book flights for conference', 'Compare prices on Tuesday.', 'IN_PROGRESS', 'MEDIUM', '2026-10-05', 4, 1, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (20, 'Update the style guide', 'Add the new badge colours.', 'TODO', 'LOW', '2026-10-25', 3, 1, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (21, 'Fix flaky date test', 'Fails before 07:00 in Vietnam (UTC offset).', 'DONE', 'MEDIUM', '2026-09-18', 2, 1, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (22, 'Prepare 1:1 notes', 'Topics: goals, blockers, training.', 'TODO', 'MEDIUM', '2026-09-30', 3, 1, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (23, 'Bob: private salary review', 'Only Bob (and admins) may see this task.', 'TODO', 'HIGH', '2026-10-09', 1, 2, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (24, 'Bob: renew passport', 'Appointment on Friday.', 'IN_PROGRESS', 'MEDIUM', '2026-10-04', 4, 2, '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
  (25, 'Bob: refactor payment module', 'Split the 900-line service.', 'TODO', 'HIGH', '2026-10-30', 2, 2, '2026-09-01 08:00:00', '2026-09-01 08:00:00');

INSERT INTO comments (id, task_id, author_id, body, created_at) VALUES
  (1, 1, 1, 'Numbers from finance arrive on Monday.', '2026-09-02 09:00:00'),
  (2, 1, 3, 'Please add the churn chart.', '2026-09-03 10:30:00'),
  (3, 2, 1, 'Reproduced with an expired session cookie.', '2026-09-04 14:15:00');
