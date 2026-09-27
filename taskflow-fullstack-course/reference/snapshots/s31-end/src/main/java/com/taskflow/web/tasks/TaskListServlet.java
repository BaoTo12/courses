package com.taskflow.web.tasks;

import com.taskflow.model.Task;
import com.taskflow.model.TaskStatus;
import com.taskflow.store.InMemoryTaskStore;
import com.taskflow.web.Html;
import com.taskflow.web.Layout;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/** S31 (31.01): GET /tasks[?status=DONE] → an HTML table, built with println. Painful on purpose. */
@WebServlet("/tasks")
public class TaskListServlet extends HttpServlet {

  private final InMemoryTaskStore store = InMemoryTaskStore.shared(); // thread-safe (provided)

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    // An unknown ?status= is IGNORED (show all) rather than an error: a filter, not a resource id.
    TaskStatus filter = TaskStatus.parse(request.getParameter("status"));
    List<Task> tasks = filter == null ? store.findAll() : store.findByStatus(filter);
    String ctx = request.getContextPath();

    PrintWriter out = Layout.begin(request, response, "Tasks");
    out.print("<p>Show: <a href=\"" + ctx + "/tasks\">All</a>");
    for (TaskStatus status : TaskStatus.values()) {
      out.print(" · <a href=\"" + ctx + "/tasks?status=" + status.name() + "\">" + status.name() + "</a>");
    }
    out.println("</p>");

    if (tasks.isEmpty()) {
      out.println("<p class=\"text-muted\">No tasks.</p>");
    } else {
      out.println("<table><thead><tr><th>Title</th><th>Status</th><th>Priority</th><th>Due</th><th></th></tr></thead><tbody>");
      for (Task task : tasks) {
        out.println("<tr>");
        out.println("<td><a href=\"" + ctx + "/tasks/view?id=" + task.getId() + "\">" + Html.escape(task.getTitle()) + "</a></td>");
        out.println("<td>" + task.getStatus() + "</td><td>" + task.getPriority() + "</td>");
        out.println("<td>" + (task.getDueDate() == null ? "—" : task.getDueDate()) + "</td>");
        // State changes are POST forms, never links (29.03). 31.13's Your Turn.
        out.println("<td>" + postButton(ctx + "/tasks/toggle", task.getId(), task.isDone() ? "Reopen" : "Mark done")
            + " " + postButton(ctx + "/tasks/delete", task.getId(), "Delete") + "</td>");
        out.println("</tr>");
      }
      out.println("</tbody></table>");
    }
    Layout.end(out);
  }

  private static String postButton(String action, long id, String label) {
    return "<form method=\"post\" action=\"" + action + "\" style=\"display:inline\">"
        + "<input type=\"hidden\" name=\"id\" value=\"" + id + "\">"
        + "<button class=\"btn btn--sm btn--secondary\" type=\"submit\">" + label + "</button></form>";
  }
}
