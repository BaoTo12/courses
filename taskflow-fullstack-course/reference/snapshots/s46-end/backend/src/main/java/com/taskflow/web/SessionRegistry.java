package com.taskflow.web;

import com.taskflow.security.AuthUser;
import com.taskflow.service.AuditService;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import javax.servlet.http.HttpSession;
import javax.servlet.http.HttpSessionAttributeListener;
import javax.servlet.http.HttpSessionBindingEvent;
import javax.servlet.http.HttpSessionEvent;
import javax.servlet.http.HttpSessionIdListener;
import javax.servlet.http.HttpSessionListener;

/**
 * S45 (45.09): who is logged in RIGHT NOW, and an audit event when a logged-in session simply times out.
 * Three listener interfaces, one object (registered by AppContextListener with addListener: 45.05):
 *   attributeAdded/Replaced "currentUser"  → login: remember sessionId → username
 *   attributeRemoved "currentUser"         → logout (LogoutServlet removes it BEFORE invalidating): forget it
 *   sessionIdChanged                       → changeSessionId() (41.11, 42.07): move the entry to the new id
 *   sessionDestroyed with a user still in  → nobody logged out: the 15-minute timeout → SESSION_EXPIRED
 * Listener methods run on request threads and on Tomcat's background expiry thread at the same time:
 * the map is a ConcurrentHashMap, and nothing else is shared (45.02).
 */
public class SessionRegistry implements HttpSessionListener, HttpSessionAttributeListener, HttpSessionIdListener {

  /** Session attribute: the IP the user logged in from (the audit needs one; a timeout has no request). */
  public static final String LOGIN_IP = "loginIp";

  private final AuditService audit;
  private final Map<String, String> usernamesBySession = new ConcurrentHashMap<>();

  public SessionRegistry(AuditService audit) {
    this.audit = audit;
  }

  /** The distinct usernames with at least one live session, sorted. */
  public List<String> loggedInUsers() {
    return usernamesBySession.values().stream().distinct().sorted().toList();
  }

  public int loggedInSessions() {
    return usernamesBySession.size();
  }

  @Override
  public void attributeAdded(HttpSessionBindingEvent event) {
    if (isUser(event)) usernamesBySession.put(event.getSession().getId(), ((AuthUser) event.getValue()).getUsername());
  }

  @Override
  public void attributeReplaced(HttpSessionBindingEvent event) {   // getValue() is the OLD value here; read the new one
    if (isUser(event)) {
      AuthUser user = (AuthUser) event.getSession().getAttribute(CurrentUser.SESSION_KEY);
      if (user != null) usernamesBySession.put(event.getSession().getId(), user.getUsername());
    }
  }

  @Override
  public void attributeRemoved(HttpSessionBindingEvent event) {
    if (isUser(event)) usernamesBySession.remove(event.getSession().getId());
  }

  @Override
  public void sessionIdChanged(HttpSessionEvent event, String oldSessionId) {
    String username = usernamesBySession.remove(oldSessionId);
    if (username != null) usernamesBySession.put(event.getSession().getId(), username);
  }

  @Override
  public void sessionDestroyed(HttpSessionEvent event) {           // runs BEFORE the attributes are removed
    HttpSession session = event.getSession();
    String username = usernamesBySession.remove(session.getId());
    if (username != null) {
      Object ip = session.getAttribute(LOGIN_IP);
      audit.record("SESSION_EXPIRED", username, ip == null ? "unknown" : ip.toString(), null);
    }
  }

  private static boolean isUser(HttpSessionBindingEvent event) {
    return CurrentUser.SESSION_KEY.equals(event.getName());
  }
}
