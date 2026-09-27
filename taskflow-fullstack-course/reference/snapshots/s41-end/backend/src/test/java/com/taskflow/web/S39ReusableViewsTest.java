package com.taskflow.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

/** S39: fragments (static and request-time includes), active navigation, the theme cookie, the shared task row. */
class S39ReusableViewsTest extends TomcatTest {

  private static String enc(String s) {
    return URLEncoder.encode(s, StandardCharsets.UTF_8);
  }

  private static String getWithCookie(String path, String cookie) throws Exception {
    return HttpClient.newHttpClient().send(HttpRequest.newBuilder(uri(CONTEXT + path)).header("Cookie", cookie).build(),
        HttpResponse.BodyHandlers.ofString()).body();
  }

  @Test
  void afterAForwardTheServletPathIsTheJsps() throws Exception { // 39.08
    String body = get(CONTEXT + "/debug/el").body();
    assertTrue(body.contains("<code>${pageContext.request.servletPath}</code></td><td>/WEB-INF/views/debug/el.jsp</td>"), body);
    assertTrue(body.contains("<code>${requestScope['javax.servlet.forward.servlet_path']}</code></td><td>/debug/el</td>"));
  }

  @Test
  void theCurrentSectionIsHighlighted() throws Exception { // 39.08
    String tasks = get(CONTEXT + "/tasks").body();
    assertTrue(tasks.contains("<a class=\"page__nav-link is-active\" href=\"/taskflow/tasks\">Tasks</a>"), tasks);
    assertTrue(tasks.contains("<a class=\"page__nav-link\" href=\"/taskflow/categories\">Categories</a>"));

    String view = get(CONTEXT + "/tasks/view?id=1").body();
    assertTrue(view.contains("<a class=\"page__nav-link is-active\" href=\"/taskflow/tasks\">Tasks</a>"));

    String newTask = get(CONTEXT + "/tasks/new").body();
    assertTrue(newTask.contains("<a class=\"page__nav-link is-active\" href=\"/taskflow/tasks/new\">New task</a>"));
    assertTrue(newTask.contains("<a class=\"page__nav-link\" href=\"/taskflow/tasks\">Tasks</a>"));
  }

  @Test
  void theThemeComesFromTheSharedCookieThroughAnAllowList() throws Exception { // 39.09
    assertTrue(getWithCookie("/debug/el", "tf_theme=dark").contains("<html lang=\"en\" data-theme=\"dark\">"));
    assertTrue(getWithCookie("/debug/el", "tf_theme=light").contains("<html lang=\"en\" data-theme=\"light\">"));
    assertTrue(getWithCookie("/debug/el", "tf_theme=%22%3E%3Cscript%3E").contains("<html lang=\"en\">"));   // not allowed → none
    String noCookie = HttpClient.newHttpClient()        // a fresh browser: this class's client may hold tf_theme already (36.14)
        .send(HttpRequest.newBuilder(uri(CONTEXT + "/debug/el")).build(), HttpResponse.BodyHandlers.ofString()).body();
    assertTrue(noCookie.contains("<html lang=\"en\">"));
  }

  @Test
  void theThemeSwitchSetsTheCookieAndReturnsToThePage() throws Exception { // 39.09
    HttpResponse<String> switched = postForm(CONTEXT + "/preferences/theme", "theme=dark&returnTo=" + enc(CONTEXT + "/tasks?q=report"));
    assertEquals(303, switched.statusCode());
    assertEquals(CONTEXT + "/tasks?q=report", switched.headers().firstValue("Location").orElseThrow());
    String cookie = switched.headers().allValues("Set-Cookie").stream().filter(c -> c.startsWith("tf_theme=")).findFirst().orElseThrow();
    assertTrue(cookie.contains("tf_theme=dark") && cookie.contains("Path=/") && cookie.contains("Max-Age="), cookie);
    assertTrue(get(CONTEXT + "/tasks").body().contains("data-theme=\"dark\""));             // the client sends it back

    HttpResponse<String> offsite = postForm(CONTEXT + "/preferences/theme", "theme=light&returnTo=" + enc("https://evil.example/"));
    assertEquals(CONTEXT + "/tasks", offsite.headers().firstValue("Location").orElseThrow()); // no open redirect
    assertEquals(400, postForm(CONTEXT + "/preferences/theme", "theme=neon").statusCode());
  }

  @Test
  void theFormErrorsFragmentReceivesItsTitleAsAParameter() throws Exception { // 39.05, 39.06
    String body = postForm(CONTEXT + "/categories/save", "name=&color=%23000000").body();
    assertTrue(body.contains("<p class=\"form-errors__title\">The category was not saved:</p>"), body);
    assertTrue(body.contains("Name must not be blank"));
  }

  @Test
  void theDashboardReusesTheTaskRowFragment() throws Exception { // 39.10
    postForm(CONTEXT + "/tasks/new", "priority=HIGH&dueDate=2020-01-01&title=" + enc("Dashboard overdue " + System.nanoTime()));
    String dashboard = get(CONTEXT + "/dashboard").body();
    assertTrue(dashboard.contains("<a class=\"page__nav-link is-active\" href=\"/taskflow/dashboard\">Dashboard</a>"));
    int overdue = dashboard.indexOf("<table class=\"dashboard__overdue\">");
    assertTrue(overdue > 0, dashboard);
    assertTrue(dashboard.indexOf("<tr class=\"task-row--overdue\">", overdue) > 0);
    assertTrue(dashboard.contains("Dashboard overdue "));
    assertFalse(dashboard.contains("Plan team offsite"));                                     // DONE: not on the dashboard
  }
}
