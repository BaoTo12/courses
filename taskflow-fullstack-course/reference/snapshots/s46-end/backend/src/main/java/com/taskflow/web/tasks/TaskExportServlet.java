package com.taskflow.web.tasks;

import com.taskflow.dao.TaskFilter;
import com.taskflow.model.Task;
import com.taskflow.security.AuthUser;
import com.taskflow.service.TaskService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.CurrentUser;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;
import java.util.concurrent.ExecutorService;
import javax.servlet.AsyncContext;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * S45 (45.14): GET /tasks/export.csv → the caller's tasks as CSV, produced on an application thread pool, not on
 * Tomcat's request thread (45.13):
 *   1. read everything we need from the request NOW (the user): the request object must not be used later
 *   2. request.startAsync(): doGet returns, the container thread goes back to the pool, the response stays OPEN
 *   3. an export thread writes the CSV and calls complete(): only then is the response finished
 * asyncSupported must be true here AND on every filter the request passes through (web.xml), or startAsync throws.
 * 🛡 CSV injection: a cell starting with = + - @ is a FORMULA in Excel/Sheets; such cells are prefixed with '.
 */
@WebServlet(urlPatterns = "/tasks/export.csv", asyncSupported = true)
public class TaskExportServlet extends HttpServlet {

  private static final Logger log = LoggerFactory.getLogger(TaskExportServlet.class);

  private TaskService service;
  private ExecutorService exports;

  @Override
  public void init() {
    service = AppContextListener.taskService(getServletContext());
    exports = AppContextListener.exportExecutor(getServletContext());
  }

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    AuthUser user = CurrentUser.get(request);                       // 1. while we're still on the request thread
    response.setContentType("text/csv;charset=UTF-8");
    response.setHeader("Content-Disposition", "attachment; filename=\"tasks.csv\"");
    AsyncContext async = request.startAsync();                      // 2.
    async.setTimeout(30_000);                                       // then Tomcat ends it with an error
    exports.submit(() -> {                                          // 3.
      try {
        List<Task> tasks = service.find(TaskFilter.all(), user);    // the owner scope applies (42.09)
        PrintWriter out = async.getResponse().getWriter();
        out.write("id,title,status,priority,due_date\r\n");         // RFC 4180: CRLF line ends
        for (Task task : tasks) {
          out.write(task.getId() + "," + cell(task.getTitle()) + "," + task.getStatus() + "," + task.getPriority()
              + "," + (task.getDueDate() == null ? "" : task.getDueDate()) + "\r\n");
        }
      } catch (Exception e) {
        log.error("CSV export failed", e);                          // ErrorHandlingFilter can't see this thread (45.13)
      } finally {
        async.complete();
      }
    });
  }

  /** A quoted CSV cell: quotes doubled; formula triggers neutralised (CSV injection). */
  static String cell(String value) {
    String text = value == null ? "" : value;
    if (!text.isEmpty() && "=+-@\t\r".indexOf(text.charAt(0)) >= 0) text = "'" + text;
    return "\"" + text.replace("\"", "\"\"") + "\"";
  }
}
