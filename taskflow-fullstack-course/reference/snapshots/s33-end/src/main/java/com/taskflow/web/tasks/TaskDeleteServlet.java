package com.taskflow.web.tasks;

import com.taskflow.store.InMemoryTaskStore;
import com.taskflow.web.Params;
import java.io.IOException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S31 Your Turn (31.13): POST /tasks/delete (id) → delete → redirect to the list.
 * doPost ONLY: a GET is answered 405 by HttpServlet (30.07), so links, prefetchers and <img> tags can't delete (29.03).
 * (No authorisation or CSRF check yet: S37's lab and S41–S42 add them.)
 */
@WebServlet("/tasks/delete")
public class TaskDeleteServlet extends HttpServlet {

  private final InMemoryTaskStore store = InMemoryTaskStore.shared();

  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
    Long id = Params.positiveId(request.getParameter("id"));
    if (id == null) {
      response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Parameter 'id' must be a positive number");
      return;
    }
    if (!store.delete(id)) {
      response.sendError(HttpServletResponse.SC_NOT_FOUND);
      return;
    }
    response.sendRedirect(request.getContextPath() + "/tasks");
  }
}
