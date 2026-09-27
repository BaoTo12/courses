package com.taskflow.model;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;

/**
 * PROVIDED (S34): a user as the VIEWS see one (db/02-schema.sql: users), WITHOUT the password hash:
 * the column isn't mapped, so it can't leak through a page or a JSON response. S38 adds login.
 * ${details.owner.displayName} → getDisplayName() (34.07). S36: also a JPA entity (PROVIDED mapping, read-only).
 */
@Entity
@Table(name = "users")
public class User {

  @Id
  private long id;
  private String username;
  @Column(name = "display_name")
  private String displayName;
  private String role;

  protected User() {} // for JPA

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
