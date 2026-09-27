package com.taskflow.web.tags;

/**
 * S44 (44.14): static methods exposed to EL as functions through taskflow.tld: ${tf:truncate(task.title, 40)}.
 * EL functions return values; the page still escapes them (<c:out>).
 */
public final class Functions {

  private Functions() {}

  /** At most `max` characters; longer texts are cut and end with "…". Null stays null. */
  public static String truncate(String text, int max) {
    if (text == null || text.length() <= max) return text;
    return text.substring(0, Math.max(0, max - 1)).stripTrailing() + "…";
  }
}
