package com.taskflow.web.tasks;

import com.taskflow.model.Comment;
import com.taskflow.store.InMemoryCommentStore;
import com.taskflow.store.InMemoryTaskStore;
import com.taskflow.web.Params;
import java.io.IOException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * PROVIDED (S35, for the 35.14 lab): POST /tasks/comment (id, body) adds a comment, then redirects to the task.
 * Validation is about SHAPE only (present, not blank, at most 1000 characters). HTML in the body is allowed and
 * stored as is: safety comes from escaping at render time (35.15). The author is alice (id 1) until S38's login.
 */
@WebServlet("/tasks/comment")
public class TaskCommentServlet extends HttpServlet {

  private final InMemoryTaskStore tasks = InMemoryTaskStore.shared();
  private final InMemoryCommentStore comments = InMemoryCommentStore.shared();

  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
    request.setCharacterEncoding("UTF-8");
    Long taskId = Params.positiveId(request.getParameter("id"));
    if (taskId == null || tasks.findById(taskId).isEmpty()) {
      response.sendError(HttpServletResponse.SC_NOT_FOUND);
      return;
    }
    String body = request.getParameter("body");
    if (body == null || body.isBlank() || body.length() > Comment.MAX_BODY_LENGTH) {
      response.sendError(HttpServletResponse.SC_BAD_REQUEST, "A comment needs 1 to " + Comment.MAX_BODY_LENGTH + " characters");
      return;
    }
    Comment comment = new Comment();
    comment.setTaskId(taskId);
    comment.setAuthorId(1); // placeholder until S38 (the logged-in user)
    comment.setBody(body.strip());
    comments.add(comment);
    response.sendRedirect(request.getContextPath() + "/tasks/view?id=" + taskId + "#comments");
  }
}
