package com.taskflow.web.debug;

import java.io.IOException;
import java.net.InetAddress;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S34 (34.16): what EL's implicit objects contain for THIS request, rendered by debug/el.jsp.
 * A development tool that shows headers and cookies: answered only for requests from this machine,
 * exactly like RequestInfoServlet (30.10). The same attribute name in two scopes shows how ${name} searches (34.03).
 */
@WebServlet("/debug/el")
public class ElDebugServlet extends HttpServlet {

  @Override
  public void init() {
    getServletContext().setAttribute("scopeDemo", "application");
  }

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    if (!InetAddress.getByName(request.getRemoteAddr()).isLoopbackAddress()) {
      response.sendError(HttpServletResponse.SC_NOT_FOUND);
      return;
    }
    request.setAttribute("scopeDemo", "request"); // shadows the application attribute for ${scopeDemo}
    request.setAttribute("pageTitle", "EL debug");
    request.getRequestDispatcher("/WEB-INF/views/debug/el.jsp").forward(request, response);
  }
}
