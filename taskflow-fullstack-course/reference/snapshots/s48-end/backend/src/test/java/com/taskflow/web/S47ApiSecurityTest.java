package com.taskflow.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskflow.db.DataSourceProvider;
import com.zaxxer.hikari.HikariDataSource;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import org.junit.jupiter.api.Test;

/** S47: /api/auth/*, JSON 401s, double-submit CSRF, CORS with an allow-list, login throttling, audited rejections. */
class S47ApiSecurityTest extends TomcatTest {

  private static final ObjectMapper JSON = new ObjectMapper();
  private static final String SPA = "http://localhost:5173";      // the allowed origin (web.xml)

  private static HttpClient browser() {
    return HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER)
        .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL)).build();
  }

  private static HttpResponse<String> call(HttpClient browser, String method, String path, String body, String... headers) throws Exception {
    HttpRequest.Builder request = HttpRequest.newBuilder(uri(CONTEXT + path));
    if (headers.length > 0) request.headers(headers);
    if (body != null) request.header("Content-Type", "application/json");
    request.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
    return browser.send(request.build(), HttpResponse.BodyHandlers.ofString());
  }

  private static HttpResponse<String> apiLogin(HttpClient browser, String username, String password) throws Exception {
    String token = xsrfToken(browser);
    return call(browser, "POST", "/api/auth/login", "{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}",
        "X-XSRF-TOKEN", token);
  }

  private static String error(HttpResponse<String> response) throws Exception {
    return JSON.readTree(response.body()).get("error").asText();
  }

  @Test
  void theCsrfEndpointIssuesAReadableCookie() throws Exception { // 47.06
    HttpResponse<String> response = call(browser(), "GET", "/api/auth/csrf", null);
    assertEquals(204, response.statusCode());
    String cookie = response.headers().allValues("Set-Cookie").stream().filter(c -> c.startsWith("XSRF-TOKEN=")).findFirst().orElseThrow();
    assertTrue(cookie.contains("Path=/;") || cookie.endsWith("Path=/"), cookie);
    assertTrue(cookie.contains("SameSite=Lax"), cookie);
    assertFalse(cookie.contains("HttpOnly"), cookie);                               // JavaScript must read it
    assertTrue(response.headers().allValues("Set-Cookie").stream().noneMatch(c -> c.startsWith("JSESSIONID=")));  // no session yet
  }

  @Test
  void anonymousApiCallsGetJson401NotARedirect() throws Exception { // 47.03, 47.04
    HttpResponse<String> me = call(browser(), "GET", "/api/auth/me", null);
    assertEquals(401, me.statusCode());
    assertEquals("UNAUTHENTICATED", error(me));
    HttpResponse<String> tasks = call(browser(), "GET", "/api/tasks", null);
    assertEquals(401, tasks.statusCode());
    assertTrue(tasks.headers().firstValue("Location").isEmpty());
    assertEquals(303, call(browser(), "GET", "/tasks", null).statusCode());         // pages still redirect
  }

  @Test
  void theSpaLoginFlowSharesTheSessionWithThePortal() throws Exception { // 47.01, 47.02
    HttpClient spa = browser();
    HttpResponse<String> login = apiLogin(spa, "alice", "alice123");
    assertEquals(200, login.statusCode(), login.body());
    JsonNode user = JSON.readTree(login.body());
    assertEquals("alice", user.get("username").asText());
    assertEquals("Alice Nguyen", user.get("displayName").asText());
    assertEquals("USER", user.get("role").asText());
    assertEquals("en", user.get("locale").asText());
    assertFalse(user.has("password") || user.has("passwordHash") || user.has("email"));
    assertTrue(login.headers().allValues("Set-Cookie").stream().anyMatch(c -> c.startsWith("JSESSIONID=") && c.contains("HttpOnly")));
    assertTrue(login.headers().allValues("Set-Cookie").stream().anyMatch(c -> c.startsWith("XSRF-TOKEN=")));  // rotated

    assertEquals("alice", JSON.readTree(call(spa, "GET", "/api/auth/me", null).body()).get("username").asText());
    assertEquals(200, call(spa, "GET", "/api/tasks", null).statusCode());
    assertEquals(200, call(spa, "GET", "/tasks", null).statusCode());              // the same session opens the portal

    String token = xsrfToken(spa);
    assertEquals(204, call(spa, "POST", "/api/auth/logout", null, "X-XSRF-TOKEN", token).statusCode());
    assertEquals(401, call(spa, "GET", "/api/auth/me", null).statusCode());
  }

  @Test
  void badCredentialsAndMissingFields() throws Exception { // 47.02, 41.14
    HttpResponse<String> wrong = apiLogin(browser(), "alice", "nope");
    assertEquals(401, wrong.statusCode());
    assertEquals("BAD_CREDENTIALS", error(wrong));
    assertEquals("Invalid username or password", JSON.readTree(wrong.body()).get("message").asText());
    HttpResponse<String> unknown = apiLogin(browser(), "nobody-" + System.nanoTime(), "nope");
    assertEquals(wrong.body().replaceAll("\"timestamp\":\"[^\"]+\"", ""), unknown.body().replaceAll("\"timestamp\":\"[^\"]+\"", ""));
    HttpClient b = browser();
    assertEquals(400, call(b, "POST", "/api/auth/login", "{\"username\":\"alice\"}", "X-XSRF-TOKEN", xsrfToken(b)).statusCode());
  }

  @Test
  void unsafeApiCallsNeedTheDoubleSubmitHeader() throws Exception { // 47.06, 47.07
    HttpClient spa = browser();
    apiLogin(spa, "bob", "bob123");
    String body = "{\"title\":\"CSRF probe " + System.nanoTime() + "\",\"status\":\"TODO\",\"priority\":\"LOW\"}";
    HttpResponse<String> none = call(spa, "POST", "/api/tasks", body);
    assertEquals(403, none.statusCode());
    assertEquals("CSRF_TOKEN_INVALID", error(none));
    assertEquals(403, call(spa, "POST", "/api/tasks", body, "X-XSRF-TOKEN", "guessed").statusCode());
    assertEquals(201, call(spa, "POST", "/api/tasks", body, "X-XSRF-TOKEN", xsrfToken(spa)).statusCode());
    assertEquals(200, call(spa, "GET", "/api/tasks", null).statusCode());           // safe methods: no token needed
    assertEquals(403, call(browser(), "POST", "/api/auth/login", "{\"username\":\"bob\",\"password\":\"bob123\"}").statusCode()); // login too
  }

  @Test
  void corsAllowsOnlyTheListedOrigin() throws Exception { // 47.08, 47.10, 47.16
    HttpResponse<String> preflight = call(browser(), "OPTIONS", "/api/tasks/1", null, "Origin", SPA,
        "Access-Control-Request-Method", "PATCH", "Access-Control-Request-Headers", "content-type,x-xsrf-token");
    assertEquals(204, preflight.statusCode());                                     // not 401: never reaches authentication
    assertEquals(SPA, preflight.headers().firstValue("Access-Control-Allow-Origin").orElse(""));
    assertEquals("true", preflight.headers().firstValue("Access-Control-Allow-Credentials").orElse(""));
    assertTrue(preflight.headers().firstValue("Access-Control-Allow-Methods").orElse("").contains("PATCH"));
    assertTrue(preflight.headers().firstValue("Access-Control-Allow-Headers").orElse("").contains("X-XSRF-TOKEN"));
    assertTrue(preflight.headers().allValues("Vary").contains("Origin"));

    HttpResponse<String> evilPreflight = call(browser(), "OPTIONS", "/api/tasks", null, "Origin", "https://evil.example",
        "Access-Control-Request-Method", "DELETE");
    assertEquals(403, evilPreflight.statusCode());
    assertTrue(evilPreflight.headers().firstValue("Access-Control-Allow-Origin").isEmpty());

    HttpResponse<String> evilRead = call(client(), "GET", "/api/tasks", null, "Origin", "https://evil.example");
    assertEquals(200, evilRead.statusCode());                                      // the server answers (curl isn't a browser)…
    assertTrue(evilRead.headers().firstValue("Access-Control-Allow-Origin").isEmpty()); // …but a browser won't let evil read it

    HttpResponse<String> spa401 = call(browser(), "GET", "/api/auth/me", null, "Origin", SPA);
    assertEquals(401, spa401.statusCode());
    assertEquals(SPA, spa401.headers().firstValue("Access-Control-Allow-Origin").orElse(""));  // errors are readable too
  }

  @Test
  void apiLoginIsThrottled() throws Exception { // 47.12
    String name = "ghost" + System.nanoTime();
    for (int i = 0; i < 5; i++) assertEquals(401, apiLogin(browser(), name, "x").statusCode());
    HttpResponse<String> blocked = apiLogin(browser(), name, "x");
    assertEquals(429, blocked.statusCode());
    assertEquals("TOO_MANY_REQUESTS", error(blocked));
    assertEquals("900", blocked.headers().firstValue("Retry-After").orElse(""));
  }

  @Test
  void apiRejectionsAreAuditedWithTheRequestId() throws Exception { // 47.13
    HttpClient spa = browser();
    apiLogin(spa, "bob", "bob123");
    HttpResponse<String> rejected = call(spa, "DELETE", "/api/tasks/23", null);   // no CSRF header
    assertEquals(403, rejected.statusCode());
    String requestId = rejected.headers().firstValue("X-Request-Id").orElseThrow();
    try (HikariDataSource ds = DataSourceProvider.create(); Connection c = ds.getConnection();
         PreparedStatement ps = c.prepareStatement("SELECT username, details FROM audit_events WHERE type = 'ACCESS_DENIED' AND details LIKE ?")) {
      ps.setString(1, "%[request " + requestId + "]");
      try (ResultSet rs = ps.executeQuery()) {
        assertTrue(rs.next(), "no audit event for request " + requestId);
        assertEquals("bob", rs.getString(1));
        assertEquals("403 CSRF_TOKEN_INVALID DELETE /api/tasks/23 [request " + requestId + "]", rs.getString(2));
      }
    }
  }
}
