package com.taskflow.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** S48: the client's request id is adopted (when well-formed); the contract-drift lab switch plants six mismatches. */
class S48IntegrationTest extends TomcatTest {

  private static final ObjectMapper JSON = new ObjectMapper();

  private static HttpResponse<String> api(String method, String path, String body, String... headers) throws Exception {
    HttpRequest.Builder request = HttpRequest.newBuilder(uri(CONTEXT + path));
    if (headers.length > 0) request.headers(headers);
    if (body != null) request.header("Content-Type", "application/json");
    if (!method.equals("GET")) request.header("X-XSRF-TOKEN", xsrfToken(client()));
    request.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
    return send(request.build());
  }

  @Test
  void theBrowsersRequestIdIsTheServersRequestId() throws Exception { // 48.08
    String id = UUID.randomUUID().toString();
    assertEquals(id, api("GET", "/api/tasks?size=1", null, "X-Request-Id", id).headers().firstValue("X-Request-Id").orElseThrow());
    String forged = api("GET", "/api/tasks?size=1", null, "X-Request-Id", "fake] INFO admin logged in [" + "x".repeat(500)).headers()
        .firstValue("X-Request-Id").orElseThrow();
    assertTrue(forged.matches("[0-9a-f]+"), forged);                               // replaced: never logged as sent
  }

  @Test
  void theContractDriftLabBreaksSixThingsAndSwitchesOff() throws Exception { // 48.05
    String title = "Drift probe " + System.nanoTime();
    long id = JSON.readTree(api("POST", "/api/tasks", "{\"title\":\"" + title + "\",\"status\":\"IN_PROGRESS\",\"priority\":\"HIGH\",\"dueDate\":\"2026-10-03\"}")
        .body()).get("id").asLong();
    assertEquals(303, postForm(CONTEXT + "/debug/contract-drift", "enabled=true").statusCode());
    try {
      JsonNode page = JSON.readTree(api("GET", "/api/tasks?q=" + title.replace(" ", "+"), null).body());
      assertTrue(page.has("total") && !page.has("totalItems"), page.toString());                 // 3.
      JsonNode task = page.get("items").get(0);
      assertTrue(task.get("id").isTextual(), task.toString());                                     // 6.
      assertEquals("in_progress", task.get("status").asText());                                    // 2.
      assertEquals("03/10/2026", task.get("dueDate").asText());                                    // 1.
      JsonNode error = JSON.readTree(api("GET", "/api/tasks/999999", null).body());
      assertEquals("NOT_FOUND", error.get("code").asText());                                       // 4.
      assertFalse(error.has("status"));
      HttpResponse<String> deleted = api("DELETE", "/api/tasks/" + id, null);
      assertEquals(200, deleted.statusCode());                                                     // 5.
      assertEquals("{\"ok\":true}", deleted.body());
    } finally {
      postForm(CONTEXT + "/debug/contract-drift", "enabled=false");
    }
    JsonNode normal = JSON.readTree(api("GET", "/api/tasks?size=1", null).body());
    assertTrue(normal.has("totalItems") && normal.get("items").get(0).get("id").isNumber());
  }
}
