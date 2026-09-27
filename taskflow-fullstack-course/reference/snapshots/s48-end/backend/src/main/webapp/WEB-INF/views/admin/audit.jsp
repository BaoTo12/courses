<%--
  S45 (45.10): the audit log. AdminAuditServlet set: auditPage (Page<AuditDao.Event>), types, typeFilter,
  loggedInUsers, loggedInSessions, activeSessions. Every value from the log is escaped: usernames of FAILED logins
  are whatever someone typed into the login form (36.10).
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<t:layout title="Audit log">
    <h1 class="page__title">Audit log</h1>

    <p class="audit__sessions">Logged in now (${loggedInSessions} sessions):
      <c:forEach items="${loggedInUsers}" var="name" varStatus="s"><c:out value="${name}"/>${s.last ? '' : ', '}</c:forEach>
      · all sessions, including anonymous ones: ${activeSessions}
    </p>

    <form method="get" action="<c:url value='/admin/audit'/>" class="filters">
      <select name="type" aria-label="Event type">
        <option value="">All events</option>
        <c:forEach items="${types}" var="type">
          <option value="${type}"${type == typeFilter ? ' selected' : ''}>${type}</option>
        </c:forEach>
      </select>
      <input type="search" name="user" maxlength="50" value="${fn:escapeXml(param.user)}" placeholder="Username" aria-label="Username">
      <button class="btn btn--sm btn--secondary" type="submit">Filter</button>
    </form>

    <c:choose>
      <c:when test="${empty auditPage.items}"><p class="text-muted">No events.</p></c:when>
      <c:otherwise>
        <table class="audit">
          <thead><tr><th>When (UTC)</th><th>Event</th><th>User</th><th>IP</th><th>Details</th></tr></thead>
          <tbody>
          <c:forEach items="${auditPage.items}" var="event">
            <tr>
              <td>${event.at}</td>
              <td>${event.type}</td>
              <td><c:out value="${event.username}" default="—"/></td>
              <td><c:out value="${event.ip}"/></td>
              <td><c:out value="${event.details}"/></td>
            </tr>
          </c:forEach>
          </tbody>
        </table>
        <t:pagination of="${auditPage}" path="/admin/audit" keep="type,user"/>
      </c:otherwise>
    </c:choose>
</t:layout>
