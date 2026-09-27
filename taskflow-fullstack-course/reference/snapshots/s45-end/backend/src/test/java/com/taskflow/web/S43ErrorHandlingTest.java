package com.taskflow.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;

/** S43: error pages for 400/403/404/500 + default, the exception → status mapping, no leaked details, request ids. */
class S43ErrorHandlingTest extends TomcatTest {

  /** Nothing a user should ever see on an error page. */
  private static void assertNoLeaks(String body) {
    assertFalse(body.contains("Apache Tomcat"), body);
    assertFalse(body.contains("Exception"), body);
    assertFalse(body.contains("at com.taskflow"), body);
    assertFalse(body.contains("password_hash"), body);
  }

  @Test
  void anUnknownPageGetsTheCustom404() throws Exception { // 43.02, 43.06
    HttpResponse<String> response = get(CONTEXT + "/tasks/nothing-here");
    assertEquals(404, response.statusCode());
    assertTrue(response.body().contains("<title>Page not found · TaskFlow Admin</title>"), response.body());
    assertTrue(response.body().contains("Logged in as Alice Nguyen"));        // the same request: attributes survive (43.03)
    assertNoLeaks(response.body());
  }

  @Test
  void aMissingTaskIsANotFoundException() throws Exception { // 43.08
    HttpResponse<String> response = get(CONTEXT + "/tasks/view?id=999999");
    assertEquals(404, response.statusCode());
    assertTrue(response.body().contains("Page not found"));
  }

  @Test
  void aBadIdGetsThe400PageWithItsFixedMessage() throws Exception { // 43.12
    HttpResponse<String> response = get(CONTEXT + "/tasks/view?id=%3Cscript%3E");
    assertEquals(400, response.statusCode());
    assertTrue(response.body().contains("Parameter &#039;id&#039; must be a positive number."), response.body());
    assertFalse(response.body().contains("<script>"));                           // the input is never echoed
    assertEquals(400, postForm(CONTEXT + "/tasks/comment", "id=1&body=+").statusCode());
  }

  @Test
  void anUnhandledExceptionShowsOnlyTheRequestId() throws Exception { // 43.09, 43.10, 43.12
    HttpResponse<String> response = get(CONTEXT + "/debug/fail");
    assertEquals(500, response.statusCode());
    String requestId = response.headers().firstValue("X-Request-Id").orElseThrow();
    assertTrue(response.body().contains("Something went wrong"), response.body());
    assertTrue(response.body().contains("<code>" + requestId + "</code>"), response.body());
    assertNoLeaks(response.body());
    assertTrue(response.headers().firstValue("Content-Security-Policy").isPresent()); // ERROR dispatch: headers too (40.08)
  }

  @Test
  void afterTheResponseIsCommittedNoErrorPageCanBeShown() throws Exception { // 43.07
    HttpResponse<String> response = get(CONTEXT + "/debug/fail?after=commit");
    assertEquals(200, response.statusCode());
    assertTrue(response.body().startsWith("<p>partial page"), response.body());
    assertFalse(response.body().contains("Something went wrong"));
  }

  @Test
  void otherStatusesGetTheDefaultErrorPage() throws Exception { // 43.02
    HttpResponse<String> response = get(CONTEXT + "/tasks/delete");          // doPost only → 405
    assertEquals(405, response.statusCode());
    assertTrue(response.body().contains("<h1 class=\"page__title\">Error 405</h1>"), response.body());
    assertNoLeaks(response.body());
  }

  @Test
  void tomcatsOwnErrorPagesShowNoVersionOrReport() throws Exception { // 43.10: the ErrorReportValve, outside any web app
    HttpResponse<String> response = get("/no-such-application/");
    assertEquals(404, response.statusCode());
    assertTrue(response.body().contains("HTTP Status 404"), response.body());
    assertNoLeaks(response.body());
  }

  @Test
  void theAdminAreaUsesThe403ErrorPage() throws Exception { // 42.03 → 43.06
    HttpResponse<String> response = get(CONTEXT + "/admin/users");
    assertEquals(403, response.statusCode());
    assertTrue(response.body().contains("<title>Access denied · TaskFlow Admin</title>"), response.body());
  }
}
