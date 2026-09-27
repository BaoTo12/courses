package com.taskflow.web.tasks;

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

/** S31 Your Turn (31.13): POST /tasks/toggle (id) → DONE ↔ TODO → redirect back to the list. */
@WebServlet("/tasks/toggle")
public class TaskToggleServlet extends HttpServlet {

  private TaskService service;

  @Override
  public void init() {
    service = AppContextListener.taskService(getServletContext()); // S36 (36.05)
  }

  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
    Long id = Params.positiveId(request.getParameter("id"));
    if (id == null) {
      response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Parameter 'id' must be a positive number");
      return;
    }
    if (!service.toggle(id, CurrentUser.get(request))) { // S36: the rule "DONE ↔ TODO" lives in the service now
      response.sendError(HttpServletResponse.SC_NOT_FOUND);
      return;
    }
    Flash.put(request, "Task status changed.");
    Http.seeOther(response, request.getContextPath() + "/tasks"); // S37: PRG with 303 (37.08)
  }
}
