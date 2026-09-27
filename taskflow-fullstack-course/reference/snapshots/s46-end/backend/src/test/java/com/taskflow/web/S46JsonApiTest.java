package com.taskflow.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

/** S46: the JSON API against the contract of the Part 1 mock (mock-api/server.mjs), logged in as alice. */
class S46JsonApiTest extends TomcatTest {

  private static final ObjectMapper JSON = new ObjectMapper();

  private static HttpResponse<String> call(String method, String path, String contentType, String body) throws Exception {
    HttpRequest.Builder request = HttpRequest.newBuilder(uri(CONTEXT + path));
    if (contentType != null) request.header("Content-Type", contentType);
    request.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
    return send(request.build());
  }

  private static HttpResponse<String> json(String method, String path, String body) throws Exception {
    return call(method, path, body == null ? null : "application/json", body);
  }

  private static JsonNode tree(HttpResponse<String> response) throws Exception {
    return JSON.readTree(response.body());
  }

  private static void assertError(HttpResponse<String> response, int status, String code) throws Exception {
    assertEquals(status, response.statusCode(), response.body());
    assertEquals("application/json;charset=UTF-8", response.headers().firstValue("Content-Type").orElse(""));
    JsonNode error = tree(response);
    assertEquals(status, error.get("status").asInt());
    assertEquals(code, error.get("error").asText());
    assertTrue(error.hasNonNull("message") && error.hasNonNull("timestamp") && error.get("path").asText().startsWith("/api/"), error.toString());
  }

  @Test
  void theListIsAPageEnvelopeOfTaskDtos() throws Exception { // 46.05, 46.06, 46.09
    HttpResponse<String> response = json("GET", "/api/tasks?size=5", null);
    assertEquals(200, response.statusCode());
    assertEquals("application/json;charset=UTF-8", response.headers().firstValue("Content-Type").orElse(""));
    JsonNode page = tree(response);
    assertEquals(5, page.get("items").size());
    assertEquals(0, page.get("page").asInt());
    assertEquals(5, page.get("size").asInt());
    long total = page.get("totalItems").asLong();
    assertEquals((total + 4) / 5, page.get("totalPages").asLong());
    JsonNode first = page.get("items").get(0);
    assertEquals("Write quarterly report", first.get("title").asText());
    assertEquals("2026-10-03", first.get("dueDate").asText());                  // 46.17: a string, not [2026,10,3]
    assertEquals("2026-09-01T08:00:00Z", first.get("createdAt").asText());
    assertEquals(Set.of("id", "title", "description", "status", "priority", "dueDate", "categoryId", "ownerId", "createdAt", "updatedAt"),
        fieldNames(first));
    assertEquals(0, tree(json("GET", "/api/tasks?q=salary", null)).get("totalItems").asInt()); // bob's task: not alice's (42.09)
    assertEquals(0, tree(json("GET", "/api/tasks?page=999", null)).get("items").size());      // past the end: empty, not clamped
  }

  @Test
  void filtersSortingAndTheirValidation() throws Exception { // 46.06, 46.07
    for (JsonNode task : tree(json("GET", "/api/tasks?status=DONE&size=100", null)).get("items")) assertEquals("DONE", task.get("status").asText());
    assertEquals("LOW", tree(json("GET", "/api/tasks?sort=priority,asc", null)).get("items").get(0).get("priority").asText());
    assertEquals("HIGH", tree(json("GET", "/api/tasks?sort=priority,desc", null)).get("items").get(0).get("priority").asText());
    for (JsonNode task : tree(json("GET", "/api/tasks?priority=HIGH&size=100", null)).get("items")) assertEquals("HIGH", task.get("priority").asText());

    HttpResponse<String> invalid = json("GET", "/api/tasks?status=OPEN&size=500&sort=owner,up", null);
    assertError(invalid, 400, "VALIDATION_FAILED");
    assertEquals(Set.of("status", "size", "sort"), fieldNames(tree(invalid).get("fieldErrors")));
  }

