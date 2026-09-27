package com.taskflow.dao;

import com.taskflow.model.Task;
import com.taskflow.model.TaskStatus;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.OptionalLong;
import javax.persistence.EntityManagerFactory;
import javax.persistence.TypedQuery;

/**
 * PROVIDED (S36): tasks in MySQL, through JPA. Every value is a query PARAMETER (:status, :text, …), never
 * concatenated into the query text; the only variable query text is the sort, taken from the TaskSort allow-list.
 */
public class TaskDao extends JpaDao {

  public TaskDao(EntityManagerFactory entityManagerFactory) {
    super(entityManagerFactory);
  }

  public List<Task> find(TaskFilter filter) {
    return read(em -> {
      StringBuilder jpql = new StringBuilder("select t from Task t where 1 = 1");
      if (filter.status() != null) jpql.append(" and t.status = :status");
      if (filter.text() != null) jpql.append(" and t.title like :text escape '!'");
      if (filter.categoryId() != null) jpql.append(" and t.categoryId = :categoryId");
      jpql.append(" order by ").append(filter.sort().orderBy());

      TypedQuery<Task> query = em.createQuery(jpql.toString(), Task.class);
      if (filter.status() != null) query.setParameter("status", filter.status());
      if (filter.text() != null) query.setParameter("text", "%" + escapeLike(filter.text()) + "%");
      if (filter.categoryId() != null) query.setParameter("categoryId", filter.categoryId());
      return query.getResultList();
    });
  }

  public Optional<Task> findById(long id) {
    return read(em -> Optional.ofNullable(em.find(Task.class, id)));
  }

  /** Inserts a new task and returns it as stored (with its id and timestamps). DuplicateKeyException: title taken. */
  public Task insert(Task task) {
    return write(em -> {
      em.persist(task);
      em.flush();
      em.refresh(task); // read back the columns MySQL filled in (created_at, updated_at)
      return task;
    });
  }

  /** Saves the fields of an existing task. False if it no longer exists. DuplicateKeyException: title taken. */
  public boolean update(Task task) {
    return write(em -> {
      if (em.find(Task.class, task.getId()) == null) return false;
      em.merge(task);
      em.flush();
      return true;
    });
  }

  public boolean updateStatus(long id, TaskStatus status) {
    return write(em -> {
      Task task = em.find(Task.class, id);
      if (task == null) return false;
      task.setStatus(status);
      return true;
    });
  }

  public boolean delete(long id) {
    return write(em -> {
      Task task = em.find(Task.class, id);
      if (task == null) return false;
      em.remove(task);   // its comments go too (ON DELETE CASCADE in the schema)
      return true;
    });
  }

  /** How many tasks have each status (every status present, 0 included). */
  public Map<TaskStatus, Integer> countByStatus() {
    return read(em -> {
      Map<TaskStatus, Integer> counts = new EnumMap<>(TaskStatus.class);
      for (TaskStatus status : TaskStatus.values()) counts.put(status, 0);
      List<Object[]> rows = em.createQuery("select t.status, count(t) from Task t group by t.status", Object[].class)
          .getResultList();
      for (Object[] row : rows) counts.put((TaskStatus) row[0], ((Long) row[1]).intValue());
      return counts;
    });
  }

  public OptionalLong latestId() {
    return read(em -> {
      Long id = em.createQuery("select max(t.id) from Task t", Long.class).getSingleResult();
      return id == null ? OptionalLong.empty() : OptionalLong.of(id);
    });
  }

  /** In LIKE, % and _ are wildcards: a search for "100%" must match the text "100%", not everything (36.09). */
  static String escapeLike(String text) {
    return text.replace("!", "!!").replace("%", "!%").replace("_", "!_");
  }
}
