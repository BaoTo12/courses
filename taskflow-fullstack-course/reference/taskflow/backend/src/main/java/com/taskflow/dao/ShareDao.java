package com.taskflow.dao;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import javax.persistence.EntityManagerFactory;

/** PROVIDED (S51): task_shares (db/05-task-shares.sql): who may SEE a task they don't own. Native queries, parameters only. */
public class ShareDao extends JpaDao {

  /** One recipient of a share, as the views and the API show it. */
  public record Share(long userId, String username, String displayName) {
    public long getUserId() { return userId; }
    public String getUsername() { return username; }
    public String getDisplayName() { return displayName; }
  }

  public ShareDao(EntityManagerFactory entityManagerFactory) {
    super(entityManagerFactory);
  }

  public List<Share> findByTask(long taskId) {
    return read(em -> {
      @SuppressWarnings("unchecked")
      List<Object[]> rows = em.createNativeQuery("SELECT u.id, u.username, u.display_name FROM task_shares s"
              + " JOIN users u ON u.id = s.user_id WHERE s.task_id = ?1 ORDER BY u.username")
          .setParameter(1, taskId).getResultList();
      return rows.stream().map(r -> new Share(((Number) r[0]).longValue(), (String) r[1], (String) r[2])).toList();
    });
  }

  /** The ids of every task shared with this user. */
  public Set<Long> taskIdsSharedWith(long userId) {
    return read(em -> {
      @SuppressWarnings("unchecked")
      List<Number> ids = em.createNativeQuery("SELECT task_id FROM task_shares WHERE user_id = ?1")
          .setParameter(1, userId).getResultList();
      Set<Long> result = new HashSet<>();
      ids.forEach(id -> result.add(id.longValue()));
      return result;
    });
  }

  public boolean isShared(long taskId, long userId) {
    return read(em -> ((Number) em.createNativeQuery("SELECT COUNT(*) FROM task_shares WHERE task_id = ?1 AND user_id = ?2")
        .setParameter(1, taskId).setParameter(2, userId).getSingleResult()).intValue() > 0);
  }

  /** False if it was already shared (the primary key). */
  public boolean insert(long taskId, long userId) {
    try {
      return write(em -> em.createNativeQuery("INSERT INTO task_shares (task_id, user_id) VALUES (?1, ?2)")
          .setParameter(1, taskId).setParameter(2, userId).executeUpdate() == 1);
    } catch (DuplicateKeyException e) {
      return false;
    }
  }

  public boolean delete(long taskId, long userId) {
    return write(em -> em.createNativeQuery("DELETE FROM task_shares WHERE task_id = ?1 AND user_id = ?2")
        .setParameter(1, taskId).setParameter(2, userId).executeUpdate() == 1);
  }
}
