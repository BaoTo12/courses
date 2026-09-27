package com.taskflow.web;

import java.util.ArrayList;
import java.util.List;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

/**
 * S38 (38.10): the last 5 tasks THIS user opened: SESSION scope (per browser, across requests).
 * Only the ids are kept: small, serialisable (38.03), and never stale; titles are looked up when shown.
 * The list is replaced, never modified in place: two requests of the same session can run at the same time.
 */
public final class RecentTasks {

  static final String SESSION_KEY = RecentTasks.class.getName();
  private static final int MAX = 5;

  private RecentTasks() {}

  public static void record(HttpServletRequest request, long taskId) {
    HttpSession session = request.getSession();
    List<Long> updated = new ArrayList<>(ids(session));
    updated.remove(Long.valueOf(taskId));   // remove(Object): the id. remove(int) would remove by INDEX
    updated.add(0, taskId);
    if (updated.size() > MAX) updated.subList(MAX, updated.size()).clear();
    session.setAttribute(SESSION_KEY, updated);  // an ArrayList<Long>: Serializable
  }

  /** Most recent first; empty without a session. Never creates a session. */
  public static List<Long> ids(HttpServletRequest request) {
    HttpSession session = request.getSession(false);
    return session == null ? List.of() : ids(session);
  }

  @SuppressWarnings("unchecked")
  private static List<Long> ids(HttpSession session) {
    Object value = session.getAttribute(SESSION_KEY);
    return value == null ? List.of() : (List<Long>) value;
  }
}
