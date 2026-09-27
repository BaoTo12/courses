<%--
  S32 Your Turn (32.12): one task. TaskViewServlet already handled 400/404 and set the "task" attribute;
  this view can assume a task exists.
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" %>
<%@ page import="com.taskflow.model.Task, com.taskflow.web.Html" %>
<%
  Task task = (Task) request.getAttribute("task");
  String ctx = request.getContextPath();
%>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title><%= Html.escape(task.getTitle()) %> · TaskFlow Admin</title>
  <link rel="stylesheet" href="<%= ctx %>/static/css/app.css">
</head>
<body>
<div class="page">
  <header class="page__header">
    <span class="page__brand">TaskFlow Admin</span>
    <nav class="page__nav">
      <a class="page__nav-link" href="<%= ctx %>/tasks">Tasks</a>
      <a class="page__nav-link" href="<%= ctx %>/tasks/new">New task</a>
    </nav>
  </header>
  <main class="page__main">
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
  </main>
  <footer class="page__footer">TaskFlow Admin</footer>
</div>
</body>
</html>
