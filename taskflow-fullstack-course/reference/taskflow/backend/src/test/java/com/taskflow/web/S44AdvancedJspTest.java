package com.taskflow.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.CookieManager;
import java.net.HttpCookie;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/** S44: i18n (LocaleFilter, bundles, the shared tf_lang cookie), pagination, sortable headers, tag files, custom tags. */
class S44AdvancedJspTest extends TomcatTest {

  private static final Pattern TOKEN = Pattern.compile("name=\"_csrf\" value=\"([^\"]+)\"");

  private static String enc(String s) {
    return URLEncoder.encode(s, StandardCharsets.UTF_8);
  }

  private static HttpResponse<String> get(HttpClient browser, String path, String... headers) throws Exception {
    HttpRequest.Builder request = HttpRequest.newBuilder(uri(CONTEXT + path));
    if (headers.length > 0) request.headers(headers);
    return browser.send(request.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
  }

  private static void setLanguageCookie(HttpClient browser, String value) {
    HttpCookie cookie = new HttpCookie("tf_lang", value);
    cookie.setPath("/");
    cookie.setVersion(0);
    ((CookieManager) browser.cookieHandler().orElseThrow()).getCookieStore().add(uri("/"), cookie);
  }

  private static int rows(String html) {
    return html.split("<td class=\"row-number\">", -1).length - 1;
  }

  @Test
  void englishIsTheDefault() throws Exception { // 44.07
    String list = get(CONTEXT + "/tasks").body();
    assertTrue(list.contains("<html lang=\"en\">"), list);
    assertTrue(list.contains("<h1 class=\"page__title\">Tasks</h1>"));
    assertTrue(list.contains(">Tiếng Việt</button>"));                        // the switch offers the other language
  }

  @Test
  void acceptLanguageChoosesVietnamese() throws Exception { // 44.07
    HttpClient bob = loggedInClient("bob", "bob123");
    String list = get(bob, "/tasks", "Accept-Language", "vi-VN,vi;q=0.9,en;q=0.8").body();
    assertTrue(list.contains("<html lang=\"vi\">"), list);
    assertTrue(list.contains("<h1 class=\"page__title\">Công việc</h1>"));
    assertTrue(list.contains("Đăng nhập: Bob Tran"));
    assertTrue(list.contains("<span class=\"badge\">Cần làm</span>"));      // the status badge tag, translated
  }

  @Test
  void theCookieWinsAndIsAllowListed() throws Exception { // 44.07
    HttpClient bob = loggedInClient("bob", "bob123");
    setLanguageCookie(bob, "en");
    assertTrue(get(bob, "/tasks", "Accept-Language", "vi").body().contains("<html lang=\"en\">"));
    setLanguageCookie(bob, "fr");                                              // not on the allow-list: ignored
    assertTrue(get(bob, "/tasks", "Accept-Language", "vi").body().contains("<html lang=\"vi\">"));
  }

  @Test
  void theLanguageSwitchWritesTheCookieTheReactAppReads() throws Exception { // 44.08
    HttpClient bob = loggedInClient("bob", "bob123");
    Matcher m = TOKEN.matcher(get(bob, "/tasks").body());
    assertTrue(m.find());
    HttpResponse<String> switched = bob.send(HttpRequest.newBuilder(uri(CONTEXT + "/preferences/language"))
        .header("Content-Type", "application/x-www-form-urlencoded")
        .POST(HttpRequest.BodyPublishers.ofString("lang=vi&returnTo=" + enc(CONTEXT + "/dashboard") + "&_csrf=" + enc(m.group(1))))
        .build(), HttpResponse.BodyHandlers.ofString());
    assertEquals(303, switched.statusCode());
    assertEquals(CONTEXT + "/dashboard", switched.headers().firstValue("Location").orElseThrow());
    String cookie = switched.headers().allValues("Set-Cookie").stream().filter(c -> c.startsWith("tf_lang=")).findFirst().orElseThrow();
    assertTrue(cookie.startsWith("tf_lang=vi;") && cookie.contains("Path=/") && cookie.contains("Max-Age=31536000"), cookie);
    assertFalse(cookie.contains("HttpOnly"), cookie);                          // i18next must be able to read it
    assertTrue(get(bob, "/dashboard").body().contains("<h1 class=\"page__title\">Bảng điều khiển</h1>"));
    assertEquals(400, postForm(CONTEXT + "/preferences/language", "lang=fr").statusCode());
  }

  @Test
  void theListIsPaged() throws Exception { // 44.04
    String first = get(CONTEXT + "/tasks").body();
    assertEquals(10, rows(first), first);
    assertTrue(first.contains("aria-current=\"page\">1</a>"), first);
    assertTrue(first.contains("href=\"/taskflow/tasks?page=2\""));
    String second = get(CONTEXT + "/tasks?page=2").body();
    assertTrue(second.contains("<td class=\"row-number\">11</td>"), second);   // numbers continue across pages
    assertTrue(second.contains("href=\"/taskflow/tasks\">Previous</a>"));     // page 1 has no page parameter
    assertTrue(get(CONTEXT + "/tasks?page=abc").body().contains("aria-current=\"page\">1</a>"));
    String clamped = get(CONTEXT + "/tasks?page=999").body();
    assertTrue(clamped.contains("aria-current=\"page\">"), clamped);
    assertFalse(clamped.contains(">Next</a>"));                                // 999 → the last page
  }

  @Test
  void pageLinksKeepTheFiltersAndEncodeThem() throws Exception { // 44.03, 44.19
    String prefix = "R&D " + System.nanoTime();
    for (int i = 1; i <= 11; i++) postForm(CONTEXT + "/tasks/new", "priority=LOW&title=" + enc(prefix + " #" + i));
    String page = get(CONTEXT + "/tasks?q=" + enc(prefix) + "&sort=title").body();
    assertEquals(10, rows(page));
    assertTrue(page.contains("href=\"/taskflow/tasks?q=" + enc(prefix) + "&amp;sort=title&amp;page=2\""), page);
    assertTrue(page.contains("Page 1 of 2 · 11 tasks"));
  }

  @Test
  void columnHeadersToggleTheSortDirection() throws Exception { // 44.16
    String ascending = get(CONTEXT + "/tasks?sort=title").body();
    assertTrue(ascending.contains("href=\"/taskflow/tasks?sort=title&amp;dir=desc\">Title ▲</a>"), ascending);
    assertTrue(ascending.contains("href=\"/taskflow/tasks?sort=due\">Due</a>"));
    String descending = get(CONTEXT + "/tasks?sort=title&dir=desc").body();
    assertTrue(descending.contains("href=\"/taskflow/tasks?sort=title\">Title ▼</a>"), descending);
    int write = descending.indexOf(">Write quarterly report</a>");
    int update = descending.indexOf(">Update the style guide</a>");
    assertTrue(write > 0 && update > write, descending);
  }

  @Test
  void datesAndDueLabelsFollowTheLanguage() throws Exception { // 44.05, 44.13
    LocalDate due = LocalDate.now().plusDays(3);
    String title = "Due label probe " + System.nanoTime();
    postForm(CONTEXT + "/tasks/new", "priority=LOW&dueDate=" + due + "&title=" + enc(title));
    String english = get(CONTEXT + "/tasks?q=" + enc(title)).body();
    assertTrue(english.contains(due.format(DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).withLocale(Locale.ENGLISH))), english);
    assertTrue(english.contains("<span class=\"due-label\">Due in 3 days</span>"), english);

    HttpClient admin = loggedInClient("admin", "admin123");                  // admins see alice's task too (42.09)
    String vietnamese = get(admin, "/tasks?q=" + enc(title), "Accept-Language", "vi").body();
    assertTrue(vietnamese.contains("<span class=\"due-label\">Còn 3 ngày</span>"), vietnamese);

    postForm(CONTEXT + "/tasks/new", "priority=LOW&dueDate=2020-01-01&title=" + enc(title + " late"));
    assertTrue(get(CONTEXT + "/tasks?q=" + enc(title + " late")).body().matches("(?s).*\\d+ days overdue.*"));
  }

  @Test
  void theTruncateFunctionCutsBeforeEscaping() throws Exception { // 44.14
    get(CONTEXT + "/tasks/view?id=4");                                         // "Review <img src=x onerror="alert(1)"> onboarding doc"
    String list = get(CONTEXT + "/tasks").body();
    assertTrue(list.contains(">Review &lt;img src=x onerror=&#034;alert(1)&#034;&gt; o…</a>"), list);
  }
}
