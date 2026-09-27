package com.taskflow.web.tasks;

import com.taskflow.model.Priority;
import com.taskflow.model.Task;
import com.taskflow.service.TaskService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.Html;
import com.taskflow.web.Layout;
import java.io.IOException;
import java.io.PrintWriter;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S31 (31.05): GET /tasks/new → the form; POST /tasks/new → validate → redirect to the new task (31.06),
 * or the form again with the errors and the user's values (400).
 */
@WebServlet("/tasks/new")
public class TaskCreateServlet extends HttpServlet {

  static final int TITLE_MAX = 120;
  private TaskService service;

  @Override
  public void init() {
    service = AppContextListener.taskService(getServletContext()); // S36 (36.05)
  }

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    renderForm(request, response, "", "MEDIUM", "", Map.of());
  }

  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
    request.setCharacterEncoding("UTF-8"); // BEFORE the first getParameter: the form body is UTF-8 (30.17 §5; a filter in S39)
    String title = trimmed(request.getParameter("title"));
    String priorityRaw = request.getParameter("priority");
    String dueRaw = trimmed(request.getParameter("dueDate"));

    // Validate EVERYTHING on the server: the form's maxlength/required are UX only (29.09).
    Map<String, String> errors = new LinkedHashMap<>();
    if (title.isEmpty()) errors.put("title", "must not be blank");
    else if (title.length() > TITLE_MAX) errors.put("title", "size must be at most " + TITLE_MAX);
    Priority priority = Priority.parse(priorityRaw);
    if (priority == null) errors.put("priority", "must be one of LOW, MEDIUM, HIGH");
    LocalDate dueDate = null;
    if (!dueRaw.isEmpty()) {
      try {
        dueDate = LocalDate.parse(dueRaw); // yyyy-MM-dd, what <input type="date"> sends
      } catch (DateTimeParseException e) {
        errors.put("dueDate", "must be a date (YYYY-MM-DD)");
      }
    }

    if (!errors.isEmpty()) {
      response.setStatus(HttpServletResponse.SC_BAD_REQUEST); // the SAME request, answered with the form + errors
      renderForm(request, response, title, priorityRaw, dueRaw, errors);
      return;
    }

    Task task = new Task();
    task.setTitle(title);
    task.setPriority(priority);
    task.setDueDate(dueDate);
    task.setOwnerId(1); // no login yet: S41 takes the owner from the SESSION, never from the form
    Task saved = service.create(task); // S36: INSERT … (a duplicate title is still a 500 until S37 validates it)

    // Redirect after a successful POST (31.06; PRG in S37): Reload won't create a second task.
    response.sendRedirect(request.getContextPath() + "/tasks/view?id=" + saved.getId());
  }

  private void renderForm(HttpServletRequest request, HttpServletResponse response, String title, String priority,
      String dueDate, Map<String, String> errors) throws IOException {
    PrintWriter out = Layout.begin(request, response, "New task");
    out.println("<form class=\"form\" method=\"post\" action=\"" + request.getContextPath() + "/tasks/new\">");
    // The user's own input is echoed back into attributes: ESCAPED (30.14), or the form is an XSS vector.
    out.println(field("Title", "<input class=\"form-field__input\" name=\"title\" maxlength=\"" + TITLE_MAX + "\" value=\""
        + Html.escape(title) + "\">", errors.get("title")));
    StringBuilder options = new StringBuilder("<select class=\"form-field__input\" name=\"priority\">");
    for (Priority p : Priority.values()) {
      options.append("<option").append(p.name().equals(priority) ? " selected" : "").append(">").append(p.name()).append("</option>");
    }
    options.append("</select>");
    out.println(field("Priority", options.toString(), errors.get("priority")));
    out.println(field("Due date", "<input class=\"form-field__input\" type=\"date\" name=\"dueDate\" value=\"" + Html.escape(dueDate) + "\">",
        errors.get("dueDate")));
    out.println("<div class=\"form__actions\"><button class=\"btn btn--primary\" type=\"submit\">Create task</button></div></form>");
    Layout.end(out);
  }

  private static String field(String label, String control, String error) {
    return "<div class=\"form-field" + (error == null ? "" : " form-field--error") + "\"><label class=\"form-field__label\">"
        + label + " " + control + "</label>" + (error == null ? "" : "<span class=\"form-field__error\">" + Html.escape(error) + "</span>")
        + "</div>";
  }

  private static String trimmed(String value) {
    return value == null ? "" : value.trim();
  }
}
