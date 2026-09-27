<%--
  S39 (39.10): the dashboard: overdue tasks and tasks due in the next 7 days. DashboardServlet set overdue, dueSoon,
  today and csrfToken. Both tables reuse task-row.jspf (the same fragment as the list), included twice in one page.
  S44: the layout tag and the bundle's texts, like the list.
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<fmt:message key="dashboard.title" var="dashboardTitle"/>
<t:layout title="${dashboardTitle}">
    <h1 class="page__title">${dashboardTitle}</h1>

    <h2><fmt:message key="dashboard.overdue"><fmt:param value="${fn:length(overdue)}"/></fmt:message></h2>
    <c:choose>
      <c:when test="${empty overdue}"><p class="text-muted"><fmt:message key="dashboard.nothingOverdue"/></p></c:when>
      <c:otherwise>
        <table class="dashboard__overdue">
          <thead><tr><th>#</th><th><fmt:message key="tasks.col.title"/></th><th><fmt:message key="tasks.col.status"/></th><th><fmt:message key="tasks.col.priority"/></th><th><fmt:message key="tasks.col.due"/></th><th></th></tr></thead>
          <tbody>
          <c:forEach items="${overdue}" var="task" varStatus="row">
            <%@ include file="/WEB-INF/views/tasks/task-row.jspf" %>
          </c:forEach>
          </tbody>
        </table>
      </c:otherwise>
    </c:choose>

    <h2><fmt:message key="dashboard.dueSoon"><fmt:param value="${fn:length(dueSoon)}"/></fmt:message></h2>
    <c:choose>
      <c:when test="${empty dueSoon}"><p class="text-muted"><fmt:message key="dashboard.nothingDueSoon"/></p></c:when>
      <c:otherwise>
        <table class="dashboard__due-soon">
          <thead><tr><th>#</th><th><fmt:message key="tasks.col.title"/></th><th><fmt:message key="tasks.col.status"/></th><th><fmt:message key="tasks.col.priority"/></th><th><fmt:message key="tasks.col.due"/></th><th></th></tr></thead>
          <tbody>
          <c:forEach items="${dueSoon}" var="task" varStatus="row">
            <%@ include file="/WEB-INF/views/tasks/task-row.jspf" %>
          </c:forEach>
          </tbody>
        </table>
      </c:otherwise>
    </c:choose>
</t:layout>