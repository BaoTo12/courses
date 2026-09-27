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

    <%-- S48 (48.05): lab switches (loopback page; the forms need a logged-in session's CSRF token). --%>
    <c:if test="${not empty csrfToken}">
      <h2>Lab switches</h2>
      <form method="post" action="<c:url value='/debug/contract-drift'/>" class="inline-form">
        <input type="hidden" name="_csrf" value="${csrfToken}">
        <button class="btn btn--sm btn--secondary" name="enabled" value="true">Contract drift ON</button>
        <button class="btn btn--sm btn--secondary" name="enabled" value="false">Contract drift OFF</button>
      </form>
    </c:if>

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
