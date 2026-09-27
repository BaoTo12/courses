package com.taskflow.web.admin;

import com.taskflow.security.AuthUser;
import com.taskflow.service.UserAdminService;
import com.taskflow.service.UserAdminService.Change;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.CurrentUser;
import com.taskflow.web.Flash;
import com.taskflow.web.Http;
import com.taskflow.web.Params;
import java.io.IOException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S42 (42.07): the three account changes, each a POST (CSRF-checked by CsrfFilter), each answered with PRG:
 *   POST /admin/users/enable   id
 *   POST /admin/users/disable  id
 *   POST /admin/users/role     id, role (USER | ADMIN)
 * Only the id and the role are read from the form: nothing else about the account can be changed here (42.08).
 */
@WebServlet({"/admin/users/enable", "/admin/users/disable", "/admin/users/role"})
public class AdminUserChangeServlet extends HttpServlet {

  private UserAdminService service;

  @Override
  public void init() {
    service = AppContextListener.userAdminService(getServletContext());
  }

  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
    Long id = Params.positiveId(request.getParameter("id"));
    if (id == null) {
      response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Parameter 'id' must be a positive number");
      return;
    }
    AuthUser admin = CurrentUser.get(request);
    String ip = request.getRemoteAddr();
    Change change;
    switch (request.getServletPath()) {
      case "/admin/users/enable" -> change = service.setEnabled(admin, id, true, ip);
      case "/admin/users/disable" -> change = service.setEnabled(admin, id, false, ip);
      default -> {
        String role = request.getParameter("role");
        if (!UserAdminService.ROLES.contains(role)) {
          response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Unknown role");
          return;
        }
        change = service.changeRole(admin, id, role, ip);
      }
    }
    switch (change) {
      case NOT_FOUND -> {
        response.sendError(HttpServletResponse.SC_NOT_FOUND);
        return;
      }
      case OWN_ACCOUNT -> Flash.put(request, "You can't change your own account.");
      case DONE -> Flash.put(request, "User updated.");
    }
    Http.seeOther(response, request.getContextPath() + "/admin/users");
  }
}
