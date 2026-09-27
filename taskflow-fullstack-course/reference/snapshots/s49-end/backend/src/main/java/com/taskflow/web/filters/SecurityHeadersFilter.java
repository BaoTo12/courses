package com.taskflow.web.filters;

import java.io.IOException;
import java.security.SecureRandom;
import java.util.Base64;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletResponse;

/**
 * S40 (40.10): security headers on every response. Set BEFORE chain.doFilter: once the servlet or JSP starts writing
 * the body, the response may be committed and headers can't be added any more.
 * S49 (49.06): a per-request CSP NONCE. Scripts and styles still come only from 'self' — plus elements carrying this
 * request's nonce: the React island's entry script, and the <style> elements styled-components inserts (it reads the
 * nonce from <meta property="csp-nonce">, header.jspf / the SPA's index.html). A new random value per response, so
 * an attacker's injected markup can't know it. Exposed to JSPs as ${cspNonce}.
 */
public class SecurityHeadersFilter implements Filter {

  public static final String NONCE_ATTRIBUTE = "cspNonce";
  private static final SecureRandom RANDOM = new SecureRandom();

  /**
   * Only our own origin for scripts, styles, images, fonts, forms and fetches; no plugins; no framing (40.12).
   * No 'unsafe-inline': inline <script> and style="…" attributes are refused by the browser (35.17, 40.10).
   */
  static String csp(String nonce) {
    return String.join("; ",
        "default-src 'self'",
        "script-src 'self' 'nonce-" + nonce + "'",
        "style-src 'self' 'nonce-" + nonce + "'",
        "img-src 'self' data:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'");
  }

  @Override
  public void doFilter(ServletRequest request, ServletResponse res, FilterChain chain) throws IOException, ServletException {
    HttpServletResponse response = (HttpServletResponse) res;
    // The ERROR dispatch (43.03) reuses the request: keep the nonce already in the page's markup and header.
    Object existing = request.getAttribute(NONCE_ATTRIBUTE);
    String nonce = existing instanceof String value ? value : newNonce();
    request.setAttribute(NONCE_ATTRIBUTE, nonce);
    response.setHeader("Content-Security-Policy", csp(nonce));
    response.setHeader("X-Content-Type-Options", "nosniff");               // trust Content-Type, don't guess (40.10)
    response.setHeader("X-Frame-Options", "DENY");                         // frame-ancestors for older browsers (40.11)
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin"); // no paths/queries leak to other sites
    chain.doFilter(request, response);
  }

  private static String newNonce() {
    byte[] bytes = new byte[18];
    RANDOM.nextBytes(bytes);
    return Base64.getEncoder().encodeToString(bytes);        // 24 chars, no padding for 18 bytes
  }
}
