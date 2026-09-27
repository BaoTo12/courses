package com.taskflow.dao;

import com.taskflow.model.Priority;
import com.taskflow.model.TaskStatus;

/**
 * S36: what the task list asks for. Every field is already PARSED and VALIDATED (by the controller): a status enum,
 * a trimmed search text or null, a category id or null, a sort constant. The DAO turns it into SQL with parameters.
 * 36.11 (Your Turn) added categoryId and sort. S42: ownerId (null = every owner), set by TaskService, never by a request.
 * S44: descending (?dir=desc) for the sortable column headers (44.16). S46: priority (the JSON API's ?priority=).
 */
public record TaskFilter(TaskStatus status, Priority priority, String text, Long categoryId, TaskSort sort,
                         boolean descending, Long ownerId) {

  public TaskFilter {
    if (sort == null) sort = TaskSort.ID;
  }

  public TaskFilter(TaskStatus status, String text, Long categoryId, TaskSort sort) {
    this(status, null, text, categoryId, sort, false, null);
  }

  public TaskFilter(TaskStatus status, String text, Long categoryId, TaskSort sort, Long ownerId) {
    this(status, null, text, categoryId, sort, false, ownerId);
  }

  public static TaskFilter all() {
    return new TaskFilter(null, null, null, TaskSort.ID);
  }

  /** The same filter, restricted to one owner (or to none: null). */
  public TaskFilter withOwner(Long owner) {
    return new TaskFilter(status, priority, text, categoryId, sort, descending, owner);
  }
}
