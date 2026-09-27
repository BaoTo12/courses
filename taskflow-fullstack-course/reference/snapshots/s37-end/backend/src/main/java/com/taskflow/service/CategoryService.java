package com.taskflow.service;

import com.taskflow.dao.CategoryDao;
import com.taskflow.model.Category;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * S37 (37.15): category management. The rule it owns: a category that tasks still use can't be deleted.
 * (The schema would allow it, setting their category to NULL; the business decided otherwise.)
 * create/rename throw DuplicateKeyException when the name is taken (case-insensitively).
 */
public class CategoryService {

  public enum DeleteResult { DELETED, NOT_FOUND, IN_USE }

  private final CategoryDao categories;

  public CategoryService(CategoryDao categories) {
    this.categories = categories;
  }

  public List<Category> list() {
    return categories.findAll();
  }

  public Optional<Category> find(long id) {
    return categories.findById(id);
  }

  /** Task count per category id (absent = 0). */
  public Map<Long, Integer> taskCounts() {
    return categories.countTasksByCategory();
  }

  public Category create(String name, String color) {
    return categories.insert(name, color);
  }

  public boolean rename(long id, String name, String color) {
    return categories.update(id, name, color);
  }

  public DeleteResult delete(long id) {
    if (categories.findById(id).isEmpty()) return DeleteResult.NOT_FOUND;
    if (taskCounts().getOrDefault(id, 0) > 0) return DeleteResult.IN_USE;
    return categories.delete(id) ? DeleteResult.DELETED : DeleteResult.NOT_FOUND;
  }
}
