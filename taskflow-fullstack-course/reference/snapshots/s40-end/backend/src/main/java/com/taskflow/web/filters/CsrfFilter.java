package com.taskflow.web.filters;

import com.taskflow.web.Csrf;
import java.io.IOException;
import java.util.Set;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S40 (40.13): the S37 CSRF check (37.13), for EVERY state-changing request, in one place.
 * A servlet added tomorrow is protected without anyone remembering to add the three lines.
 * Runs after CharacterEncodingFilter: it reads the _csrf parameter, which fixes the request's encoding (40.19).
 */
public class CsrfFilter implements Filter {

  private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");

  @Override
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
    HttpServletRequest request = (HttpServletRequest) req;
    if (!SAFE_METHODS.contains(request.getMethod()) && !Csrf.isValid(request)) {
      ((HttpServletResponse) res).sendError(HttpServletResponse.SC_FORBIDDEN, "Invalid or missing CSRF token");
      return;                                   // not calling chain.doFilter = the servlet never runs (40.04)
    }
    chain.doFilter(req, res);
  }
}
