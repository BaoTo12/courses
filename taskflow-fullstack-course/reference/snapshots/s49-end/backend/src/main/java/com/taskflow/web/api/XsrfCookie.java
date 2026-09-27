package com.taskflow.web.api;

import java.security.SecureRandom;
import java.util.Base64;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletResponse;

/**
 * S47 (47.06): the SPA's CSRF token, in a cookie named XSRF-TOKEN (Axios and Angular's default name, and the one
 * TaskFlow's React app reads with js-cookie in S24).
 *   NOT HttpOnly: the page's JavaScript must READ it and copy it into the X-XSRF-TOKEN header.
 *   Path=/: the React app's pages (/, /tasks…) must see it, not only /taskflow.
 *   SameSite=Lax: from context.xml's CookieProcessor (41.12).
 * 32 random bytes from SecureRandom: unguessable.
 */
public final class XsrfCookie {

  public static final String COOKIE = "XSRF-TOKEN";
  public static final String HEADER = "X-XSRF-TOKEN";
  private static final SecureRandom RANDOM = new SecureRandom();

  private XsrfCookie() {}

  public static String issue(HttpServletResponse response) {
    byte[] bytes = new byte[32];
    RANDOM.nextBytes(bytes);
    String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    Cookie cookie = new Cookie(COOKIE, token);
    cookie.setPath("/");
    cookie.setHttpOnly(false);
    response.addCookie(cookie);
    return token;
  }
}
