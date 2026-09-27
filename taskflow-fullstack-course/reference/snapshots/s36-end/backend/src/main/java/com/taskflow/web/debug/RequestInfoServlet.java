package com.taskflow.web.debug;

import com.taskflow.web.Html;
import java.io.IOException;
import java.io.PrintWriter;
import java.net.InetAddress;
import java.util.Collections;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S30 (30.10): everything the container parsed out of a request, as a table. Used throughout the course.
 * Mapped to "/debug/request-info" AND "/debug/request-info/*" so getPathInfo() can be seen (30.08).
 * 🛡 It shows headers, including Cookie: only answered for requests from THIS machine (loopback); 404 otherwise.
 */
@WebServlet(urlPatterns = {"/debug/request-info", "/debug/request-info/*"})
public class RequestInfoServlet extends HttpServlet {

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    if (!InetAddress.getByName(request.getRemoteAddr()).isLoopbackAddress()) {
      response.sendError(HttpServletResponse.SC_NOT_FOUND); // don't even admit it exists
      return;
    }
    response.setContentType("text/html;charset=UTF-8");
    PrintWriter out = response.getWriter();
    out.println("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>Request info</title>");
    out.println("<link rel=\"stylesheet\" href=\"" + request.getContextPath() + "/static/css/app.css\"></head>");
    out.println("<body><main class=\"page__main\"><h1 class=\"page__title\">Request info</h1><table>");
    row(out, "getMethod()", request.getMethod());
    row(out, "getRequestURL()", request.getRequestURL().toString());
    row(out, "getRequestURI()", request.getRequestURI());
    row(out, "getContextPath()", request.getContextPath());
    row(out, "getServletPath()", request.getServletPath());
    row(out, "getPathInfo()", String.valueOf(request.getPathInfo()));
    row(out, "getQueryString()", String.valueOf(request.getQueryString()));
    row(out, "getProtocol()", request.getProtocol());
    row(out, "getRemoteAddr()", request.getRemoteAddr());
    row(out, "getLocale()", request.getLocale().toLanguageTag());
    for (String header : Collections.list(request.getHeaderNames())) {
      row(out, "header " + header, request.getHeader(header));
    }
    request.getParameterMap().forEach((name, values) -> row(out, "param " + name, String.join(", ", values)));
    out.println("</table></main></body></html>");
  }

  /** Every value is escaped: headers and parameters are attacker-controlled (29.09). */
  private static void row(PrintWriter out, String label, String value) {
    out.println("<tr><th>" + Html.escape(label) + "</th><td><code>" + Html.escape(value) + "</code></td></tr>");
  }
}
