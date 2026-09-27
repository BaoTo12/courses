package com.taskflow.web.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.taskflow.dao.DuplicateKeyException;
import com.taskflow.dao.TaskFilter;
import com.taskflow.dao.TaskSort;
import com.taskflow.model.Comment;
import com.taskflow.model.Priority;
import com.taskflow.model.Task;
import com.taskflow.model.TaskStatus;
import com.taskflow.security.AuthUser;
import com.taskflow.service.Page;
import com.taskflow.service.TaskService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.CurrentUser;
import com.taskflow.web.api.dto.Dtos.CommentDto;
import com.taskflow.web.api.dto.Dtos.PageDto;
import com.taskflow.web.api.dto.Dtos.TaskDto;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S46 (46.05): the tasks resource. The SAME TaskService as the JSP controllers (46.01): same rules, same ownership
 * checks (46.12); only the input (JSON, query parameters) and the output (DTOs as JSON) differ.
 *
 *   GET    /api/tasks?q=&status=&priority=&categoryId=&page=0&size=20&sort=dueDate,asc   → 200 PageDto<TaskDto>
 *   POST   /api/tasks                → 201 + Location + TaskDto
 *   GET    /api/tasks/{id}           → 200 TaskDto          (someone else's or missing → 404)
 *   PUT    /api/tasks/{id}           → 200 TaskDto          (all fields)
 *   PATCH  /api/tasks/{id}           → 200 TaskDto          (the fields present)
 *   DELETE /api/tasks/{id}           → 204
 *   GET    /api/tasks/{id}/comments  → 200 [CommentDto]     (46.14)
 *   POST   /api/tasks/{id}/comments  → 201 + Location + CommentDto (46.14)
 */
@WebServlet("/api/tasks/*")
public class TaskApiServlet extends ApiServlet {

  private static final Map<String, TaskSort> SORT_FIELDS = Map.of(
      "id", TaskSort.ID, "title", TaskSort.TITLE, "priority", TaskSort.PRIORITY,
      "dueDate", TaskSort.DUE, "createdAt", TaskSort.CREATED, "updatedAt", TaskSort.UPDATED);
  private static final Map<String, String> TITLE_TAKEN = Map.of("title", "a task with this title already exists");
  static final int COMMENT_MAX = 1000;

  private TaskService service;

  @Override
  public void init() {
    service = AppContextListener.taskService(getServletContext());
  }

  @Override
  protected void route(HttpServletRequest request, HttpServletResponse response, String method, List<String> path) throws IOException {
    AuthUser user = CurrentUser.get(request);
    if (user == null) throw ApiException.unauthenticated();
    if (path.isEmpty() && is(method, "GET")) list(request, response, user);
    else if (path.isEmpty() && is(method, "POST")) create(request, response, user);
    else if (path.size() == 1) {
      long id = id(path.get(0), "Task not found");
      switch (method) {
        case "GET" -> Json.write(response, 200, TaskDto.from(find(id, user)));
        case "PUT" -> update(request, response, id, user, false);
        case "PATCH" -> update(request, response, id, user, true);
        case "DELETE" -> delete(response, id, user);
        default -> throw ApiException.noEndpoint(request);
      }
    } else if (path.size() == 2 && path.get(1).equals("comments")) {
      long id = id(path.get(0), "Task not found");
      if (is(method, "GET")) listComments(response, id, user);
      else if (is(method, "POST")) addComment(request, response, id, user);
      else throw ApiException.noEndpoint(request);
    } else {
      throw ApiException.noEndpoint(request);
    }
  }

  private void list(HttpServletRequest request, HttpServletResponse response, AuthUser user) throws IOException {
    Map<String, String> errors = new LinkedHashMap<>();
    String q = request.getParameter("q");
    TaskStatus status = null;
    if (request.getParameter("status") != null) {
      status = TaskStatus.parse(request.getParameter("status"));
      if (status == null) errors.put("status", "must be one of TODO, IN_PROGRESS, DONE");
    }
    Priority priority = null;
    if (request.getParameter("priority") != null) {
      priority = Priority.parse(request.getParameter("priority"));
      if (priority == null) errors.put("priority", "must be one of LOW, MEDIUM, HIGH");
    }
    Long categoryId = null;
    if (request.getParameter("categoryId") != null) {
      categoryId = positive(request.getParameter("categoryId"));
      if (categoryId == null) errors.put("categoryId", "must be a positive integer");
    }
    String pageParam = orDefault(request.getParameter("page"), "0");
    String sizeParam = orDefault(request.getParameter("size"), "20");
    if (!pageParam.matches("\\d{1,9}")) errors.put("page", "must be an integer >= 0");
    if (!sizeParam.matches("\\d{1,3}") || Integer.parseInt(sizeParam) < 1 || Integer.parseInt(sizeParam) > 100) {
      errors.put("size", "must be between 1 and 100");
    }
    String[] sort = orDefault(request.getParameter("sort"), "id,asc").split(",", -1);
    String direction = sort.length > 1 ? sort[1] : "asc";
    TaskSort taskSort = SORT_FIELDS.get(sort[0]);
    if (taskSort == null || sort.length > 2 || !(direction.equals("asc") || direction.equals("desc"))) {
      errors.put("sort", "must be <field>,<asc|desc> with field one of id, title, priority, dueDate, createdAt, updatedAt");
    }
    if (!errors.isEmpty()) throw ApiException.validation(errors);

    boolean descending = direction.equals("desc");
    if (taskSort == TaskSort.PRIORITY) descending = !descending;   // TaskSort ranks HIGH first; the API's "asc" is LOW → HIGH
    TaskFilter filter = new TaskFilter(status, priority, q == null || q.isBlank() ? null : q.strip(), categoryId,
        taskSort, descending, null);
    Page<Task> page = service.pageAt(filter, Integer.parseInt(pageParam) + 1, Integer.parseInt(sizeParam), user);
    Json.write(response, 200, PageDto.from(page, TaskDto::from));
  }

  private void create(HttpServletRequest request, HttpServletResponse response, AuthUser user) throws IOException {
    TaskInput input = TaskInput.parse(Json.readTree(request), false, service.categoryIds());
    if (!input.errors().isEmpty()) throw ApiException.validation(input.errors());
    Task task = new Task();
    input.applyTo(task);
    task.setOwnerId(user.getId());                          // from the session, never from the body (42.08, 46.10)
    Task saved;
    try {
      saved = service.create(task);
    } catch (DuplicateKeyException e) {
      throw ApiException.validation(TITLE_TAKEN);
    }
    response.setHeader("Location", request.getContextPath() + "/api/tasks/" + saved.getId());
    Json.write(response, 201, TaskDto.from(saved));
  }

  private void update(HttpServletRequest request, HttpServletResponse response, long id, AuthUser user, boolean partial)
      throws IOException {
    Task stored = find(id, user);
    TaskInput input = TaskInput.parse(Json.readTree(request), partial, service.categoryIds());
    if (!input.errors().isEmpty()) throw ApiException.validation(input.errors());
    input.applyTo(stored);
    try {
      if (!service.update(stored, user)) throw ApiException.notFound("Task not found");
    } catch (DuplicateKeyException e) {
      throw ApiException.validation(TITLE_TAKEN);
    }
    Json.write(response, 200, TaskDto.from(find(id, user)));  // re-read: updated_at is set by MySQL
  }

  private void delete(HttpServletResponse response, long id, AuthUser user) {
    if (!service.delete(id, user)) throw ApiException.notFound("Task not found");
    response.setStatus(204);                                  // no body at all
  }

  private void listComments(HttpServletResponse response, long taskId, AuthUser user) throws IOException {
    List<CommentDto> comments = service.comments(taskId, user).orElseThrow(() -> ApiException.notFound("Task not found"))
        .stream().map(details -> CommentDto.from(details.getComment())).toList();
    Json.write(response, 200, comments);
  }

  private void addComment(HttpServletRequest request, HttpServletResponse response, long taskId, AuthUser user) throws IOException {
    JsonNode body = Json.readTree(request).get("body");
    String text = body != null && body.isTextual() ? body.asText().strip() : "";
    if (text.isEmpty() || text.length() > COMMENT_MAX) {
      throw ApiException.validation(Map.of("body", "must be 1 to " + COMMENT_MAX + " characters"));
    }
    Comment comment = service.comment(taskId, user, text).orElseThrow(() -> ApiException.notFound("Task not found"));
    response.setHeader("Location", request.getContextPath() + "/api/tasks/" + taskId + "/comments/" + comment.getId());
    Json.write(response, 201, CommentDto.from(comment));
  }

  private Task find(long id, AuthUser user) {
    return service.task(id, user).orElseThrow(() -> ApiException.notFound("Task not found"));
  }

  private static Long positive(String value) {
    return value.matches("[1-9]\\d{0,17}") ? Long.parseLong(value) : null;
  }

  private static String orDefault(String value, String fallback) {
    return value == null ? fallback : value;
  }
}
