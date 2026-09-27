package com.taskflow.web.debug;

import java.io.IOException;
import java.net.InetAddress;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/** S45 (45.16): GET /debug/slow?ms=600 → answers after that many milliseconds (at most 5000). Loopback only. */
@WebServlet("/debug/slow")
public class SlowServlet extends HttpServlet {

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    if (!InetAddress.getByName(request.getRemoteAddr()).isLoopbackAddress()) {
      response.sendError(HttpServletResponse.SC_NOT_FOUND);
      return;
    }
    String raw = request.getParameter("ms");
    long ms = raw != null && raw.matches("\\d{1,4}") ? Math.min(Long.parseLong(raw), 5000) : 600;
    try {
      Thread.sleep(ms);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
    response.setContentType("text/plain;charset=UTF-8");
    response.getWriter().write("slept " + ms + " ms");
  }
}
