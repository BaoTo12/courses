package com.taskflow.web.filters;

import java.io.IOException;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S47 (47.10): CORS for /api/*, with an explicit ALLOW-LIST of origins (context param taskflow.cors.allowedOrigins).
 * CORS doesn't protect the API from clients (curl ignores it); it tells BROWSERS which other sites' JavaScript may
 * read responses sent with the user's cookies (47.08).
 *   allowed Origin    → Access-Control-Allow-Origin: <that origin> (never "*" with credentials), Allow-Credentials,
 *                       Vary: Origin (caches must not reuse one origin's answer for another)
 *   preflight OPTIONS → answered HERE with the allowed methods/headers, 204: it never reaches authentication (47.16)
 *   other origins     → no CORS headers: the browser refuses to expose the response; their preflights → 403 (no body:
 *                       this filter runs before "api", and the browser only looks at the missing headers)
 *   no Origin header  → same-origin or not a browser: nothing to do
 * Placed before "api", so even error JSON (401, 403) carries the headers and the SPA can read it.
 */
public class CorsFilter implements Filter {

  private Set<String> allowedOrigins;

  @Override
  public void init(FilterConfig config) {
    String value = config.getServletContext().getInitParameter("taskflow.cors.allowedOrigins");
    allowedOrigins = value == null ? Set.of() : Arrays.stream(value.split(","))
        .map(String::strip).filter(s -> !s.isEmpty()).collect(Collectors.toUnmodifiableSet());
  }

  @Override
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
    HttpServletRequest request = (HttpServletRequest) req;
    HttpServletResponse response = (HttpServletResponse) res;
    String origin = request.getHeader("Origin");
    boolean preflight = "OPTIONS".equals(request.getMethod()) && request.getHeader("Access-Control-Request-Method") != null;
    response.addHeader("Vary", "Origin");
    if (origin != null && allowedOrigins.contains(origin)) {
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Access-Control-Allow-Credentials", "true");
      if (preflight) {
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, X-XSRF-TOKEN");
        response.setHeader("Access-Control-Max-Age", "600");      // the browser may cache this answer for 10 minutes
        response.setStatus(204);
        return;
      }
    } else if (preflight) {
      response.setStatus(403);                                    // no Allow-* headers: the browser blocks the real request
      return;
    }
    chain.doFilter(req, res);
  }
}
