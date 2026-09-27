<%--
  S43 (43.06): <error-page> for 404, reached by an ERROR dispatch (43.03): the same request object, with the
  javax.servlet.error.* attributes added. Only a fixed text for the user; nothing from the exception or the URL.
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<c:set var="pageTitle" value="Page not found"/>
<%@ include file="/WEB-INF/views/common/header.jspf" %>
    <h1 class="page__title">Page not found</h1>
    <p class="error-page__text">There's nothing here. The page may have been deleted, or the link is wrong.</p>
    <p><a href="<c:url value='/tasks'/>">Back to your tasks</a></p>
<%@ include file="/WEB-INF/views/common/footer.jspf" %>