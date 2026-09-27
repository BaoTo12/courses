<%--
  S44 (44.04): <t:pagination of="${taskPage}" path="/tasks" keep="q,status,category,sort,dir"/>
  Previous · 1 2 3 · Next, and "Page 2 of 3 · 22 tasks". Nothing at all when everything fits on one page.
  `of` is a com.taskflow.service.Page (number, totalPages, hasPrevious, hasNext, total).
--%>
<%@ tag description="Pagination for a Page" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ attribute name="of" required="true" type="com.taskflow.service.Page" %>
<%@ attribute name="path" required="true" %>
<%@ attribute name="keep" required="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<c:if test="${of.totalPages > 1}">
  <nav class="pagination" aria-label="<fmt:message key='pagination.label'/>">
    <c:if test="${of.hasPrevious}">
      <t:pageLink path="${path}" keep="${keep}" number="${of.number - 1}"><fmt:message key="pagination.previous"/></t:pageLink>
    </c:if>
    <c:forEach begin="1" end="${of.totalPages}" var="n">
      <t:pageLink path="${path}" keep="${keep}" number="${n}" current="${n == of.number}">${n}</t:pageLink>
    </c:forEach>
    <c:if test="${of.hasNext}">
      <t:pageLink path="${path}" keep="${keep}" number="${of.number + 1}"><fmt:message key="pagination.next"/></t:pageLink>
    </c:if>
    <span class="pagination__summary">
      <fmt:message key="pagination.summary">
        <fmt:param value="${of.number}"/>
        <fmt:param value="${of.totalPages}"/>
        <fmt:param value="${of.total}"/>
      </fmt:message>
    </span>
  </nav>
</c:if>