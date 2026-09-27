package com.taskflow.service;

import com.taskflow.dao.AuditDao;

/**
 * S42: the security audit log, for the web layer (controllers and filters call services, not DAOs: 36.02).
 * Event types so far: LOGIN_OK, LOGIN_FAIL, LOGIN_THROTTLED, LOGOUT (S41), ACCESS_DENIED, USER_ENABLED,
 * USER_DISABLED, ROLE_CHANGED, SESSION_REVOKED (S42). Never a password, a session id or a token (43.11).
 */
public class AuditService {

  private final AuditDao audit;

  public AuditService(AuditDao audit) {
    this.audit = audit;
  }

  public void record(String type, String username, String ip, String details) {
    audit.record(type, username, ip, details);
  }
}
