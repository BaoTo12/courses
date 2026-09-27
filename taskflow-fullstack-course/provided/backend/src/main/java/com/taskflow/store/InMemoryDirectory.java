package com.taskflow.store;

import com.taskflow.model.Category;
import com.taskflow.model.User;
import java.util.Map;
import java.util.Optional;

/**
 * PROVIDED (S34): the users and categories of db/03-seed.sql, in memory and read-only,
 * until S36 reads them from MySQL (UserDao, CategoryDao).
 */
public final class InMemoryDirectory {

  private static final InMemoryDirectory SHARED = new InMemoryDirectory();

  private final Map<Long, User> users = Map.of(
      1L, new User(1, "alice", "Alice Nguyen", "USER"),
      2L, new User(2, "bob", "Bob Tran", "USER"),
      3L, new User(3, "admin", "Admin", "ADMIN"));

  private final Map<Long, Category> categories = Map.of(
      1L, new Category(1, "Work", "#2563eb"),
      2L, new Category(2, "Engineering", "#7c3aed"),
      3L, new Category(3, "Team", "#059669"),
      4L, new Category(4, "Personal", "#d97706"));

  public static InMemoryDirectory shared() {
    return SHARED;
  }

  public Optional<User> findUser(long id) {
    return Optional.ofNullable(users.get(id));
  }

  public Optional<Category> findCategory(long id) {
    return Optional.ofNullable(categories.get(id));
  }
}
