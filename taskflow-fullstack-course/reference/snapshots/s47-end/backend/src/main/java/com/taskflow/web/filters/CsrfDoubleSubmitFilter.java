package com.taskflow.web.filters;

import com.taskflow.web.api.ApiException;
import com.taskflow.web.api.XsrfCookie;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Set;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;

/**
 * S47 (47.06): CSRF protection for /api/*, the DOUBLE-SUBMIT COOKIE pattern. On every unsafe method, the value of the
 * XSRF-TOKEN cookie must equal the X-XSRF-TOKEN header.
 *   - a cross-site page can make the browser SEND the cookie, but can't READ it (same-origin policy), so it can't copy
 *     it into the header; and it can't set a custom header cross-origin without a CORS preflight we refuse (47.07)
 *   - no server-side state: the token isn't stored in the session (the SPA may get it before logging in)
 * Compared in constant time. Throws ApiException → ApiExceptionFilter → 403 CSRF_TOKEN_INVALID (JSON).
 */
public class CsrfDoubleSubmitFilter implements Filter {

  private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");

  @Override
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
    HttpServletRequest request = (HttpServletRequest) req;
    if (!SAFE_METHODS.contains(request.getMethod())) {
      String cookie = cookie(request);
      String header = request.getHeader(XsrfCookie.HEADER);
      if (cookie == null || cookie.isEmpty() || header == null
          || !MessageDigest.isEqual(cookie.getBytes(StandardCharsets.UTF_8), header.getBytes(StandardCharsets.UTF_8))) {
        throw ApiException.csrfInvalid();
      }
    }
    chain.doFilter(req, res);
  }

  private static String cookie(HttpServletRequest request) {
    Cookie[] cookies = request.getCookies();
    if (cookies == null) return null;
    for (Cookie cookie : cookies) {
      if (XsrfCookie.COOKIE.equals(cookie.getName())) return cookie.getValue();
    }
    return null;
  }
}
