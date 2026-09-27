<%--
  S44 (44.04): one link to a page of a list, KEEPING the current request's parameters named in `keep`
  (e.g. "q,status,category,sort,dir"): <c:url> + <c:param> encode every value (44.03), so "R&D" becomes q=R%26D and
  can't break the URL (44.19). Page 1 has no page parameter: one URL per page, not two.
  The body is the link text.
--%>
<%@ tag description="A link to page N of a list" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ attribute name="path" required="true" %>
<%@ attribute name="keep" required="true" %>
<%@ attribute name="number" required="true" type="java.lang.Integer" %>
<%@ attribute name="current" type="java.lang.Boolean" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<c:url var="href" value="${path}">
  <c:forEach items="${fn:split(keep, ',')}" var="name">
    <c:if test="${not empty param[name]}"><c:param name="${name}" value="${param[name]}"/></c:if>
  </c:forEach>
  <c:if test="${number > 1}"><c:param name="page" value="${number}"/></c:if>
</c:url>
<a class="pagination__link${current ? ' is-active' : ''}" href="${fn:escapeXml(href)}"${current ? ' aria-current="page"' : ''}><jsp:doBody/></a>