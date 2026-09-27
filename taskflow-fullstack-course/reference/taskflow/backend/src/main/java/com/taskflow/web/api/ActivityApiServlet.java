package com.taskflow.web.api;

import com.taskflow.security.AuthUser;
import com.taskflow.service.ActivityRecorder;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.CurrentUser;
import com.taskflow.web.api.dto.Dtos.ActivityDto;
import java.io.IOException;
import java.util.List;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/** S51: GET /api/activity → the caller's 20 latest task events, newest first: [ActivityDto]. */
@WebServlet("/api/activity")
public class ActivityApiServlet extends ApiServlet {

  private ActivityRecorder activity;

  @Override
  public void init() {
    activity = AppContextListener.activity(getServletContext());
  }

  @Override
  protected void route(HttpServletRequest request, HttpServletResponse response, String method, List<String> path) throws IOException {
    if (!path.isEmpty() || !is(method, "GET")) throw ApiException.noEndpoint(request);
    AuthUser user = CurrentUser.get(request);
    if (user == null) throw ApiException.unauthenticated();
    Json.write(response, 200, activity.latest(user, 20).stream().map(ActivityDto::from).toList());
  }
}