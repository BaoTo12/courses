package com.taskflow.web.filters;

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
 * S40 (40.15, Your Turn): while maintenance is on, answer 503 + Retry-After with a short page, except for
 * static files (the page's CSS) and /debug/* (where the operator switches it off). S41 adds: logged-in admins pass.
 */
public class MaintenanceModeFilter implements Filter {

  private MaintenanceMode mode;

  @Override
  public void init(FilterConfig config) {
    boolean initiallyOn = Boolean.parseBoolean(config.getServletContext().getInitParameter("taskflow.maintenance"));
    mode = new MaintenanceMode(initiallyOn);
    config.getServletContext().setAttribute(MaintenanceMode.ATTRIBUTE, mode);   // shared with the switch (application scope)
  }

  @Override
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
    HttpServletRequest request = (HttpServletRequest) req;
    if (mode.isEnabled() && !isExempt(request)) {
      HttpServletResponse response = (HttpServletResponse) res;
      response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
      response.setHeader("Retry-After", "600");                                   // seconds: "try again in 10 minutes"
      request.setAttribute("pageTitle", "Maintenance");
      request.getRequestDispatcher("/WEB-INF/views/maintenance.jsp").forward(request, response);
      return;
    }
    chain.doFilter(req, res);
  }

  private static boolean isExempt(HttpServletRequest request) {
    String path = request.getServletPath();       // a REQUEST dispatch: this is the path the user asked for
    return path.startsWith("/static/") || path.startsWith("/debug/");
  }
}
