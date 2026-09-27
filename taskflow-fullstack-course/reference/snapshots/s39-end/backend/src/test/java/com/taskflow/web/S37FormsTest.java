package com.taskflow.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URLEncoder;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

/** S37: create/edit/delete forms, validation with redisplay, PRG with 303 + flash, CSRF tokens, no mass assignment. */
class S37FormsTest extends TomcatTest {

  private static String enc(String s) {
    return URLEncoder.encode(s, StandardCharsets.UTF_8);
  }

  private static HttpResponse<String> postWithoutToken(String path, String body) throws Exception {
    return send(HttpRequest.newBuilder(uri(CONTEXT + path))
        .header("Content-Type", "application/x-www-form-urlencoded").POST(HttpRequest.BodyPublishers.ofString(body)).build());
  }

  private static long idFrom(HttpResponse<String> response) {
    String location = response.headers().firstValue("Location").orElseThrow();
    return Long.parseLong(location.replaceAll(".*id=(\\d+).*", "$1"));
  }

  @Test
  void theNewTaskFormCarriesACsrfTokenFromTheSession() throws Exception { // 37.03, 37.13
    HttpResponse<String> form = java.net.http.HttpClient.newHttpClient()
        .send(HttpRequest.newBuilder(uri(CONTEXT + "/tasks/new")).build(), HttpResponse.BodyHandlers.ofString());
    assertEquals(200, form.statusCode());
    assertTrue(form.body().matches("(?s).*<input type=\"hidden\" name=\"_csrf\" value=\"[A-Za-z0-9_-]{43}\">.*"), form.body());
    assertTrue(form.headers().allValues("Set-Cookie").stream().anyMatch(c -> c.startsWith("JSESSIONID=") && c.contains("HttpOnly")));
  }

  @Test
  void postsWithoutTheRightTokenAreRefused() throws Exception { // 37.12, 37.13
    String title = "Forged " + System.nanoTime();
    assertEquals(403, postWithoutToken("/tasks/new", "priority=LOW&title=" + enc(title)).statusCode());
    assertEquals(403, postWithoutToken("/tasks/new", "priority=LOW&title=" + enc(title) + "&_csrf=guessed").statusCode());
    assertEquals(403, postWithoutToken("/tasks/delete", "id=1").statusCode());
    assertFalse(get(CONTEXT + "/tasks").body().contains(title));
    assertTrue(get(CONTEXT + "/tasks/view?id=1").body().contains("Write quarterly report")); // not deleted
  }

  @Test
  void aValidCreateIsPostRedirectGetWithAOneTimeFlash() throws Exception { // 37.08, 37.09
    HttpResponse<String> created = postForm(CONTEXT + "/tasks/new", "priority=HIGH&categoryId=2&title=" + enc("PRG " + System.nanoTime()));
    assertEquals(303, created.statusCode());
    String location = created.headers().firstValue("Location").orElseThrow();
    assertTrue(location.startsWith(CONTEXT + "/tasks/view?id="));

    String first = get(location).body();
    assertTrue(first.contains("<p class=\"flash\" role=\"status\">Task created.</p>"), first);
    assertTrue(first.contains("<dt>Category</dt><dd>Engineering</dd>"));
    assertFalse(get(location).body().contains("Task created."));          // shown once
  }

  @Test
  void invalidInputComesBackWithErrorsAndTheUsersValues() throws Exception { // 37.05, 37.06
    HttpResponse<String> response = postForm(CONTEXT + "/tasks/new",
        "title=" + enc("\"><b>x</b>") + "&priority=URGENT&dueDate=2026-02-30&categoryId=999&description=" + enc("keep me"));
    assertEquals(400, response.statusCode());
    String body = response.body();
    assertTrue(body.contains("value=\"&#034;&gt;&lt;b&gt;x&lt;/b&gt;\""), body);          // old value, escaped
    assertTrue(body.contains(">keep me</textarea>"));
    assertTrue(body.contains("must be one of LOW, MEDIUM, HIGH"));
    assertTrue(body.contains("must be a date (YYYY-MM-DD)"));                        // Feb 30 doesn't parse
    assertTrue(body.contains("must be one of the listed categories"));
    assertTrue(body.contains("<div class=\"form-field form-field--error\">"));
  }

  @Test
  void aDuplicateTitleIsAFormErrorNotA500() throws Exception { // 37.04
    HttpResponse<String> response = postForm(CONTEXT + "/tasks/new", "priority=LOW&title=" + enc("write QUARTERLY report"));
    assertEquals(400, response.statusCode());
    assertTrue(response.body().contains("you already have a task with this title"));
  }

  @Test
  void editIsPrefilledAndSavesOnlyTheFormFields() throws Exception { // 37.10, 37.11
    long id = idFrom(postForm(CONTEXT + "/tasks/new", "priority=LOW&dueDate=2026-12-01&title=" + enc("Edit me " + System.nanoTime())));
    String form = get(CONTEXT + "/tasks/edit?id=" + id).body();
    assertTrue(form.contains("value=\"2026-12-01\""));
    assertTrue(form.contains("<option selected>LOW</option>"));
    assertTrue(form.contains("<input type=\"hidden\" name=\"id\" value=\"" + id + "\">"));

    String newTitle = "Edited " + System.nanoTime();
    HttpResponse<String> saved = postForm(CONTEXT + "/tasks/edit",
        "id=" + id + "&priority=HIGH&title=" + enc(newTitle) + "&ownerId=2&status=DONE");  // two fields the form doesn't have
    assertEquals(303, saved.statusCode());
    String view = get(CONTEXT + "/tasks/view?id=" + id).body();
    assertTrue(view.contains("Task saved."));
    assertTrue(view.contains("<h1 class=\"page__title\">" + newTitle + "</h1>"));
    assertTrue(view.contains("<dt>Owner</dt><dd>Alice Nguyen (alice)</dd>"));     // not bob: mass assignment ignored
    assertTrue(view.contains("<span class=\"badge\">TODO</span>"));               // status unchanged
  }

  @Test
  void deleteIsAPostWithAFlashAndA303() throws Exception { // 37.10
    long id = idFrom(postForm(CONTEXT + "/tasks/new", "priority=LOW&title=" + enc("Delete me " + System.nanoTime())));
    assertEquals(405, get(CONTEXT + "/tasks/delete?id=" + id).statusCode());
    HttpResponse<String> deleted = postForm(CONTEXT + "/tasks/delete", "id=" + id);
    assertEquals(303, deleted.statusCode());
    assertEquals(CONTEXT + "/tasks", deleted.headers().firstValue("Location").orElseThrow());
    assertTrue(get(CONTEXT + "/tasks").body().contains("Task deleted."));
    assertEquals(404, get(CONTEXT + "/tasks/view?id=" + id).statusCode());
  }
}
