package com.taskflow.security;

/**
 * S42 (42.05): thrown by a SERVICE when the caller may not touch what they asked for ("task 23 belongs to someone
 * else"). The service decides; the web layer (AuthorizationFilter) turns it into a response and an audit event.
 * The message is for the audit log, never for the user.
 */
public class AccessDeniedException extends RuntimeException {

  public AccessDeniedException(String details) {
    super(details);
  }
}
