package com.taskflow.web.tasks;

import com.taskflow.service.TaskService;
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
 * S31 Your Turn (31.13): POST /tasks/delete (id) → delete → redirect to the list.
 * doPost ONLY: a GET is answered 405 by HttpServlet (30.07), so links, prefetchers and <img> tags can't delete (29.03).
 * The CSRF token is checked by CsrfFilter before this servlet runs (S40). Authorisation ("may THIS user delete it?") is TaskService's job (S42).
 */
@WebServlet("/tasks/delete")
public class TaskDeleteServlet extends HttpServlet {

  private TaskService service;

  @Override
  public void init() {
    service = AppContextListener.taskService(getServletContext()); // S36 (36.05)
  }

  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
    long id = Params.requiredId(request, "id");                       // S43: bad id → BadRequestException → 400 page
    if (!service.delete(id, CurrentUser.get(request))) throw new NotFoundException(); // S42: owner or admin only (42.05)
    Flash.put(request, "Task deleted.");
    Http.seeOther(response, request.getContextPath() + "/tasks"); // S37: PRG with 303 (37.08)
  }
}
