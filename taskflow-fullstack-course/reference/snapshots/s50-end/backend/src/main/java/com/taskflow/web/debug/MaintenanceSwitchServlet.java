package com.taskflow.web.debug;

import com.taskflow.web.Http;
import com.taskflow.web.filters.MaintenanceMode;
import java.io.IOException;
import java.net.InetAddress;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S40 (40.15): POST /debug/maintenance (enabled=true|false) switches maintenance mode at runtime.
 * Loopback only (like every /debug page); the CSRF token is checked by CsrfFilter like any POST.
 */
@WebServlet("/debug/maintenance")
public class MaintenanceSwitchServlet extends HttpServlet {

  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
    if (!InetAddress.getByName(request.getRemoteAddr()).isLoopbackAddress()) {
      response.sendError(HttpServletResponse.SC_NOT_FOUND);
      return;
    }
    MaintenanceMode mode = (MaintenanceMode) getServletContext().getAttribute(MaintenanceMode.ATTRIBUTE);
    mode.setEnabled(Boolean.parseBoolean(request.getParameter("enabled")));
    Http.seeOther(response, request.getContextPath() + "/debug/stats");
  }
}
