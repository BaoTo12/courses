<%--
  One task (S32 Your Turn). TaskViewServlet already handled 400/404 and set the "task" attribute.
  S33: the page frame now comes from header.jspf / footer.jspf.
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ page import="com.taskflow.model.Task, com.taskflow.web.Html" %>
<%
  Task task = (Task) request.getAttribute("task");
  String ctx = request.getContextPath();
  String pageTitle = task.getTitle();   // header.jspf escapes it
%>
<%@ include file="/WEB-INF/views/common/header.jspf" %>
    <nav class="text-muted"><a href="<%= ctx %>/tasks">Tasks</a> › <%= Html.escape(task.getTitle()) %></nav>
    <h1 class="page__title"><%= Html.escape(task.getTitle()) %></h1>
    <p><span class="badge"><%= task.getStatus() %></span> <span class="badge"><%= task.getPriority() %></span></p>
    <% if (task.getDescription().isEmpty()) { %>
      <p class="text-muted">No description.</p>
    <% } else { %>
      <p><%= Html.escape(task.getDescription()) %></p>
    <% } %>
    <p class="text-muted">Due: <%= task.getDueDate() == null ? "no due date" : task.getDueDate() %></p>
    <p><a class="btn btn--secondary btn--sm" href="<%= ctx %>/tasks">Back to the list</a></p>
<%@ include file="/WEB-INF/views/common/footer.jspf" %>
