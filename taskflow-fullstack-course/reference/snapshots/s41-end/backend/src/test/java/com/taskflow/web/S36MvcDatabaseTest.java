package com.taskflow.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URLEncoder;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;

/** S36: Controller → Service → DAO → MySQL; SQL injection attempts are data; category filter and allow-listed sort. */
class S36MvcDatabaseTest extends TomcatTest {

  private static String enc(String s) {
    return URLEncoder.encode(s, StandardCharsets.UTF_8);
  }

  @Test
  void theListAndTheCategoriesComeFromMySql() throws Exception { // 36.05
    String list = get(CONTEXT + "/tasks").body();
    assertTrue(list.contains("Draft Q4 roadmap"), list);                      // a row of db/03-seed.sql
    assertTrue(list.contains("<option value=\"2\">Engineering</option>"));    // categories, ordered by name
    assertTrue(list.indexOf(">Engineering<") < list.indexOf(">Work<"));
  }

  @Test
  void sqlInjectionAttemptsAreSearchedAsText() throws Exception { // 36.08, 36.09
    for (String attack : List.of(
        "' OR '1'='1",
        "_",                                   // (a literal % is checked below: another test creates a title with one)
        "x' UNION SELECT id, username, password_hash, 'TODO', 'LOW', NULL, NULL, 1, NOW(), NOW() FROM users -- ")) {
      HttpResponse<String> response = get(CONTEXT + "/tasks?q=" + enc(attack));
      assertEquals(200, response.statusCode(), attack);
      assertTrue(response.body().contains("<p class=\"text-muted\">No tasks.</p>"), attack);
      assertFalse(response.body().contains("$2a$"), attack);
    }
  }

  @Test
  void likeWildcardsInTheSearchAreLiteral() throws Exception { // 36.09 §3
    String title = "Coverage at 100% " + System.nanoTime();
    postForm(CONTEXT + "/tasks/new", "priority=LOW&title=" + enc(title));
    String found = get(CONTEXT + "/tasks?q=" + enc("100%")).body();
    assertTrue(found.contains(title));
    assertFalse(found.contains("Write quarterly report"));
  }

  @Test
  void theCategoryFilterGoesThroughTheWholeStack() throws Exception { // 36.11
    String personal = get(CONTEXT + "/tasks?category=4").body();
    assertTrue(personal.contains("Book dentist appointment"));
    assertFalse(personal.contains("Write quarterly report"));
    assertTrue(personal.contains("<option value=\"4\" selected>Personal</option>"));
    assertEquals(200, get(CONTEXT + "/tasks?category=abc").statusCode());   // invalid → all, not a 500
  }

  @Test
  void theSortIsAllowListed() throws Exception { // 36.09 §4, 36.11
    String byTitle = get(CONTEXT + "/tasks?sort=title").body();
    assertTrue(byTitle.indexOf("Archive old Jira epics") < byTitle.indexOf("Write quarterly report"));
    assertTrue(byTitle.contains("<option value=\"title\" selected>Title</option>"));

    String byId = get(CONTEXT + "/tasks").body();
    assertTrue(byId.indexOf("Write quarterly report") < byId.indexOf("Archive old Jira epics"));

    for (String sort : List.of("due", "priority", "newest")) {
      assertEquals(200, get(CONTEXT + "/tasks?sort=" + sort).statusCode(), sort);
    }
    String byPriority = get(CONTEXT + "/tasks?sort=priority").body();
    assertTrue(byPriority.indexOf("Write quarterly report") < byPriority.indexOf("Plan team offsite")); // HIGH before LOW

    HttpResponse<String> attack = get(CONTEXT + "/tasks?sort=" + enc("title; DROP TABLE tasks"));
    assertEquals(200, attack.statusCode());
    assertTrue(attack.body().indexOf("Write quarterly report") < attack.body().indexOf("Archive old Jira epics")); // default
    assertTrue(get(CONTEXT + "/tasks").body().contains("Draft Q4 roadmap"));   // the table is still there
  }

  @Test
  void theStatusLinksKeepTheOtherChoices() throws Exception { // 35.11 + 36.11
    String body = get(CONTEXT + "/tasks?category=4&sort=title").body();
    assertTrue(body.contains("href=\"/taskflow/tasks?status=DONE&amp;category=4&amp;sort=title\""), body);
  }
}
