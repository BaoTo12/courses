package com.taskflow.web;

import java.io.IOException;
import java.util.Set;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S39 (39.09): POST /preferences/theme (theme = light | dark | system, returnTo) → sets the tf_theme cookie, the SAME
 * cookie the React app uses (24.05), then 303 back to the page the user was on.
 * The value is checked against an allow-list, and returnTo must be a path inside this app (no open redirect, 24.14).
 */
@WebServlet("/preferences/theme")
public class ThemeServlet extends HttpServlet {

  static final String COOKIE = "tf_theme";
  private static final Set<String> THEMES = Set.of("light", "dark", "system");
  private static final int ONE_YEAR = 365 * 24 * 60 * 60;

  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
    String theme = request.getParameter("theme");
    if (theme == null || !THEMES.contains(theme)) {
      response.sendError(HttpServletResponse.SC_BAD_REQUEST, "theme must be light, dark or system");
      return;
    }
    Cookie cookie = new Cookie(COOKIE, theme);
    cookie.setPath("/");                                         // shared with the React app on the same host
    cookie.setMaxAge("system".equals(theme) ? 0 : ONE_YEAR);    // "system" = no preference: delete the cookie
    // Not HttpOnly: the React app reads it with js-cookie. It's a preference, not a secret.
    response.addCookie(cookie);
    Http.seeOther(response, safeReturnTo(request, request.getParameter("returnTo")));
  }

  /** A path of THIS application ("/taskflow/…"), or the task list. Never another site (24.14). */
  static String safeReturnTo(HttpServletRequest request, String returnTo) {
    String home = request.getContextPath() + "/tasks";
    if (returnTo == null || !returnTo.startsWith(request.getContextPath() + "/")) return home;
    if (returnTo.startsWith("//") || returnTo.contains("\\") || returnTo.contains("\r") || returnTo.contains("\n")) return home;
    return returnTo;
  }
}
