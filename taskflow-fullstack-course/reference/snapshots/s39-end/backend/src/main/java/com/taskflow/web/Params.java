package com.taskflow.web;

/**
 * S31 (31.03, 31.16): turning untrusted String parameters into typed values WITHOUT exceptions escaping.
 * `Long.parseLong("abc")` throws NumberFormatException → an uncaught 500 error page. Here: null = invalid.
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
}
