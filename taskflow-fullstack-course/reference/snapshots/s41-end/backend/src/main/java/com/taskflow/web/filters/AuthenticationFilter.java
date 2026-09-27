package com.taskflow.web.filters;

import com.taskflow.security.AuthUser;
import com.taskflow.web.Csrf;
import com.taskflow.web.CurrentUser;
import com.taskflow.web.Http;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S41 (41.09): everything requires a logged-in user, except an explicit ALLOW-LIST of public paths.
 *   logged in  → the user as request attribute "currentUser" (views are session="false", 34.25), a CSRF token for
 *                every page's forms (Csrf.prepare: the session exists anyway), and Cache-Control: no-store (41.22)
 *   public     → continue
 *   otherwise  → 303 → /login?returnUrl=<where they wanted to go> (&expired=1 if their session id was stale)
 */
public class AuthenticationFilter implements Filter {

  private static final Set<String> PUBLIC_PATHS = Set.of("/login", "/", "/index.html", "/favicon.ico", "/hello", "/time");
  private static final List<String> PUBLIC_PREFIXES = List.of("/static/", "/debug/");   // /debug/*: loopback-only anyway

  @Override
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
    HttpServletRequest request = (HttpServletRequest) req;
    HttpServletResponse response = (HttpServletResponse) res;
    String path = request.getServletPath();

    AuthUser user = CurrentUser.get(request);
    if (user != null) {
      request.setAttribute("currentUser", user);
      if (!path.startsWith("/static/")) {
        Csrf.prepare(request);
        response.setHeader("Cache-Control", "no-store");   // private pages: not kept in the browser's history cache
      }
      chain.doFilter(req, res);
      return;
    }
    if (isPublic(path)) {
      chain.doFilter(req, res);
      return;
    }
    StringBuilder login = new StringBuilder(request.getContextPath()).append("/login");
    String separator = "?";
    if ("GET".equals(request.getMethod())) {                // after login, come back here (validated at login, 41.17)
      String query = request.getQueryString();
      String target = request.getRequestURI() + (query == null ? "" : "?" + query);
      login.append(separator).append("returnUrl=").append(URLEncoder.encode(target, StandardCharsets.UTF_8));
      separator = "&";
    }
    if (request.getRequestedSessionId() != null && !request.isRequestedSessionIdValid()) {
      login.append(separator).append("expired=1");         // the browser sent a session id we no longer know (41.19)
    }
    Http.seeOther(response, login.toString());
  }

  private static boolean isPublic(String path) {
    return PUBLIC_PATHS.contains(path) || PUBLIC_PREFIXES.stream().anyMatch(path::startsWith);
  }
}
