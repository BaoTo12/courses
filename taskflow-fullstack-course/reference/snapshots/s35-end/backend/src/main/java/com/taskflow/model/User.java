package com.taskflow.model;

/**
 * PROVIDED (S34): a user as the VIEWS see one (db/02-schema.sql: users), without the password hash.
 * S38 adds login; S36 loads users from MySQL. ${details.owner.displayName} → getDisplayName() (34.07).
 */
public class User {

  private final long id;
  private final String username;
  private final String displayName;
  private final String role;

  public User(long id, String username, String displayName, String role) {
    this.id = id;
    this.username = username;
    this.displayName = displayName;
    this.role = role;
  }

  public long getId() { return id; }
  public String getUsername() { return username; }
  public String getDisplayName() { return displayName; }
  public String getRole() { return role; }
  public boolean isAdmin() { return "ADMIN".equals(role); } // a boolean property: ${user.admin} (34.07)
}
