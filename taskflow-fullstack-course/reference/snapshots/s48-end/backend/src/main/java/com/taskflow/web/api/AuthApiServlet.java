package com.taskflow.web.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.taskflow.security.AuthUser;
import com.taskflow.service.AuthService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.Csrf;
import com.taskflow.web.CurrentUser;
import com.taskflow.web.SessionRegistry;
import com.taskflow.web.api.dto.Dtos.UserDto;
import java.io.IOException;
import java.util.List;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

/**
 * S47 (47.02): authentication for the SPA, on the SAME session as the Admin Portal (one JSESSIONID, HttpOnly).
 *   GET  /api/auth/csrf    → 204 + a fresh XSRF-TOKEN cookie (the SPA calls it first)
 *   POST /api/auth/login   {"username","password"} → 200 UserDto | 401 BAD_CREDENTIALS | 429 + Retry-After | 400
 *   POST /api/auth/logout  → 204 (the session is gone)
 *   GET  /api/auth/me      → 200 UserDto | 401 UNAUTHENTICATED ("who am I?" after a page reload)
 * Same AuthService as LoginServlet (41.07): the throttle, the BCrypt check, the audit, the generic message.
 * Public paths for AuthenticationFilter; login still needs the CSRF header (CsrfDoubleSubmitFilter): no login CSRF.
 */
@WebServlet("/api/auth/*")
public class AuthApiServlet extends ApiServlet {

  private AuthService auth;

  @Override
  public void init() {
    auth = AppContextListener.authService(getServletContext());
  }

  @Override
  protected void route(HttpServletRequest request, HttpServletResponse response, String method, List<String> path) throws IOException {
    String action = path.size() == 1 ? path.get(0) : "";
    switch (method + " " + action) {
      case "GET csrf" -> {
        XsrfCookie.issue(response);
        response.setStatus(204);
      }
      case "POST login" -> login(request, response);
      case "POST logout" -> logout(request, response);
      case "GET me" -> {
        AuthUser user = CurrentUser.get(request);
        if (user == null) throw ApiException.unauthenticated();
        Json.write(response, 200, profile(user));
      }
      default -> throw ApiException.noEndpoint(request);
    }
  }

  private void login(HttpServletRequest request, HttpServletResponse response) throws IOException {
    JsonNode body = Json.readTree(request);
    JsonNode username = body.get("username");
    JsonNode password = body.get("password");
    if (username == null || !username.isTextual() || password == null || !password.isTextual()) {
      throw ApiException.badRequest("username and password are required");
    }
    AuthService.LoginResult result = auth.login(username.asText(), password.asText(), request.getRemoteAddr());
    switch (result.outcome()) {
      case SUCCESS -> {
        if (request.getSession(false) != null) request.changeSessionId();  // 🛡 fixation (41.11); none yet → a new one below
        HttpSession session = request.getSession();
        session.setAttribute(SessionRegistry.LOGIN_IP, request.getRemoteAddr());
        session.setAttribute(CurrentUser.SESSION_KEY, result.user());
        Csrf.reset(request);                      // the Admin Portal's form token rotates too
        XsrfCookie.issue(response);               // and the SPA's: a token from before login isn't reused after it
        Json.write(response, 200, profile(result.user()));
      }
      case THROTTLED -> {
        response.setHeader("Retry-After", String.valueOf(auth.throttleSeconds()));
        throw ApiException.tooManyRequests();
      }
      default -> throw ApiException.badCredentials();
    }
  }

  private void logout(HttpServletRequest request, HttpServletResponse response) {
    AuthUser user = CurrentUser.get(request);
    HttpSession session = request.getSession(false);
    if (session != null) {
      session.removeAttribute(CurrentUser.SESSION_KEY);   // a logout, not a timeout (45.09)
      session.invalidate();
    }
    if (user != null) auth.loggedOut(user.getUsername(), request.getRemoteAddr());
    response.setStatus(204);
  }

  private UserDto profile(AuthUser user) {
    return auth.profile(user.getId()).map(UserDto::from).orElseThrow(ApiException::unauthenticated);
  }
}
