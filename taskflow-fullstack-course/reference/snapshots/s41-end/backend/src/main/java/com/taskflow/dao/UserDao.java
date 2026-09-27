package com.taskflow.dao;

import com.taskflow.model.User;
import java.util.List;
import java.util.Optional;
import javax.persistence.EntityManagerFactory;

/**
 * PROVIDED (S36): users as the views see them (the User entity doesn't map password_hash).
 * S41: findCredentials, the ONE query that reads a password hash, used only by the login check.
 */
public class UserDao extends JpaDao {

  /** What the login check needs: never put this object in a session, a request attribute or a view. */
  public record Credentials(User user, String passwordHash, boolean enabled) {}

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
      boolean enabled = row[5] instanceof Boolean ? (Boolean) row[5] : ((Number) row[5]).intValue() != 0;
      return Optional.of(new Credentials(user, (String) row[4], enabled));
    });
  }
}
