package com.taskflow.web.categories;

import com.taskflow.service.CategoryService;
import com.taskflow.web.AppContextListener;
import com.taskflow.web.Csrf;
import com.taskflow.web.Flash;
import java.io.IOException;
import java.util.Map;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/** S37 (37.15): GET /categories → every category with its task count, a rename form per row, a "new" form. */
@WebServlet("/categories")
public class CategoryListServlet extends HttpServlet {

  private CategoryService service;

  @Override
  public void init() {
    service = AppContextListener.categoryService(getServletContext());
  }

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    Flash.consume(request);
    show(request, response, service, new CategoryForm(), Map.of());
  }

  /** Also used by CategorySaveServlet to show the page again with errors (a forward, 37.05). */
  static void show(HttpServletRequest request, HttpServletResponse response, CategoryService service,
      CategoryForm newForm, Map<String, String> errors) throws ServletException, IOException {
    Csrf.prepare(request);
    request.setAttribute("pageTitle", "Categories");
    request.setAttribute("categories", service.list());
    request.setAttribute("counts", service.taskCounts());  // Map<Long, Integer>: ${counts[category.id]} (34.10)
    request.setAttribute("newForm", newForm);
    request.setAttribute("errors", errors);
    request.getRequestDispatcher("/WEB-INF/views/categories/list.jsp").forward(request, response);
  }
}
