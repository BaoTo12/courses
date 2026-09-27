<%--
  S51: tasks per user and status. AdminReportsServlet set: report (rows, generatedAt), generatedAt (text), statuses.
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<fmt:message key="reports.title" var="reportsTitle"/>
<t:layout title="${reportsTitle}">
    <h1 class="page__title">${reportsTitle}</h1>
    <p class="text-muted">
      <fmt:message key="reports.generated"><fmt:param value="${generatedAt}"/></fmt:message>
      · <a href="<c:url value='/admin/reports?refresh=1'/>"><fmt:message key="reports.refresh"/></a>
      · <a href="<c:url value='/admin/reports.csv'/>"><fmt:message key="reports.csv"/></a>
    </p>
    <table class="reports">
      <thead>
        <tr>
          <th><fmt:message key="reports.user"/></th>
          <c:forEach items="${statuses}" var="status"><th><fmt:message key="status.${status}"/></th></c:forEach>
          <th><fmt:message key="reports.total"/></th>
        </tr>
      </thead>
      <tbody>
      <c:forEach items="${report.rows}" var="row">
        <tr>
          <td><c:out value="${row.displayName}"/> (<c:out value="${row.username}"/>)</td>
          <c:forEach items="${statuses}" var="status"><td class="reports__count"><fmt:formatNumber value="${row.counts[status]}"/></td></c:forEach>
          <td class="reports__total"><fmt:formatNumber value="${row.total}"/></td>
        </tr>
      </c:forEach>
      </tbody>
    </table>
</t:layout>