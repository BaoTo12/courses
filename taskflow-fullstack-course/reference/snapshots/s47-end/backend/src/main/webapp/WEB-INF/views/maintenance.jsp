<%--
  S40 (40.15): shown by MaintenanceModeFilter with status 503. A plain page: no data, no forms, no session.
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ include file="/WEB-INF/views/common/header.jspf" %>
    <h1 class="page__title">Down for maintenance</h1>
    <p class="maintenance">TaskFlow Admin is being updated. Please try again in a few minutes.</p>
<%@ include file="/WEB-INF/views/common/footer.jspf" %>
