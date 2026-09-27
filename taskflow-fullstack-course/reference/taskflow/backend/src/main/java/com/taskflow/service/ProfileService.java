package com.taskflow.service;

import com.taskflow.dao.UserDao;
import com.taskflow.security.AuthUser;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * S51: a user changes THEIR OWN profile: display name and language. Only these two fields exist here: the role, the
 * username and "enabled" can't be reached from this service, whatever a form or JSON body contains (42.08, 46.10).
 * The theme is a cookie only (no database column): the controllers write it.
 */
public class ProfileService {

  public static final List<String> LOCALES = List.of("en", "vi");
  public static final int DISPLAY_NAME_MAX = 100;

  /** Either field errors (keyed like the form/JSON fields) or the updated user for the session. */
  public record Result(Map<String, String> errors, AuthUser user) {}

  private final UserDao users;
  private final AuditService audit;

  public ProfileService(UserDao users, AuditService audit) {
    this.users = users;
    this.audit = audit;
  }

  public Result update(AuthUser caller, String displayName, String locale, String ip) {
    Map<String, String> errors = new LinkedHashMap<>();
    String name = displayName == null ? "" : displayName.strip();
    if (name.isEmpty()) errors.put("displayName", "must not be blank");
    else if (name.length() > DISPLAY_NAME_MAX) errors.put("displayName", "size must be at most " + DISPLAY_NAME_MAX);
    if (!LOCALES.contains(locale)) errors.put("locale", "must be one of en, vi");
    if (!errors.isEmpty()) return new Result(errors, caller);
    users.updateProfile(caller.getId(), name, locale);
    audit.record("PROFILE_UPDATED", caller.getUsername(), ip, null);
    return new Result(Map.of(), caller.withDisplayName(name));
  }
}
