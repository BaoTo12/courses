package com.taskflow.web;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

/**
 * S37 (37.13): the synchroniser token pattern.
 *   - A page that contains POST forms calls prepare(): a random token is kept in the SESSION (created once per
 *     session) and exposed as the request attribute "csrfToken"; every form sends it back in a hidden field "_csrf".
 *   - Every state-changing request calls isValid() first: the field must equal the session's token.
 * Another site can make a browser SEND a request with TaskFlow's cookies, but it can't READ a TaskFlow page,
 * so it can't know the token. S40 moves the check into a filter, so no servlet can forget it.
 */
public final class Csrf {

  public static final String PARAMETER = "_csrf";
  private static final String SESSION_KEY = Csrf.class.getName();
  private static final SecureRandom RANDOM = new SecureRandom();

  private Csrf() {}

  /** For pages with POST forms: returns the session's token (creating the session and token if needed). */
  public static String prepare(HttpServletRequest request) {
    HttpSession session = request.getSession(); // ⚠ creates a session (and a JSESSIONID cookie) if there's none
    String token = (String) session.getAttribute(SESSION_KEY);
    if (token == null) {
      byte[] bytes = new byte[32];              // 256 random bits: unguessable
      RANDOM.nextBytes(bytes);
      token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
      session.setAttribute(SESSION_KEY, token);
    }
    request.setAttribute("csrfToken", token);
    return token;
  }

  /** S41 (41.11): forget the token, e.g. at login, so the logged-in session gets a NEW one on its next page. */
  public static void reset(HttpServletRequest request) {
    HttpSession session = request.getSession(false);
    if (session != null) session.removeAttribute(SESSION_KEY);
  }

  /** True only if the request's _csrf field equals the session's token. Never creates a session. */
  public static boolean isValid(HttpServletRequest request) {
    HttpSession session = request.getSession(false);
    if (session == null) return false;
    String expected = (String) session.getAttribute(SESSION_KEY);
    String actual = request.getParameter(PARAMETER);
    return expected != null && actual != null
        && MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), actual.getBytes(StandardCharsets.UTF_8)); // constant time
  }
}
