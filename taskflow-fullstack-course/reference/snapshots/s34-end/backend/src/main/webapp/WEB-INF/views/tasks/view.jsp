<%--
  One task. TaskViewServlet handled 400/404 and set "details" (a TaskDetails) and "pageTitle".
  S34 (34.09): EL only. No imports of model classes, no casts, no null checks: ${details.category.name}
  is simply empty when there's no category, and `empty` chooses the fallback text.
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ page import="com.taskflow.web.Html" %>
<%@ include file="/WEB-INF/views/common/header.jspf" %>
    <nav class="text-muted"><a href="${pageContext.request.contextPath}/tasks">Tasks</a> › ${Html.escape(details.task.title)}</nav>
    <h1 class="page__title">${Html.escape(details.task.title)}</h1>
    <p><span class="badge">${details.task.status}</span> <span class="badge">${details.task.priority}</span></p>
    <p class="${empty details.task.description ? 'text-muted' : 'task__description'}">${empty details.task.description ? 'No description.' : Html.escape(details.task.description)}</p>
    <dl>
      <dt>Category</dt><dd>${empty details.category ? 'No category' : Html.escape(details.category.name)}</dd>
      <dt>Owner</dt><dd>${Html.escape(details.owner.displayName)} (${Html.escape(details.owner.username)})</dd>
      <dt>Due</dt><dd>${empty details.task.dueDate ? 'no due date' : details.task.dueDate}</dd>
    </dl>
    <p><a class="btn btn--secondary btn--sm" href="${pageContext.request.contextPath}/tasks">Back to the list</a></p>
<%@ include file="/WEB-INF/views/common/footer.jspf" %>
