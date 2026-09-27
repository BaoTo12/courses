<%--
  The task list VIEW. TaskListServlet prepared everything (34.21) and forwarded here.
  S35 (35.08): no Java left. <c:forEach> loops, <c:if>/<c:choose> decide what is RENDERED (S34's `hidden` only hid it),
  <c:url> builds links, <c:out>/fn:escapeXml escape. Same output as S34 for the same data, plus row numbers,
  status labels, and a delete confirmation that reads the title from an escaped attribute (35.17).
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ include file="/WEB-INF/views/common/header.jspf" %>
    <h1 class="page__title">Tasks</h1>

    <form method="get" action="<c:url value='/tasks'/>">
      <input type="search" name="q" value="${fn:escapeXml(param.q)}" placeholder="Search titles">
      <button class="btn btn--sm btn--secondary" type="submit">Search</button>
    </form>

    <p>Show: <a href="<c:url value='/tasks'/>">All</a>
      <c:forEach items="${statuses}" var="status">
        <c:url var="statusUrl" value="/tasks">
          <c:param name="status" value="${status}"/>
          <c:if test="${not empty param.q}"><c:param name="q" value="${param.q}"/></c:if>
        </c:url>
        · <a class="${statusFilter == status ? 'is-active' : ''}" href="${fn:escapeXml(statusUrl)}">${status}</a>
      </c:forEach>
    </p>

    <p class="stats">
      <span class="badge">To do: ${stats['TODO']}</span>
      <span class="badge">In progress: ${stats['IN_PROGRESS']}</span>
      <span class="badge">Done: ${stats['DONE']}</span>
    </p>

    <c:if test="${overdueCount > 0}">
      <p class="text-danger">${overdueCount} overdue ${overdueCount == 1 ? 'task' : 'tasks'}</p>
    </c:if>

    <c:choose>
      <c:when test="${empty tasks}">
        <p class="text-muted">No tasks.</p>
      </c:when>
      <c:otherwise>
        <table>
          <thead><tr><th>#</th><th>Title</th><th>Status</th><th>Priority</th><th>Due</th><th></th></tr></thead>
          <tbody>
          <c:forEach items="${tasks}" var="task" varStatus="row">
            <tr class="${task.isOverdue(today) ? 'task-row--overdue' : ''}">
              <td class="row-number">${row.count}</td>
              <td><a href="<c:url value='/tasks/view?id=${task.id}'/>"><c:out value="${task.title}"/></a></td>
              <td>
                <c:choose>
                  <c:when test="${task.status == 'DONE'}"><span class="badge badge--done">Done</span></c:when>
                  <c:when test="${task.status == 'IN_PROGRESS'}"><span class="badge badge--progress">In progress</span></c:when>
                  <c:otherwise><span class="badge">To do</span></c:otherwise>
                </c:choose>
              </td>
              <td>${task.priority}</td>
              <td>${empty task.dueDate ? '—' : task.dueDate}<c:if test="${task.isOverdue(today)}"> ⚠</c:if></td>
              <td>
                <form method="post" action="<c:url value='/tasks/toggle'/>" style="display:inline">
                  <input type="hidden" name="id" value="${task.id}">
                  <button class="btn btn--sm btn--secondary" type="submit">${task.done ? 'Reopen' : 'Mark done'}</button>
                </form>
                <form method="post" action="<c:url value='/tasks/delete'/>" style="display:inline" data-confirm-title="${fn:escapeXml(task.title)}">
                  <input type="hidden" name="id" value="${task.id}">
                  <button class="btn btn--sm btn--secondary" type="submit">Delete</button>
                </form>
              </td>
            </tr>
          </c:forEach>
          </tbody>
        </table>
      </c:otherwise>
    </c:choose>
<%@ include file="/WEB-INF/views/common/footer.jspf" %>
