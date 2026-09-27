package com.taskflow.web.island;

import com.taskflow.dao.TaskFilter;
import com.taskflow.model.Task;
import com.taskflow.security.AuthUser;
import com.taskflow.service.AuthService;
import com.taskflow.service.Page;
import com.taskflow.service.TaskService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.CurrentUser;
import com.taskflow.web.api.dto.Dtos.CategoryDto;
import com.taskflow.web.api.dto.Dtos.PageDto;
import com.taskflow.web.api.dto.Dtos.TaskDto;
import com.taskflow.web.api.dto.Dtos.UserDto;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S49 (49.02–49.08): GET /react-board → a JSP page (layout, nav, i18n from the server) with a React Kanban board mounted
 * inside it. The servlet prepares the INITIAL DATA the island needs for its first render, in the exact JSON shapes
 * of the API (the same DTOs), so React can seed its RTK Query cache instead of making three requests on load:
 *   {"user": UserDto, "tasks": PageDto<TaskDto> (the SPA's LIST_QUERY: size 100), "categories": [CategoryDto]}
 * Serialised with ScriptJson (49.05) for <script type="application/json">.
 */
@WebServlet("/react-board")
public class ReactBoardServlet extends HttpServlet {

  static final int LIST_SIZE = 100;          // the SPA's LIST_QUERY = { size: 100 } (22.09): the same cache entry

  private TaskService tasks;
  private AuthService auth;

  @Override
  public void init() {
    tasks = AppContextListener.taskService(getServletContext());
    auth = AppContextListener.authService(getServletContext());
  }

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    AuthUser user = CurrentUser.get(request);
    Page<Task> page = tasks.pageAt(TaskFilter.all(), 1, LIST_SIZE, user);
    Map<String, Object> initial = new LinkedHashMap<>();
    initial.put("user", auth.profile(user.getId()).map(UserDto::from).orElseThrow());
    initial.put("tasks", PageDto.from(page, TaskDto::from));
    initial.put("categories", tasks.categories().stream().map(CategoryDto::from).toList());

    request.setAttribute("pageTitle", "Board");
    request.setAttribute("initialJson", ScriptJson.of(initial));
    request.setAttribute("island", IslandAssets.entry(getServletContext(), "src/island/boardIsland.tsx"));
    request.getRequestDispatcher("/WEB-INF/views/react-board.jsp").forward(request, response);
  }
}
