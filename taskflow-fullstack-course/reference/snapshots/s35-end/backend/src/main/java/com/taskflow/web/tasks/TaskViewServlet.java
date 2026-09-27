package com.taskflow.web.tasks;

import com.taskflow.model.CommentDetails;
import com.taskflow.model.Task;
import com.taskflow.model.TaskDetails;
import com.taskflow.store.InMemoryCommentStore;
import com.taskflow.store.InMemoryDirectory;
import com.taskflow.store.InMemoryTaskStore;
import com.taskflow.web.Params;
import java.io.IOException;
import java.util.List;
import java.util.Optional;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * GET /tasks/view?id=N. The controller handles every error path (400, 404) BEFORE choosing the view,
 * so view.jsp can simply assume a task exists (32.12).
 * S34 (34.09): it assembles a TaskDetails (the task + its category + its owner) for ${details.…} in the view.
 * S35 (35.19): and the task's comments with their authors.
 */
@WebServlet("/tasks/view")
public class TaskViewServlet extends HttpServlet {

  private final InMemoryTaskStore store = InMemoryTaskStore.shared();
  private final InMemoryDirectory directory = InMemoryDirectory.shared();
  private final InMemoryCommentStore comments = InMemoryCommentStore.shared();

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
    Task task = found.get();
    List<CommentDetails> taskComments = comments.findByTask(task.getId()).stream()      // S35 (35.18)
        .map(c -> new CommentDetails(c, directory.findUser(c.getAuthorId()).orElse(null)))
        .toList();
    TaskDetails details = new TaskDetails(
        task,
        task.getCategoryId() == null ? null : directory.findCategory(task.getCategoryId()).orElse(null),
        directory.findUser(task.getOwnerId()).orElse(null),
        taskComments);

    request.setAttribute("details", details);
    request.setAttribute("pageTitle", task.getTitle()); // header.jspf escapes it
    request.getRequestDispatcher("/WEB-INF/views/tasks/view.jsp").forward(request, response);
  }
}
