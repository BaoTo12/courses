package com.taskflow.web;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

/**
 * S37 (37.09): a message that survives ONE redirect ("Task created").
 * Request attributes die with the request (31.06), so the message waits in the SESSION, and the next page that
 * shows messages moves it into the request ("flash") and removes it from the session: shown exactly once.
 * Views read ${flash}, a request attribute, so they don't need access to the session (session="false", 33.10).
 */
public final class Flash {

  private static final String SESSION_KEY = Flash.class.getName();

  private Flash() {}

  /** Before a redirect: remember the message for the next page. */
  public static void put(HttpServletRequest request, String message) {
    request.getSession().setAttribute(SESSION_KEY, message);
  }

  /** In a GET controller, before forwarding: take the waiting message (if any) for THIS page, and forget it. */
  public static void consume(HttpServletRequest request) {
    HttpSession session = request.getSession(false); // no session → no message; don't create one
    if (session == null) return;
    Object message = session.getAttribute(SESSION_KEY);
    if (message != null) {
      session.removeAttribute(SESSION_KEY);
      request.setAttribute("flash", message);
    }
  }
}
