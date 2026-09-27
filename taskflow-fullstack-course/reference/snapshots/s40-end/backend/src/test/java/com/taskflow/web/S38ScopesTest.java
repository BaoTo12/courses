package com.taskflow.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/** S38: application scope (category cache, counters) vs session scope (recently viewed) vs request scope. */
class S38ScopesTest extends TomcatTest {

  private static long number(String body, String cssClass) {
    Matcher m = Pattern.compile("class=\"" + cssClass + "\">(\\d+)<").matcher(body);
    assertTrue(m.find(), body);
    return Long.parseLong(m.group(1));
  }

  @Test
  void theCategoryCacheIsRefreshedWhenACategoryChanges() throws Exception { // 38.06
    String name = "Cached " + System.nanoTime();
    assertFalse(get(CONTEXT + "/tasks/new").body().contains(name));
    assertEquals(303, postForm(CONTEXT + "/categories/save",
        "name=" + URLEncoder.encode(name, StandardCharsets.UTF_8) + "&color=%23123456").statusCode());
    assertTrue(get(CONTEXT + "/tasks/new").body().contains(">" + name + "</option>"));   // served from the refreshed cache
    assertTrue(get(CONTEXT + "/tasks").body().contains(">" + name + "</option>"));
  }

  @Test
  void applicationCountersSeeEveryUser() throws Exception { // 38.07
    long before = number(get(CONTEXT + "/debug/stats").body(), "stat--requests");
    HttpClient otherBrowser = HttpClient.newHttpClient();                         // another user, another session
    otherBrowser.send(HttpRequest.newBuilder(uri(CONTEXT + "/tasks")).build(), HttpResponse.BodyHandlers.ofString());
    String after = get(CONTEXT + "/debug/stats").body();
    assertTrue(number(after, "stat--requests") >= before + 2, after);             // its request + ours
    assertTrue(number(after, "stat--sessions") >= 2);                            // ours + the other browser's
  }

  @Test
  void recentlyViewedIsPerSession() throws Exception { // 38.10 (session scope)
    get(CONTEXT + "/tasks/view?id=1");
    get(CONTEXT + "/tasks/view?id=3");
    get(CONTEXT + "/tasks/view?id=1");                                            // again: moves to the front, no duplicate
    String mine = get(CONTEXT + "/tasks").body();
    int recent = mine.indexOf("Recently viewed:");
    assertTrue(recent > 0, mine);
    assertTrue(mine.indexOf(">Write quarterly report</a>", recent) < mine.indexOf(">Plan team offsite</a>", recent)); // newest first
    String recentBlock = mine.substring(recent, mine.indexOf("</p>", recent));
    assertEquals(1, recentBlock.split(">Write quarterly report</a>", -1).length - 1, recentBlock);

    String someoneElse = HttpClient.newHttpClient()
        .send(HttpRequest.newBuilder(uri(CONTEXT + "/tasks")).build(), HttpResponse.BodyHandlers.ofString()).body();
    assertFalse(someoneElse.contains("Recently viewed:"));
  }

  @Test
  void mostViewedIsSharedByEveryone() throws Exception { // 38.10 (application scope)
    HttpClient otherBrowser = HttpClient.newHttpClient();
    for (int i = 0; i < 3; i++) {
      otherBrowser.send(HttpRequest.newBuilder(uri(CONTEXT + "/tasks/view?id=5")).build(), HttpResponse.BodyHandlers.ofString());
    }
    String stats = get(CONTEXT + "/debug/stats").body();
    assertTrue(stats.matches("(?s).*>Prepare sprint demo</a> \\(\\d+\\)</li>.*"), stats);
  }
}
