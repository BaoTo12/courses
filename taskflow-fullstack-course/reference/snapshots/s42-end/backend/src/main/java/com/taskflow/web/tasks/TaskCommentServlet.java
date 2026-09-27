package com.taskflow.web.tasks;

import com.taskflow.model.Comment;
import com.taskflow.service.TaskService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.CurrentUser;
import com.taskflow.web.Flash;
import com.taskflow.web.Http;
import com.taskflow.web.Params;
import java.io.IOException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * PROVIDED (S35, for the 35.14 lab): POST /tasks/comment (id, body) adds a comment, then redirects to the task.
 * Validation is about SHAPE only (present, not blank, at most 1000 characters). HTML in the body is allowed and
 * stored as is: safety comes from escaping at render time (35.15). The author is the logged-in user (S41).
 * S36: saved through TaskService → CommentDao (MySQL).
 */
@WebServlet("/tasks/comment")
public class TaskCommentServlet extends HttpServlet {

  private TaskService service;

  @Override
  public void init() {
    service = AppContextListener.taskService(getServletContext()); // S36 (36.05)
  }

  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
    Long taskId = Params.positiveId(request.getParameter("id"));
    if (taskId == null) {
      response.sendError(HttpServletResponse.SC_NOT_FOUND);
      return;
    }
    String body = request.getParameter("body");
    if (body == null || body.isBlank() || body.length() > Comment.MAX_BODY_LENGTH) {
      response.sendError(HttpServletResponse.SC_BAD_REQUEST, "A comment needs 1 to " + Comment.MAX_BODY_LENGTH + " characters");
      return;
    }
    if (!service.addComment(taskId, CurrentUser.get(request), body.strip())) { // S41: the logged-in user
      response.sendError(HttpServletResponse.SC_NOT_FOUND);
      return;
    }
    Flash.put(request, "Comment added.");
    Http.seeOther(response, request.getContextPath() + "/tasks/view?id=" + taskId + "#comments"); // S37: 303
  }
}
