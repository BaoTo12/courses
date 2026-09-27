package com.taskflow.web.tasks;

import com.taskflow.service.TaskService;
import com.taskflow.service.TaskService.ShareResult;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.CurrentUser;
import com.taskflow.web.Flash;
import com.taskflow.web.Http;
import com.taskflow.web.Params;
import com.taskflow.web.errors.NotFoundException;
import java.io.IOException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S51: sharing from the task page (owner or admin; CSRF-checked by CsrfFilter; PRG back to the task).
 *   POST /tasks/share    id, username   → read-only access for that user
 *   POST /tasks/unshare  id, userId     → access removed
 * Who may do it, and the rules (not the owner, not twice), are TaskService's (S42's rule: the service decides).
 */
@WebServlet({"/tasks/share", "/tasks/unshare"})
public class TaskShareServlet extends HttpServlet {

  private TaskService service;

  @Override
  public void init() {
    service = AppContextListener.taskService(getServletContext());
  }

  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
    long id = Params.requiredId(request, "id");
    if ("/tasks/unshare".equals(request.getServletPath())) {
      if (!service.unshare(id, CurrentUser.get(request), Params.requiredId(request, "userId"))) throw new NotFoundException();
      Flash.put(request, "Sharing removed.");
    } else {
      ShareResult result = service.share(id, CurrentUser.get(request), request.getParameter("username"))
          .orElseThrow(NotFoundException::new);
      Flash.put(request, switch (result) {
        case SHARED -> "Task shared.";
        case NO_SUCH_USER -> "There's no user with that name.";
        case OWNER -> "That user owns the task.";
        case ALREADY_SHARED -> "The task is already shared with that user.";
      });
    }
    Http.seeOther(response, request.getContextPath() + "/tasks/view?id=" + id);
  }
}