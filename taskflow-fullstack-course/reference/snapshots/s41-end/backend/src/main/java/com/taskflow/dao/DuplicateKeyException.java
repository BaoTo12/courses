package com.taskflow.dao;

/** PROVIDED (S36): a UNIQUE constraint said no (a task title already used by the owner, a category name taken). */
public class DuplicateKeyException extends DaoException {

  public DuplicateKeyException(String message, Throwable cause) {
    super(message, cause);
  }
}
