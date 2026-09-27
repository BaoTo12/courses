package com.taskflow.web.tasks;

import com.taskflow.service.TaskService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.CurrentUser;
import java.util.OptionalLong;
import java.io.IOException;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S31 (31.07): GET /tasks/latest → FORWARDS to /tasks/view?id=<newest>. A forward is server-internal: one request,
 * the URL bar keeps /tasks/latest, and TaskViewServlet sees id as a parameter (the forward path's query string).
 */
@WebServlet("/tasks/latest")
public class TaskLatestServlet extends HttpServlet {

  private TaskService service;

  @Override
  public void init() {
    service = AppContextListener.taskService(getServletContext()); // S36 (36.05)
  }

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    OptionalLong newest = service.latestId(CurrentUser.get(request)); // S36: SELECT MAX(id); S42: of the tasks this user may see
    if (newest.isEmpty()) {
      response.sendError(HttpServletResponse.SC_NOT_FOUND);
      return;
    }
    // A path relative to the CONTEXT (no /taskflow prefix): forwards never leave the web app.
    request.getRequestDispatcher("/tasks/view?id=" + newest.getAsLong()).forward(request, response);
  }
}
