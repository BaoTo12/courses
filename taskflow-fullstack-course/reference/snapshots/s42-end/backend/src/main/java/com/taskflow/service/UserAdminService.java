package com.taskflow.service;

import com.taskflow.dao.UserDao;
import com.taskflow.security.AccessDeniedException;
import com.taskflow.security.AuthUser;
import java.util.List;
import java.util.Set;

/**
 * S42 (42.07): what an admin can do to accounts: enable, disable, change the role.
 *   - the service checks the caller is an admin ITSELF, although /admin/* is already filtered (defence in depth, 42.06)
 *   - an admin can't change their OWN account (no locking yourself out, no accidental self-demotion)
 *   - the role comes from an allow-list: "SUPERADMIN" or "ADMIN'--" is refused, not stored (42.08)
 *   - every change is audited, and the AccountRegistry is refreshed: it applies to open sessions at their next request
 */
public class UserAdminService {

  public enum Change { DONE, NOT_FOUND, OWN_ACCOUNT }

  public static final Set<String> ROLES = Set.of("USER", "ADMIN");

  private final UserDao users;
  private final AccountRegistry registry;
  private final AuditService audit;

  public UserAdminService(UserDao users, AccountRegistry registry, AuditService audit) {
    this.users = users;
    this.registry = registry;
    this.audit = audit;
  }

  public List<UserDao.Account> accounts(AuthUser caller) {
    requireAdmin(caller);
    return users.findAccounts();
  }

  public Change setEnabled(AuthUser caller, long userId, boolean enabled, String ip) {
    requireAdmin(caller);
    if (userId == caller.getId()) return Change.OWN_ACCOUNT;
    if (!users.setEnabled(userId, enabled)) return Change.NOT_FOUND;
    registry.refresh();
    audit.record(enabled ? "USER_ENABLED" : "USER_DISABLED", caller.getUsername(), ip, "user " + userId);
    return Change.DONE;
  }

  /** IllegalArgumentException for a role outside the allow-list (the controller validates first: a 400). */
  public Change changeRole(AuthUser caller, long userId, String role, String ip) {
    requireAdmin(caller);
    if (!ROLES.contains(role)) throw new IllegalArgumentException("Unknown role");
    if (userId == caller.getId()) return Change.OWN_ACCOUNT;
    if (!users.setRole(userId, role)) return Change.NOT_FOUND;
    registry.refresh();
    audit.record("ROLE_CHANGED", caller.getUsername(), ip, "user " + userId + " → " + role);
    return Change.DONE;
  }

  private static void requireAdmin(AuthUser caller) {
    if (caller == null || !caller.isAdmin()) throw new AccessDeniedException("user administration");
  }
}
