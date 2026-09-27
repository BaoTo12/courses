package com.taskflow.web.debug;

import java.io.IOException;
import java.net.InetAddress;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S45 (45.03, 45.04): a DELIBERATELY broken servlet, for the race-condition lab (loopback only).
 *   GET /debug/race?who=alice              → the bug: `who` goes through an INSTANCE field
 *   GET /debug/race?who=alice&mode=safe    → the fix: a local variable
 * There is ONE instance of this class, and every request runs doGet on its own thread at the same time (45.02).
 * The pause stands in for real work (a query, a template) between writing the field and reading it back.
 */
@WebServlet("/debug/race")
public class RaceDemoServlet extends HttpServlet {

  private String currentUser;   // ❌ shared by EVERY request thread

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    if (!InetAddress.getByName(request.getRemoteAddr()).isLoopbackAddress()) {
      response.sendError(HttpServletResponse.SC_NOT_FOUND);
      return;
    }
    String who = request.getParameter("who");
    String answer;
    if ("safe".equals(request.getParameter("mode"))) {
      String mine = who;                  // ✅ a local variable: on THIS thread's stack
      pause();
      answer = mine;
    } else {
      currentUser = who;                  // another thread may overwrite it during the pause…
      pause();
      answer = currentUser;               // …and this request answers with someone else's value
    }
    response.setContentType("text/plain;charset=UTF-8");
    response.getWriter().write("you are " + answer);
  }

  private static void pause() {
    try {
      Thread.sleep(50);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }
}
