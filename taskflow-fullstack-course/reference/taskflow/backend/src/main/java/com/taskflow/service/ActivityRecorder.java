package com.taskflow.service;

import com.taskflow.dao.AuditDao;
import com.taskflow.security.AuthUser;
import java.util.List;
import java.util.stream.Stream;

/**
 * S51: the activity feed. Listens to TaskService's events and appends them to the audit trail (the same append-only
 * table as the security events: one timeline, one retention policy), and reads a user's latest ones back.
 * The IP column is required; a domain event has no request, so it's "-" (the request line in the app log has it).
 */
public class ActivityRecorder implements TaskEvent.Listener {

  public static final List<String> TYPES = Stream.of(TaskEvent.Type.values()).map(Enum::name).toList();
  private static final int TITLE_MAX = 200;

  private final AuditDao audit;

  public ActivityRecorder(AuditDao audit) {
    this.audit = audit;
  }

  @Override
  public void onTaskEvent(TaskEvent event) {
    String title = event.title() == null ? "" : event.title();
    if (title.length() > TITLE_MAX) title = title.substring(0, TITLE_MAX - 1) + "…";
    audit.record(event.type().name(), event.actor().getUsername(), "-", "task " + event.taskId() + ": " + title);
  }

  /** The caller's latest activity, newest first. */
  public List<AuditDao.Event> latest(AuthUser caller, int limit) {
    return audit.findActivity(caller.getUsername(), TYPES, limit);
  }
}
