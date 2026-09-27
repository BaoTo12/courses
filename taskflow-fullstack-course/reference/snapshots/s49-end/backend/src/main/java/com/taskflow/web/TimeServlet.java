package com.taskflow.web;

import java.io.IOException;
import java.io.PrintWriter;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebInitParam;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S30 Your Turn (30.15): the time, with
 * - a PER-SERVLET setting: init parameter "format" (ServletConfig, 30.12);
 * - a PER-APPLICATION setting: context parameter "greeting" in web.xml (ServletContext, 30.13).
 */
@WebServlet(urlPatterns = "/time", initParams = @WebInitParam(name = "format", value = "HH:mm:ss, EEEE d MMMM yyyy"))
public class TimeServlet extends HttpServlet {

  private DateTimeFormatter formatter; // built once in init(), read-only afterwards: thread-safe

  @Override
  public void init() throws ServletException {
    String pattern = getInitParameter("format"); // = getServletConfig().getInitParameter("format")
    try {
      formatter = DateTimeFormatter.ofPattern(pattern);
    } catch (IllegalArgumentException e) {
      // A bad pattern is a deployment bug: fail at init, loudly, instead of on every request.
      throw new ServletException("Invalid 'format' init parameter: " + pattern, e);
    }
  }

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    String greeting = getServletContext().getInitParameter("greeting"); // shared by the whole app
    response.setContentType("text/html;charset=UTF-8"); // BEFORE getWriter(): the Vietnamese greeting needs UTF-8 (30.17)
    PrintWriter out = response.getWriter();
    out.println("<!doctype html><html lang=\"vi\"><head><meta charset=\"utf-8\"><title>Time</title></head><body>");
    out.println("<h1>" + Html.escape(greeting) + "</h1>");
    out.println("<p>" + Html.escape(ZonedDateTime.now().format(formatter)) + "</p>");
    out.println("</body></html>");
  }
}
