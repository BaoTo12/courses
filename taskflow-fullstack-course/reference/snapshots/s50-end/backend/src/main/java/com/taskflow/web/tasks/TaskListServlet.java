package com.taskflow.web.tasks;

import com.taskflow.dao.TaskFilter;
import com.taskflow.dao.TaskSort;
import com.taskflow.model.Task;
import com.taskflow.model.TaskStatus;
import com.taskflow.security.AuthUser;
import com.taskflow.service.Page;
import com.taskflow.service.TaskService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.CurrentUser;
import com.taskflow.web.Flash;
import com.taskflow.web.Params;
import com.taskflow.web.RecentTasks;
import java.io.IOException;
import java.util.Optional;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * GET /tasks[?status=DONE][&q=text][&category=2][&sort=due][&dir=desc][&page=2]. A thin CONTROLLER (36.05):
 *   1. parse and validate the request into typed values (a TaskFilter + a page number),
 *   2. ask the SERVICE for the data,
 *   3. put it in request attributes, and forward to the view.
 * No queries, no HTML here. 36.11 (Your Turn) added the category filter and the sort.
 * S44: one PAGE at a time (44.04), and the sort direction (44.16). Invalid page/dir values fall back to defaults.
 */
@WebServlet("/tasks")
public class TaskListServlet extends HttpServlet {

  private TaskService service;

  @Override
  public void init() {
    service = AppContextListener.taskService(getServletContext()); // created once by the listener (36.04)
  }

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    TaskFilter filter = new TaskFilter(
        TaskStatus.parse(request.getParameter("status")),        // unknown → null → all (31.01)
        null,                                                    // S46: priority (the JSON API filters by it)
        normalise(request.getParameter("q")),                    // blank → null (34.12)
        Params.positiveId(request.getParameter("category")),     // not a positive number → null → all
        TaskSort.parse(request.getParameter("sort")),            // not in the allow-list → the default (36.09)
        "desc".equals(request.getParameter("dir")),              // S44: anything but "desc" → ascending
        null);                                                   // the owner: TaskService decides (42.09)
    Long requestedPage = Params.positiveId(request.getParameter("page"));

    AuthUser user = CurrentUser.get(request);
    Page<Task> page = service.page(filter, requestedPage == null ? 1 : requestedPage.intValue(), user); // S42 + S44

    request.setAttribute("pageTitle", "Tasks");
    request.setAttribute("taskPage", page);
    request.setAttribute("tasks", page.getItems());
    request.setAttribute("statusFilter", filter.status());
    request.setAttribute("categoryFilter", filter.categoryId());
    request.setAttribute("sort", filter.sort());
    request.setAttribute("descending", filter.descending());
    request.setAttribute("today", service.today());
    request.setAttribute("overdueCount", service.overdue(user).size()); // S44: all of the user's overdue tasks, not one page's
    request.setAttribute("stats", service.countByStatus(user));
    request.setAttribute("statuses", TaskStatus.values());
    request.setAttribute("categories", service.categories());
    request.setAttribute("sorts", TaskSort.values());
    request.setAttribute("recentTasks", RecentTasks.ids(request).stream()          // S38: this user's last 5 (session)
        .map(id -> service.task(id, user)).flatMap(Optional::stream).toList());   // deleted ones simply drop out
    Flash.consume(request);  // S37: "Task deleted." etc., shown once (37.09)
    request.getRequestDispatcher("/WEB-INF/views/tasks/list.jsp").forward(request, response);
  }

  private static String normalise(String q) {
    return q == null || q.isBlank() ? null : q.strip();
  }
}
