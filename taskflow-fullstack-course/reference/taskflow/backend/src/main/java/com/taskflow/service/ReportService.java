package com.taskflow.service;

import com.taskflow.dao.TaskDao;
import com.taskflow.dao.UserDao;
import com.taskflow.model.TaskStatus;
import com.taskflow.security.AccessDeniedException;
import com.taskflow.security.AuthUser;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * S51: the admin report: tasks per user and status. An APPLICATION-SCOPE CACHE (38.06): the GROUP BY runs at most once
 * per TTL, whoever asks; the result is an immutable snapshot behind a volatile field, so concurrent readers never
 * see half of a report. `refresh = true` forces a new one (the "Refresh" button).
 */
public class ReportService {

  /** One user's line: counts per status (every status present) and the total. */
  public record Row(long userId, String username, String displayName, Map<TaskStatus, Integer> counts, int total) {
    public String getUsername() { return username; }
    public String getDisplayName() { return displayName; }
    public Map<TaskStatus, Integer> getCounts() { return counts; }
    public int getTotal() { return total; }
  }

  /** A whole report, and when it was computed. */
  public record Report(List<Row> rows, Instant generatedAt) {
    public List<Row> getRows() { return rows; }
    public Instant getGeneratedAt() { return generatedAt; }
  }

  private final TaskDao tasks;
  private final UserDao users;
  private final Clock clock;
  private final Duration ttl;
  private volatile Report cached;

  public ReportService(TaskDao tasks, UserDao users, Clock clock, Duration ttl) {
    this.tasks = tasks;
    this.users = users;
    this.clock = clock;
    this.ttl = ttl;
  }

  public Report tasksPerUser(AuthUser caller, boolean refresh) {
    if (caller == null || !caller.isAdmin()) throw new AccessDeniedException("admin report");   // defence in depth (42.06)
    Report current = cached;
    Instant now = clock.instant();
    if (refresh || current == null || current.generatedAt().plus(ttl).isBefore(now)) {
      current = compute(now);
      cached = current;           // two threads may both compute once after expiry: harmless, and no lock needed
    }
    return current;
  }

  private Report compute(Instant now) {
    Map<Long, Map<TaskStatus, Integer>> counts = new HashMap<>();
    for (Object[] row : tasks.countByOwnerAndStatus()) {
      counts.computeIfAbsent(((Number) row[0]).longValue(), id -> new EnumMap<>(TaskStatus.class))
          .put((TaskStatus) row[1], ((Number) row[2]).intValue());
    }
    List<Row> rows = new ArrayList<>();
    for (UserDao.Account account : users.findAccounts()) {
      Map<TaskStatus, Integer> perStatus = new EnumMap<>(TaskStatus.class);
      for (TaskStatus status : TaskStatus.values()) {
        perStatus.put(status, counts.getOrDefault(account.id(), Map.of()).getOrDefault(status, 0));
      }
      int total = perStatus.values().stream().mapToInt(Integer::intValue).sum();
      rows.add(new Row(account.id(), account.username(), account.displayName(), Map.copyOf(perStatus), total));
    }
    return new Report(List.copyOf(rows), now);
  }
}
