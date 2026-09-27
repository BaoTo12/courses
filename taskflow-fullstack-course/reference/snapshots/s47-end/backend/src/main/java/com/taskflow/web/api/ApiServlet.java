package com.taskflow.web.api;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S46 (46.04): the base of TaskFlow's API servlets: a tiny ROUTER.
 * HttpServlet's service() knows GET/POST/PUT/DELETE/HEAD/OPTIONS/TRACE, but NOT PATCH (→ 501), and answers unknown
 * combinations with sendError (→ an HTML error page). So API servlets take over service() completely:
 *   route(method, segments) with segments = pathInfo split on "/":  null or "/" → [], "/5" → ["5"], "/5/comments" → ["5", "comments"]
 * Anything a subclass doesn't handle → ApiException.noEndpoint → a JSON 404 (46.16).
 */
public abstract class ApiServlet extends HttpServlet {

  @Override
  protected void service(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    String pathInfo = request.getPathInfo();
    List<String> segments = pathInfo == null || pathInfo.equals("/") ? List.of()
        : Arrays.asList(pathInfo.substring(1).split("/", -1));
    route(request, response, request.getMethod(), segments);
  }

  protected abstract void route(HttpServletRequest request, HttpServletResponse response, String method, List<String> path)
      throws IOException;

  /** A path segment that must be a positive id; anything else ("abc", "-1", "") → 404 (the mock's contract). */
  protected static long id(String segment, String notFoundMessage) {
    if (segment.matches("[1-9]\\d{0,17}")) return Long.parseLong(segment);
    throw ApiException.notFound(notFoundMessage);
  }

  protected static boolean is(String method, String expected) {
    return expected.equals(method);
  }
}
