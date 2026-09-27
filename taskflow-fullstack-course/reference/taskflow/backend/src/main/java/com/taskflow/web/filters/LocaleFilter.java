package com.taskflow.web.filters;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.jsp.jstl.core.Config;

/**
 * S44 (44.07): which language this request is rendered in, decided ONCE, before any view runs:
 *   1. the tf_lang cookie (written by the Admin Portal's switcher AND by the React app's i18next: one preference),
 *      if its value is on the ALLOW-LIST (en, vi): a cookie is user input (39.09)
 *   2. otherwise the browser's Accept-Language, best match first
 *   3. otherwise English
 * The result goes where JSTL's fmt tags look for it: Config.set(request, FMT_LOCALE, …), i.e. the request attribute
 * "javax.servlet.jsp.jstl.fmt.locale.request". Plus "lang" ("en"/"vi") for <html lang>.
 * Request scope, not session: TaskFlow's views are session="false", and the cookie is read on every request anyway.
 */
public class LocaleFilter implements Filter {

  public static final String COOKIE = "tf_lang";
  public static final List<String> LANGUAGES = List.of("en", "vi");

  @Override
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
    HttpServletRequest request = (HttpServletRequest) req;
    String lang = choose(request);
    Config.set(request, Config.FMT_LOCALE, Locale.forLanguageTag(lang));
    request.setAttribute("lang", lang);
    chain.doFilter(req, res);
  }

  static String choose(HttpServletRequest request) {
    Cookie[] cookies = request.getCookies();
    if (cookies != null) {
      for (Cookie cookie : cookies) {
        if (COOKIE.equals(cookie.getName()) && LANGUAGES.contains(cookie.getValue())) return cookie.getValue();
      }
    }
    if (request.getHeader("Accept-Language") != null) {                // without the header, getLocales() is the SERVER's default
      for (Locale locale : Collections.list(request.getLocales())) {    // already sorted by q-value
        if (LANGUAGES.contains(locale.getLanguage())) return locale.getLanguage();
      }
    }
    return "en";
  }
}
