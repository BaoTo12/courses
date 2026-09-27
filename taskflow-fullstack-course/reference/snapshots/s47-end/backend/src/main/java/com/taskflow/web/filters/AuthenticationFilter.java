package com.taskflow.web.filters;

import com.taskflow.security.AuthUser;
import com.taskflow.service.AccountRegistry;
import com.taskflow.service.AuditService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.Csrf;
import com.taskflow.web.CurrentUser;
import com.taskflow.web.Flash;
import com.taskflow.web.Http;
import com.taskflow.web.api.Api;
import com.taskflow.web.api.ApiException;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
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
 * S47 (47.04): for /api/* the answer is never a redirect: ApiException → ApiExceptionFilter → 401 UNAUTHENTICATED JSON.
 * S42 (42.07): the session holds a COPY of the user from login time. On every request it's compared with the account's
 * CURRENT state (AccountRegistry, in memory): disabled since → the session ends now; role changed → the session gets
 * the new role and a new id (a privilege change, like a login: 41.11).
 */
public class AuthenticationFilter implements Filter {

  private static final Set<String> PUBLIC_PATHS = Set.of("/login", "/", "/index.html", "/favicon.ico", "/hello", "/time",
      "/api/auth/csrf", "/api/auth/login", "/api/auth/logout", "/api/auth/me");   // S47: me/logout answer anonymous callers themselves
  private static final List<String> PUBLIC_PREFIXES = List.of("/static/", "/debug/");   // /debug/*: loopback-only anyway

  private AccountRegistry accounts;
  private AuditService audit;

  @Override
  public void init(FilterConfig config) {
    accounts = AppContextListener.accountRegistry(config.getServletContext());
    audit = AppContextListener.auditService(config.getServletContext());
  }

  @Override
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
    HttpServletRequest request = (HttpServletRequest) req;
    HttpServletResponse response = (HttpServletResponse) res;
    String path = request.getServletPath();

    AuthUser user = CurrentUser.get(request);
    if (user != null) {
      Optional<AccountRegistry.State> account = accounts.state(user.getId());
      if (account.isEmpty() || !account.get().enabled()) {       // disabled by an admin since this login (42.07)
        audit.record("SESSION_REVOKED", user.getUsername(), request.getRemoteAddr(), "account disabled");
        request.getSession().removeAttribute(CurrentUser.SESSION_KEY);   // S45: revoked, not expired (45.09)
        request.getSession().invalidate();
        if (Api.isApiRequest(request)) throw ApiException.unauthenticated();   // S47: JSON 401 for the SPA (47.04)
        Flash.put(request, "Your session has ended. Please log in again.");
        Http.seeOther(response, request.getContextPath() + "/login");
        return;
      }
      if (!account.get().role().equals(user.getRole())) {        // promoted or demoted since this login
        user = user.withRole(account.get().role());
        request.changeSessionId();
        request.getSession().setAttribute(CurrentUser.SESSION_KEY, user);
      }
      request.setAttribute("currentUser", user);
      if (!path.startsWith("/static/")) {
        Csrf.prepare(request);
        response.setHeader("Cache-Control", "no-store");   // private pages: not kept in the browser's history cache
      }
      chain.doFilter(req, res);
      return;
    }
    String fullPath = Api.path(request);                    // S47: servletPath + pathInfo (/api/auth/* is one servlet)
    if (isPublic(path) || PUBLIC_PATHS.contains(fullPath)) {
      chain.doFilter(req, res);
      return;
    }
    if (Api.isApiRequest(request)) throw ApiException.unauthenticated();     // S47: never redirect an API call (47.03)
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
