<%--
  The task list VIEW. TaskListServlet (the controller) loaded the data and forwarded here (S32).
  S33: written ENTIRELY with scriptlets on purpose, then critiqued (33.13). S34 replaces the Java with EL, S35 with JSTL.
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ page import="java.time.LocalDate, java.util.List, com.taskflow.model.Task, com.taskflow.model.TaskStatus, com.taskflow.web.Html" %>
<%
  @SuppressWarnings("unchecked")
  List<Task> tasks = (List<Task>) request.getAttribute("tasks");   // set by the servlet (32.05)
  String ctx = request.getContextPath();
  String pageTitle = "Tasks";                                        // read by header.jspf (a translation-time include)

  // 33.15 Your Turn: overdue = a due date before today, and not done. Business logic in a view: see 33.16's critique.
  LocalDate today = LocalDate.now();
  int overdueCount = 0;
  for (Task t : tasks) {
    if (!t.isDone() && t.getDueDate() != null && t.getDueDate().isBefore(today)) overdueCount++;
  }
%>
<%@ include file="/WEB-INF/views/common/header.jspf" %>
    <h1 class="page__title">Tasks</h1>

    <p>Show: <a href="<%= ctx %>/tasks">All</a>
      <% for (TaskStatus status : TaskStatus.values()) { %>
        · <a href="<%= ctx %>/tasks?status=<%= status.name() %>"><%= status.name() %></a>
      <% } %>
    </p>

    <% if (overdueCount > 0) { %>
      <p class="text-danger"><%= overdueCount %> overdue <%= overdueCount == 1 ? "task" : "tasks" %></p>
    <% } %>

    <% if (tasks.isEmpty()) { %>
      <p class="text-muted">No tasks.</p>
    <% } else { %>
      <table>
        <thead><tr><th>Title</th><th>Status</th><th>Priority</th><th>Due</th><th></th></tr></thead>
        <tbody>
        <% for (Task task : tasks) {
             boolean overdue = !task.isDone() && task.getDueDate() != null && task.getDueDate().isBefore(today); %>
          <tr<%= overdue ? " class=\"task-row--overdue\"" : "" %>>
            <%-- The title is user input: escaped (32.11). --%>
            <td><a href="<%= ctx %>/tasks/view?id=<%= task.getId() %>"><%= Html.escape(task.getTitle()) %></a></td>
            <td><%= task.getStatus() %></td>
            <td><%= task.getPriority() %></td>
            <td><%= task.getDueDate() == null ? "—" : task.getDueDate() %><%= overdue ? " ⚠" : "" %></td>
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
<%@ include file="/WEB-INF/views/common/footer.jspf" %>
