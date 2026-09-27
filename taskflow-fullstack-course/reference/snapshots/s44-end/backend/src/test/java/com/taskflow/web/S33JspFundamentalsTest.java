package com.taskflow.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URLEncoder;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

/** S33: page directive effects, translation-time includes, and the scriptlet "overdue" feature. */
class S33JspFundamentalsTest extends TomcatTest {

  @Test
  void sessionFalseMeansTheViewsCreateNoSessionCookie() throws Exception { // 33.10
    // S37: task pages now create a session ON PURPOSE (their forms need a CSRF token, 37.13). A JSP-only page doesn't.
    HttpResponse<String> response = java.net.http.HttpClient.newHttpClient()
        .send(HttpRequest.newBuilder(uri(CONTEXT + "/debug/el")).build(), HttpResponse.BodyHandlers.ofString());
    assertEquals(200, response.statusCode());
    assertTrue(response.headers().allValues("Set-Cookie").isEmpty(), response.headers().allValues("Set-Cookie").toString());
  }

  @Test
  void theHeaderFragmentIsIncludedWithThePagesTitle() throws Exception { // 33.10 include directive
    String view = get(CONTEXT + "/tasks/view?id=1").body();
    assertTrue(view.contains("<title>Write quarterly report · TaskFlow Admin</title>"));
    assertTrue(view.contains("<footer class=\"page__footer\">TaskFlow Admin</footer>"));
  }

  @Test
  void overdueTasksAreCountedAndHighlighted() throws Exception { // 33.15
    String body = "title=" + URLEncoder.encode("Overdue " + System.nanoTime(), StandardCharsets.UTF_8) + "&priority=LOW&dueDate=2020-01-01";
    HttpResponse<String> created = postForm(CONTEXT + "/tasks/new", body);
    assertEquals(303, created.statusCode());

    String list = get(CONTEXT + "/tasks?sort=newest").body();   // S44: paged; the new task is on page 1 when newest first
    assertTrue(list.contains("class=\"task-row--overdue\""));
    assertTrue(list.matches("(?s).*<p class=\"text-danger\">\\d+ overdue tasks?</p>.*"));
    assertTrue(list.contains("Jan 1, 2020"), list);                // S44: <tf:date>, in the request's language
    assertTrue(list.contains(" ⚠"));
  }
}
