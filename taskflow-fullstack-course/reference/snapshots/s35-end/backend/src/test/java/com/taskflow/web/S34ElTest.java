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
import org.junit.jupiter.api.Test;

/** S34: views written with EL; nested bean properties; implicit objects; EL itself does not escape (we do). */
class S34ElTest extends TomcatTest {

  private static String enc(String s) {
    return URLEncoder.encode(s, StandardCharsets.UTF_8);
  }

  @Test
  void theDetailsPageShowsNestedPropertiesAndIsNullSafe() throws Exception { // 34.08, 34.09
    String first = get(CONTEXT + "/tasks/view?id=1").body();
    assertTrue(first.contains("<dt>Category</dt><dd>Work</dd>"), first);
    assertTrue(first.contains("<dt>Owner</dt><dd>Alice Nguyen (alice)</dd>"));
    assertTrue(first.contains("<dt>Due</dt><dd>2026-10-03</dd>"));

    String noCategory = get(CONTEXT + "/tasks/view?id=4").body(); // categoryId null, no due date
    assertTrue(noCategory.contains("<dd>No category</dd>"));
    assertTrue(noCategory.contains("<dd>no due date</dd>"));
  }

  @Test
  void userTextIsEscapedBecauseElItselfDoesNotEscape() throws Exception { // 34.18, 34.19
    String body = "title=" + enc("<script>alert(1)</script> S34") + "&priority=LOW";
    HttpResponse<String> created = send(HttpRequest.newBuilder(uri(CONTEXT + "/tasks/new"))
        .header("Content-Type", "application/x-www-form-urlencoded").POST(HttpRequest.BodyPublishers.ofString(body)).build());
    String location = created.headers().firstValue("Location").orElseThrow();

    String view = get(location).body();
    assertFalse(view.contains("<script>alert(1)"));
    assertTrue(view.contains("<title>&lt;script&gt;alert(1)&lt;/script&gt; S34 · TaskFlow Admin</title>"));
    assertTrue(view.contains("<h1 class=\"page__title\">&lt;script&gt;alert(1)&lt;/script&gt; S34</h1>"));
    assertFalse(get(CONTEXT + "/tasks").body().contains("<script>alert(1)"));
  }

  @Test
  void theSearchBoxEchoesTheQueryEscapedAndFilters() throws Exception { // 34.18 (fixed), 34.15
    String echoed = get(CONTEXT + "/tasks?q=" + enc("report\"><script>")).body();
    // S35: fn:escapeXml writes " as &#034; (S34's Html.escape wrote &quot;: equivalent entities, 35.04)
    assertTrue(echoed.contains("value=\"report&#034;&gt;&lt;script&gt;\""), echoed);

    String found = get(CONTEXT + "/tasks?q=REPORT").body();
    assertTrue(found.contains("Write quarterly report"));
    assertFalse(found.contains("Review PR #42"));
  }

  @Test
  void theListReadsAMapComparesEnumsWithStringsAndUsesEmpty() throws Exception { // 34.10, 34.13, 34.20
    String list = get(CONTEXT + "/tasks").body();
    assertTrue(list.matches("(?s).*<span class=\"badge\">To do: \\d+</span>.*"), list);
    assertTrue(list.matches("(?s).*<span class=\"badge\">Done: \\d+</span>.*"));

    String done = get(CONTEXT + "/tasks?status=DONE").body();
    assertTrue(done.contains("<a class=\"is-active\" href=\"/taskflow/tasks?status=DONE\">DONE</a>"));
    assertTrue(done.contains("<a class=\"\" href=\"/taskflow/tasks?status=TODO\">TODO</a>"));

    String none = get(CONTEXT + "/tasks?q=" + enc("no such task anywhere")).body();
    assertTrue(none.contains("<p class=\"text-muted\">No tasks.</p>"));
    assertFalse(none.contains("<table")); // S35: <c:choose> doesn't render it at all (S34 sent it with `hidden`)
  }

  @Test
  void theElDebugPageShowsImplicitObjectsAndCoercions() throws Exception { // 34.03, 34.13–34.16
    HttpResponse<String> response = send(HttpRequest.newBuilder(uri(CONTEXT + "/debug/el?q=%3Cb%3Ehi&tag=a&tag=b"))
        .header("User-Agent", "TaskFlowTest/1.0").header("Cookie", "tf_lang=vi").GET().build());
    assertEquals(200, response.statusCode(), response.body());
    String body = response.body();
    assertTrue(body.contains("<code>${param.q}</code></td><td>&lt;b&gt;hi</td>"), body);
    assertTrue(body.contains("<code>${paramValues.tag[1]}</code></td><td>b</td>"));
    assertTrue(body.contains("<code>${param.page + 1}</code></td><td>1</td>"));      // null → 0, then + 1
    assertTrue(body.contains("<code>${empty param.missing}</code></td><td>true</td>"));
    assertTrue(body.contains("<code>${header['User-Agent']}</code></td><td>TaskFlowTest/1.0</td>"));
    assertTrue(body.contains("<code>${cookie.tf_lang.value}</code></td><td>vi</td>"));
    assertTrue(body.contains("<code>${initParam.greeting}</code></td><td>Xin chào từ TaskFlow!</td>"));
    assertTrue(body.contains("<code>${pageContext.request.contextPath}</code></td><td>/taskflow</td>"));
    assertTrue(body.contains("<code>${pageContext.request.method}</code></td><td>GET</td>"));
    assertTrue(body.contains("<code>${applicationScope.scopeDemo}</code></td><td>application</td>"));
    assertTrue(body.contains("<code>${scopeDemo}</code></td><td>request</td>"));             // request before application
    assertTrue(body.contains("<code>${empty pageContext.session}</code></td><td>true</td>")); // session="false" (34.25)
    assertTrue(body.contains("<code>${'5' == 5}</code></td><td>true</td>"));
    assertTrue(response.headers().allValues("Set-Cookie").isEmpty()); // sessionScope didn't create a session
  }

  @Test
  void convertedViewsContainNoScriptlets() throws Exception { // 34.09: only directives and comments remain
    for (String view : List.of("tasks/view.jsp", "common/header.jspf", "debug/el.jsp")) {
      String source = Files.readString(Path.of("src/main/webapp/WEB-INF/views/" + view), StandardCharsets.UTF_8);
      assertFalse(Pattern.compile("<%(?![@-])").matcher(source).find(), view);
    }
  }
}
