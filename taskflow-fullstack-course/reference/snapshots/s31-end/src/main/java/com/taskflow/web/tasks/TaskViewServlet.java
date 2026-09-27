package com.taskflow.web.tasks;

import com.taskflow.model.Task;
import com.taskflow.store.InMemoryTaskStore;
import com.taskflow.web.Html;
import com.taskflow.web.Layout;
import com.taskflow.web.Params;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.Optional;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/** S31 (31.03): GET /tasks/view?id=N → the task; a missing/invalid id → 400; an unknown id → 404. */
@WebServlet("/tasks/view")
public class TaskViewServlet extends HttpServlet {

  private final InMemoryTaskStore store = InMemoryTaskStore.shared();

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    Long id = Params.positiveId(request.getParameter("id"));
    if (id == null) {
      response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Parameter 'id' must be a positive number");
      return; // ALWAYS return after sendError/sendRedirect (30.18)
    }
    Optional<Task> found = store.findById(id);
    if (found.isEmpty()) {
      response.sendError(HttpServletResponse.SC_NOT_FOUND);
      return;
    }
    Task task = found.get();

    PrintWriter out = Layout.begin(request, response, task.getTitle()); // Layout escapes the title
    out.println("<p><span class=\"badge\">" + task.getStatus() + "</span> <span class=\"badge\">" + task.getPriority() + "</span></p>");
    out.println("<p>" + (task.getDescription().isEmpty() ? "<span class=\"text-muted\">No description.</span>" : Html.escape(task.getDescription())) + "</p>");
    out.println("<p class=\"text-muted\">Due: " + (task.getDueDate() == null ? "no due date" : task.getDueDate()) + "</p>");
    out.println("<p><a href=\"" + request.getContextPath() + "/tasks\">Back to the list</a></p>");
    Layout.end(out);
  }
}
