package com.taskflow.web;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.concurrent.atomic.AtomicLong;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S30: TaskFlow Admin's first servlet. GET /taskflow/hello[?name=…] → an HTML page.
 * No main(): Tomcat finds this class through the annotation, creates ONE instance, and calls it for every request.
 */
@WebServlet(urlPatterns = "/hello", loadOnStartup = 1) // loadOnStartup: created at deployment, not on the first request (30.06)
public class HelloServlet extends HttpServlet {

  /** Shared by ALL requests (one instance, many threads, 30.05): must be thread-safe. */
  private final AtomicLong requestCount = new AtomicLong();

  @Override
  public void init() throws ServletException {
    log("init(): HelloServlet created once, at deployment"); // → Tomcat's log (localhost.<date>.log)
  }

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    String name = request.getParameter("name"); // null when absent (29.06)
    String who = (name == null || name.isBlank()) ? "world" : name.trim();
    long count = requestCount.incrementAndGet();

    // Status and headers BEFORE the body (30.09). The charset MUST be set before getWriter() (30.17).
    response.setContentType("text/html;charset=UTF-8");
    PrintWriter out = response.getWriter();
    out.println("<!doctype html>");
    out.println("<html lang=\"en\"><head><meta charset=\"utf-8\"><title>Hello</title>");
    out.println("<link rel=\"stylesheet\" href=\"static/css/app.css\"></head><body><main class=\"page__main\">");
    // 30.14: `who` is USER INPUT. Escaped, or /hello?name=<script>… runs in the visitor's browser.
    out.println("<h1 class=\"page__title\">Hello, " + Html.escape(who) + "!</h1>");
    out.println("<p class=\"text-muted\">Request #" + count + " handled by " + Thread.currentThread().getName() + "</p>");
    out.println("</main></body></html>");
  }

  @Override
  public void destroy() {
    log("destroy(): the application is stopping; " + requestCount.get() + " requests served");
  }
}
