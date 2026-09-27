package com.taskflow.service;

import com.taskflow.security.AuthUser;

/**
 * S51: something happened to a task, published by TaskService to its listeners (the observer pattern, like the
 * Servlet API's listeners in 45.07). ActivityRecorder turns them into the activity feed; others could send mails.
 */
public record TaskEvent(Type type, AuthUser actor, long taskId, String title) {

  public enum Type { TASK_CREATED, TASK_UPDATED, TASK_DELETED, COMMENT_ADDED, TASK_SHARED, TASK_UNSHARED }

  /** Receives events on the thread of the request that caused them: keep it quick, and never throw. */
  @FunctionalInterface
  public interface Listener {
    void onTaskEvent(TaskEvent event);
  }
}
