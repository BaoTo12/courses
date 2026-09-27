package com.taskflow.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;

/**
 * S50: the final header set, and plain-HTTP behaviour (no HSTS, no Secure flag: development must keep working).
 * The HTTPS side (HSTS + Secure cookies) was checked against DevServer's TLS connector (S50 README).
 */
class S50HardeningTest extends TomcatTest {

  @Test
  void everyResponseCarriesTheFinalHeaderSet() throws Exception { // 50.05
    for (String path : new String[] {CONTEXT + "/tasks", CONTEXT + "/api/tasks?size=1", CONTEXT + "/tasks/nothing-here", CONTEXT + "/app/"}) {
      HttpResponse<String> response = get(path);
      assertEquals("camera=(), microphone=(), geolocation=(), payment=()", response.headers().firstValue("Permissions-Policy").orElse(""), path);
      assertEquals("same-origin", response.headers().firstValue("Cross-Origin-Opener-Policy").orElse(""), path);
      assertEquals("nosniff", response.headers().firstValue("X-Content-Type-Options").orElse(""), path);
      assertEquals("DENY", response.headers().firstValue("X-Frame-Options").orElse(""), path);
      assertTrue(response.headers().firstValue("Content-Security-Policy").orElse("").contains("object-src 'none'"), path);
    }
  }

  @Test
  void plainHttpGetsNoHstsAndNoSecureFlag() throws Exception { // 50.07
    HttpResponse<String> csrf = get(CONTEXT + "/api/auth/csrf");
    assertTrue(csrf.headers().firstValue("Strict-Transport-Security").isEmpty());
    String cookie = csrf.headers().allValues("Set-Cookie").stream().filter(c -> c.startsWith("XSRF-TOKEN=")).findFirst().orElseThrow();
    assertFalse(cookie.contains("Secure"), cookie);
  }

  @Test
  void noDefaultServletDirectoryListings() throws Exception { // 50.05
    HttpResponse<String> listing = get(CONTEXT + "/static/css/");
    assertEquals(404, listing.statusCode());
    assertFalse(listing.body().contains("Directory Listing For"));   // Tomcat's listing page title
  }
}
