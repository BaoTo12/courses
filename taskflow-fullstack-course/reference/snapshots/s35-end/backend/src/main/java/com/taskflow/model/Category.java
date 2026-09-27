package com.taskflow.model;

/**
 * PROVIDED (S34): a task category (db/02-schema.sql: categories). Read-only: a constructor and getters.
 * That's enough for EL, which only ever calls PUBLIC GETTERS: ${details.category.name} → getName() (34.07).
 */
public class Category {

  private final long id;
  private final String name;
  private final String color;

  public Category(long id, String name, String color) {
    this.id = id;
    this.name = name;
    this.color = color;
  }

  public long getId() { return id; }
  public String getName() { return name; }
  public String getColor() { return color; }
}
