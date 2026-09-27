package com.taskflow.web.api;

import com.taskflow.service.TaskService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.api.dto.Dtos.CategoryDto;
import java.io.IOException;
import java.util.List;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/** S46: GET /api/categories → [CategoryDto], from the application-scoped catalog (38.06). */
@WebServlet("/api/categories")
public class CategoryApiServlet extends ApiServlet {

  private TaskService service;

  @Override
  public void init() {
    service = AppContextListener.taskService(getServletContext());
  }

  @Override
  protected void route(HttpServletRequest request, HttpServletResponse response, String method, List<String> path) throws IOException {
    if (!path.isEmpty() || !is(method, "GET")) throw ApiException.noEndpoint(request);
    Json.write(response, 200, service.categories().stream().map(CategoryDto::from).toList());
  }
}
