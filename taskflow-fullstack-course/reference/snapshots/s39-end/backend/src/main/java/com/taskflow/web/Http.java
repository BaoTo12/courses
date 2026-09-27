package com.taskflow.web;

import javax.servlet.http.HttpServletResponse;

/** S37 (37.08): small HTTP helpers for controllers. */
public final class Http {

  private Http() {}

  /**
   * 303 See Other: "done; now GET the result over there". The status made for Post/Redirect/Get: unlike 302,
   * its meaning is unambiguous, so the next request is always a GET, whatever the first method was.
   */
  public static void seeOther(HttpServletResponse response, String location) {
    response.setStatus(HttpServletResponse.SC_SEE_OTHER);
    response.setHeader("Location", location);
  }
}
