package com.taskflow.dao;

import java.sql.SQLException;

/**
 * PROVIDED (S36): a database failure, as an UNCHECKED exception. Controllers can't do anything useful with it:
 * it becomes a 500 (S43: an error page). The one failure callers CAN handle is a duplicate: DuplicateKeyException.
 */
public class DaoException extends RuntimeException {

  public DaoException(String message, Throwable cause) {
    super(message, cause);
  }

  /** Wraps a JPA/Hibernate exception; a MySQL "duplicate entry" (error 1062) becomes a DuplicateKeyException. */
  static DaoException from(RuntimeException e) {
    for (Throwable cause = e; cause != null; cause = cause.getCause()) {
      if (cause instanceof SQLException && ((SQLException) cause).getErrorCode() == 1062) {
        return new DuplicateKeyException(cause.getMessage(), e);
      }
    }
    return new DaoException("Database operation failed", e);
  }
}
