package com.taskflow.web.api;

import java.util.Map;
import javax.servlet.http.HttpServletRequest;

/**
 * S46 (46.08): an API outcome that isn't a success, thrown from anywhere in an API servlet and turned into the
 * standard error JSON by ApiExceptionFilter. The code ("VALIDATION_FAILED") is for programs; the message for people.
 */
public class ApiException extends RuntimeException {

  private final int status;
  private final String code;
  private final Map<String, String> fieldErrors;

  public ApiException(int status, String code, String message, Map<String, String> fieldErrors) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  public int status() { return status; }
  public String code() { return code; }
  public Map<String, String> fieldErrors() { return fieldErrors; }

  public static ApiException validation(Map<String, String> fieldErrors) {
    return new ApiException(400, "VALIDATION_FAILED", "Request contains invalid fields", fieldErrors);
  }

  public static ApiException badRequest(String message) {
    return new ApiException(400, "VALIDATION_FAILED", message, null);
  }

  public static ApiException malformedJson() {
    return new ApiException(400, "MALFORMED_JSON", "Request body is not valid JSON", null);
  }

  public static ApiException unsupportedMediaType() {
    return new ApiException(415, "UNSUPPORTED_MEDIA_TYPE", "Send the request body as application/json", null);
  }

  public static ApiException notFound(String message) {
    return new ApiException(404, "NOT_FOUND", message, null);
  }

  public static ApiException noEndpoint(HttpServletRequest request) {
    return notFound("No endpoint " + request.getMethod() + " " + Api.path(request));
  }

  public static ApiException unauthenticated() {
    return new ApiException(401, "UNAUTHENTICATED", "Not logged in", null);
  }

  /** S47: the same answer for an unknown user and a wrong password (41.14). */
  public static ApiException badCredentials() {
    return new ApiException(401, "BAD_CREDENTIALS", "Invalid username or password", null);
  }

  public static ApiException csrfInvalid() {
    return new ApiException(403, "CSRF_TOKEN_INVALID", "Missing or invalid CSRF token", null);
  }

  /** S47 (47.12): the caller must also set Retry-After before throwing. */
  public static ApiException tooManyRequests() {
    return new ApiException(429, "TOO_MANY_REQUESTS", "Too many failed attempts. Please try again later.", null);
  }
}
