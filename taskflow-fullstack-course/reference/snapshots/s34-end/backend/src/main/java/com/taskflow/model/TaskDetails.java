package com.taskflow.model;

/**
 * S34 (34.09): everything the details page shows, as ONE object for the view.
 * ${details.task.title} · ${details.category.name} · ${details.owner.displayName}.
 * category is null for a task without one, owner is null for an unknown user: EL walks a null chain
 * without an exception and prints nothing (34.08), and the view decides what to show instead with `empty`.
 */
public class TaskDetails {

  private final Task task;
  private final Category category;
  private final User owner;

  public TaskDetails(Task task, Category category, User owner) {
    this.task = task;
    this.category = category;
    this.owner = owner;
  }

  public Task getTask() { return task; }
  public Category getCategory() { return category; }
  public User getOwner() { return owner; }
}
