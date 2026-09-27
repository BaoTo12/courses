package com.taskflow.web.tasks;

import com.taskflow.dao.DuplicateKeyException;
import com.taskflow.model.Task;
import com.taskflow.service.TaskService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.CurrentUser;
import com.taskflow.web.Flash;
import com.taskflow.web.Http;
import com.taskflow.web.Params;
import com.taskflow.web.errors.NotFoundException;
import java.io.IOException;
import java.util.Map;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S37 (37.10): GET /tasks/edit?id=N → the form, pre-filled. POST /tasks/edit (id in a hidden field) → validate →
 * 400 + the form again, or save + flash + 303 → the task. Same rules as create (the CSRF token: CsrfFilter), only the form's fields.
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
    long id = Params.requiredId(request, "id");                       // S43: bad id → BadRequestException → 400 page
    Task task = service.task(id, CurrentUser.get(request))           // S42: owner or admin only (42.05)
        .orElseThrow(NotFoundException::new);
    TaskFormPage.show(request, response, service, TaskForm.of(task), Map.of(), id);
  }

  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    long id = Params.requiredId(request, "id");
    Task stored = service.task(id, CurrentUser.get(request)).orElseThrow(NotFoundException::new);
    TaskForm form = TaskForm.from(request);
    Map<String, String> errors = form.validate(service.categoryIds());
    if (errors.isEmpty()) {
      Task task = stored;             // the STORED task: its id, owner and status stay as they are
      form.applyTo(task);             // only the five form fields change (37.11)
      try {
        if (!service.update(task, CurrentUser.get(request))) throw new NotFoundException(); // deleted in the meantime
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
