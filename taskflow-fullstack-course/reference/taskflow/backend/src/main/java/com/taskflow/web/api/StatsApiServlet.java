package com.taskflow.web.api;

import com.taskflow.security.AuthUser;
import com.taskflow.service.TaskService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.CurrentUser;
import com.taskflow.web.api.dto.Dtos.StatsDto;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/** S46 (46.99 Q4): GET /api/stats → {"total":22,"byStatus":{"TODO":…},"byPriority":{"LOW":…}} for the caller's tasks (all for admins). */
@WebServlet("/api/stats")
public class StatsApiServlet extends ApiServlet {

  private TaskService service;

  @Override
  public void init() {
    service = AppContextListener.taskService(getServletContext());
  }

  @Override
  protected void route(HttpServletRequest request, HttpServletResponse response, String method, List<String> path) throws IOException {
    if (!path.isEmpty() || !is(method, "GET")) throw ApiException.noEndpoint(request);
    AuthUser user = CurrentUser.get(request);
    if (user == null) throw ApiException.unauthenticated();
    Map<String, Integer> byStatus = service.countByStatus(user);
    long total = byStatus.values().stream().mapToLong(Integer::longValue).sum();
    Json.write(response, 200, new StatsDto(total, byStatus, service.countByPriority(user)));
  }
}
