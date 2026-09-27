package com.taskflow.model;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;

/**
 * PROVIDED (S34): a task category (db/02-schema.sql: categories). EL only ever calls PUBLIC GETTERS:
 * ${details.category.name} → getName() (34.07). S36: also a JPA entity (PROVIDED mapping).
 */
@Entity
@Table(name = "categories")
public class Category {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long id;
  private String name;
  private String color;

  protected Category() {} // for JPA

  public Category(long id, String name, String color) {
    this.id = id;
    this.name = name;
    this.color = color;
  }

  public long getId() { return id; }
  public String getName() { return name; }
  public String getColor() { return color; }
  public void setName(String name) { this.name = name; }
  public void setColor(String color) { this.color = color; }
}
