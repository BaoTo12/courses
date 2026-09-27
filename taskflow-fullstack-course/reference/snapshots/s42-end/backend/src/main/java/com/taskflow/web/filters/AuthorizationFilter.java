package com.taskflow.web.filters;

import com.taskflow.security.AccessDeniedException;
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
 *   1. URL rule: /admin and everything under it needs the ADMIN role → otherwise 403 + the access-denied page.
 *      "/admin/*"-style prefix checks cover EVERY method and every sub-path: the POST /admin/users/disable too (42.11).
 *   2. Data rule: a SERVICE threw AccessDeniedException (task 23 isn't yours, 42.05) → 404. We don't confirm that
 *      the task exists (GitHub answers private repositories the same way).
 *   Both are written to the audit log as ACCESS_DENIED, with what was asked for.
 * The filter never DECIDES the data rule (it can't know who owns task 23): it only turns the service's decision
 * into a response, in one place for every controller.
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
    AuthUser user = CurrentUser.get(request);
    String path = request.getServletPath();

    if (path.equals("/admin") || path.startsWith("/admin/")) {
      if (user == null || !user.isAdmin()) {
        denied(request, user, request.getMethod() + " " + path);
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        request.setAttribute("pageTitle", "Access denied");
        request.getRequestDispatcher("/WEB-INF/views/errors/403.jsp").forward(request, response);
        return;
      }
    }
    try {
      chain.doFilter(req, res);
    } catch (AccessDeniedException e) {
      denied(request, user, e.getMessage());
      if (response.isCommitted()) throw e;       // too late to change the response (43.07)
      response.resetBuffer();
      response.sendError(HttpServletResponse.SC_NOT_FOUND);
    }
  }

  private void denied(HttpServletRequest request, AuthUser user, String details) {
    audit.record("ACCESS_DENIED", user == null ? null : user.getUsername(), request.getRemoteAddr(), details);
  }
}
