package com.taskflow.web.tasks;

import com.taskflow.model.Task;
import com.taskflow.model.TaskStatus;
import com.taskflow.store.InMemoryTaskStore;
import java.io.IOException;
import java.time.Clock;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * GET /tasks[?status=DONE][&q=text]. A CONTROLLER (32.06): it decides what to show, puts it in request attributes,
 * and forwards to list.jsp. S34: it now also decides everything list.jsp used to compute itself (33.16's critique):
 * "today", the overdue count, and the per-status stats. The view only displays them, with EL.
 */
@WebServlet("/tasks")
public class TaskListServlet extends HttpServlet {

  private final InMemoryTaskStore store = InMemoryTaskStore.shared();
  private final Clock clock = Clock.systemDefaultZone(); // one place to choose the clock (S44: the user's timezone)

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    TaskStatus filter = TaskStatus.parse(request.getParameter("status")); // unknown → null → all (31.01)
    String query = normalise(request.getParameter("q"));                  // S34: title search

    List<Task> all = store.findAll();
    List<Task> tasks = all.stream()
        .filter(t -> filter == null || t.getStatus() == filter)
        .filter(t -> query == null || t.getTitle().toLowerCase(Locale.ROOT).contains(query))
        .toList();
    LocalDate today = LocalDate.now(clock);

    Map<String, Integer> stats = new LinkedHashMap<>();                    // 34.20: every status, even at 0
    for (TaskStatus status : TaskStatus.values()) stats.put(status.name(), 0);
    for (Task task : all) stats.merge(task.getStatus().name(), 1, Integer::sum);

    request.setAttribute("pageTitle", "Tasks");                          // read by header.jspf as ${pageTitle}
    request.setAttribute("tasks", tasks);
    request.setAttribute("statusFilter", filter);                        // may be null
    request.setAttribute("today", today);                                // for ${task.isOverdue(today)}
    request.setAttribute("overdueCount", tasks.stream().filter(t -> t.isOverdue(today)).count());
    request.setAttribute("stats", stats);
    request.getRequestDispatcher("/WEB-INF/views/tasks/list.jsp").forward(request, response); // the VIEW (31.07)
  }

  private static String normalise(String q) {
    return q == null || q.isBlank() ? null : q.strip().toLowerCase(Locale.ROOT);
  }
}
