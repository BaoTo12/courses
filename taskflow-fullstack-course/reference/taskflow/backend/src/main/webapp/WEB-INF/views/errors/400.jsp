<%--
  S43 (43.12): status 400. The message comes from sendError(400, message): ErrorHandlingFilter passes the text of
  a BadRequestException, which is always written by us (43.12). Escaped anyway: it's output (34.18).
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<c:set var="pageTitle" value="Bad request"/>
<%@ include file="/WEB-INF/views/common/header.jspf" %>
    <h1 class="page__title">Bad request</h1>
    <c:set var="message" value="${requestScope['javax.servlet.error.message']}"/>
    <p class="error-page__text"><c:out value="${empty message ? 'The request could not be understood.' : message}"/></p>
    <p><a href="<c:url value='/tasks'/>">Back to your tasks</a></p>
<%@ include file="/WEB-INF/views/common/footer.jspf" %>