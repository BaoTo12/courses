package com.taskflow.dao;

import com.taskflow.model.User;
import java.util.List;
import java.util.Optional;
import javax.persistence.EntityManagerFactory;

/**
 * PROVIDED (S36): users as the views see them (the User entity doesn't map password_hash).
 * S41: findCredentials, the ONE query that reads a password hash, used only by the login check.
 * S42: accounts for the admin pages (no hash), and the two changes an admin can make: enabled, role.
 */
public class UserDao extends JpaDao {

  /** What the login check needs: never put this object in a session, a request attribute or a view. */
  public record Credentials(User user, String passwordHash, boolean enabled) {}

  /** S42: a user as the admin pages see one. JavaBean-style getters so EL can read it (${account.username}). */
  public record Account(long id, String username, String email, String displayName, String role, boolean enabled) {
    public long getId() { return id; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public String getDisplayName() { return displayName; }
    public String getRole() { return role; }
    public boolean isEnabled() { return enabled; }
    public boolean isAdmin() { return "ADMIN".equals(role); }
  }

  public UserDao(EntityManagerFactory entityManagerFactory) {
    super(entityManagerFactory);
  }

  public Optional<User> findById(long id) {
    return read(em -> Optional.ofNullable(em.find(User.class, id)));
  }

  public Optional<Credentials> findCredentials(String username) {
    return read(em -> {
      @SuppressWarnings("unchecked")
      List<Object[]> rows = em.createNativeQuery(
              "SELECT id, username, display_name, role, password_hash, enabled FROM users WHERE username = ?1")
          .setParameter(1, username)
          .getResultList();
      if (rows.isEmpty()) return Optional.empty();
      Object[] row = rows.get(0);
      User user = new User(((Number) row[0]).longValue(), (String) row[1], (String) row[2], (String) row[3]);
      return Optional.of(new Credentials(user, (String) row[4], bool(row[5])));
    });
  }

  /** S42: every account, by username. */
  public List<Account> findAccounts() {
    return read(em -> {
      @SuppressWarnings("unchecked")
      List<Object[]> rows = em.createNativeQuery(
              "SELECT id, username, email, display_name, role, enabled FROM users ORDER BY username")
          .getResultList();
      return rows.stream().map(row -> new Account(((Number) row[0]).longValue(), (String) row[1], (String) row[2],
          (String) row[3], (String) row[4], bool(row[5]))).toList();
    });
  }

  /** S42: false if there's no such user. */
  public boolean setEnabled(long id, boolean enabled) {
    return write(em -> em.createNativeQuery("UPDATE users SET enabled = ?1 WHERE id = ?2")
        .setParameter(1, enabled).setParameter(2, id).executeUpdate() == 1);
  }

  /** S42: false if there's no such user. The role must already be validated (USER or ADMIN). */
  public boolean setRole(long id, String role) {
    return write(em -> em.createNativeQuery("UPDATE users SET role = ?1 WHERE id = ?2")
        .setParameter(1, role).setParameter(2, id).executeUpdate() == 1);
  }

  private static boolean bool(Object value) {
    return value instanceof Boolean b ? b : ((Number) value).intValue() != 0;
  }
}
