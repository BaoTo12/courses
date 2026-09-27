package com.taskflow.web.admin;

import com.taskflow.service.UserAdminService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.CurrentUser;
import com.taskflow.web.Flash;
import java.io.IOException;
import java.util.List;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/** S42 (42.07): GET /admin/users → every account, with enable/disable and role forms. Admins only (AuthorizationFilter). */
@WebServlet("/admin/users")
public class AdminUsersServlet extends HttpServlet {

  private UserAdminService service;

  @Override
  public void init() {
    service = AppContextListener.userAdminService(getServletContext());
  }

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    request.setAttribute("pageTitle", "Users");
    request.setAttribute("accounts", service.accounts(CurrentUser.get(request)));
    request.setAttribute("roles", List.of("USER", "ADMIN"));
    Flash.consume(request);
    request.getRequestDispatcher("/WEB-INF/views/admin/users.jsp").forward(request, response);
  }
}
