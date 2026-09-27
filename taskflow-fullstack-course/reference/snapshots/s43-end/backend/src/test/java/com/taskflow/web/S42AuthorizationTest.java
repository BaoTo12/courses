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
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/** S42: roles on /admin/*, ownership in TaskService (IDOR), user management, changes applied to open sessions. */
class S42AuthorizationTest extends TomcatTest {

  private static final Pattern TOKEN = Pattern.compile("name=\"_csrf\" value=\"([^\"]+)\"");
  private static final String BOBS_TASK = "Bob: private salary review";   // task 23, owned by bob (db/03-seed.sql)

  private static String enc(String s) {
    return URLEncoder.encode(s, StandardCharsets.UTF_8);
  }

  private static HttpResponse<String> get(HttpClient browser, String path) throws Exception {
    return browser.send(HttpRequest.newBuilder(uri(CONTEXT + path)).build(), HttpResponse.BodyHandlers.ofString());
  }

  /** A form POST from this browser, with its session's CSRF token (read from a page with forms). */
  private static HttpResponse<String> post(HttpClient browser, String path, String body) throws Exception {
    Matcher m = TOKEN.matcher(get(browser, "/tasks/new").body());
    assertTrue(m.find());
    return browser.send(HttpRequest.newBuilder(uri(CONTEXT + path)).header("Content-Type", "application/x-www-form-urlencoded")
        .POST(HttpRequest.BodyPublishers.ofString(body + "&_csrf=" + enc(m.group(1)))).build(), HttpResponse.BodyHandlers.ofString());
  }

  private static boolean audited(String type, String username, String details) throws Exception {
    try (HikariDataSource ds = DataSourceProvider.create(); Connection c = ds.getConnection();
         PreparedStatement ps = c.prepareStatement("SELECT COUNT(*) FROM audit_events WHERE type = ? AND username = ? AND details = ?")) {
      ps.setString(1, type);
      ps.setString(2, username);
      ps.setString(3, details);
      try (ResultSet rs = ps.executeQuery()) {
        rs.next();
        return rs.getInt(1) > 0;
      }
    }
  }

  @Test
  void nonAdminsAreDeniedEveryAdminPathAndMethod() throws Exception { // 42.03, 42.11
    HttpResponse<String> page = get(CONTEXT + "/admin/users");
    assertEquals(403, page.statusCode());
    assertTrue(page.body().contains("Access denied"), page.body());
    assertEquals(403, postForm(CONTEXT + "/admin/users/disable", "id=2").statusCode());   // the POST too
    assertEquals(403, get(CONTEXT + "/admin").statusCode());
    assertTrue(audited("ACCESS_DENIED", "alice", "POST /admin/users/disable"));
    assertFalse(get(CONTEXT + "/tasks").body().contains(">Users</a>"));                  // 42.06: not even shown
  }

  @Test
  void adminsSeeTheUserList() throws Exception { // 42.07
    HttpClient admin = loggedInClient("admin", "admin123");
    HttpResponse<String> page = get(admin, "/admin/users");
    assertEquals(200, page.statusCode());
    assertTrue(page.body().contains("Bob Tran (bob)"), page.body());
    assertTrue(page.body().contains("Enabled (you)"), page.body());
    assertTrue(page.body().contains(">Users</a>"));
  }

  @Test
  void someoneElsesTaskLooksLikeItDoesNotExist() throws Exception { // 42.04, 42.05
    assertEquals(404, get(CONTEXT + "/tasks/view?id=23").statusCode());
    assertEquals(404, get(CONTEXT + "/tasks/edit?id=23").statusCode());
    assertEquals(404, postForm(CONTEXT + "/tasks/edit", "id=23&title=Mine+now&priority=LOW").statusCode());
    assertEquals(404, postForm(CONTEXT + "/tasks/toggle", "id=23").statusCode());
    assertEquals(404, postForm(CONTEXT + "/tasks/comment", "id=23&body=hello").statusCode());
    assertEquals(404, postForm(CONTEXT + "/tasks/delete", "id=23").statusCode());
    assertTrue(audited("ACCESS_DENIED", "alice", "task 23"));

    String asAdmin = get(loggedInClient("admin", "admin123"), "/tasks/view?id=23").body();   // untouched, and admins may see it
    assertTrue(asAdmin.contains(BOBS_TASK), asAdmin);
    assertFalse(asAdmin.contains("hello"));
  }

