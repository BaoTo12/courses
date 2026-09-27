<%--
  S43 (43.02): the DEFAULT error page (an <error-page> with only a <location>, Servlet 3.0+): every status without a
  page of its own (405, 413, …). pageContext.errorData (a javax.servlet.jsp.ErrorData) exposes the error attributes.
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<c:set var="pageTitle" value="Error ${pageContext.errorData.statusCode}"/>
<%@ include file="/WEB-INF/views/common/header.jspf" %>
    <h1 class="page__title">Error ${pageContext.errorData.statusCode}</h1>
    <p class="error-page__text">TaskFlow couldn't handle this request.</p>
    <p><a href="<c:url value='/tasks'/>">Back to your tasks</a></p>
<%@ include file="/WEB-INF/views/common/footer.jspf" %>