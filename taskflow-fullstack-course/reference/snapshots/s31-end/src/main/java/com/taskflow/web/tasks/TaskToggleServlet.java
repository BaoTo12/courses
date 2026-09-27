package com.taskflow.web.tasks;

import com.taskflow.model.Task;
import com.taskflow.model.TaskStatus;
import com.taskflow.store.InMemoryTaskStore;
import com.taskflow.web.Params;
import java.io.IOException;
import java.util.Optional;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/** S31 Your Turn (31.13): POST /tasks/toggle (id) → DONE ↔ TODO → redirect back to the list. */
@WebServlet("/tasks/toggle")
public class TaskToggleServlet extends HttpServlet {

  private final InMemoryTaskStore store = InMemoryTaskStore.shared();

  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
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
    Task task = found.get(); // a COPY: changing it changes nothing until save()
    task.setStatus(task.isDone() ? TaskStatus.TODO : TaskStatus.DONE);
    store.save(task);
    response.sendRedirect(request.getContextPath() + "/tasks");
  }
}
