package com.taskflow.web.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.taskflow.security.AuthUser;
import com.taskflow.service.AuthService;
import com.taskflow.service.ProfileService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.CurrentUser;
import com.taskflow.web.api.dto.Dtos.UserDto;
import com.taskflow.web.filters.LocaleFilter;
import java.io.IOException;
import java.util.List;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S51: PATCH /api/users/me {"displayName"?, "locale"?} → 200 UserDto. The SPA's profile page.
 * Absent fields keep their current value; only these two fields are read (no role, no username: 46.10).
 * The session's copy of the user and the shared tf_lang cookie follow, like the portal's /profile.
 */
@WebServlet("/api/users/*")
public class UsersApiServlet extends ApiServlet {

  private static final int ONE_YEAR = 365 * 24 * 60 * 60;

  private ProfileService profiles;
  private AuthService auth;

  @Override
  public void init() {
    profiles = AppContextListener.profiles(getServletContext());
    auth = AppContextListener.authService(getServletContext());
  }

  @Override
  protected void route(HttpServletRequest request, HttpServletResponse response, String method, List<String> path) throws IOException {
    if (!(path.size() == 1 && path.get(0).equals("me") && is(method, "PATCH"))) throw ApiException.noEndpoint(request);
    AuthUser user = CurrentUser.get(request);
    if (user == null) throw ApiException.unauthenticated();
    UserDto current = auth.profile(user.getId()).map(UserDto::from).orElseThrow(ApiException::unauthenticated);
    JsonNode body = Json.readTree(request);
    String displayName = body.has("displayName") ? text(body.get("displayName")) : current.displayName();
    String locale = body.has("locale") ? text(body.get("locale")) : current.locale();
    ProfileService.Result result = profiles.update(user, displayName, locale, request.getRemoteAddr());
    if (!result.errors().isEmpty()) throw ApiException.validation(result.errors());
    request.getSession().setAttribute(CurrentUser.SESSION_KEY, result.user());
    Cookie lang = new Cookie(LocaleFilter.COOKIE, locale);
    lang.setPath("/");
    lang.setMaxAge(ONE_YEAR);
    lang.setSecure(request.isSecure());
    response.addCookie(lang);
    Json.write(response, 200, auth.profile(user.getId()).map(UserDto::from).orElseThrow());
  }

  private static String text(JsonNode node) {
    return node != null && node.isTextual() ? node.asText() : null;
  }
}