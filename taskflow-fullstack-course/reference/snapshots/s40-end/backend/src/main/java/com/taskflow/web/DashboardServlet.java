package com.taskflow.web;

import com.taskflow.service.TaskService;
import java.io.IOException;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/** S39 (39.10): GET /dashboard → overdue tasks and tasks due within 7 days, rendered with the shared task-row fragment. */
@WebServlet("/dashboard")
public class DashboardServlet extends HttpServlet {

  private TaskService service;

  @Override
  public void init() {
    service = AppContextListener.taskService(getServletContext());
  }

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    request.setAttribute("pageTitle", "Dashboard");
    request.setAttribute("today", service.today());
    request.setAttribute("overdue", service.overdue());
    request.setAttribute("dueSoon", service.dueWithin(7));
    Csrf.prepare(request);   // the rows contain POST forms (toggle, delete)
    Flash.consume(request);
    request.getRequestDispatcher("/WEB-INF/views/dashboard.jsp").forward(request, response);
  }
}
