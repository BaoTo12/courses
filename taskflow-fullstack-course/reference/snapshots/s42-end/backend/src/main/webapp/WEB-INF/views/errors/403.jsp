<%--
  S42 (42.03): shown by AuthorizationFilter with status 403 when a non-admin asks for /admin/*.
  It says what happened, not why in detail: the details (who, what, from where) are in the audit log.
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ include file="/WEB-INF/views/common/header.jspf" %>
    <h1 class="page__title">Access denied</h1>
    <p class="error-page__text">You don't have permission to open this page.</p>
    <p><a href="<c:url value='/tasks'/>">Back to your tasks</a></p>
<%@ include file="/WEB-INF/views/common/footer.jspf" %>
