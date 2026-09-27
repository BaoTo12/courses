<%--
  S44 (44.10, 44.11): the page layout as a TAG FILE. A page becomes
    <t:layout title="…"> …its own content… </t:layout>
  instead of "include header.jspf … include footer.jspf". The tag sets pageTitle in ITS page scope, where the included
  header finds it first (34.03), then renders the header, the caller's body (<jsp:doBody/>) and the footer.
  The header and footer fragments are the same files the other pages include: one layout, two ways to use it.
--%>
<%@ tag description="TaskFlow Admin page layout" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ attribute name="title" required="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<c:set var="pageTitle" value="${title}"/>
<%@ include file="/WEB-INF/views/common/header.jspf" %>
<jsp:doBody/>
<%@ include file="/WEB-INF/views/common/footer.jspf" %>