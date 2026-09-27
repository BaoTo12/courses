package com.taskflow.web.admin;

import com.taskflow.model.TaskStatus;
import com.taskflow.service.ReportService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.CurrentUser;
import java.io.IOException;
import java.io.PrintWriter;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S51: the admin report (admins only: /admin/*, and ReportService checks again).
 *   GET /admin/reports[?refresh=1]  → tasks per user and status (cached up to 60 s, application scope)
 *   GET /admin/reports.csv          → the same as CSV (usernames and display names are user data: quoted and
 *                                     formula-neutralised like the task export, 45.14)
 */
@WebServlet({"/admin/reports", "/admin/reports.csv"})
public class AdminReportsServlet extends HttpServlet {

  private ReportService reports;

  @Override
  public void init() {
    reports = AppContextListener.reports(getServletContext());
  }

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    ReportService.Report report = reports.tasksPerUser(CurrentUser.get(request), request.getParameter("refresh") != null);
    if (request.getServletPath().endsWith(".csv")) {
      response.setContentType("text/csv;charset=UTF-8");
      response.setHeader("Content-Disposition", "attachment; filename=\"tasks-per-user.csv\"");
      PrintWriter out = response.getWriter();
      out.write("username,display_name,todo,in_progress,done,total\r\n");
      for (ReportService.Row row : report.rows()) {
        out.write(cell(row.username()) + "," + cell(row.displayName()) + "," + row.counts().get(TaskStatus.TODO) + ","
            + row.counts().get(TaskStatus.IN_PROGRESS) + "," + row.counts().get(TaskStatus.DONE) + "," + row.total() + "\r\n");
      }
      return;
    }
    request.setAttribute("pageTitle", "Reports");
    request.setAttribute("report", report);
    request.setAttribute("generatedAt", report.generatedAt().toString().replace('T', ' ').replaceFirst("\\.\\d+", "").replace("Z", " UTC"));
    request.setAttribute("statuses", TaskStatus.values());
    request.getRequestDispatcher("/WEB-INF/views/admin/reports.jsp").forward(request, response);
  }

  /** A quoted CSV cell; formula triggers neutralised (CSV injection, 45.14). */
  static String cell(String value) {
    String text = value == null ? "" : value;
    if (!text.isEmpty() && "=+-@\t\r".indexOf(text.charAt(0)) >= 0) text = "'" + text;
    return "\"" + text.replace("\"", "\"\"") + "\"";
  }
}