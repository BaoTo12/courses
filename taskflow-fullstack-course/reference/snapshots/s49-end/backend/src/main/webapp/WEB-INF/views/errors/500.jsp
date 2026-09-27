<%--
  S43 (43.06, 43.10): status 500, and any exception that reaches the container. The user gets an apology and the
  REQUEST ID (43.12): the same id is in X-Request-Id and in every log line of this request (40.06), so support can
  find the stack trace in the logs. Never the exception, its message, a stack trace or a version (43.09).
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<c:set var="pageTitle" value="Something went wrong"/>
<%@ include file="/WEB-INF/views/common/header.jspf" %>
    <h1 class="page__title">Something went wrong</h1>
    <p class="error-page__text">Sorry, TaskFlow couldn't complete this request. It has been logged, and you can try again.</p>
    <c:if test="${not empty requestId}">
      <p class="error-page__reference">If you contact support, quote this reference: <code>${requestId}</code></p>
    </c:if>
    <p><a href="<c:url value='/tasks'/>">Back to your tasks</a></p>
<%@ include file="/WEB-INF/views/common/footer.jspf" %>