package com.taskflow.model;

import java.time.Instant;
import java.time.LocalDate;

/**
 * PROVIDED (S31): a task, as a mutable JavaBean (a no-arg constructor, getters and setters).
 * Why this shape, and why getters matter for JSP's Expression Language, is S34's topic.
 * The store hands out COPIES, so callers can't change stored tasks behind its back.
 */
public class Task {

  private long id;
  private String title;
  private String description = "";
  private TaskStatus status = TaskStatus.TODO;
  private Priority priority = Priority.MEDIUM;
  private LocalDate dueDate;
  private Long categoryId;
  private long ownerId;
  private Instant createdAt;
  private Instant updatedAt;

  public Task() {}

  /** A copy (the store never shares its own objects). */
  public Task copy() {
    Task t = new Task();
    t.id = id;
    t.title = title;
    t.description = description;
    t.status = status;
    t.priority = priority;
    t.dueDate = dueDate;
    t.categoryId = categoryId;
    t.ownerId = ownerId;
    t.createdAt = createdAt;
    t.updatedAt = updatedAt;
    return t;
  }

  public long getId() { return id; }
  public void setId(long id) { this.id = id; }
  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public TaskStatus getStatus() { return status; }
  public void setStatus(TaskStatus status) { this.status = status; }
  public Priority getPriority() { return priority; }
  public void setPriority(Priority priority) { this.priority = priority; }
  public LocalDate getDueDate() { return dueDate; }
  public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
  public Long getCategoryId() { return categoryId; }
  public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }
  public long getOwnerId() { return ownerId; }
  public void setOwnerId(long ownerId) { this.ownerId = ownerId; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

  /** Convenience for views: is it done? (EL reads it as ${task.done}, S34.) */
  public boolean isDone() { return status == TaskStatus.DONE; }
}
