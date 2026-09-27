package com.taskflow.web.tasks;

import com.taskflow.model.Task;
import com.taskflow.model.TaskStatus;
import com.taskflow.store.InMemoryTaskStore;
import java.io.IOException;
import java.util.List;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * GET /tasks[?status=DONE]. S31 wrote the HTML here with println; since S32 this servlet is a CONTROLLER:
 * it decides what to show, puts it in request attributes, and FORWARDS to a JSP that renders it (32.06).
 */
@WebServlet("/tasks")
public class TaskListServlet extends HttpServlet {

  private final InMemoryTaskStore store = InMemoryTaskStore.shared();

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    TaskStatus filter = TaskStatus.parse(request.getParameter("status")); // unknown → null → all (31.01)
    List<Task> tasks = filter == null ? store.findAll() : store.findByStatus(filter);

    request.setAttribute("tasks", tasks);          // the MODEL for the view (32.05)
    request.setAttribute("statusFilter", filter);  // may be null
    request.getRequestDispatcher("/WEB-INF/views/tasks/list.jsp").forward(request, response); // the VIEW (31.07)
  }
}
