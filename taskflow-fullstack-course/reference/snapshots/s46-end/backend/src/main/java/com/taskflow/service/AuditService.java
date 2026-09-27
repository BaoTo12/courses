package com.taskflow.service;

import com.taskflow.dao.AuditDao;
import com.taskflow.security.AccessDeniedException;
import com.taskflow.security.AuthUser;
import java.util.List;

/**
 * S42: the security audit log, for the web layer (controllers and filters call services, not DAOs: 36.02).
 * Event types: LOGIN_OK, LOGIN_FAIL, LOGIN_THROTTLED, LOGOUT (S41), ACCESS_DENIED, USER_ENABLED, USER_DISABLED,
 * ROLE_CHANGED, SESSION_REVOKED (S42), SESSION_EXPIRED, SLOW_REQUEST (S45). Never a password, a session id or a token (43.11).
 * S45 (45.10): reading it, for admins only, one page at a time.
 */
public class AuditService {

  public static final List<String> TYPES = List.of("LOGIN_OK", "LOGIN_FAIL", "LOGIN_THROTTLED", "LOGOUT", "ACCESS_DENIED",
      "USER_ENABLED", "USER_DISABLED", "ROLE_CHANGED", "SESSION_REVOKED", "SESSION_EXPIRED", "SLOW_REQUEST");
  public static final int PAGE_SIZE = 25;

  private final AuditDao audit;

  public AuditService(AuditDao audit) {
    this.audit = audit;
  }

  public void record(String type, String username, String ip, String details) {
    audit.record(type, username, ip, details);
  }

  /** type must be one of TYPES or null; username null = any. */
  public Page<AuditDao.Event> page(AuthUser caller, String type, String username, int requestedPage) {
    if (caller == null || !caller.isAdmin()) throw new AccessDeniedException("audit log");   // defence in depth (42.06)
    long total = audit.count(type, username);
    int number = Page.clamp(requestedPage, total, PAGE_SIZE);
    return new Page<>(audit.find(type, username, (number - 1) * PAGE_SIZE, PAGE_SIZE), number, PAGE_SIZE, total);
  }
}
