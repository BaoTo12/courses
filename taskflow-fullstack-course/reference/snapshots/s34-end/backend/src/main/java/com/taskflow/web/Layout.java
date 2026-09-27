package com.taskflow.web;

import java.io.IOException;
import java.io.PrintWriter;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S31 (31.01): the page frame every println-servlet repeats: doctype, CSS, header, nav, footer.
 * Even factored out, HTML inside Java strings is painful: quotes to escape, no syntax highlighting, designers
 * can't touch it. That pain is the reason for JSP (S32).
 */
public final class Layout {

  private Layout() {}

  /** Sets the content type (charset FIRST, 30.17), writes the top of the page, returns the writer. */
  public static PrintWriter begin(HttpServletRequest request, HttpServletResponse response, String title) throws IOException {
    response.setContentType("text/html;charset=UTF-8");
    PrintWriter out = response.getWriter();
    String ctx = request.getContextPath(); // absolute links that survive any context path (28.10, 31.11)
    out.println("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">");
    out.println("<title>" + Html.escape(title) + " · TaskFlow Admin</title>");
    out.println("<link rel=\"stylesheet\" href=\"" + ctx + "/static/css/app.css\"></head><body><div class=\"page\">");
    out.println("<header class=\"page__header\"><span class=\"page__brand\">TaskFlow Admin</span>");
    out.println("<nav class=\"page__nav\"><a class=\"page__nav-link\" href=\"" + ctx + "/tasks\">Tasks</a>"
        + " <a class=\"page__nav-link\" href=\"" + ctx + "/tasks/new\">New task</a></nav></header>");
    out.println("<main class=\"page__main\"><h1 class=\"page__title\">" + Html.escape(title) + "</h1>");
    return out;
  }

  public static void end(PrintWriter out) {
    out.println("</main><footer class=\"page__footer\">TaskFlow Admin</footer></div></body></html>");
  }
}
