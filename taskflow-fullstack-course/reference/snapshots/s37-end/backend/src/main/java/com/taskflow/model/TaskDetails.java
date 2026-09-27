package com.taskflow.model;

import java.util.List;

/**
 * S34 (34.09): everything the details page shows, as ONE object for the view.
 * ${details.task.title} · ${details.category.name} · ${details.owner.displayName}.
 * category is null for a task without one, owner is null for an unknown user: EL walks a null chain
 * without an exception and prints nothing (34.08), and the view decides what to show instead with `empty`.
 * S35 (35.18): plus the task's comments, each with its author.
 */
public class TaskDetails {

  private final Task task;
  private final Category category;
  private final User owner;
  private final List<CommentDetails> comments;

  public TaskDetails(Task task, Category category, User owner, List<CommentDetails> comments) {
    this.task = task;
    this.category = category;
    this.owner = owner;
    this.comments = List.copyOf(comments);
  }

  public Task getTask() { return task; }
  public Category getCategory() { return category; }
  public User getOwner() { return owner; }
  public List<CommentDetails> getComments() { return comments; }
}
