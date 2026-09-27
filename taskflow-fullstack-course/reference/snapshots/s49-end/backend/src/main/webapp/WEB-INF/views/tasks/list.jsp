<%--
  The task list VIEW. TaskListServlet prepared everything (34.21) and forwarded here.
  S35 (35.08): no Java left. <c:forEach> loops, <c:if>/<c:choose> decide what is RENDERED (S34's `hidden` only hid it),
  <c:url> builds links, <c:out>/fn:escapeXml escape. Same output as S34 for the same data, plus row numbers,
  status labels, and a delete confirmation that reads the title from an escaped attribute (35.17).
  S36 (36.11): categories from the database, and an allow-listed sort; the filter links keep all current choices.
  S39 (39.10): each row comes from task-row.jspf, shared with the dashboard.
  S44: the layout TAG (44.11), every text from the bundle (44.06), one PAGE of tasks + <t:pagination> (44.04),
  sortable column headers (44.16), and an EL function from our own TLD (44.14).
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<%@ taglib prefix="tf" uri="urn:taskflow:tags" %>
<fmt:message key="tasks.title" var="listTitle"/>
<c:set var="rowOffset" value="${taskPage.offset}"/>
<t:layout title="${listTitle}">
    <h1 class="page__title">${listTitle}</h1>
    <p class="export"><a href="<c:url value='/tasks/export.csv'/>"><fmt:message key="tasks.export"/></a></p>  <%-- S45 (45.14) --%>

    <%-- S36 (36.11): search + category + sort in one GET form. Every value is re-validated by the controller. --%>
    <form method="get" action="<c:url value='/tasks'/>" class="filters">
      <input type="search" name="q" value="${fn:escapeXml(param.q)}" placeholder="<fmt:message key='tasks.searchPlaceholder'/>">
      <select name="category">
        <option value=""><fmt:message key="tasks.allCategories"/></option>
        <c:forEach items="${categories}" var="category">
          <option value="${category.id}"${category.id == categoryFilter ? ' selected' : ''}><c:out value="${category.name}"/></option>
        </c:forEach>
      </select>
      <select name="sort">
        <c:forEach items="${sorts}" var="option">
          <option value="${option.param}"${option == sort ? ' selected' : ''}><fmt:message key="sort.${option}"/></option>
        </c:forEach>
      </select>
      <c:if test="${not empty statusFilter}"><input type="hidden" name="status" value="${statusFilter}"></c:if>
      <button class="btn btn--sm btn--secondary" type="submit"><fmt:message key="tasks.apply"/></button>
    </form>

    <p><fmt:message key="tasks.show"/> <a href="<c:url value='/tasks'/>"><fmt:message key="tasks.all"/></a>
      <c:forEach items="${statuses}" var="status">
        <c:url var="statusUrl" value="/tasks">
          <c:param name="status" value="${status}"/>
          <c:if test="${not empty param.q}"><c:param name="q" value="${param.q}"/></c:if>
          <c:if test="${not empty categoryFilter}"><c:param name="category" value="${categoryFilter}"/></c:if>
          <c:if test="${sort != 'ID'}"><c:param name="sort" value="${sort.param}"/></c:if>
          <c:if test="${descending}"><c:param name="dir" value="desc"/></c:if>
        </c:url>
        · <a class="${statusFilter == status ? 'is-active' : ''}" href="${fn:escapeXml(statusUrl)}"><fmt:message key="status.${status}"/></a>
      </c:forEach>
    </p>

    <%-- S38 (38.10): per-user history from the SESSION, looked up fresh (titles can change). --%>
    <c:if test="${not empty recentTasks}">
      <p class="text-muted recent"><fmt:message key="tasks.recentlyViewed"/>
        <c:forEach items="${recentTasks}" var="recent" varStatus="r">
          <a href="<c:url value='/tasks/view?id=${recent.id}'/>"><c:out value="${tf:truncate(recent.title, 40)}"/></a>${r.last ? '' : ' · '}
        </c:forEach>
      </p>
    </c:if>

    <p class="stats">
      <c:forEach items="${statuses}" var="status">
        <span class="badge"><fmt:message key="tasks.stats.${status}"><fmt:param value="${stats[status.name()]}"/></fmt:message></span>
      </c:forEach>
    </p>

    <c:if test="${overdueCount > 0}">
      <p class="text-danger"><fmt:message key="tasks.overdue"><fmt:param value="${overdueCount}"/></fmt:message></p>
    </c:if>

    <c:choose>
      <c:when test="${empty tasks}">
        <p class="text-muted"><fmt:message key="tasks.empty"/></p>
      </c:when>
      <c:otherwise>
        <table>
          <thead>
            <tr>
              <th><fmt:message key="tasks.col.number"/></th>
              <th><t:sortHeader column="title" current="${sort.param}" descending="${descending}" keep="q,status,category"><fmt:message key="tasks.col.title"/></t:sortHeader></th>
              <th><fmt:message key="tasks.col.status"/></th>
              <th><t:sortHeader column="priority" current="${sort.param}" descending="${descending}" keep="q,status,category"><fmt:message key="tasks.col.priority"/></t:sortHeader></th>
              <th><t:sortHeader column="due" current="${sort.param}" descending="${descending}" keep="q,status,category"><fmt:message key="tasks.col.due"/></t:sortHeader></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
          <c:forEach items="${tasks}" var="task" varStatus="row">
            <%@ include file="/WEB-INF/views/tasks/task-row.jspf" %>
          </c:forEach>
          </tbody>
        </table>
        <t:pagination of="${taskPage}" path="/tasks" keep="q,status,category,sort,dir"/>
      </c:otherwise>
    </c:choose>
</t:layout>