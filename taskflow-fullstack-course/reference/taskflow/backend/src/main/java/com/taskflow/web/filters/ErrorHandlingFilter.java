package com.taskflow.web.filters;

import com.taskflow.security.AccessDeniedException;
import com.taskflow.security.ReadOnlyException;
import com.taskflow.security.AuthUser;
import com.taskflow.service.AuditService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.CurrentUser;
import com.taskflow.web.errors.BadRequestException;
import com.taskflow.web.errors.NotFoundException;
import java.io.IOException;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * S43 (43.08): the ONE place where exceptions become HTTP statuses. Right after the logging filter, so every log line
 * written here carries the request id (MDC, 40.06).
 *
 *   NotFoundException       → 404                       (a controller: "the service found nothing")
 *   BadRequestException     → 400 + its fixed message   (43.12)
 *   AccessDeniedException   → 404 + audit ACCESS_DENIED  (moved here from AuthorizationFilter: 42.05)
 *   anything else           → log the details, 500       (the user sees only the request id: 43.10)
 *
 * sendError() doesn't render anything itself: when the chain has returned, the container dispatches (type ERROR) to
 * the <error-page> for that status (web.xml, 43.02). If the response is already COMMITTED, it's too late for any
 * of that (43.07): we can only log.
 */
public class ErrorHandlingFilter implements Filter {

  private static final Logger log = LoggerFactory.getLogger(ErrorHandlingFilter.class);

  private AuditService audit;

  @Override
  public void init(FilterConfig config) {
    audit = AppContextListener.auditService(config.getServletContext());
  }

  @Override
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
    HttpServletRequest request = (HttpServletRequest) req;
    HttpServletResponse response = (HttpServletResponse) res;
    try {
      chain.doFilter(req, res);
    } catch (IOException | ServletException | RuntimeException e) {
      Throwable cause = rootCause(e);
      if (response.isCommitted()) {
        log.error("Exception after the response was committed: {} {}", request.getMethod(), request.getRequestURI(), cause);
        return;
      }
      response.resetBuffer();
      if (cause instanceof NotFoundException) {
        response.sendError(HttpServletResponse.SC_NOT_FOUND);
      } else if (cause instanceof BadRequestException) {
        response.sendError(HttpServletResponse.SC_BAD_REQUEST, cause.getMessage());
      } else if (cause instanceof ReadOnlyException) {
        response.sendError(HttpServletResponse.SC_FORBIDDEN);               // S51: visible, but shared read-only
      } else if (cause instanceof AccessDeniedException) {
        AuthUser user = CurrentUser.get(request);
        audit.record("ACCESS_DENIED", user == null ? null : user.getUsername(), request.getRemoteAddr(), cause.getMessage());
        response.sendError(HttpServletResponse.SC_NOT_FOUND);                // don't confirm it exists (42.05)
      } else {
        log.error("Unhandled exception: {} {}", request.getMethod(), request.getRequestURI(), cause);
        response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
      }
    }
  }

  /** JSPs and dispatchers wrap exceptions in ServletException (JasperException): the interesting one is inside. */
  private static Throwable rootCause(Throwable e) {
    Throwable cause = e;
    while (cause instanceof ServletException servletException && servletException.getRootCause() != null) {
      cause = servletException.getRootCause();
    }
    return cause;
  }
}
