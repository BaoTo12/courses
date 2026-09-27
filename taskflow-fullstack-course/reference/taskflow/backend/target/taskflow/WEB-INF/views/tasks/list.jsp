<%--
  The task list VIEW. TaskListServlet prepared everything (34.21) and forwarded here.
  S35 (35.08): no Java left. <c:forEach> loops, <c:if>/<c:choose> decide what is RENDERED (S34's `hidden` only hid it),
  <c:url> builds links, <c:out>/fn:escapeXml escape. Same output as S34 for the same data, plus row numbers,
  status labels, and a delete confirmation that reads the title from an escaped attribute (35.17).
  S36 (36.11): categories from the database, and an allow-listed sort; the filter links keep all current choices.
  S39 (39.10): each row comes from task-row.jspf, shared with the dashboard.
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ include file="/WEB-INF/views/common/header.jspf" %>
    <h1 class="page__title">Tasks</h1>

    <%-- S36 (36.11): search + category + sort in one GET form. Every value is re-validated by the controller. --%>
    <form method="get" action="<c:url value='/tasks'/>" class="filters">
      <input type="search" name="q" value="${fn:escapeXml(param.q)}" placeholder="Search titles">
      <select name="category">
        <option value="">All categories</option>
        <c:forEach items="${categories}" var="category">
          <option value="${category.id}"${category.id == categoryFilter ? ' selected' : ''}><c:out value="${category.name}"/></option>
        </c:forEach>
      </select>
      <select name="sort">
        <c:forEach items="${sorts}" var="option">
          <option value="${option.param}"${option == sort ? ' selected' : ''}>${option.label}</option>
        </c:forEach>
      </select>
      <c:if test="${not empty statusFilter}"><input type="hidden" name="status" value="${statusFilter}"></c:if>
      <button class="btn btn--sm btn--secondary" type="submit">Apply</button>
    </form>

    <p>Show: <a href="<c:url value='/tasks'/>">All</a>
      <c:forEach items="${statuses}" var="status">
        <c:url var="statusUrl" value="/tasks">
          <c:param name="status" value="${status}"/>
          <c:if test="${not empty param.q}"><c:param name="q" value="${param.q}"/></c:if>
          <c:if test="${not empty categoryFilter}"><c:param name="category" value="${categoryFilter}"/></c:if>
          <c:if test="${sort != 'ID'}"><c:param name="sort" value="${sort.param}"/></c:if>
        </c:url>
        · <a class="${statusFilter == status ? 'is-active' : ''}" href="${fn:escapeXml(statusUrl)}">${status}</a>
      </c:forEach>
    </p>

    <%-- S38 (38.10): per-user history from the SESSION, looked up fresh (titles can change). --%>
    <c:if test="${not empty recentTasks}">
      <p class="text-muted recent">Recently viewed:
        <c:forEach items="${recentTasks}" var="recent" varStatus="r">
          <a href="<c:url value='/tasks/view?id=${recent.id}'/>"><c:out value="${recent.title}"/></a>${r.last ? '' : ' · '}
        </c:forEach>
      </p>
    </c:if>

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
            <%@ include file="/WEB-INF/views/tasks/task-row.jspf" %>
          </c:forEach>
          </tbody>
        </table>
      </c:otherwise>
    </c:choose>
<%@ include file="/WEB-INF/views/common/footer.jspf" %>
