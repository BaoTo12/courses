package com.taskflow.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URLEncoder;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/** S35: JSTL views (loops, choices, URLs, escaping by default), the comments section, stored XSS defended. */
class S35JstlTest extends TomcatTest {

  private static String enc(String s) {
    return URLEncoder.encode(s, StandardCharsets.UTF_8);
  }

  private static HttpResponse<String> post(String path, String form) throws Exception {
    return send(HttpRequest.newBuilder(uri(CONTEXT + path))
        .header("Content-Type", "application/x-www-form-urlencoded").POST(HttpRequest.BodyPublishers.ofString(form)).build());
  }

  @Test
  void noViewContainsJavaAnymore() throws Exception { // 35.08, 35.09
    List<Path> views;
    try (Stream<Path> files = Files.walk(Path.of("src/main/webapp/WEB-INF/views"))) {
      views = files.filter(p -> p.toString().endsWith(".jsp") || p.toString().endsWith(".jspf")).toList();
    }
    assertTrue(views.size() >= 5, views.toString());
    for (Path view : views) {
      String source = Files.readString(view, StandardCharsets.UTF_8);
      assertFalse(Pattern.compile("<%(?![@-])").matcher(source).find(), view.toString());
    }
  }

  @Test
  void theListLoopsWithRowNumbersAndStatusLabels() throws Exception { // 35.07, 35.08
    String list = get(CONTEXT + "/tasks").body();
    assertTrue(list.contains("<td class=\"row-number\">1</td>"), list);
    assertTrue(list.contains("<span class=\"badge badge--progress\">In progress</span>"));
    assertTrue(list.contains("<span class=\"badge badge--done\">Done</span>"));
    assertTrue(list.contains("data-confirm-title=\"Write quarterly report\""));
    assertFalse(list.contains("No tasks."));
  }

  @Test
  void anEmptyResultRendersNoTableAtAll() throws Exception { // 35.06: not rendered, not just hidden
    String none = get(CONTEXT + "/tasks?q=" + enc("no such task anywhere")).body();
    assertTrue(none.contains("<p class=\"text-muted\">No tasks.</p>"));
    assertFalse(none.contains("<table"));
  }

  @Test
  void statusLinksAreBuiltWithCUrlAndCParam() throws Exception { // 35.11: URL-encoded parameters, then HTML-escaped &
    String body = get(CONTEXT + "/tasks?q=" + enc("a&b\"")).body();
    assertTrue(body.contains("href=\"/taskflow/tasks?status=DONE&amp;q=a%26b%22\""), body);
    assertTrue(body.contains("href=\"/taskflow/static/css/app.css\""));
  }

  @Test
  void storedXssInACommentIsRenderedAsText() throws Exception { // 35.14, 35.15
    HttpResponse<String> created = post("/tasks/comment", "id=3&body=" + enc("<img src=x onerror=alert('stored')>"));
    assertEquals(302, created.statusCode());
    assertEquals(CONTEXT + "/tasks/view?id=3#comments", created.headers().firstValue("Location").orElseThrow());

    String view = get(CONTEXT + "/tasks/view?id=3").body();
    assertFalse(view.contains("<img src=x"));
    assertTrue(view.contains("<td class=\"comment__body\">&lt;img src=x onerror=alert(&#039;stored&#039;)&gt;</td>"), view);
  }

  @Test
  void theCommentsSectionHasAnEmptyStateZebraRowsAndAnAdminLabel() throws Exception { // 35.18, 35.19
    String none = get(CONTEXT + "/tasks/view?id=4").body();
    assertTrue(none.contains("<h2>Comments (0)</h2>"));
    assertTrue(none.contains("<p class=\"text-muted\">No comments yet.</p>"));

    String two = get(CONTEXT + "/tasks/view?id=1").body();
    assertTrue(two.contains("<h2>Comments (2)</h2>"), two);
    assertTrue(two.contains("<tr class=\"comment--odd\">"));
    assertTrue(two.contains("<tr class=\"comment--even\">"));
    assertTrue(two.contains("<td class=\"row-number\">#2</td>"));
    assertTrue(two.contains("<td class=\"comment__author\">Admin <span class=\"badge\">Admin</span></td>"), two);
    assertTrue(two.contains("<td class=\"comment__author\">Alice Nguyen</td>"));
  }

  @Test
  void invalidCommentsAreRejected() throws Exception { // TaskCommentServlet (provided)
    assertEquals(400, post("/tasks/comment", "id=1&body=" + enc("   ")).statusCode());
    assertEquals(400, post("/tasks/comment", "id=1&body=" + "x".repeat(1001)).statusCode());
    assertEquals(404, post("/tasks/comment", "id=999999&body=hi").statusCode());
  }

  @Test
  void theConfirmTitleIsEscapedForItsAttributeContext() throws Exception { // 35.16, 35.17
    post("/tasks/new", "priority=LOW&title=" + enc("\"><script>x</script>"));
    String list = get(CONTEXT + "/tasks").body();
    assertTrue(list.contains("data-confirm-title=\"&#034;&gt;&lt;script&gt;x&lt;/script&gt;\""), list);
    assertFalse(list.contains("<script>x</script>"));
  }

  @Test
  void theDebugPageListsEveryHeaderAndCookie() throws Exception { // 35.07: iterating maps
    HttpResponse<String> response = send(HttpRequest.newBuilder(uri(CONTEXT + "/debug/el"))
        .header("User-Agent", "TaskFlowTest/1.0").header("Cookie", "tf_lang=vi; theme=dark").GET().build());
    String body = response.body();
    assertTrue(body.contains("<tr><td>theme</td><td>dark</td></tr>"), body);
    assertTrue(body.contains("<tr><td>tf_lang</td><td>vi</td></tr>"));
    assertTrue(body.split("TaskFlowTest/1.0", -1).length - 1 >= 2); // the single row + the loop
  }
}
