package com.taskflow.web.filters;

import com.taskflow.security.AuthUser;
import com.taskflow.service.AuditService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.CurrentUser;
import java.io.IOException;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S42 (42.03): runs right after AuthenticationFilter, so a request here has a user (or is for a public path).
 * URL rule: /admin and everything under it needs the ADMIN role → otherwise 403, audited as ACCESS_DENIED.
 * "/admin/*"-style prefix checks cover EVERY method and every sub-path: the POST /admin/users/disable too (42.11).
 *
 * S43: sendError(403) → the container shows errors/403.jsp (<error-page>, 43.06) instead of our own forward, and
 * the DATA rule's AccessDeniedException (42.05) is now mapped by ErrorHandlingFilter with the other exceptions (43.08).
 */
public class AuthorizationFilter implements Filter {

  private AuditService audit;

  @Override
  public void init(FilterConfig config) {
    audit = AppContextListener.auditService(config.getServletContext());
  }

  @Override
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
    HttpServletRequest request = (HttpServletRequest) req;
    HttpServletResponse response = (HttpServletResponse) res;
    String path = request.getServletPath();

    if (path.equals("/admin") || path.startsWith("/admin/")) {
      AuthUser user = CurrentUser.get(request);
      if (user == null || !user.isAdmin()) {
        audit.record("ACCESS_DENIED", user == null ? null : user.getUsername(), request.getRemoteAddr(),
            request.getMethod() + " " + path);
        response.sendError(HttpServletResponse.SC_FORBIDDEN);
        return;
      }
    }
    chain.doFilter(req, res);
  }
}
