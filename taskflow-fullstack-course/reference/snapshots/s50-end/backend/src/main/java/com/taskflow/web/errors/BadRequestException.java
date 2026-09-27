package com.taskflow.web.errors;

/**
 * S43 (43.12): the request itself is malformed ("id=abc") → 400. The message IS shown to the user (errors/400.jsp),
 * so it must be a fixed text written by us, never built from the input or from an exception.
 */
public class BadRequestException extends RuntimeException {

  public BadRequestException(String userMessage) {
    super(userMessage);
  }
}
