package com.taskflow.web.tasks;

import com.taskflow.dao.DuplicateKeyException;
import com.taskflow.model.Task;
import com.taskflow.service.TaskService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.Csrf;
import com.taskflow.web.Flash;
import com.taskflow.web.Http;
import java.io.IOException;
import java.util.Map;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * GET /tasks/new → the empty form. POST /tasks/new → validate →
 *   invalid: 400 + the SAME form again, with errors and the user's values (a FORWARD: 37.05);
 *   valid:   save, a flash message, 303 → the new task (Post/Redirect/Get: 37.08).
 * S31 printed the form with println; S37 renders form.jsp (shared with edit) and checks the CSRF token (37.13).
 */
@WebServlet("/tasks/new")
public class TaskCreateServlet extends HttpServlet {

  private TaskService service;

  @Override
  public void init() {
    service = AppContextListener.taskService(getServletContext());
  }

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    TaskFormPage.show(request, response, service, new TaskForm(), Map.of(), null);
  }

  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    request.setCharacterEncoding("UTF-8"); // BEFORE the first getParameter: the form body is UTF-8 (30.17)
    if (!Csrf.isValid(request)) {
      response.sendError(HttpServletResponse.SC_FORBIDDEN, "Invalid or missing CSRF token");
      return;
    }
    TaskForm form = TaskForm.from(request);
    Map<String, String> errors = form.validate(service.categoryIds());
    if (errors.isEmpty()) {
      Task task = new Task();
      form.applyTo(task);
      task.setOwnerId(1); // no login yet: S41 takes the owner from the SESSION, never from the form (37.11)
      try {
        Task saved = service.create(task);
        Flash.put(request, "Task created.");
        Http.seeOther(response, request.getContextPath() + "/tasks/view?id=" + saved.getId());
        return;
      } catch (DuplicateKeyException e) {  // a business rule the database enforces: UNIQUE (owner_id, title)
        errors.put("title", "you already have a task with this title");
      }
    }
    response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
    TaskFormPage.show(request, response, service, form, errors, null);
  }
}
