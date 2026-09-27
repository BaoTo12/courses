package com.taskflow.web.filters;

import com.taskflow.security.AccessDeniedException;
import com.taskflow.security.AuthUser;
import com.taskflow.service.AuditService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.CurrentUser;
import com.taskflow.web.api.Api;
import com.taskflow.web.api.ApiError;
import com.taskflow.web.api.ApiException;
import com.taskflow.web.api.Json;
import java.io.IOException;
import java.time.Instant;
import java.util.Set;
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
 * S46 (46.07, 46.08): the API's ErrorHandlingFilter (43.08), speaking JSON. Mapped to /api/*, INSIDE the global
 * errors filter, so API exceptions are caught here first.
 *   before: a request with a body must be application/json → else 415 (a plain HTML form can't send JSON: 46.07)
 *   after:  ApiException          → its status + the standard error JSON
 *           AccessDeniedException → 404 NOT_FOUND + audit ACCESS_DENIED (don't confirm it exists, 42.05)
 *           anything else         → log with the request id, 500 INTERNAL_ERROR (no details, 43.10)
 */
public class ApiExceptionFilter implements Filter {

  private static final Logger log = LoggerFactory.getLogger(ApiExceptionFilter.class);
  private static final Set<String> BODYLESS = Set.of("GET", "HEAD", "OPTIONS", "DELETE");

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
      if (!BODYLESS.contains(request.getMethod()) && hasBody(request) && !isJson(request)) {
        throw ApiException.unsupportedMediaType();
      }
      chain.doFilter(req, res);
    } catch (ApiException e) {
      if (e.status() == 401 || e.status() == 403) auditRejection(request, e);   // S47 (47.13)
      send(request, response, e.status(), e.code(), e.getMessage(), e);
    } catch (AccessDeniedException e) {
      AuthUser user = CurrentUser.get(request);
      audit.record("ACCESS_DENIED", user == null ? null : user.getUsername(), request.getRemoteAddr(), e.getMessage());
      send(request, response, 404, "NOT_FOUND", "Not found", null);
    } catch (IOException | ServletException | RuntimeException e) {
      log.error("Unhandled API exception: {} {}", request.getMethod(), request.getRequestURI(), e);
      send(request, response, 500, "INTERNAL_ERROR", "Unexpected server error", null);
    }
  }

  /**
   * S47 (47.13): every 401/403 of the API in the audit log, with the request id that also appears in the application
   * log and the X-Request-Id header (40.06). Except the SPA's "who am I?" probe: an anonymous GET /api/auth/me is the
   * normal first call of every visit, not a rejection worth an event.
   */
  private void auditRejection(HttpServletRequest request, ApiException e) {
    if (e.status() == 401 && "GET".equals(request.getMethod()) && "/api/auth/me".equals(Api.path(request))) return;
    AuthUser user = CurrentUser.get(request);
    audit.record("ACCESS_DENIED", user == null ? null : user.getUsername(), request.getRemoteAddr(),
        e.status() + " " + e.code() + " " + request.getMethod() + " " + Api.path(request) + " [request " + request.getAttribute("requestId") + "]");
  }

  private static void send(HttpServletRequest request, HttpServletResponse response, int status, String code, String message,
                           ApiException source) throws IOException {
    if (response.isCommitted()) {
      log.error("API error after the response was committed: {} {} → {}", request.getMethod(), request.getRequestURI(), status);
      return;
    }
    response.resetBuffer();
    Json.write(response, status, new ApiError(status, code, message, source == null ? null : source.fieldErrors(),
        Api.path(request), Instant.now().toString()));
  }

  private static boolean hasBody(HttpServletRequest request) {
    return request.getContentLengthLong() > 0 || request.getHeader("Transfer-Encoding") != null;
  }

  private static boolean isJson(HttpServletRequest request) {
    String type = request.getContentType();
    return type != null && type.toLowerCase().startsWith("application/json");
  }
}
