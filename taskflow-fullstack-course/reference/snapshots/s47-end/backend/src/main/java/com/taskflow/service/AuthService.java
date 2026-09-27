package com.taskflow.service;

import com.taskflow.dao.AuditDao;
import com.taskflow.dao.UserDao;
import com.taskflow.model.User;
import com.taskflow.security.AuthUser;
import com.taskflow.security.LoginThrottle;
import com.taskflow.security.PasswordHasher;
import java.util.Optional;

/**
 * S41 (41.07): checks a username and password. Knows nothing about HTTP: sessions are the controller's job.
 *   - throttled → refused before any check (41.15)
 *   - unknown user → the SAME work (burnTime) and the SAME answer as a wrong password (41.14)
 *   - every outcome is written to the audit log (append-only, 36.10)
 */
public class AuthService {

  public enum Outcome { SUCCESS, INVALID, THROTTLED }

  public record LoginResult(Outcome outcome, AuthUser user) {
    static LoginResult of(Outcome outcome) { return new LoginResult(outcome, null); }
  }

  private final UserDao users;
  private final AuditDao audit;
  private final PasswordHasher hasher;
  private final LoginThrottle throttle;

  public AuthService(UserDao users, AuditDao audit, PasswordHasher hasher, LoginThrottle throttle) {
    this.users = users;
    this.audit = audit;
    this.hasher = hasher;
    this.throttle = throttle;
  }

  public LoginResult login(String username, String password, String ip) {
    String name = username == null ? "" : username.strip();
    String pass = password == null ? "" : password;
    if (throttle.isBlocked(name, ip)) {
      audit.record("LOGIN_THROTTLED", name, ip, null);
      return LoginResult.of(Outcome.THROTTLED);
    }
    Optional<UserDao.Credentials> credentials = name.isEmpty() ? Optional.empty() : users.findCredentials(name);
    boolean valid;
    if (credentials.isEmpty()) {
      hasher.burnTime(pass);                                        // same cost as a real check (41.14)
      valid = false;
    } else {
      valid = hasher.matches(pass, credentials.get().passwordHash()) && credentials.get().enabled();
    }
    if (!valid) {
      throttle.recordFailure(name, ip);
      audit.record("LOGIN_FAIL", name, ip, null);
      return LoginResult.of(Outcome.INVALID);
    }
    throttle.recordSuccess(name);
    audit.record("LOGIN_OK", name, ip, null);
    User user = credentials.get().user();
    return new LoginResult(Outcome.SUCCESS, new AuthUser(user.getId(), user.getUsername(), user.getDisplayName(), user.getRole()));
  }

  /** S46: the user's profile (for /api/auth/me and the login response). */
  public Optional<User> profile(long userId) {
    return users.findById(userId);
  }

  public void loggedOut(String username, String ip) {
    audit.record("LOGOUT", username, ip, null);
  }

  public long throttleSeconds() {
    return throttle.period().getSeconds();
  }
}
