package com.taskflow.web.errors;

/**
 * S43 (43.08): "there's nothing here" → 404. Thrown by a controller when the service answered empty:
 *   service.details(id, user).orElseThrow(NotFoundException::new)
 * ErrorHandlingFilter turns it into sendError(404) → the container shows errors/404.jsp.
 */
public class NotFoundException extends RuntimeException {

  public NotFoundException() {
    super("Not found");
  }
}
