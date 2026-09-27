package com.taskflow.security;

/**
 * S51: the caller may SEE this task (it's shared with them) but not change it. Unlike a plain AccessDeniedException
 * (answered 404: "no such task"), this one is answered 403: hiding a task the user can already open would only confuse.
 */
public class ReadOnlyException extends AccessDeniedException {

  public ReadOnlyException(String details) {
    super(details);
  }
}
