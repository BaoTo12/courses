package com.taskflow.web.tasks;

import com.taskflow.model.Task;
import com.taskflow.store.InMemoryTaskStore;
import java.io.IOException;
import java.util.List;
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

  private final InMemoryTaskStore store = InMemoryTaskStore.shared();

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    List<Task> all = store.findAll();
    if (all.isEmpty()) {
      response.sendError(HttpServletResponse.SC_NOT_FOUND);
      return;
    }
    long newest = all.get(all.size() - 1).getId();
    // A path relative to the CONTEXT (no /taskflow prefix): forwards never leave the web app.
    request.getRequestDispatcher("/tasks/view?id=" + newest).forward(request, response);
  }
}
