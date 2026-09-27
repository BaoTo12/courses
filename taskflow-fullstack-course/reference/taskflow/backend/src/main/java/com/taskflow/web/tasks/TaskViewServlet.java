package com.taskflow.web.tasks;

import com.taskflow.model.TaskDetails;
import com.taskflow.service.TaskService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.AppStats;
import com.taskflow.web.CurrentUser;
import com.taskflow.web.Flash;
import com.taskflow.web.Params;
import com.taskflow.web.RecentTasks;
import com.taskflow.web.errors.NotFoundException;
import com.taskflow.service.AuthService;
import com.taskflow.web.api.dto.Dtos.UserDto;
import com.taskflow.web.island.IslandAssets;
import com.taskflow.web.island.ScriptJson;
import java.util.List;
import java.util.Map;
import com.taskflow.security.AuthUser;
import java.io.IOException;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * GET /tasks/view?id=N. The controller handles every error path (400, 404) BEFORE choosing the view (32.12).
 * S43: by THROWING: ErrorHandlingFilter maps the exceptions to statuses, web.xml maps the statuses to pages (43.08).
 * S36: the service assembles the TaskDetails (task + category + owner + comments) from the database.
 */
@WebServlet("/tasks/view")
public class TaskViewServlet extends HttpServlet {

  private TaskService service;
  private AuthService auth;

  @Override
  public void init() {
    service = AppContextListener.taskService(getServletContext());
    auth = AppContextListener.authService(getServletContext());
  }

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    long id = Params.requiredId(request, "id");                       // S43: bad id → BadRequestException → 400 page
    AuthUser user = CurrentUser.get(request);
    TaskDetails details = service.details(id, user)                     // S42: someone else's task → AccessDeniedException
        .orElseThrow(NotFoundException::new);                            // S43: → 404 page (ErrorHandlingFilter)
    request.setAttribute("details", details);
    request.setAttribute("pageTitle", details.getTask().getTitle()); // header.jspf escapes it
    boolean canEdit = service.canEdit(details.getTask(), user);        // S51: owner/admin; shared with you = read-only
    request.setAttribute("canEdit", canEdit);
    if (canEdit) request.setAttribute("shares", service.shares(id, user).orElse(List.of()));
    RecentTasks.record(request, id);                                                          // S38: session scope
    ((AppStats) getServletContext().getAttribute(AppStats.ATTRIBUTE)).taskViewed(id);        // S38: application scope
    // S49 (49.12): the React comments island, if built: its entry files and its initial data (who is logged in).
    IslandAssets.Entry island = IslandAssets.entry(getServletContext(), "src/island/commentsIsland.tsx");
    if (island != null) {
      request.setAttribute("commentsIsland", island);
      request.setAttribute("commentsInitialJson", ScriptJson.of(Map.of("user",
          auth.profile(user.getId()).map(UserDto::from).orElseThrow(), "readOnly", !canEdit)));
    }
    Flash.consume(request);
    request.getRequestDispatcher("/WEB-INF/views/tasks/view.jsp").forward(request, response);
  }
}
