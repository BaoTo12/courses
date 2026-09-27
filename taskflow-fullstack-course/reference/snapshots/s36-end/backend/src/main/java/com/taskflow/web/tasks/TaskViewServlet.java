package com.taskflow.web.tasks;

import com.taskflow.model.TaskDetails;
import com.taskflow.service.TaskService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.Params;
import java.io.IOException;
import java.util.Optional;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * GET /tasks/view?id=N. The controller handles every error path (400, 404) BEFORE choosing the view (32.12).
 * S36: the service assembles the TaskDetails (task + category + owner + comments) from the database.
 */
@WebServlet("/tasks/view")
public class TaskViewServlet extends HttpServlet {

  private TaskService service;

  @Override
  public void init() {
    service = AppContextListener.taskService(getServletContext());
  }

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    Long id = Params.positiveId(request.getParameter("id"));
    if (id == null) {
      response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Parameter 'id' must be a positive number");
      return;
    }
    Optional<TaskDetails> details = service.details(id);
    if (details.isEmpty()) {
      response.sendError(HttpServletResponse.SC_NOT_FOUND);
      return;
    }
    request.setAttribute("details", details.get());
    request.setAttribute("pageTitle", details.get().getTask().getTitle()); // header.jspf escapes it
    request.getRequestDispatcher("/WEB-INF/views/tasks/view.jsp").forward(request, response);
  }
}
