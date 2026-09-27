<%--
  S51: the profile form. ProfileServlet set: form (displayName, locale, theme as typed), errors, locales, themes.
  Values are escaped (fn:escapeXml in attributes, 35.11); the choices come from the server's allow-lists.
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<fmt:message key="profile.title" var="profileTitle"/>
<t:layout title="${profileTitle}">
    <h1 class="page__title">${profileTitle}</h1>
    <jsp:include page="/WEB-INF/views/common/form-errors.jsp">
      <jsp:param name="title" value="The profile was not saved:"/>
    </jsp:include>
    <form method="post" action="<c:url value='/profile'/>" class="form profile-form">
      <input type="hidden" name="_csrf" value="${csrfToken}">
      <div class="form-field${empty errors.displayName ? '' : ' form-field--error'}">
        <label class="form-field__label" for="displayName"><fmt:message key="profile.displayName"/></label>
        <input id="displayName" name="displayName" maxlength="100" required value="${fn:escapeXml(form.displayName)}">
      </div>
      <div class="form-field${empty errors.locale ? '' : ' form-field--error'}">
        <label class="form-field__label" for="locale"><fmt:message key="profile.language"/></label>
        <select id="locale" name="locale">
          <c:forEach items="${locales}" var="option">
            <option value="${option}"${option == form.locale ? ' selected' : ''}><fmt:message key="profile.language.${option}"/></option>
          </c:forEach>
        </select>
      </div>
      <div class="form-field${empty errors.theme ? '' : ' form-field--error'}">
        <label class="form-field__label" for="theme"><fmt:message key="profile.theme"/></label>
        <select id="theme" name="theme">
          <c:forEach items="${themes}" var="option">
            <option value="${option}"${option == form.theme ? ' selected' : ''}><fmt:message key="profile.theme.${option}"/></option>
          </c:forEach>
        </select>
      </div>
      <button class="btn" type="submit"><fmt:message key="profile.save"/></button>
    </form>
</t:layout>