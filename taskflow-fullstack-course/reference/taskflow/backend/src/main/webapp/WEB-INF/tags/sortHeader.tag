<%--
  S44 (44.16, Your Turn): a sortable column header. Clicking the active column flips the direction; clicking another
  column sorts by it ascending. Filters are kept (`keep`), the page is NOT: a new order starts at page 1.
    <t:sortHeader column="title" current="${sort.param}" descending="${descending}" keep="q,status,category">Title</t:sortHeader>
--%>
<%@ tag description="A column header link that sorts the list" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ attribute name="column" required="true" %>
<%@ attribute name="current" required="true" %>
<%@ attribute name="descending" required="true" type="java.lang.Boolean" %>
<%@ attribute name="keep" required="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<c:set var="active" value="${column == current}"/>
<c:url var="href" value="/tasks">
  <c:forEach items="${fn:split(keep, ',')}" var="name">
    <c:if test="${not empty param[name]}"><c:param name="${name}" value="${param[name]}"/></c:if>
  </c:forEach>
  <c:param name="sort" value="${column}"/>
  <c:if test="${active and not descending}"><c:param name="dir" value="desc"/></c:if>
</c:url>
<a class="sort-link${active ? ' is-active' : ''}" href="${fn:escapeXml(href)}"><jsp:doBody/>${active ? (descending ? ' ▼' : ' ▲') : ''}</a>