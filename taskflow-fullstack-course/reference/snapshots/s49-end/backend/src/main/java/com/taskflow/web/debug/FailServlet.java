package com.taskflow.web.debug;

import java.io.IOException;
import java.io.PrintWriter;
import java.net.InetAddress;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S43 (43.09, 43.07): a deliberate failure, for developers (loopback only).
 *   GET /debug/fail                 → throws before writing anything: the 500 page appears
 *   GET /debug/fail?after=commit    → writes and FLUSHES part of a page, then throws: too late for any error page
 * The message imitates what real exceptions carry (SQL, internal names): it must never reach the browser.
 */
@WebServlet("/debug/fail")
public class FailServlet extends HttpServlet {

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    if (!InetAddress.getByName(request.getRemoteAddr()).isLoopbackAddress()) {
      response.sendError(HttpServletResponse.SC_NOT_FOUND);
      return;
    }
    if ("commit".equals(request.getParameter("after"))) {
      response.setContentType("text/html;charset=UTF-8");
      PrintWriter out = response.getWriter();
      out.println("<p>partial page");
      out.flush();                                             // status 200 and these bytes are on their way
    }
    throw new IllegalStateException("Simulated failure in SELECT password_hash FROM users WHERE id = 3 (taskflow_app@mysql:3306)");
  }
}
