package com.taskflow.web.categories;

import com.taskflow.model.Category;
import com.taskflow.service.CategoryService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.Flash;
import com.taskflow.web.Http;
import com.taskflow.web.Params;
import java.io.IOException;
import java.util.Optional;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S37 (37.15): POST /categories/delete (id). A category still used by tasks is NOT deleted: the refusal is reported
 * with a flash message on the list (it's not a form field error, so PRG applies: 303 either way).
 */
@WebServlet("/categories/delete")
public class CategoryDeleteServlet extends HttpServlet {

  private CategoryService service;

  @Override
  public void init() {
    service = AppContextListener.categoryService(getServletContext());
  }

  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
    Long id = Params.positiveId(request.getParameter("id"));
    Optional<Category> category = id == null ? Optional.empty() : service.find(id);
    if (category.isEmpty()) {
      response.sendError(HttpServletResponse.SC_NOT_FOUND);
      return;
    }
    int used = service.taskCounts().getOrDefault(id, 0);
    switch (service.delete(id)) {
      case DELETED:
        Flash.put(request, "Category \"" + category.get().getName() + "\" deleted.");
        break;
      case IN_USE:
        Flash.put(request, "Category \"" + category.get().getName() + "\" is used by " + used
            + (used == 1 ? " task" : " tasks") + ": move them to another category first.");
        break;
      default:
        response.sendError(HttpServletResponse.SC_NOT_FOUND);
        return;
    }
    Http.seeOther(response, request.getContextPath() + "/categories");
  }
}
