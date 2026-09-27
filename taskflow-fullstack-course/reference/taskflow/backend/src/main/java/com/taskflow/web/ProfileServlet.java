package com.taskflow.web;

import com.taskflow.security.AuthUser;
import com.taskflow.service.AuthService;
import com.taskflow.service.ProfileService;
import com.taskflow.web.filters.LocaleFilter;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S51: GET /profile → the form (display name, language, theme). POST /profile → validate → 400 + the form again, or
 * save + update the SESSION's copy of the user (the header shows the new name at once) + the shared tf_lang / tf_theme
 * cookies (TaskFlow Web follows, 44.08) + flash + 303 (PRG, 37.08). Only the three named fields are read (46.10).
 */
@WebServlet("/profile")
public class ProfileServlet extends HttpServlet {

  static final Set<String> THEMES = Set.of("light", "dark", "system");
  private static final int ONE_YEAR = 365 * 24 * 60 * 60;

  private ProfileService profiles;
  private AuthService auth;

  @Override
  public void init() {
    profiles = AppContextListener.profiles(getServletContext());
    auth = AppContextListener.authService(getServletContext());
  }

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    AuthUser user = CurrentUser.get(request);
    String locale = auth.profile(user.getId()).map(u -> u.getLocale()).orElse("en");
    show(request, response, user.getDisplayName(), locale, currentTheme(request), Map.of());
  }

  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    AuthUser user = CurrentUser.get(request);
    String displayName = request.getParameter("displayName");
    String locale = request.getParameter("locale");
    String theme = request.getParameter("theme");
    ProfileService.Result result = profiles.update(user, displayName, locale, request.getRemoteAddr());
    Map<String, String> errors = new java.util.LinkedHashMap<>(result.errors());
    if (!THEMES.contains(theme)) errors.put("theme", "must be one of light, dark, system");
    if (!errors.isEmpty()) {
      response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
      show(request, response, displayName, locale, theme, errors);
      return;
    }
    request.getSession().setAttribute(CurrentUser.SESSION_KEY, result.user());
    addPreference(request, response, LocaleFilter.COOKIE, locale, ONE_YEAR);
    addPreference(request, response, ThemeServlet.COOKIE, theme, "system".equals(theme) ? 0 : ONE_YEAR);
    Flash.put(request, "Profile saved.");
    Http.seeOther(response, request.getContextPath() + "/profile");
  }

  private static void addPreference(HttpServletRequest request, HttpServletResponse response, String name, String value, int maxAge) {
    Cookie cookie = new Cookie(name, value);
    cookie.setPath("/");                       // shared with TaskFlow Web (not HttpOnly: it reads them)
    cookie.setMaxAge(maxAge);
    cookie.setSecure(request.isSecure());
    response.addCookie(cookie);
  }

  private static String currentTheme(HttpServletRequest request) {
    if (request.getCookies() != null) {
      for (Cookie cookie : request.getCookies()) {
        if (ThemeServlet.COOKIE.equals(cookie.getName()) && THEMES.contains(cookie.getValue())) return cookie.getValue();
      }
    }
    return "system";
  }

  private void show(HttpServletRequest request, HttpServletResponse response, String displayName, String locale, String theme,
                    Map<String, String> errors) throws ServletException, IOException {
    request.setAttribute("pageTitle", "Profile");
    request.setAttribute("form", Map.of("displayName", displayName == null ? "" : displayName,
        "locale", locale == null ? "" : locale, "theme", theme == null ? "" : theme));
    request.setAttribute("errors", errors);
    request.setAttribute("locales", ProfileService.LOCALES);
    request.setAttribute("themes", List.of("system", "light", "dark"));
    Flash.consume(request);
    request.getRequestDispatcher("/WEB-INF/views/profile.jsp").forward(request, response);
  }
}