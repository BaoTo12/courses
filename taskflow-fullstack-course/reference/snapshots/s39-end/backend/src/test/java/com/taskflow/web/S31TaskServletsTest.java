package com.taskflow.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URLEncoder;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

/**
 * S31: the in-memory task servlets over real HTTP. The store is shared by all tests in the JVM (and lives in the
 * web app's class loader), so every test creates its OWN task instead of relying on the others' state.
 */
class S31TaskServletsTest extends TomcatTest {

  private static HttpResponse<String> postForm(String path, Map<String, String> fields) throws Exception {
    String body = fields.entrySet().stream()
        .map(e -> URLEncoder.encode(e.getKey(), StandardCharsets.UTF_8) + "=" + URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8))
        .collect(Collectors.joining("&"));
    return postForm(path, body); // S37: TomcatTest adds the CSRF token
  }

  /** Creates a task through the form; returns its id (from the redirect's Location). */
  private static long create(String title) throws Exception {
    HttpResponse<String> created = postForm(CONTEXT + "/tasks/new", Map.of("title", title, "priority", "HIGH", "dueDate", ""));
    assertEquals(303, created.statusCode()); // S37: PRG with 303 (was 302)
    String location = created.headers().firstValue("Location").orElseThrow();
    assertTrue(location.startsWith(CONTEXT + "/tasks/view?id="), location);
    return Long.parseLong(location.substring(location.indexOf("id=") + 3));
  }

  @Test
  void theListShowsSeededTasksAndFiltersByStatus() throws Exception {
    String all = get(CONTEXT + "/tasks").body();
    assertTrue(all.contains("Plan team offsite")); // S36: seed data from db/03-seed.sql (was the in-memory "Book flights…")
    String done = get(CONTEXT + "/tasks?status=DONE").body();
    assertTrue(done.contains("Plan team offsite"));
    assertFalse(done.contains("Write quarterly report"));
    // an unknown status is ignored, not an error
    assertEquals(200, get(CONTEXT + "/tasks?status=DELETED").statusCode());
  }

  @Test
  void viewValidatesTheId() throws Exception {
    assertEquals(400, get(CONTEXT + "/tasks/view").statusCode());
    assertEquals(400, get(CONTEXT + "/tasks/view?id=abc").statusCode()); // 31.16: no NumberFormatException → 500
    assertEquals(400, get(CONTEXT + "/tasks/view?id=-1").statusCode());
    assertEquals(404, get(CONTEXT + "/tasks/view?id=999999").statusCode());
  }

  @Test
  void createRedirectsToTheNewTaskAndTheUtf8TitleSurvives() throws Exception {
    long id = create("Viết báo cáo quý");
    HttpResponse<String> view = get(CONTEXT + "/tasks/view?id=" + id);
    assertEquals(200, view.statusCode());
    assertTrue(view.body().contains("Viết báo cáo quý"));
  }

  @Test
  void invalidInputIs400WithErrorsAndTheEscapedValuesKept() throws Exception {
    HttpResponse<String> response = postForm(CONTEXT + "/tasks/new", Map.of("title", "  ", "priority", "URGENT", "dueDate", "tomorrow"));
    assertEquals(400, response.statusCode());
    assertTrue(response.body().contains("must not be blank"));
    assertTrue(response.body().contains("must be one of LOW, MEDIUM, HIGH"));
    assertTrue(response.body().contains("must be a date (YYYY-MM-DD)"));

    HttpResponse<String> xss = postForm(CONTEXT + "/tasks/new", Map.of("title", "\"><script>x</script>", "priority", "NOPE"));
    assertTrue(xss.body().contains("value=\"&#034;&gt;&lt;script&gt;x&lt;/script&gt;\"")); // S37: form.jsp uses fn:escapeXml
  }

  @Test
  void titlesAreEscapedInTheList() throws Exception {
    create("<img src=x onerror=alert(1)>");
    String list = get(CONTEXT + "/tasks").body();
    assertFalse(list.contains("<img src=x"));
    assertTrue(list.contains("&lt;img src=x onerror=alert(1)&gt;"));
  }

  @Test
  void forwardKeepsTheUrlAndShowsTheNewestTask() throws Exception {
    create("The newest task " + System.nanoTime());
    HttpResponse<String> latest = get(CONTEXT + "/tasks/latest");
    assertEquals(200, latest.statusCode()); // no 302: the browser never learns about /tasks/view
    assertTrue(latest.headers().firstValue("Location").isEmpty());
    assertTrue(latest.body().contains("The newest task"));
  }

  @Test
  void toggleAndDeleteArePostOnlyThenRedirectToTheList() throws Exception {
    long id = create("Toggle me " + System.nanoTime());
    assertEquals(405, get(CONTEXT + "/tasks/delete?id=" + id).statusCode()); // GET can't delete (29.03)

    HttpResponse<String> toggled = postForm(CONTEXT + "/tasks/toggle", Map.of("id", String.valueOf(id)));
    assertEquals(303, toggled.statusCode());
    assertEquals(CONTEXT + "/tasks", toggled.headers().firstValue("Location").orElseThrow());
    assertTrue(get(CONTEXT + "/tasks/view?id=" + id).body().contains(">DONE<"));

    assertEquals(303, postForm(CONTEXT + "/tasks/delete", Map.of("id", String.valueOf(id))).statusCode());
    assertEquals(404, get(CONTEXT + "/tasks/view?id=" + id).statusCode());
    assertEquals(404, postForm(CONTEXT + "/tasks/delete", Map.of("id", String.valueOf(id))).statusCode()); // already gone
  }
}
