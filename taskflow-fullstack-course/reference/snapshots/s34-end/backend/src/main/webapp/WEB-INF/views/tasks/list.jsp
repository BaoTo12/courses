<%--
  The task list VIEW. TaskListServlet (the controller) prepared everything and forwarded here.
  S34: EL for every EXPRESSION. EL has no statements, so the loop is still a scriptlet; S35 replaces it with <c:forEach>.
  Without tags, "don't show this block" is written as the HTML `hidden` attribute (also S35: <c:if>).
  34.20 Your Turn: the stats box, "No tasks" via `empty`, the overdue class via a ternary.
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ page import="com.taskflow.web.Html" %>
<%@ include file="/WEB-INF/views/common/header.jspf" %>
    <h1 class="page__title">Tasks</h1>

    <%-- 🛡 34.18/34.19: ${param.q} is attacker-controlled text inside a quoted attribute → escaped. --%>
    <form method="get" action="${pageContext.request.contextPath}/tasks">
      <input type="search" name="q" value="${Html.escape(param.q)}" placeholder="Search titles">
      <button class="btn btn--sm btn--secondary" type="submit">Search</button>
    </form>

    <p>Show: <a href="${pageContext.request.contextPath}/tasks">All</a>
      · <a class="${statusFilter == 'TODO' ? 'is-active' : ''}" href="${pageContext.request.contextPath}/tasks?status=TODO">TODO</a>
      · <a class="${statusFilter == 'IN_PROGRESS' ? 'is-active' : ''}" href="${pageContext.request.contextPath}/tasks?status=IN_PROGRESS">IN_PROGRESS</a>
      · <a class="${statusFilter == 'DONE' ? 'is-active' : ''}" href="${pageContext.request.contextPath}/tasks?status=DONE">DONE</a>
    </p>

    <p class="stats">
      <span class="badge">To do: ${stats['TODO']}</span>
      <span class="badge">In progress: ${stats['IN_PROGRESS']}</span>
      <span class="badge">Done: ${stats['DONE']}</span>
    </p>

    <p class="text-danger"${overdueCount == 0 ? ' hidden' : ''}>${overdueCount} overdue ${overdueCount == 1 ? 'task' : 'tasks'}</p>
    <p class="text-muted"${empty tasks ? '' : ' hidden'}>No tasks.</p>

    <table${empty tasks ? ' hidden' : ''}>
      <thead><tr><th>Title</th><th>Status</th><th>Priority</th><th>Due</th><th></th></tr></thead>
      <tbody>
      <% for (Object task : (java.util.List<?>) request.getAttribute("tasks")) {
           pageContext.setAttribute("task", task); // the bridge from Java to EL: what <c:forEach var="task"> does for you (S35)
      %>
        <tr class="${task.isOverdue(today) ? 'task-row--overdue' : ''}">
          <td><a href="${pageContext.request.contextPath}/tasks/view?id=${task.id}">${Html.escape(task.title)}</a></td>
          <td>${task.status}</td>
          <td>${task.priority}</td>
          <td>${empty task.dueDate ? '—' : task.dueDate}${task.isOverdue(today) ? ' ⚠' : ''}</td>
          <td>
            <form method="post" action="${pageContext.request.contextPath}/tasks/toggle" style="display:inline">
              <input type="hidden" name="id" value="${task.id}">
              <button class="btn btn--sm btn--secondary" type="submit">${task.done ? 'Reopen' : 'Mark done'}</button>
            </form>
            <form method="post" action="${pageContext.request.contextPath}/tasks/delete" style="display:inline">
              <input type="hidden" name="id" value="${task.id}">
              <button class="btn btn--sm btn--secondary" type="submit">Delete</button>
            </form>
          </td>
        </tr>
      <% } %>
      </tbody>
    </table>
<%@ include file="/WEB-INF/views/common/footer.jspf" %>