  @Test
  void aTasksWholeLifecycle() throws Exception { // 46.05
    String title = "API task " + System.nanoTime();
    HttpResponse<String> created = json("POST", "/api/tasks",
        "{\"title\":\"  " + title + "  \",\"description\":\"d\",\"status\":\"TODO\",\"priority\":\"HIGH\",\"dueDate\":null,\"categoryId\":1}");
    assertEquals(201, created.statusCode(), created.body());
    JsonNode task = tree(created);
    long id = task.get("id").asLong();
    assertEquals(CONTEXT + "/api/tasks/" + id, created.headers().firstValue("Location").orElseThrow());
    assertEquals(title, task.get("title").asText());                             // trimmed
    assertEquals(1, task.get("ownerId").asLong());
    assertTrue(task.get("dueDate").isNull());

    JsonNode patched = tree(json("PATCH", "/api/tasks/" + id, "{\"dueDate\":\"2026-12-24\"}"));
    assertEquals("2026-12-24", patched.get("dueDate").asText());
    assertEquals(title, patched.get("title").asText());                          // absent fields untouched
    assertEquals("HIGH", patched.get("priority").asText());

    HttpResponse<String> put = json("PUT", "/api/tasks/" + id,
        "{\"title\":\"" + title + " v2\",\"status\":\"DONE\",\"priority\":\"LOW\"}");
    assertEquals(200, put.statusCode(), put.body());
    assertEquals("", tree(put).get("description").asText());                    // PUT = every field: absent → default
    assertTrue(tree(put).get("dueDate").isNull() && tree(put).get("categoryId").isNull());

    HttpResponse<String> deleted = json("DELETE", "/api/tasks/" + id, null);
    assertEquals(204, deleted.statusCode());
    assertEquals("", deleted.body());
    assertError(json("GET", "/api/tasks/" + id, null), 404, "NOT_FOUND");
  }

  @Test
  void invalidBodiesGetTheRightStatus() throws Exception { // 46.07
    HttpResponse<String> empty = json("POST", "/api/tasks", "{}");
    assertError(empty, 400, "VALIDATION_FAILED");
    assertEquals(Set.of("title", "status", "priority"), fieldNames(tree(empty).get("fieldErrors")));

    String body = "{\"title\":\"Duplicate " + System.nanoTime() + "\",\"status\":\"TODO\",\"priority\":\"LOW\"}";
    assertEquals(201, json("POST", "/api/tasks", body).statusCode());
    HttpResponse<String> duplicate = json("POST", "/api/tasks", body);
    assertError(duplicate, 400, "VALIDATION_FAILED");
    assertEquals("a task with this title already exists", tree(duplicate).get("fieldErrors").get("title").asText());

    assertError(json("POST", "/api/tasks", "{\"title\": "), 400, "MALFORMED_JSON");
    assertError(call("POST", "/api/tasks", "text/plain", "title=x"), 415, "UNSUPPORTED_MEDIA_TYPE");
    assertError(call("POST", "/api/tasks", "application/x-www-form-urlencoded", "title=x"), 415, "UNSUPPORTED_MEDIA_TYPE");
    JsonNode badFields = tree(json("POST", "/api/tasks", "{\"title\":\"x\",\"status\":\"TODO\",\"priority\":\"LOW\",\"dueDate\":\"2026-02-30\",\"categoryId\":999}"))
        .get("fieldErrors");
    assertEquals(Set.of("dueDate", "categoryId"), fieldNames(badFields));
  }

