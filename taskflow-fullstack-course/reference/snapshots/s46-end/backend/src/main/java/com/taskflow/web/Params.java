package com.taskflow.web;

import com.taskflow.web.errors.BadRequestException;
import javax.servlet.http.HttpServletRequest;

/**
 * S31 (31.03, 31.16): turning untrusted String parameters into typed values WITHOUT exceptions escaping.
 * `Long.parseLong("abc")` throws NumberFormatException → an uncaught 500 error page. Here: null = invalid.
 * S43 (43.12): requiredId, for parameters without which the request makes no sense → 400 with a fixed message.
 */
public final class Params {

  private Params() {}

  /** A positive id ("42"), or null for null, "", "abc", "-1", "0", "9999999999999999999". */
  public static Long positiveId(String raw) {
    if (raw == null || raw.isBlank()) return null;
    try {
      long id = Long.parseLong(raw.trim());
      return id > 0 ? id : null;
    } catch (NumberFormatException e) {
      return null;
    }
  }

  /** The positive id in this parameter, or BadRequestException (→ 400 page). The message names the parameter, never echoes its value. */
  public static long requiredId(HttpServletRequest request, String name) {
    Long id = positiveId(request.getParameter(name));
    if (id == null) throw new BadRequestException("Parameter '" + name + "' must be a positive number.");
    return id;
  }
}
