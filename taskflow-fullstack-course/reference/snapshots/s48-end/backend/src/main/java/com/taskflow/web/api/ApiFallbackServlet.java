package com.taskflow.web.api;

import java.util.List;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S46 (46.16): every /api/… path no other servlet claims. More specific mappings (/api/tasks/*, /api/categories,
 * /api/stats) win; without this servlet, /api/nope would fall through to the default servlet → sendError(404) →
 * the HTML 404 page, which a JSON client can't parse.
 */
@WebServlet("/api/*")
public class ApiFallbackServlet extends ApiServlet {

  @Override
  protected void route(HttpServletRequest request, HttpServletResponse response, String method, List<String> path) {
    throw ApiException.noEndpoint(request);
  }
}
