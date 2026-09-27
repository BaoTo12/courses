package com.taskflow.service;

import com.taskflow.dao.CategoryDao;
import com.taskflow.model.Category;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * S38 (38.06): the categories, cached for the whole application (application scope).
 * Categories are read on almost every page and change rarely: loading them once and refreshing only when they change
 * saves a query per page. Thread safety: the list is an IMMUTABLE snapshot in a volatile field; a refresh builds a new
 * list and replaces the reference in one step, so readers see either the old list or the new one, never a half-built one.
 */
public class CategoryCatalog {

  private final CategoryDao dao;
  private volatile List<Category> categories;

  public CategoryCatalog(CategoryDao dao) {
    this.dao = dao;
    this.categories = List.copyOf(dao.findAll()); // loaded at startup
  }

  public List<Category> all() {
    return categories;
  }

  public Set<Long> ids() {
    return categories.stream().map(Category::getId).collect(Collectors.toUnmodifiableSet());
  }

  public Optional<Category> byId(long id) {
    return categories.stream().filter(c -> c.getId() == id).findFirst();
  }

  /** After any change to the categories table (CategoryService calls it). */
  public void refresh() {
    categories = List.copyOf(dao.findAll());
  }
}
