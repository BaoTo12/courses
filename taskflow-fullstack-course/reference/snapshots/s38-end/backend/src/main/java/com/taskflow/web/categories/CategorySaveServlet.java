package com.taskflow.web.categories;

import com.taskflow.dao.DuplicateKeyException;
import com.taskflow.service.CategoryService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.Csrf;
import com.taskflow.web.Flash;
import com.taskflow.web.Http;
import com.taskflow.web.Params;
import java.io.IOException;
import java.util.Map;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S37 (37.15): POST /categories/save. Without an id → create; with an id → rename/recolour.
 * Invalid or duplicate → 400 + the page again with the errors (forward). Valid → flash + 303 → /categories (PRG).
 */
@WebServlet("/categories/save")
public class CategorySaveServlet extends HttpServlet {

  private CategoryService service;

  @Override
  public void init() {
    service = AppContextListener.categoryService(getServletContext());
  }

  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    request.setCharacterEncoding("UTF-8");
    if (!Csrf.isValid(request)) {
      response.sendError(HttpServletResponse.SC_FORBIDDEN, "Invalid or missing CSRF token");
      return;
    }
    String idParam = request.getParameter("id");
    Long id = idParam == null || idParam.isBlank() ? null : Params.positiveId(idParam);
    if (idParam != null && !idParam.isBlank() && id == null) {
      response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Parameter 'id' must be a positive number");
      return;
    }
    CategoryForm form = CategoryForm.from(request);
    Map<String, String> errors = form.validate();
    if (errors.isEmpty()) {
      try {
        if (id == null) {
          service.create(form.getName(), form.getColor());
          Flash.put(request, "Category \"" + form.getName() + "\" created.");
        } else {
          if (!service.rename(id, form.getName(), form.getColor())) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
          }
          Flash.put(request, "Category saved.");
        }
        Http.seeOther(response, request.getContextPath() + "/categories");
        return;
      } catch (DuplicateKeyException e) {
        errors.put("name", "A category named \"" + form.getName() + "\" already exists");
      }
    }
    response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
    CategoryListServlet.show(request, response, service, id == null ? form : new CategoryForm(), errors);
  }
}