  @Test
  void usersListOnlyTheirOwnTasksAndAdminsListAll() throws Exception { // 42.09
    String alices = get(CONTEXT + "/tasks").body();
    assertFalse(alices.contains(BOBS_TASK));
    assertTrue(alices.contains(">Write quarterly report</a>"));

    HttpClient bob = loggedInClient("bob", "bob123");
    String bobs = get(bob, "/tasks").body();
    assertTrue(bobs.contains(BOBS_TASK), bobs);
    assertFalse(bobs.contains(">Write quarterly report</a>"));
    assertTrue(get(bob, "/tasks?q=quarterly").body().contains("No tasks."));

    String all = get(loggedInClient("admin", "admin123"), "/tasks").body();
    assertTrue(all.contains(BOBS_TASK) && all.contains(">Write quarterly report</a>"));
  }

  @Test
  void anEditCannotChangeTheOwner() throws Exception { // 42.08
    String title = "Mass assignment probe " + System.nanoTime();
    HttpResponse<String> created = postForm(CONTEXT + "/tasks/new", "priority=LOW&title=" + enc(title));
    String location = created.headers().firstValue("Location").orElseThrow();
    String id = location.substring(location.indexOf("id=") + 3);
    assertEquals(303, postForm(CONTEXT + "/tasks/edit", "id=" + id + "&priority=HIGH&ownerId=2&title=" + enc(title)).statusCode());
    assertTrue(get(location).body().contains("<dt>Owner</dt><dd>Alice Nguyen (alice)</dd>"));
  }

  @Test
  void disablingAUserEndsTheirOpenSession() throws Exception { // 42.07, 42.99 Q2
    HttpClient bob = loggedInClient("bob", "bob123");
    HttpClient admin = loggedInClient("admin", "admin123");
    try {
      assertEquals(200, get(bob, "/tasks").statusCode());
      HttpResponse<String> disabled = post(admin, "/admin/users/disable", "id=2");
      assertEquals(303, disabled.statusCode());
      assertTrue(get(admin, "/admin/users").body().contains("User updated."));

      HttpResponse<String> next = get(bob, "/tasks");                        // the SAME session, one request later
      assertEquals(303, next.statusCode());
      assertEquals(CONTEXT + "/login", next.headers().firstValue("Location").orElseThrow());
      assertTrue(get(bob, "/login").body().contains("Your session has ended."));
      assertTrue(audited("USER_DISABLED", "admin", "user 2"));
      assertTrue(audited("SESSION_REVOKED", "bob", "account disabled"));
    } finally {
      assertEquals(303, post(admin, "/admin/users/enable", "id=2").statusCode());
    }
    loggedInClient("bob", "bob123");                                           // enabled again: can log in
  }

  @Test
  void aRoleChangeAppliesToTheOpenSession() throws Exception { // 42.07
    HttpClient bob = loggedInClient("bob", "bob123");
    HttpClient admin = loggedInClient("admin", "admin123");
    try {
      assertEquals(403, get(bob, "/admin/users").statusCode());
      assertEquals(303, post(admin, "/admin/users/role", "id=2&role=ADMIN").statusCode());
      assertEquals(200, get(bob, "/admin/users").statusCode());               // promoted, without logging in again
    } finally {
      assertEquals(303, post(admin, "/admin/users/role", "id=2&role=USER").statusCode());
    }
    assertEquals(403, get(bob, "/admin/users").statusCode());                 // and demoted again
  }

  @Test
  void adminsCannotChangeTheirOwnAccountAndRolesAreAllowListed() throws Exception { // 42.07, 42.08
    HttpClient admin = loggedInClient("admin", "admin123");
    assertEquals(303, post(admin, "/admin/users/disable", "id=3").statusCode());
    assertTrue(get(admin, "/admin/users").body().contains("You can&#039;t change your own account."));
    assertEquals(400, post(admin, "/admin/users/role", "id=2&role=SUPERADMIN").statusCode());
    assertEquals(404, post(admin, "/admin/users/disable", "id=999").statusCode());
  }
}
