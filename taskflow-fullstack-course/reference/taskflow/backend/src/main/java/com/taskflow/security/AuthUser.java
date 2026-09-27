package com.taskflow.security;

import java.io.Serializable;

/**
 * S41 (41.07): the logged-in user, as kept in the SESSION: small, serialisable (38.03), no secrets (38.09).
 * Never the password hash, never the whole database row.
 */
public final class AuthUser implements Serializable {

  private static final long serialVersionUID = 1L;

  private final long id;
  private final String username;
  private final String displayName;
  private final String role;

  public AuthUser(long id, String username, String displayName, String role) {
    this.id = id;
    this.username = username;
    this.displayName = displayName;
    this.role = role;
  }

  public long getId() { return id; }
  public String getUsername() { return username; }
  public String getDisplayName() { return displayName; }
  public String getRole() { return role; }
  public boolean isAdmin() { return "ADMIN".equals(role); }

  /** S42: the same user with another role (an admin changed it while this session was open). */
  public AuthUser withRole(String newRole) {
    return new AuthUser(id, username, displayName, newRole);
  }

  /** S51: the same user after a profile change. */
  public AuthUser withDisplayName(String newDisplayName) {
    return new AuthUser(id, username, newDisplayName, role);
  }
}
