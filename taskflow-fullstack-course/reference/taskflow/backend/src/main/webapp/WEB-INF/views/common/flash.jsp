<%--
  S39 (39.05): the flash message (37.09) as a separate JSP, included at REQUEST time by header.jspf:
  <jsp:include page="/WEB-INF/views/common/flash.jsp"/>. It's its own servlet with its own page scope; it sees the
  request's attributes (flash) and parameters. It sets no content type: the including page owns the response.
--%>
<%@ page pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<c:if test="${not empty flash}"><p class="flash" role="status"><c:out value="${flash}"/></p></c:if>
