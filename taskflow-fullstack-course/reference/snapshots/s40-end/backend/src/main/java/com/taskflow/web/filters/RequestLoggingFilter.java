package com.taskflow.web.filters;

import java.io.IOException;
import java.util.concurrent.ThreadLocalRandom;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

/**
 * S40 (40.06): one log line per request: method, URI, status, duration, and a request id.
 *   - BEFORE chain.doFilter: start the clock, create the id, put it in the MDC (every log line of this request,
 *     from any class, can print it) and in an X-Request-Id response header (a user can quote it in a bug report).
 *   - AFTER chain.doFilter: the servlet and the JSP are done; the status is known. Log it.
 * An exception thrown through the filter is logged as 500: the container turns it into one AFTER we return (40.17).
 */
public class RequestLoggingFilter implements Filter {

  private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);

  @Override
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
    HttpServletRequest request = (HttpServletRequest) req;
    HttpServletResponse response = (HttpServletResponse) res;
    String requestId = Long.toHexString(ThreadLocalRandom.current().nextLong());
    long start = System.nanoTime();
    MDC.put("requestId", requestId);
    response.setHeader("X-Request-Id", requestId);
    int status = 500;                         // what the client gets if an exception escapes
    try {
      chain.doFilter(request, response);
      status = response.getStatus();          // Servlet 3.0+: the status set by the servlet, sendError included
    } finally {
      long millis = (System.nanoTime() - start) / 1_000_000;
      log.info("{} {} {} {}ms", request.getMethod(), uriWithQuery(request), status, millis);
      MDC.remove("requestId");                // threads are reused: never leave data for the next request
    }
  }

  private static String uriWithQuery(HttpServletRequest request) {
    String query = request.getQueryString();
    return query == null ? request.getRequestURI() : request.getRequestURI() + "?" + query;
  }
}
