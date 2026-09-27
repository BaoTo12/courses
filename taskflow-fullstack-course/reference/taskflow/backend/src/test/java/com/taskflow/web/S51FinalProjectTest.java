package com.taskflow.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/** S51: read-only sharing (portal + API), the profile (portal + API), admin reports (cache + CSV), the activity feed. */
class S51FinalProjectTest extends TomcatTest {

  private static final ObjectMapper JSON = new ObjectMapper();
  private static final Pattern TOKEN = Pattern.compile("name=\"_csrf\" value=\"([^\"]+)\"");

  private static String enc(String s) {
    return URLEncoder.encode(s, StandardCharsets.UTF_8);
  }

  private static HttpResponse<String> get(HttpClient browser, String path) throws Exception {
    return browser.send(HttpRequest.newBuilder(uri(CONTEXT + path)).build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
  }

  /** A JSON API call from this browser (with the double-submit header on unsafe methods). */
  private static HttpResponse<String> api(HttpClient browser, String method, String path, String body) throws Exception {
    HttpRequest.Builder request = HttpRequest.newBuilder(uri(CONTEXT + path));
    if (body != null) request.header("Content-Type", "application/json");
    if (!method.equals("GET")) request.header("X-XSRF-TOKEN", xsrfToken(browser));
    request.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
    return browser.send(request.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
  }

  /** A portal form POST from this browser, with its session's CSRF token. */
  private static HttpResponse<String> form(HttpClient browser, String path, String body) throws Exception {
    Matcher m = TOKEN.matcher(get(browser, "/tasks/new").body());
    assertTrue(m.find());
    return browser.send(HttpRequest.newBuilder(uri(CONTEXT + path)).header("Content-Type", "application/x-www-form-urlencoded")
        .POST(HttpRequest.BodyPublishers.ofString(body + "&_csrf=" + enc(m.group(1)))).build(), HttpResponse.BodyHandlers.ofString());
  }

  @Test
  void aSharedTaskIsVisibleButReadOnly() throws Exception { // sharing (db/05 shares bob's task 24 with alice)
    assertTrue(get(CONTEXT + "/tasks?q=passport").body().contains("Bob: renew passport"));   // in alice's list…
    String view = get(CONTEXT + "/tasks/view?id=24").body();
    assertTrue(view.contains("Shared with you (read-only)"), view);                        // …and viewable
    assertFalse(view.contains("/tasks/edit?id=24"));                                       // no edit link
    assertFalse(view.contains("name=\"body\""));                                            // no comment form
    assertEquals(403, get(CONTEXT + "/tasks/edit?id=24").statusCode());
    assertEquals(403, postForm(CONTEXT + "/tasks/toggle", "id=24").statusCode());
    assertEquals(403, postForm(CONTEXT + "/tasks/delete", "id=24").statusCode());
    assertEquals(404, get(CONTEXT + "/tasks/view?id=23").statusCode());                    // not shared: still invisible

    HttpResponse<String> patch = api(client(), "PATCH", "/api/tasks/24", "{\"status\":\"DONE\"}");
    assertEquals(403, patch.statusCode());
    assertEquals("READ_ONLY", JSON.readTree(patch.body()).get("error").asText());
    assertEquals(200, api(client(), "GET", "/api/tasks/24", null).statusCode());
    assertEquals(403, api(client(), "GET", "/api/tasks/24/shares", null).statusCode());   // only the owner manages shares
  }

  @Test
  void theOwnerSharesAndUnsharesThroughTheApi() throws Exception {
    HttpClient bob = loggedInClient("bob", "bob123");
    assertEquals(404, api(client(), "GET", "/api/tasks/25", null).statusCode());           // alice can't see task 25 yet
    HttpResponse<String> shared = api(bob, "POST", "/api/tasks/25/shares", "{\"username\":\"alice\"}");
    assertEquals(201, shared.statusCode(), shared.body());
    JsonNode share = JSON.readTree(shared.body());
    assertEquals("alice", share.get("username").asText());
    assertEquals(CONTEXT + "/api/tasks/25/shares/1", shared.headers().firstValue("Location").orElseThrow());
    assertEquals(200, api(client(), "GET", "/api/tasks/25", null).statusCode());           // now she can

    assertEquals("already shared with that user", JSON.readTree(api(bob, "POST", "/api/tasks/25/shares", "{\"username\":\"alice\"}").body())
        .get("fieldErrors").get("username").asText());
    assertEquals("unknown user", JSON.readTree(api(bob, "POST", "/api/tasks/25/shares", "{\"username\":\"nobody\"}").body())
        .get("fieldErrors").get("username").asText());
    assertEquals("that user owns the task", JSON.readTree(api(bob, "POST", "/api/tasks/25/shares", "{\"username\":\"bob\"}").body())
        .get("fieldErrors").get("username").asText());

    assertEquals(204, api(bob, "DELETE", "/api/tasks/25/shares/1", null).statusCode());
    assertEquals(404, api(client(), "GET", "/api/tasks/25", null).statusCode());           // gone again
  }

  @Test
  void theProfileChangesNameLanguageAndThemeButNothingElse() throws Exception {
    HttpClient bob = loggedInClient("bob", "bob123");
    try {
      HttpResponse<String> saved = form(bob, "/profile", "displayName=" + enc("Bob the Builder") + "&locale=vi&theme=dark&role=ADMIN");
      assertEquals(303, saved.statusCode());
      assertTrue(saved.headers().allValues("Set-Cookie").stream().anyMatch(c -> c.startsWith("tf_lang=vi;")));
      assertTrue(saved.headers().allValues("Set-Cookie").stream().anyMatch(c -> c.startsWith("tf_theme=dark;")));
      String page = get(bob, "/profile").body();
      assertTrue(page.contains("Đăng nhập: Bob the Builder"), page);                       // the session's copy + the language
      assertEquals(403, get(bob, "/admin/users").statusCode());                            // role=ADMIN was ignored

      assertEquals(400, form(bob, "/profile", "displayName=+&locale=fr&theme=neon").statusCode());
      HttpResponse<String> invalid = api(bob, "PATCH", "/api/users/me", "{\"locale\":\"fr\"}");
      assertEquals("must be one of en, vi", JSON.readTree(invalid.body()).get("fieldErrors").get("locale").asText());
    } finally {
      HttpResponse<String> restored = api(bob, "PATCH", "/api/users/me", "{\"displayName\":\"Bob Tran\",\"locale\":\"vi\",\"role\":\"ADMIN\"}");
      assertEquals(200, restored.statusCode(), restored.body());
      JsonNode user = JSON.readTree(restored.body());
      assertEquals("Bob Tran", user.get("displayName").asText());
      assertEquals("USER", user.get("role").asText());
    }
  }

  @Test
  void adminReportsAreCachedAndExportable() throws Exception {
    HttpClient admin = loggedInClient("admin", "admin123");
    String report = get(admin, "/admin/reports").body();
    assertTrue(report.contains("Alice Nguyen (alice)"), report);
    Matcher generated = Pattern.compile("generated ([^(]+) \\(").matcher(report);
    assertTrue(generated.find(), report);
    assertTrue(get(admin, "/admin/reports").body().contains("generated " + generated.group(1) + " ("));   // cached
    HttpResponse<String> csv = get(admin, "/admin/reports.csv");
    assertEquals("text/csv;charset=UTF-8", csv.headers().firstValue("Content-Type").orElse(""));
    assertTrue(csv.body().startsWith("username,display_name,todo,in_progress,done,total\r\n"), csv.body());
    assertTrue(csv.body().contains("\"alice\",\"Alice Nguyen\","));
    assertEquals(403, get(CONTEXT + "/admin/reports").statusCode());                       // alice
  }

  @Test
  void taskEventsFeedTheActivityPanels() throws Exception {
    String title = "Activity probe " + System.nanoTime();
    HttpResponse<String> created = postForm(CONTEXT + "/tasks/new", "priority=LOW&title=" + enc(title));
    String id = created.headers().firstValue("Location").orElseThrow().replaceAll(".*id=", "");
    assertTrue(get(CONTEXT + "/dashboard").body().contains("Created: task " + id + ": " + title));
    JsonNode feed = JSON.readTree(api(client(), "GET", "/api/activity", null).body());
    assertEquals("TASK_CREATED", feed.get(0).get("type").asText());
    assertEquals("task " + id + ": " + title, feed.get(0).get("details").asText());
    assertTrue(feed.get(0).get("at").asText().endsWith("Z"));
  }
}
