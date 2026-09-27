package com.taskflow.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;

/** S32: servlet → setAttribute → forward → JSP, through the embedded Tomcat (with Jasper compiling the JSPs). */
class S32JspTest extends TomcatTest {

  @Test
  void theListIsRenderedByTheJspWithItsPageDirectiveCharset() throws Exception {
    HttpResponse<String> response = get(CONTEXT + "/tasks");
    assertEquals(200, response.statusCode(), response.body());
    assertTrue(response.headers().firstValue("Content-Type").orElseThrow().toLowerCase().startsWith("text/html;charset=utf-8"));
    assertTrue(response.body().contains("<title>Tasks · TaskFlow Admin</title>"));
    assertTrue(response.body().contains("Write quarterly report"));
    // what the browser receives: HTML only, no JSP syntax, no Java (32.08)
    assertFalse(response.body().contains("<%"));
    assertFalse(response.body().contains("request.getAttribute"));
    assertTrue(response.body().contains("href=\"/taskflow/static/css/app.css\""));
  }

  @Test
  void jspsUnderWebInfCannotBeRequestedDirectly() throws Exception { // 32.07, 32.14
    assertEquals(404, get(CONTEXT + "/WEB-INF/views/tasks/list.jsp").statusCode());
  }

  @Test
  void theDetailsPageIsAJspTooAndErrorsStayInTheServlet() throws Exception { // 32.12
    HttpResponse<String> view = get(CONTEXT + "/tasks/view?id=1");
    assertEquals(200, view.statusCode());
    assertTrue(view.body().contains("<h1 class=\"page__title\">Write quarterly report</h1>"));
    assertEquals(404, get(CONTEXT + "/tasks/view?id=999999").statusCode());
    assertEquals(400, get(CONTEXT + "/tasks/view?id=x").statusCode());
  }
}
