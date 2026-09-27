package com.taskflow.web.auth;

import com.taskflow.service.AuthService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.Csrf;
import com.taskflow.web.CurrentUser;
import com.taskflow.web.Flash;
import com.taskflow.web.Http;
import com.taskflow.web.Redirects;
import java.io.IOException;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

/**
 * S41 (41.07): GET /login → the form. POST /login (username, password, returnUrl) →
 *   success:   NEW session id (41.11) + the user in the session + a fresh CSRF token + 303 → returnUrl (checked, 41.17)
 *   invalid:   the form again with ONE generic message (41.14)
 *   throttled: 429 + Retry-After (41.15)
 */
@WebServlet("/login")
public class LoginServlet extends HttpServlet {

  static final String INVALID = "Invalid username or password.";

  private AuthService auth;

  @Override
  public void init() {
    auth = AppContextListener.authService(getServletContext());
  }

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    if (CurrentUser.get(request) != null) {                                      // already logged in
      Http.seeOther(response, request.getContextPath() + "/tasks");
      return;
    }
    Flash.consume(request);
    request.setAttribute("expired", request.getParameter("expired") != null);   // set by AuthenticationFilter (41.19)
    show(request, response, "");
  }

  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    String username = request.getParameter("username");
    AuthService.LoginResult result = auth.login(username, request.getParameter("password"), request.getRemoteAddr());
    switch (result.outcome()) {
      case SUCCESS -> {
        request.changeSessionId();                                  // 🛡 session fixation (41.11): same data, new id
        HttpSession session = request.getSession();
        session.setAttribute(CurrentUser.SESSION_KEY, result.user());
        Csrf.reset(request);                                        // a new token for the logged-in session
        Flash.put(request, "Welcome, " + result.user().getDisplayName() + ".");
        String fallback = request.getContextPath() + "/tasks";
        Http.seeOther(response, Redirects.safeLocalPath(request, request.getParameter("returnUrl"), fallback));
      }
      case THROTTLED -> {
        response.setStatus(429);                                    // Too Many Requests
        response.setHeader("Retry-After", String.valueOf(auth.throttleSeconds()));
        request.setAttribute("error", "Too many failed attempts. Please try again later.");
        show(request, response, username);
      }
      default -> {
        request.setAttribute("error", INVALID);                     // the same text for every failure (41.14)
        show(request, response, username);
      }
    }
  }

  private void show(HttpServletRequest request, HttpServletResponse response, String username) throws ServletException, IOException {
    Csrf.prepare(request);                                          // the login form posts too (a pre-login session)
    request.setAttribute("pageTitle", "Log in");
    request.setAttribute("username", username == null ? "" : username);
    request.setAttribute("returnUrl", Redirects.safeLocalPath(request, request.getParameter("returnUrl"), ""));
    request.getRequestDispatcher("/WEB-INF/views/auth/login.jsp").forward(request, response);
  }
}
