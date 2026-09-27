package com.taskflow.web;

import javax.servlet.http.HttpServletRequest;

/**
 * S41 (41.17): the one place that decides whether a user-supplied redirect target is acceptable (the login's
 * returnUrl, the theme switch's returnTo). Only paths INSIDE this application; anything else → the fallback.
 * An absolute URL (https://evil.example), a protocol-relative one (//evil.example), a backslash trick (/\evil.example)
 * or a header-injection attempt (CR/LF) is refused (24.14, 41.16).
 */
public final class Redirects {

  private Redirects() {}

  public static String safeLocalPath(HttpServletRequest request, String target, String fallback) {
    String appRoot = request.getContextPath() + "/";
    if (target == null || !target.startsWith(appRoot)) return fallback;
    if (target.startsWith("//") || target.contains("\\") || target.contains("\r") || target.contains("\n")) return fallback;
    return target;
  }
}
