<%--
  S38 (38.07): application-scope counters. StatsServlet set "stats" (the AppStats object) and "mostViewed"
  (Map<Task, Long>, most viewed first). The same AppStats is also reachable as \${applicationScope[…]} by its long name.
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ include file="/WEB-INF/views/common/header.jspf" %>
    <h1 class="page__title">Statistics</h1>
    <table>
      <tbody>
      <tr><td>Requests since startup</td><td class="stat--requests">${stats.requests}</td></tr>
      <tr><td>Active sessions</td><td class="stat--sessions">${stats.activeSessions}</td></tr>
      </tbody>
    </table>

    <h2>Most viewed tasks</h2>
    <c:choose>
      <c:when test="${empty mostViewed}"><p class="text-muted">No task has been viewed yet.</p></c:when>
      <c:otherwise>
        <ol class="most-viewed">
          <c:forEach items="${mostViewed}" var="entry">
            <li><a href="<c:url value='/tasks/view?id=${entry.key.id}'/>"><c:out value="${entry.key.title}"/></a> (${entry.value})</li>
          </c:forEach>
        </ol>
      </c:otherwise>
    </c:choose>
<%@ include file="/WEB-INF/views/common/footer.jspf" %>
