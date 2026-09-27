package com.taskflow.web.filters;

import java.io.IOException;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Pattern;
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
 * S43: the id is also a request attribute: the error page is rendered after this filter has returned (MDC cleared).
 */
public class RequestLoggingFilter implements Filter {

  private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);
  private static final Pattern UUID_PATTERN = Pattern.compile("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");

  @Override
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
    HttpServletRequest request = (HttpServletRequest) req;
    HttpServletResponse response = (HttpServletResponse) res;
    String requestId = incomingId(request);
    long start = System.nanoTime();
    MDC.put("requestId", requestId);
    response.setHeader("X-Request-Id", requestId);
    request.setAttribute("requestId", requestId);    // S43: for the 500 page's reference (43.12), which runs after we return
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

  /**
   * S48 (48.08): adopt the client's X-Request-Id (TaskFlow Web sends a UUID per call, 13.12), so the browser's
   * Network tab and the server's log show the SAME id. Only if it's a well-formed UUID: anything else could inject
   * fake lines or huge values into the log (43.11), so it's replaced by our own.
   */
  private static String incomingId(HttpServletRequest request) {
    String sent = request.getHeader("X-Request-Id");
    if (sent != null && UUID_PATTERN.matcher(sent).matches()) return sent;
    return Long.toHexString(ThreadLocalRandom.current().nextLong());
  }

  private static String uriWithQuery(HttpServletRequest request) {
    String query = request.getQueryString();
    return query == null ? request.getRequestURI() : request.getRequestURI() + "?" + query;
  }
}
