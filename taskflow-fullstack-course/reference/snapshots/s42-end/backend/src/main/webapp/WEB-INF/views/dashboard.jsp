<%--
  S39 (39.10): the dashboard: overdue tasks and tasks due in the next 7 days. DashboardServlet set overdue, dueSoon,
  today and csrfToken. Both tables reuse task-row.jspf (the same fragment as the list), included twice in one page.
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ include file="/WEB-INF/views/common/header.jspf" %>
    <h1 class="page__title">Dashboard</h1>

    <h2>Overdue (${fn:length(overdue)})</h2>
    <c:choose>
      <c:when test="${empty overdue}"><p class="text-muted">Nothing is overdue.</p></c:when>
      <c:otherwise>
        <table class="dashboard__overdue">
          <thead><tr><th>#</th><th>Title</th><th>Status</th><th>Priority</th><th>Due</th><th></th></tr></thead>
          <tbody>
          <c:forEach items="${overdue}" var="task" varStatus="row">
            <%@ include file="/WEB-INF/views/tasks/task-row.jspf" %>
          </c:forEach>
          </tbody>
        </table>
      </c:otherwise>
    </c:choose>

    <h2>Due in the next 7 days (${fn:length(dueSoon)})</h2>
    <c:choose>
      <c:when test="${empty dueSoon}"><p class="text-muted">Nothing is due this week.</p></c:when>
      <c:otherwise>
        <table class="dashboard__due-soon">
          <thead><tr><th>#</th><th>Title</th><th>Status</th><th>Priority</th><th>Due</th><th></th></tr></thead>
          <tbody>
          <c:forEach items="${dueSoon}" var="task" varStatus="row">
            <%@ include file="/WEB-INF/views/tasks/task-row.jspf" %>
          </c:forEach>
          </tbody>
        </table>
      </c:otherwise>
    </c:choose>
<%@ include file="/WEB-INF/views/common/footer.jspf" %>
