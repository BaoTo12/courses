package com.taskflow.web.admin;

import com.taskflow.service.AuditService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.AppStats;
import com.taskflow.web.CurrentUser;
import com.taskflow.web.Params;
import com.taskflow.web.SessionRegistry;
import java.io.IOException;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S45 (45.10): GET /admin/audit[?type=LOGIN_FAIL][&user=bob][&page=2]: the audit log, newest first, 25 per page,
 * with S44's pagination tag; plus who is logged in right now (SessionRegistry) and the session counter (AppStats, S38).
 * The type is allow-listed; the username is only a query PARAMETER (never query text).
 */
@WebServlet("/admin/audit")
public class AdminAuditServlet extends HttpServlet {

  private AuditService audit;
  private SessionRegistry sessions;

  @Override
  public void init() {
    audit = AppContextListener.auditService(getServletContext());
    sessions = AppContextListener.sessionRegistry(getServletContext());
  }

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    String rawType = request.getParameter("type");                          // List.of(…).contains(null) THROWS (45.10)
    String type = rawType != null && AuditService.TYPES.contains(rawType) ? rawType : null;
    String user = request.getParameter("user");
    user = user == null || user.isBlank() ? null : user.strip();
    if (user != null && user.length() > 50) user = user.substring(0, 50);
    Long page = Params.positiveId(request.getParameter("page"));

    request.setAttribute("pageTitle", "Audit log");
    request.setAttribute("auditPage", audit.page(CurrentUser.get(request), type, user, page == null ? 1 : page.intValue()));
    request.setAttribute("types", AuditService.TYPES);
    request.setAttribute("typeFilter", type);
    request.setAttribute("loggedInUsers", sessions.loggedInUsers());
    request.setAttribute("loggedInSessions", sessions.loggedInSessions());
    request.setAttribute("activeSessions", ((AppStats) getServletContext().getAttribute(AppStats.ATTRIBUTE)).getActiveSessions());
    request.getRequestDispatcher("/WEB-INF/views/admin/audit.jsp").forward(request, response);
  }
}