  @Test
  void clientsCannotSetServerControlledFields() throws Exception { // 46.10, 46.11
    String title = "Mass assignment " + System.nanoTime();
    JsonNode task = tree(json("POST", "/api/tasks", "{\"id\":999999,\"ownerId\":2,\"createdAt\":\"2000-01-01T00:00:00Z\","
        + "\"title\":\"" + title + "\",\"status\":\"TODO\",\"priority\":\"LOW\"}"));
    assertNotEquals(999999, task.get("id").asLong());
    assertEquals(1, task.get("ownerId").asLong());
    assertNotEquals("2000-01-01T00:00:00Z", task.get("createdAt").asText());
    JsonNode patched = tree(json("PATCH", "/api/tasks/" + task.get("id").asLong(), "{\"ownerId\":2,\"role\":\"ADMIN\"}"));
    assertEquals(1, patched.get("ownerId").asLong());
  }

  @Test
  void someoneElsesTaskIsNotFoundForEveryMethod() throws Exception { // 46.12
    assertError(json("GET", "/api/tasks/23", null), 404, "NOT_FOUND");
    assertError(json("PATCH", "/api/tasks/23", "{\"status\":\"DONE\"}"), 404, "NOT_FOUND");
    assertError(json("DELETE", "/api/tasks/23", null), 404, "NOT_FOUND");
    assertError(json("GET", "/api/tasks/23/comments", null), 404, "NOT_FOUND");
    assertEquals(200, send(HttpRequest.newBuilder(uri(CONTEXT + "/api/tasks/23")).build(), loggedInClient("bob", "bob123")).statusCode());
  }

  @Test
  void everyApiErrorIsJson() throws Exception { // 46.16
    HttpResponse<String> unknown = json("GET", "/api/nope", null);
    assertError(unknown, 404, "NOT_FOUND");
    assertEquals("No endpoint GET /api/nope", tree(unknown).get("message").asText());
    assertEquals("/api/nope", tree(unknown).get("path").asText());
    assertError(json("DELETE", "/api/tasks", null), 404, "NOT_FOUND");          // not HttpServlet's HTML 405
    assertError(json("GET", "/api/tasks/abc", null), 404, "NOT_FOUND");
    assertError(json("GET", "/api/categories/1", null), 404, "NOT_FOUND");
    assertEquals(200, json("PATCH", "/api/tasks/1", "{}").statusCode());         // PATCH routed (HttpServlet alone → 501)
  }

  @Test
  void commentsCategoriesAndStats() throws Exception { // 46.14, 46.99 Q4
    JsonNode comments = tree(json("GET", "/api/tasks/1/comments", null));
    assertTrue(comments.isArray() && comments.size() > 0);
    assertEquals(Set.of("id", "taskId", "authorId", "body", "createdAt"), fieldNames(comments.get(0)));
    assertError(json("POST", "/api/tasks/1/comments", "{\"body\":\"   \"}"), 400, "VALIDATION_FAILED");
    HttpResponse<String> added = json("POST", "/api/tasks/1/comments", "{\"body\":\"<b>stored as typed</b>\"}");
    assertEquals(201, added.statusCode(), added.body());
    JsonNode comment = tree(added);
    assertEquals("<b>stored as typed</b>", comment.get("body").asText());
    assertEquals(CONTEXT + "/api/tasks/1/comments/" + comment.get("id").asLong(), added.headers().firstValue("Location").orElseThrow());

    JsonNode categories = tree(json("GET", "/api/categories", null));
    assertEquals(Set.of("id", "name", "color"), fieldNames(categories.get(0)));

    JsonNode stats = tree(json("GET", "/api/stats", null));
    long byStatus = 0;
    for (JsonNode count : stats.get("byStatus")) byStatus += count.asLong();
    assertEquals(stats.get("total").asLong(), byStatus);
    assertEquals(Set.of("LOW", "MEDIUM", "HIGH"), fieldNames(stats.get("byPriority")));
  }

  private static Set<String> fieldNames(JsonNode node) {
    Set<String> names = new HashSet<>();
    node.fieldNames().forEachRemaining(names::add);
    return names;
  }

  private static HttpResponse<String> send(HttpRequest request, java.net.http.HttpClient browser) throws Exception {
    return browser.send(request, HttpResponse.BodyHandlers.ofString());
  }
}
