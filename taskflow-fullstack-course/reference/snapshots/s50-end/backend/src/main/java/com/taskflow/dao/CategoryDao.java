package com.taskflow.dao;

import com.taskflow.model.Category;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import javax.persistence.EntityManagerFactory;

/** PROVIDED (S36): categories in MySQL, through JPA. */
public class CategoryDao extends JpaDao {

  public CategoryDao(EntityManagerFactory entityManagerFactory) {
    super(entityManagerFactory);
  }

  public List<Category> findAll() {
    return read(em -> em.createQuery("select c from Category c order by c.name", Category.class).getResultList());
  }

  public Optional<Category> findById(long id) {
    return read(em -> Optional.ofNullable(em.find(Category.class, id)));
  }

  /** Task count per category id (categories without tasks are absent). */
  public Map<Long, Integer> countTasksByCategory() {
    return read(em -> {
      Map<Long, Integer> counts = new HashMap<>();
      List<Object[]> rows = em.createQuery(
              "select t.categoryId, count(t) from Task t where t.categoryId is not null group by t.categoryId", Object[].class)
          .getResultList();
      for (Object[] row : rows) counts.put((Long) row[0], ((Long) row[1]).intValue());
      return counts;
    });
  }

  /** Inserts a category. DuplicateKeyException if the name is taken (case-insensitively: the _ci collation). */
  public Category insert(String name, String color) {
    return write(em -> {
      Category category = new Category(0, name, color);
      em.persist(category);
      em.flush();
      return category;
    });
  }

  /** Renames / recolours. False if it doesn't exist. DuplicateKeyException if the name is taken. */
  public boolean update(long id, String name, String color) {
    return write(em -> {
      Category category = em.find(Category.class, id);
      if (category == null) return false;
      category.setName(name);
      category.setColor(color);
      em.flush();
      return true;
    });
  }

  public boolean delete(long id) {
    return write(em -> {
      Category category = em.find(Category.class, id);
      if (category == null) return false;
      em.remove(category);
      return true;
    });
  }
}
