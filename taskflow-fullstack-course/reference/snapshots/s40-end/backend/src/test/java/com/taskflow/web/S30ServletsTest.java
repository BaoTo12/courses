package com.taskflow.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URLEncoder;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

/** S28–S30 claims, checked against a real embedded Tomcat 9 (see TomcatTest). */
class S30ServletsTest extends TomcatTest {

  // ── S28 / S29: the container around the app ──────────────────────────────────────────────────

  @Test
  void contextRootWithoutSlashIsRedirectedAndTheWelcomeFileIsServed() throws Exception {
    HttpResponse<String> noSlash = get(CONTEXT);
    assertEquals(302, noSlash.statusCode());
    assertEquals(CONTEXT + "/", noSlash.headers().firstValue("Location").orElseThrow());

    HttpResponse<String> root = get(CONTEXT + "/");
    assertEquals(200, root.statusCode());
    assertTrue(root.body().contains("It works."));
  }

  @Test
  void webInfIsNeverServed() throws Exception {
    assertEquals(404, get(CONTEXT + "/WEB-INF/web.xml").statusCode());
    assertEquals(200, get(CONTEXT + "/static/css/app.css").statusCode());
  }

  // ── S30: HelloServlet ─────────────────────────────────────────────────────────────────────────

  @Test
  void helloGreetsTheWorldInUtf8Html() throws Exception {
    HttpResponse<String> response = get(CONTEXT + "/hello");
    assertEquals(200, response.statusCode());
    assertEquals("text/html;charset=UTF-8", response.headers().firstValue("Content-Type").orElseThrow());
    assertTrue(response.body().contains("Hello, world!"));
  }

  @Test
  void helloUsesTheNameParameterIncludingVietnamese() throws Exception {
    HttpResponse<String> response = get(CONTEXT + "/hello?name=" + URLEncoder.encode("Công", StandardCharsets.UTF_8));
    assertTrue(response.body().contains("Hello, Công!"));
  }

  @Test
  void helloEscapesTheNameReflectedXssIsText() throws Exception { // 30.14
    String payload = "<script>alert(1)</script>";
    HttpResponse<String> response = get(CONTEXT + "/hello?name=" + URLEncoder.encode(payload, StandardCharsets.UTF_8));
    assertFalse(response.body().contains(payload));
    assertTrue(response.body().contains("Hello, &lt;script&gt;alert(1)&lt;/script&gt;!"));
  }

  @Test
  void anUnimplementedMethodIs405() throws Exception { // 30.07: HttpServlet's default doPost
    // S40: with a valid CSRF token; without one, CsrfFilter answers 403 before the servlet is even called
    HttpResponse<String> response = postForm(CONTEXT + "/hello", "");
    assertEquals(405, response.statusCode());
  }

  // ── S30: request anatomy (30.08) ──────────────────────────────────────────────────────────────

  @Test
  void requestInfoShowsHowTheUrlIsSplit() throws Exception {
    String body = get(CONTEXT + "/debug/request-info/a/b?x=1&x=2").body();
    assertTrue(body.contains("<th>getContextPath()</th><td><code>/taskflow</code>"));
    assertTrue(body.contains("<th>getServletPath()</th><td><code>/debug/request-info</code>"));
    assertTrue(body.contains("<th>getPathInfo()</th><td><code>/a/b</code>"));
    assertTrue(body.contains("<th>getQueryString()</th><td><code>x=1&amp;x=2</code>"));
    assertTrue(body.contains("<th>param x</th><td><code>1, 2</code>"));

    String exact = get(CONTEXT + "/debug/request-info").body();
    assertTrue(exact.contains("<th>getPathInfo()</th><td><code>null</code>"));
  }

  // ── S30 Your Turn: init and context parameters, UTF-8 (30.15) ─────────────────────────────────

  @Test
  void timeUsesTheContextGreetingInUtf8() throws Exception {
    HttpResponse<String> response = get(CONTEXT + "/time");
    assertEquals(200, response.statusCode());
    assertTrue(response.body().contains("<h1>Xin chào từ TaskFlow!</h1>"));
  }
}
