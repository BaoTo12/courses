package com.taskflow.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.taskflow.db.DataSourceProvider;
import com.zaxxer.hikari.HikariDataSource;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/** S45: the thread model (race lab), listeners (session registry, slow requests), the audit page, async CSV export. */
class S45AdvancedServletTest extends TomcatTest {

  private static final Pattern TOKEN = Pattern.compile("name=\"_csrf\" value=\"([^\"]+)\"");

  private static String enc(String s) {
    return URLEncoder.encode(s, StandardCharsets.UTF_8);
  }

  private static HttpResponse<String> get(HttpClient browser, String path) throws Exception {
    return browser.send(HttpRequest.newBuilder(uri(CONTEXT + path)).build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
  }

  private static long countAudit(String type, String username, String detailsLike) throws Exception {
    try (HikariDataSource ds = DataSourceProvider.create(); Connection c = ds.getConnection();
         PreparedStatement ps = c.prepareStatement("SELECT COUNT(*) FROM audit_events WHERE type = ?"
             + (username == null ? "" : " AND username = ?") + (detailsLike == null ? "" : " AND details LIKE ?"))) {
      int i = 1;
      ps.setString(i++, type);
      if (username != null) ps.setString(i++, username);
      if (detailsLike != null) ps.setString(i, detailsLike);
      try (ResultSet rs = ps.executeQuery()) {
        rs.next();
        return rs.getLong(1);
      }
    }
  }

  /** How many of 20 simultaneous requests got an answer for someone else. */
  private static long mixUps(String mode) throws Exception {
    HttpClient http = HttpClient.newHttpClient();
    List<CompletableFuture<Boolean>> answers = new ArrayList<>();
    for (int i = 0; i < 20; i++) {
      String who = "user" + i;
      answers.add(http.sendAsync(HttpRequest.newBuilder(uri(CONTEXT + "/debug/race?who=" + who + mode)).build(),
          HttpResponse.BodyHandlers.ofString()).thenApply(r -> !r.body().equals("you are " + who)));
    }
    return answers.stream().map(CompletableFuture::join).filter(wrong -> wrong).count();
  }

  @Test
  void anInstanceFieldMixesUpConcurrentRequests() throws Exception { // 45.03, 45.04
    assertTrue(mixUps("") > 0, "the unsafe servlet should answer some requests with another request's value");
    assertEquals(0, mixUps("&mode=safe"));
  }

  @Test
  void adminsReadTheAuditLogWithFiltersAndPages() throws Exception { // 45.10
    String name = "<b>probe" + System.nanoTime() + "</b>";
    HttpClient anonymous = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER)
        .cookieHandler(new java.net.CookieManager(null, java.net.CookiePolicy.ACCEPT_ALL)).build();
    Matcher m = TOKEN.matcher(get(anonymous, "/login").body());
    assertTrue(m.find());
    anonymous.send(HttpRequest.newBuilder(uri(CONTEXT + "/login")).header("Content-Type", "application/x-www-form-urlencoded")
        .POST(HttpRequest.BodyPublishers.ofString("username=" + enc(name) + "&password=x&_csrf=" + enc(m.group(1)))).build(),
        HttpResponse.BodyHandlers.ofString());

    HttpClient admin = loggedInClient("admin", "admin123");
    HttpResponse<String> filtered = get(admin, "/admin/audit?type=LOGIN_FAIL&user=" + enc(name));
    assertEquals(200, filtered.statusCode());
    assertTrue(filtered.body().contains("<td>LOGIN_FAIL</td>"), filtered.body());
    assertTrue(filtered.body().contains("&lt;b&gt;probe"), filtered.body());   // what someone TYPED is escaped
    assertFalse(filtered.body().contains("<b>probe"));

    for (int i = 0; i < 26; i++) get(CONTEXT + "/admin/users");                 // alice: 26 ACCESS_DENIED events, > one page
    String denied = get(admin, "/admin/audit?type=ACCESS_DENIED&user=alice").body();
    assertTrue(denied.contains("href=\"/taskflow/admin/audit?type=ACCESS_DENIED&amp;user=alice&amp;page=2\""), denied); // S44's tag, filters kept
    assertTrue(get(admin, "/admin/audit?type=DROP+TABLE").body().contains("<option value=\"\">All events</option>"));
    assertEquals(403, get(CONTEXT + "/admin/audit").statusCode());              // alice
  }

  @Test
  void theSessionRegistryKnowsWhoIsLoggedIn() throws Exception { // 45.07, 45.09
    HttpClient admin = loggedInClient("admin", "admin123");
    long expiredBefore = countAudit("SESSION_EXPIRED", "bob", null);
    HttpClient bob = loggedInClient("bob", "bob123");
    String now = get(admin, "/admin/audit").body();
    assertTrue(now.matches("(?s).*Logged in now \\(\\d+ sessions\\):.*bob.*"), now);

    Matcher m = TOKEN.matcher(get(bob, "/tasks").body());
    assertTrue(m.find());
    bob.send(HttpRequest.newBuilder(uri(CONTEXT + "/logout")).header("Content-Type", "application/x-www-form-urlencoded")
        .POST(HttpRequest.BodyPublishers.ofString("_csrf=" + enc(m.group(1)))).build(), HttpResponse.BodyHandlers.ofString());
    String after = get(admin, "/admin/audit").body();
    String line = after.substring(after.indexOf("Logged in now"), after.indexOf("all sessions"));
    assertFalse(line.contains("bob"), line);
    assertEquals(expiredBefore, countAudit("SESSION_EXPIRED", "bob", null));    // a logout is not a timeout
  }

  @Test
  void slowRequestsAreAudited() throws Exception { // 45.16
    String pattern = "GET /taskflow/debug/slow %";
    long before = countAudit("SLOW_REQUEST", null, pattern);
    get(CONTEXT + "/debug/slow?ms=10");
    get(CONTEXT + "/debug/slow?ms=700");
    long after = before;
    for (int i = 0; i < 20 && after == before; i++) {                            // requestDestroyed may run just after the response
      Thread.sleep(100);
      after = countAudit("SLOW_REQUEST", null, pattern);
    }
    assertEquals(before + 1, after);                                              // the 700 ms one, not the 10 ms one
  }

  @Test
  void theCsvExportRunsAsyncAndIsSafeForSpreadsheets() throws Exception { // 45.14
    String stamp = String.valueOf(System.nanoTime());
    postForm(CONTEXT + "/tasks/new", "priority=LOW&title=" + enc("=1+2 formula " + stamp));
    postForm(CONTEXT + "/tasks/new", "priority=LOW&title=" + enc("Say \"hi\" " + stamp));
    HttpResponse<String> csv = get(CONTEXT + "/tasks/export.csv");
    assertEquals(200, csv.statusCode());
    assertEquals("text/csv;charset=UTF-8", csv.headers().firstValue("Content-Type").orElse(""));
    assertEquals("attachment; filename=\"tasks.csv\"", csv.headers().firstValue("Content-Disposition").orElse(""));
    assertTrue(csv.body().startsWith("id,title,status,priority,due_date\r\n1,\"Write quarterly report\","), csv.body());
    assertTrue(csv.body().contains(",\"'=1+2 formula " + stamp + "\","));      // neutralised formula
    assertTrue(csv.body().contains(",\"Say \"\"hi\"\" " + stamp + "\","));      // doubled quotes
    assertFalse(csv.body().contains("Bob: private salary review"));             // the owner scope (42.09)
  }
}
