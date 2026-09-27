package com.taskflow.web.tasks;

import com.taskflow.dao.DuplicateKeyException;
import com.taskflow.model.Task;
import com.taskflow.service.TaskService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.Csrf;
import com.taskflow.web.Flash;
import com.taskflow.web.Http;
import com.taskflow.web.Params;
import java.io.IOException;
import java.util.Map;
import java.util.Optional;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S37 (37.10): GET /tasks/edit?id=N → the form, pre-filled. POST /tasks/edit (id in a hidden field) → validate →
 * 400 + the form again, or save + flash + 303 → the task. Same rules as create: CSRF token, only the form's fields.
 */
@WebServlet("/tasks/edit")
public class TaskEditServlet extends HttpServlet {

  private TaskService service;

  @Override
  public void init() {
    service = AppContextListener.taskService(getServletContext());
  }

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    Long id = Params.positiveId(request.getParameter("id"));
    if (id == null) {
      response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Parameter 'id' must be a positive number");
      return;
    }
    Optional<Task> task = service.task(id);
    if (task.isEmpty()) {
      response.sendError(HttpServletResponse.SC_NOT_FOUND);
      return;
    }
    TaskFormPage.show(request, response, service, TaskForm.of(task.get()), Map.of(), id);
  }

  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    request.setCharacterEncoding("UTF-8");
    if (!Csrf.isValid(request)) {
      response.sendError(HttpServletResponse.SC_FORBIDDEN, "Invalid or missing CSRF token");
      return;
    }
    Long id = Params.positiveId(request.getParameter("id"));
    Optional<Task> stored = id == null ? Optional.empty() : service.task(id);
    if (stored.isEmpty()) {
      response.sendError(HttpServletResponse.SC_NOT_FOUND);
      return;
    }
    TaskForm form = TaskForm.from(request);
    Map<String, String> errors = form.validate(service.categoryIds());
    if (errors.isEmpty()) {
      Task task = stored.get();       // the STORED task: its id, owner and status stay as they are
      form.applyTo(task);             // only the five form fields change (37.11)
      try {
        if (!service.update(task)) {
          response.sendError(HttpServletResponse.SC_NOT_FOUND); // deleted in the meantime
          return;
        }
        Flash.put(request, "Task saved.");
        Http.seeOther(response, request.getContextPath() + "/tasks/view?id=" + id);
        return;
      } catch (DuplicateKeyException e) {
        errors.put("title", "you already have a task with this title");
      }
    }
    response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
    TaskFormPage.show(request, response, service, form, errors, id);
  }
}
