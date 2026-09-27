package com.taskflow.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.net.URLEncoder;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

/** S40: the filter chain: encoding, logging (status + request id), security headers, maintenance mode, CSRF. */
class S40FiltersTest extends TomcatTest {

  private static String enc(String s) {
    return URLEncoder.encode(s, StandardCharsets.UTF_8);
  }

  @Test
  void utf8BodiesWorkWithoutAnyServletSettingTheEncoding() throws Exception { // 40.05
    String title = "Họp nhóm thứ Hai " + System.nanoTime();
    HttpResponse<String> created = postForm(CONTEXT + "/tasks/new", "priority=LOW&title=" + enc(title));
    assertEquals(303, created.statusCode());
    assertTrue(get(created.headers().firstValue("Location").orElseThrow()).body().contains(title));
  }

  @Test
  void everyRequestIsLoggedWithItsFinalStatusAndAnId() throws Exception { // 40.06, 40.17
    Logger logger = (Logger) LoggerFactory.getLogger("com.taskflow.web.filters.RequestLoggingFilter");
    ListAppender<ILoggingEvent> captured = new ListAppender<>();
    captured.start();
    logger.addAppender(captured);
    try {
      HttpResponse<String> missing = get(CONTEXT + "/tasks/view?id=999999");
      assertEquals(404, missing.statusCode());
      String requestId = missing.headers().firstValue("X-Request-Id").orElseThrow();
      ILoggingEvent line = captured.list.stream()
          .filter(e -> e.getFormattedMessage().startsWith("GET /taskflow/tasks/view?id=999999 "))
          .findFirst().orElseThrow();
      assertTrue(line.getFormattedMessage().matches("GET /taskflow/tasks/view\\?id=999999 404 \\d+ms"), line.getFormattedMessage());
      assertEquals(requestId, line.getMDCPropertyMap().get("requestId"));
    } finally {
      logger.detachAppender(captured);
    }
  }

  @Test
  void securityHeadersAreOnEveryResponse() throws Exception { // 40.10
    for (String path : new String[] {"/tasks", "/static/css/app.css", "/tasks/view?id=999999"}) {
      HttpResponse<String> response = get(CONTEXT + path);
      assertTrue(response.headers().firstValue("Content-Security-Policy").orElse("").contains("frame-ancestors 'none'"), path);
      assertEquals("nosniff", response.headers().firstValue("X-Content-Type-Options").orElse(""), path);
      assertEquals("DENY", response.headers().firstValue("X-Frame-Options").orElse(""), path);
      assertEquals("strict-origin-when-cross-origin", response.headers().firstValue("Referrer-Policy").orElse(""), path);
    }
  }

  @Test
  void noViewUsesInlineStylesOrScriptsAnyMore() throws Exception { // 40.12: the CSP would block them
    for (String path : new String[] {"/tasks", "/tasks/view?id=1", "/tasks/new", "/categories", "/dashboard"}) {
      String body = get(CONTEXT + path).body();
      assertFalse(body.contains(" style=\""), path);
      // every EXECUTABLE <script> has a src; S49's JSON data blocks (type="application/json") are never executed
      assertFalse(body.matches("(?s).*<script(?![^>]*\\ssrc=)(?![^>]*type=\"application/json\")[^>]*>.*"), path);
    }
  }

  @Test
  void theCsrfFilterGuardsEveryNonGetRequest() throws Exception { // 40.13
    HttpResponse<String> noToken = send(HttpRequest.newBuilder(uri(CONTEXT + "/tasks"))   // a GET-only servlet
        .header("Content-Type", "application/x-www-form-urlencoded").POST(HttpRequest.BodyPublishers.ofString("x=1")).build());
    assertEquals(403, noToken.statusCode());                                             // the filter answers first
    assertEquals(405, postForm(CONTEXT + "/tasks", "x=1").statusCode());                  // with a token: the servlet's 405
  }

  @Test
  void maintenanceModeAnswers503ButLetsStaticFilesAndDebugThrough() throws Exception { // 40.15
    assertEquals(303, postForm(CONTEXT + "/debug/maintenance", "enabled=true").statusCode());
    try {
      HttpResponse<String> blocked = get(CONTEXT + "/tasks");
      assertEquals(503, blocked.statusCode());
      assertEquals("600", blocked.headers().firstValue("Retry-After").orElseThrow());
      assertTrue(blocked.body().contains("Down for maintenance"));
      assertTrue(blocked.headers().firstValue("Content-Security-Policy").isPresent()); // earlier filters still ran
      assertEquals(200, get(CONTEXT + "/static/css/app.css").statusCode());
      assertEquals(200, get(CONTEXT + "/debug/stats").statusCode());
    } finally {
      postForm(CONTEXT + "/debug/maintenance", "enabled=false");
    }
    assertEquals(200, get(CONTEXT + "/tasks").statusCode());
  }
}
