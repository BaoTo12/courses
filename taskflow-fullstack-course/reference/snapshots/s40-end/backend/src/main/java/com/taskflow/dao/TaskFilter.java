package com.taskflow.dao;

import com.taskflow.model.TaskStatus;

/**
 * S36: what the task list asks for. Every field is already PARSED and VALIDATED (by the controller): a status enum,
 * a trimmed search text or null, a category id or null, a sort constant. The DAO turns it into SQL with parameters.
 * 36.11 (Your Turn) added categoryId and sort.
 */
public record TaskFilter(TaskStatus status, String text, Long categoryId, TaskSort sort) {

  public TaskFilter {
    if (sort == null) sort = TaskSort.ID;
  }

  public static TaskFilter all() {
    return new TaskFilter(null, null, null, TaskSort.ID);
  }
}
