package com.taskflow.web.filters;

import java.io.IOException;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletResponse;

/**
 * S40 (40.10): security headers on every response. Set BEFORE chain.doFilter: once the servlet or JSP starts writing
 * the body, the response may be committed and headers can't be added any more.
 */
public class SecurityHeadersFilter implements Filter {

  /**
   * Only our own origin for scripts, styles, images, fonts, forms and fetches; no plugins; no framing (40.12).
   * No 'unsafe-inline': inline <script> and style="…" attributes are refused by the browser (35.17, 40.10).
   */
  static final String CSP = String.join("; ",
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'");

  @Override
  public void doFilter(ServletRequest request, ServletResponse res, FilterChain chain) throws IOException, ServletException {
    HttpServletResponse response = (HttpServletResponse) res;
    response.setHeader("Content-Security-Policy", CSP);
    response.setHeader("X-Content-Type-Options", "nosniff");               // trust Content-Type, don't guess (40.10)
    response.setHeader("X-Frame-Options", "DENY");                         // frame-ancestors for older browsers (40.11)
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin"); // no paths/queries leak to other sites
    chain.doFilter(request, response);
  }
}
