package com.taskflow.web.auth;

import com.taskflow.security.AuthUser;
import com.taskflow.service.AuthService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.CurrentUser;
import com.taskflow.web.Flash;
import com.taskflow.web.Http;
import java.io.IOException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

/**
 * S41 (41.08): POST /logout → the whole session is destroyed (not just the user attribute: the CSRF token, the flash,
 * the history go too), then 303 → /login. A POST (with the CSRF token) so another site can't log users out.
 */
@WebServlet("/logout")
public class LogoutServlet extends HttpServlet {

  private AuthService auth;

  @Override
  public void init() {
    auth = AppContextListener.authService(getServletContext());
  }

  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
    AuthUser user = CurrentUser.get(request);
    HttpSession session = request.getSession(false);
    if (session != null) session.invalidate();
    if (user != null) auth.loggedOut(user.getUsername(), request.getRemoteAddr());
    Flash.put(request, "You have been logged out.");               // a NEW, anonymous session carries the message
    Http.seeOther(response, request.getContextPath() + "/login");
  }
}
