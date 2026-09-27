package com.taskflow.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
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

/**
 * S49: the React island page (initial data safe inside a script element, CSP nonce), the comments island hook,
 * the SPA served from the WAR under /app/ (fallback routing, nonce substitution, caching).
 * The island and SPA tests need the frontend builds in src/main/webapp (npm run build:island / build:war).
 */
class S49HybridTest extends TomcatTest {

  private static final ObjectMapper JSON = new ObjectMapper();
  private static final Pattern NONCE = Pattern.compile("'nonce-([A-Za-z0-9+/=]+)'");

  private static String nonceOf(HttpResponse<String> response) {
    Matcher m = NONCE.matcher(response.headers().firstValue("Content-Security-Policy").orElse(""));
    assertTrue(m.find(), "no nonce in the CSP");
    return m.group(1);
  }

  @Test
  void everyResponseGetsAFreshNonceThatThePageUses() throws Exception { // 49.06
    HttpResponse<String> first = get(CONTEXT + "/tasks");
    HttpResponse<String> second = get(CONTEXT + "/tasks");
    assertNotEquals(nonceOf(first), nonceOf(second));
    assertTrue(first.body().contains("<meta property=\"csp-nonce\" nonce=\"" + nonceOf(first) + "\">"), first.body());
    String csp = first.headers().firstValue("Content-Security-Policy").orElseThrow();
    assertTrue(csp.contains("script-src 'self' 'nonce-") && csp.contains("style-src 'self' 'nonce-"), csp);
    assertFalse(csp.contains("unsafe-inline"));
  }

  @Test
  void initialDataCannotBreakOutOfItsScriptElement() throws Exception { // 49.04, 49.05
    String title = "</script><script>alert(1)</script> & co " + System.nanoTime();
    postForm(CONTEXT + "/tasks/new", "priority=LOW&title=" + URLEncoder.encode(title, StandardCharsets.UTF_8));
    HttpResponse<String> page = get(CONTEXT + "/react-board");
    assertEquals(200, page.statusCode());
    String body = page.body();
    assertFalse(body.contains("</script><script>alert(1)"), "the title reached the HTML parser unescaped");
    int start = body.indexOf("<script type=\"application/json\" id=\"board-data\">");
    assertTrue(start > 0, body);
    String data = body.substring(body.indexOf('>', start) + 1, body.indexOf("</script>", start));
    assertTrue(data.contains("\\u003c/script\\u003e"), data.substring(0, Math.min(300, data.length())));
    JsonNode initial = JSON.readTree(data);                                         // still valid JSON…
    boolean found = false;
    for (JsonNode task : initial.get("tasks").get("items")) found |= task.get("title").asText().equals(title);
    assertTrue(found, "…and JSON.parse gives back the original title");
    assertEquals("alice", initial.get("user").get("username").asText());
    assertEquals(0, initial.get("tasks").get("page").asInt());
  }

  @Test
  void theIslandScriptCarriesTheNonceAndTheHashedFile() throws Exception { // 49.07
    HttpResponse<String> page = get(CONTEXT + "/react-board");
    Matcher script = Pattern.compile("<script type=\"module\" nonce=\"([^\"]+)\" src=\"/taskflow/static/island/assets/boardIsland-[^\"]+\\.js\"></script>")
        .matcher(page.body());
    assertTrue(script.find(), page.body());
    assertEquals(nonceOf(page), script.group(1));
    HttpResponse<String> view = get(CONTEXT + "/tasks/view?id=1");
    assertTrue(view.body().contains("<div id=\"comments-root\" data-task-id=\"1\">"));   // 49.12
    assertTrue(view.body().contains("<script type=\"application/json\" id=\"comments-data\">"));
    assertTrue(view.body().contains("<table class=\"comments\">"));                    // the no-JS fallback stays
  }

  @Test
  void theSpaIsServedFromTheWarWithFallbackRouting() throws Exception { // 49.10
    HttpClient anonymous = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).build();
    HttpResponse<String> deep = anonymous.send(HttpRequest.newBuilder(uri(CONTEXT + "/app/tasks/5")).build(), HttpResponse.BodyHandlers.ofString());
    assertEquals(200, deep.statusCode());                                           // public shell, not a login redirect
    assertTrue(deep.body().contains("<div id=\"root\"></div>"));
    assertFalse(deep.body().contains("__CSP_NONCE__"));
    assertTrue(deep.body().contains("nonce=\"" + nonceOf(deep) + "\""));
    assertEquals("no-store", deep.headers().firstValue("Cache-Control").orElse(""));

    Matcher asset = Pattern.compile("src=\"/taskflow(/app/assets/index-[^\"]+\\.js)\"").matcher(deep.body());
    assertTrue(asset.find());
    HttpResponse<String> js = anonymous.send(HttpRequest.newBuilder(uri(CONTEXT + asset.group(1))).build(), HttpResponse.BodyHandlers.ofString());
    assertEquals(200, js.statusCode());
    assertEquals("public, max-age=31536000, immutable", js.headers().firstValue("Cache-Control").orElse(""));

    HttpResponse<String> bare = anonymous.send(HttpRequest.newBuilder(uri(CONTEXT + "/app")).build(), HttpResponse.BodyHandlers.ofString());
    assertEquals(302, bare.statusCode());
    assertEquals(CONTEXT + "/app/", bare.headers().firstValue("Location").orElseThrow().replaceFirst("^https?://[^/]+", ""));
    assertEquals(200, anonymous.send(HttpRequest.newBuilder(uri(CONTEXT + "/app/locales/vi/common.json")).build(),
        HttpResponse.BodyHandlers.ofString()).statusCode());
  }
}
