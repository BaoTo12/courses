package com.taskflow.web.debug;

import com.taskflow.model.Task;
import com.taskflow.service.TaskService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.AppStats;
import java.io.IOException;
import java.net.InetAddress;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/** S38 (38.07): the application-scoped counters, for developers (loopback only, like 30.10 and 34.16). */
@WebServlet("/debug/stats")
public class StatsServlet extends HttpServlet {

  private TaskService service;

  @Override
  public void init() {
    service = AppContextListener.taskService(getServletContext());
  }

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    if (!InetAddress.getByName(request.getRemoteAddr()).isLoopbackAddress()) {
      response.sendError(HttpServletResponse.SC_NOT_FOUND);
      return;
    }
    AppStats stats = (AppStats) getServletContext().getAttribute(AppStats.ATTRIBUTE);
    Map<Task, Long> mostViewed = new LinkedHashMap<>();
    for (Map.Entry<Long, Long> entry : stats.mostViewed(5)) {
      service.taskForDiagnostics(entry.getKey()).ifPresent(task -> mostViewed.put(task, entry.getValue()));  // deleted tasks are skipped
    }
    request.setAttribute("stats", stats);
    request.setAttribute("mostViewed", mostViewed);
    request.setAttribute("pageTitle", "Statistics");
    request.getRequestDispatcher("/WEB-INF/views/debug/stats.jsp").forward(request, response);
  }
}
