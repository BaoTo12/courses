package com.taskflow.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.taskflow.db.DataSourceProvider;
import com.zaxxer.hikari.HikariDataSource;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/** S41: login/logout, the authentication filter, session fixation, enumeration, throttling, open redirects, audit. */
class S41AuthenticationTest extends TomcatTest {

  private static final Pattern TOKEN = Pattern.compile("name=\"_csrf\" value=\"([^\"]+)\"");

  private static String enc(String s) {
    return URLEncoder.encode(s, StandardCharsets.UTF_8);
  }

  /** A fresh anonymous browser. */
  private static HttpClient browser() {
    return HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER)
        .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL)).build();
  }

  private static HttpResponse<String> get(HttpClient browser, String path) throws Exception {
    return browser.send(HttpRequest.newBuilder(uri(CONTEXT + path)).build(), HttpResponse.BodyHandlers.ofString());
  }

  /** GET /login, then POST it with these credentials (and extra fields). */
  private static HttpResponse<String> attemptLogin(HttpClient browser, String username, String password, String extra) throws Exception {
    Matcher m = TOKEN.matcher(get(browser, "/login").body());
    assertTrue(m.find());
    String body = "username=" + enc(username) + "&password=" + enc(password) + "&_csrf=" + enc(m.group(1)) + extra;
    return browser.send(HttpRequest.newBuilder(uri(CONTEXT + "/login")).header("Content-Type", "application/x-www-form-urlencoded")
        .POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
  }

  private static String sessionCookie(HttpResponse<String> response) {
    return response.headers().allValues("Set-Cookie").stream().filter(c -> c.startsWith("JSESSIONID=")).findFirst().orElse("");
  }

  @Test
  void anonymousRequestsAreSentToTheLoginPageWithTheirReturnUrl() throws Exception { // 41.09
    HttpClient anonymous = browser();
    HttpResponse<String> redirected = get(anonymous, "/tasks?q=report");
    assertEquals(303, redirected.statusCode());
    assertEquals(CONTEXT + "/login?returnUrl=" + enc(CONTEXT + "/tasks?q=report"), redirected.headers().firstValue("Location").orElseThrow());
    assertEquals(200, get(anonymous, "/login").statusCode());                          // public paths stay reachable
    assertEquals(200, get(anonymous, "/static/css/app.css").statusCode());
  }

  @Test
  void aSuccessfulLoginChangesTheSessionIdAndGoesBack() throws Exception { // 41.07, 41.11, 41.12
    HttpClient victim = browser();
    HttpResponse<String> loginPage = get(victim, "/login");
    String before = sessionCookie(loginPage);
    assertTrue(before.contains("HttpOnly") && before.contains("SameSite=Lax"), before);

    HttpResponse<String> loggedIn = attemptLogin(victim, "alice", "alice123", "&returnUrl=" + enc(CONTEXT + "/tasks?q=report"));
    assertEquals(303, loggedIn.statusCode());
    assertEquals(CONTEXT + "/tasks?q=report", loggedIn.headers().firstValue("Location").orElseThrow());
    String after = sessionCookie(loggedIn);
    assertFalse(after.isEmpty(), "a new session id is sent at login");
    assertFalse(after.split(";")[0].equals(before.split(";")[0]), "session fixation: the id must change");

    String page = get(victim, "/tasks").body();
    assertTrue(page.contains("Welcome, Alice Nguyen."));
    assertTrue(page.contains("Logged in as Alice Nguyen"));
  }

  @Test
  void unknownUserAndWrongPasswordGetTheSameAnswer() throws Exception { // 41.13, 41.14
    HttpResponse<String> unknown = attemptLogin(browser(), "nobody-" + System.nanoTime(), "whatever", "");
    HttpResponse<String> wrong = attemptLogin(browser(), "admin", "wrong-password", "");
    assertEquals(wrong.statusCode(), unknown.statusCode());
    assertTrue(unknown.body().contains("Invalid username or password."));
    assertTrue(wrong.body().contains("Invalid username or password."));
    assertFalse(wrong.body().contains("wrong-password"));                             // the password is never echoed
  }

  @Test
  void repeatedFailuresLockTheAccountEvenForTheRightPassword() throws Exception { // 41.15
    for (int i = 0; i < 5; i++) assertEquals(200, attemptLogin(browser(), "bob", "guess" + i, "").statusCode());
    HttpResponse<String> locked = attemptLogin(browser(), "bob", "bob123", "");
    assertEquals(429, locked.statusCode());
    assertTrue(locked.headers().firstValue("Retry-After").isPresent());
    assertTrue(locked.body().contains("Too many failed attempts"));
    assertEquals(303, attemptLogin(browser(), "admin", "admin123", "").statusCode());  // other accounts are unaffected
  }

  @Test
  void theReturnUrlCannotLeaveTheApplication() throws Exception { // 41.16, 41.17
    for (String evil : new String[] {"https://evil.example/", "//evil.example/", "/\\evil.example"}) {
      HttpResponse<String> response = attemptLogin(browser(), "admin", "admin123", "&returnUrl=" + enc(evil));
      assertEquals(CONTEXT + "/tasks", response.headers().firstValue("Location").orElseThrow(), evil);
    }
  }

  @Test
  void logoutDestroysTheSessionAndPrivatePagesAreNotCached() throws Exception { // 41.08, 41.22
    HttpClient user = loggedInClient("admin", "admin123");
    HttpResponse<String> page = get(user, "/tasks");
    assertEquals("no-store", page.headers().firstValue("Cache-Control").orElse(""));
    Matcher m = TOKEN.matcher(page.body());
    assertTrue(m.find());
    HttpResponse<String> out = user.send(HttpRequest.newBuilder(uri(CONTEXT + "/logout"))
        .header("Content-Type", "application/x-www-form-urlencoded")
        .POST(HttpRequest.BodyPublishers.ofString("_csrf=" + enc(m.group(1)))).build(), HttpResponse.BodyHandlers.ofString());
    assertEquals(303, out.statusCode());
    assertEquals(CONTEXT + "/login", out.headers().firstValue("Location").orElseThrow());
    assertTrue(get(user, "/login").body().contains("You have been logged out."));
    assertEquals(303, get(user, "/tasks").statusCode());                               // protected again
  }

  @Test
  void aStaleSessionIdShowsTheExpiredMessage() throws Exception { // 41.19
    HttpResponse<String> stale = HttpClient.newHttpClient().send(HttpRequest.newBuilder(uri(CONTEXT + "/tasks"))
        .header("Cookie", "JSESSIONID=0123456789ABCDEF0123456789ABCDEF").build(), HttpResponse.BodyHandlers.ofString());
    String location = stale.headers().firstValue("Location").orElseThrow();
    assertTrue(location.endsWith("&expired=1"), location);
    assertTrue(get(browser(), "/login?expired=1").body().contains("Your session has expired."));
  }

  @Test
  void newTasksBelongToTheLoggedInUser() throws Exception { // 37.11 completed
    HttpClient bob = loggedInClient("admin", "admin123");
    Matcher m = TOKEN.matcher(get(bob, "/tasks/new").body());
    assertTrue(m.find());
    HttpResponse<String> created = bob.send(HttpRequest.newBuilder(uri(CONTEXT + "/tasks/new"))
        .header("Content-Type", "application/x-www-form-urlencoded")
        .POST(HttpRequest.BodyPublishers.ofString("priority=LOW&title=" + enc("Admin's task " + System.nanoTime()) + "&_csrf=" + enc(m.group(1))))
        .build(), HttpResponse.BodyHandlers.ofString());
    String view = get(bob, created.headers().firstValue("Location").orElseThrow().substring(CONTEXT.length())).body();
    assertTrue(view.contains("<dt>Owner</dt><dd>Admin (admin)</dd>"), view);
  }

  @Test
  void everyLoginOutcomeIsAudited() throws Exception { // 41.07 + 36.10's append-only log
    String name = "audit-probe-" + System.nanoTime();
    attemptLogin(browser(), name, "x", "");
    try (HikariDataSource ds = DataSourceProvider.create(); Connection c = ds.getConnection();
         PreparedStatement ps = c.prepareStatement("SELECT type, ip FROM audit_events WHERE username = ?")) {
      ps.setString(1, name);
      try (ResultSet rs = ps.executeQuery()) {
        assertTrue(rs.next());
        assertEquals("LOGIN_FAIL", rs.getString(1));
        assertEquals("127.0.0.1", rs.getString(2));
      }
    }
  }
}
