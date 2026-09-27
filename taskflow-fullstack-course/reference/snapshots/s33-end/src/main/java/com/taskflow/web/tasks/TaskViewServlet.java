package com.taskflow.web.tasks;

import com.taskflow.model.Task;
import com.taskflow.store.InMemoryTaskStore;
import com.taskflow.web.Params;
import java.io.IOException;
import java.util.Optional;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * GET /tasks/view?id=N. The controller handles every error path (400, 404) BEFORE choosing the view,
 * so view.jsp can simply assume a task exists (32.12).
 */
@WebServlet("/tasks/view")
public class TaskViewServlet extends HttpServlet {

  private final InMemoryTaskStore store = InMemoryTaskStore.shared();

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    Long id = Params.positiveId(request.getParameter("id"));
    if (id == null) {
      response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Parameter 'id' must be a positive number");
      return;
    }
    Optional<Task> found = store.findById(id);
    if (found.isEmpty()) {
      response.sendError(HttpServletResponse.SC_NOT_FOUND);
      return;
    }
    request.setAttribute("task", found.get());
    request.getRequestDispatcher("/WEB-INF/views/tasks/view.jsp").forward(request, response);
  }
}
