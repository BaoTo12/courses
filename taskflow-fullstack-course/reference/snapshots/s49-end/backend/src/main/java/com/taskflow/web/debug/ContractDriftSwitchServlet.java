package com.taskflow.web.debug;

import com.taskflow.web.Http;
import java.io.IOException;
import java.net.InetAddress;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * PROVIDED LAB TOOL (S48, 48.05): POST /debug/contract-drift (enabled=true|false) switches ContractDriftFilter.
 * Loopback only; the form on /debug/stats posts here with the CSRF token (CsrfFilter), like the maintenance switch (40.15).
 */
@WebServlet("/debug/contract-drift")
public class ContractDriftSwitchServlet extends HttpServlet {

  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
    if (!InetAddress.getByName(request.getRemoteAddr()).isLoopbackAddress()) {
      response.sendError(HttpServletResponse.SC_NOT_FOUND);
      return;
    }
    getServletContext().setAttribute(ContractDriftFilter.ATTRIBUTE, Boolean.parseBoolean(request.getParameter("enabled")));
    Http.seeOther(response, request.getContextPath() + "/debug/stats");
  }
}
