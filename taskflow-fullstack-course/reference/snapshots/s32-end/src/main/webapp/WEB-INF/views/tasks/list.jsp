<%--
  S32 (32.06): the task list VIEW. TaskListServlet (the controller) loaded the data and forwarded here.
  This page only RENDERS the "tasks" request attribute. It lives under WEB-INF: the browser can't request it (32.07).
  The Java code (scriptlets) is temporary: S34 replaces it with EL, S35 with JSTL.
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" %>
<%@ page import="java.util.List, com.taskflow.model.Task, com.taskflow.model.TaskStatus, com.taskflow.web.Html" %>
<%
  @SuppressWarnings("unchecked")
  List<Task> tasks = (List<Task>) request.getAttribute("tasks");   // set by the servlet (32.05)
  String ctx = request.getContextPath();
%>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Tasks · TaskFlow Admin</title>
  <%-- An absolute path with the context: works at any URL depth and context path (32.15) --%>
  <link rel="stylesheet" href="<%= ctx %>/static/css/app.css">
</head>
<body>
<div class="page">
  <header class="page__header">
    <span class="page__brand">TaskFlow Admin</span>
    <nav class="page__nav">
      <a class="page__nav-link page__nav-link--active" href="<%= ctx %>/tasks">Tasks</a>
      <a class="page__nav-link" href="<%= ctx %>/tasks/new">New task</a>
    </nav>
  </header>
  <main class="page__main">
    <h1 class="page__title">Tasks</h1>

    <p>Show: <a href="<%= ctx %>/tasks">All</a>
      <% for (TaskStatus status : TaskStatus.values()) { %>
        · <a href="<%= ctx %>/tasks?status=<%= status.name() %>"><%= status.name() %></a>
      <% } %>
    </p>

    <% if (tasks.isEmpty()) { %>
      <p class="text-muted">No tasks.</p>
    <% } else { %>
      <table>
        <thead><tr><th>Title</th><th>Status</th><th>Priority</th><th>Due</th><th></th></tr></thead>
        <tbody>
        <% for (Task task : tasks) { %>
          <tr>
            <%-- The title is user input: escaped (32.11). An unescaped <%= task.getTitle() %> would be XSS. --%>
            <td><a href="<%= ctx %>/tasks/view?id=<%= task.getId() %>"><%= Html.escape(task.getTitle()) %></a></td>
            <td><%= task.getStatus() %></td>
            <td><%= task.getPriority() %></td>
            <td><%= task.getDueDate() == null ? "—" : task.getDueDate() %></td>
            <td>
              <form method="post" action="<%= ctx %>/tasks/toggle" style="display:inline">
                <input type="hidden" name="id" value="<%= task.getId() %>">
                <button class="btn btn--sm btn--secondary" type="submit"><%= task.isDone() ? "Reopen" : "Mark done" %></button>
              </form>
              <form method="post" action="<%= ctx %>/tasks/delete" style="display:inline">
                <input type="hidden" name="id" value="<%= task.getId() %>">
                <button class="btn btn--sm btn--secondary" type="submit">Delete</button>
              </form>
            </td>
          </tr>
        <% } %>
        </tbody>
      </table>
    <% } %>
  </main>
  <footer class="page__footer">TaskFlow Admin</footer>
</div>
</body>
</html>
