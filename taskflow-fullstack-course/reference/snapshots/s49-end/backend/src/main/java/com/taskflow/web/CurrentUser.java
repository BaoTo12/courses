package com.taskflow.web;

import com.taskflow.security.AuthUser;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

/** S41: who is logged in, read from the session (never creates one). Views read the request attribute "currentUser". */
public final class CurrentUser {

  public static final String SESSION_KEY = "currentUser";

  private CurrentUser() {}

  /** The logged-in user, or null. */
  public static AuthUser get(HttpServletRequest request) {
    HttpSession session = request.getSession(false);
    return session == null ? null : (AuthUser) session.getAttribute(SESSION_KEY);
  }
}
