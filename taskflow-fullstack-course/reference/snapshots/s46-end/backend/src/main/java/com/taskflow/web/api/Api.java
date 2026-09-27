package com.taskflow.web.api;

import javax.servlet.http.HttpServletRequest;

/**
 * S46: "is this request for the JSON API?", decided from the path the CONTAINER mapped: servletPath + pathInfo,
 * both decoded and normalised. Never from getRequestURI(), which is raw: /taskflow/api/../tasks/delete starts with
 * /api/ but is mapped to /tasks/delete, so a check on it could exempt a page URL from the page rules (40.18).
 */
public final class Api {

  private Api() {}

  /** The application-relative, normalised path: "/api/tasks/5". */
  public static String path(HttpServletRequest request) {
    String pathInfo = request.getPathInfo();
    return request.getServletPath() + (pathInfo == null ? "" : pathInfo);
  }

  public static boolean isApiRequest(HttpServletRequest request) {
    String path = path(request);
    return path.equals("/api") || path.startsWith("/api/");
  }
}
