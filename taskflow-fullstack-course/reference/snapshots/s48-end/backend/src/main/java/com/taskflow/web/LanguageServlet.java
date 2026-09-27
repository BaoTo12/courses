package com.taskflow.web;

import com.taskflow.web.errors.BadRequestException;
import com.taskflow.web.filters.LocaleFilter;
import java.io.IOException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S44 (44.08): POST /preferences/language (lang, returnTo) → the tf_lang cookie → back to the page.
 * The SAME cookie the React app's i18next reads and writes (S25: lookupCookie 'tf_lang', path '/'): cookies are per
 * HOST, not per port, so on localhost the Admin Portal (:8080) and the React dev server (:5173) share it, and in
 * Part 4 both are served from one origin anyway. Switch here → the React app follows on its next load, and vice versa.
 */
@WebServlet("/preferences/language")
public class LanguageServlet extends HttpServlet {

  private static final int ONE_YEAR = 365 * 24 * 60 * 60;

  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
    String lang = request.getParameter("lang");
    if (!LocaleFilter.LANGUAGES.contains(lang)) throw new BadRequestException("Unsupported language.");
    Cookie cookie = new Cookie(LocaleFilter.COOKIE, lang);
    cookie.setPath("/");                 // the whole host: the React app too
    cookie.setMaxAge(ONE_YEAR);
    // Not HttpOnly: i18next reads it in the browser. A preference, not a secret. SameSite=Lax comes from context.xml (41.12).
    response.addCookie(cookie);
    Http.seeOther(response, Redirects.safeLocalPath(request, request.getParameter("returnTo"), request.getContextPath() + "/tasks"));
  }
}
