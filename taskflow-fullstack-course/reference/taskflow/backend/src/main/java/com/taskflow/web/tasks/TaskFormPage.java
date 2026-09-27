package com.taskflow.web.tasks;

import com.taskflow.model.Priority;
import com.taskflow.service.TaskService;
import java.io.IOException;
import java.util.Map;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/** S37 (37.06): shows form.jsp, for creating (taskId null) or editing, with the form's values and its errors. */
final class TaskFormPage {

  private TaskFormPage() {}

  static void show(HttpServletRequest request, HttpServletResponse response, TaskService service,
      TaskForm form, Map<String, String> errors, Long taskId) throws ServletException, IOException {
    request.setAttribute("form", form);
    request.setAttribute("errors", errors);
    request.setAttribute("taskId", taskId);
    request.setAttribute("formAction", taskId == null ? "/tasks/new" : "/tasks/edit");
    request.setAttribute("pageTitle", taskId == null ? "New task" : "Edit task");
    request.setAttribute("priorities", Priority.values());
    request.setAttribute("categories", service.categories());
    request.getRequestDispatcher("/WEB-INF/views/tasks/form.jsp").forward(request, response);
  }
}
