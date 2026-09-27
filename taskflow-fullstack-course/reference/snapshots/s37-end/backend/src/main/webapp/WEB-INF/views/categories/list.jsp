<%--
  S37 (37.15): category management. CategoryListServlet set: categories, counts (Map<Long, Integer>), newForm, errors
  and csrfToken. Every form POSTs with the token; every success is a 303 back here with a flash message (PRG).
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ include file="/WEB-INF/views/common/header.jspf" %>
    <h1 class="page__title">Categories</h1>

    <c:if test="${not empty errors}">
      <div class="form-errors" role="alert">
        <c:forEach items="${errors}" var="error"><p class="form-field__error"><c:out value="${error.value}"/></p></c:forEach>
      </div>
    </c:if>

    <table class="categories">
      <thead><tr><th>Name and colour</th><th>Tasks</th><th></th></tr></thead>
      <tbody>
      <c:forEach items="${categories}" var="category">
        <tr>
          <td>
            <form method="post" action="<c:url value='/categories/save'/>" style="display:inline">
              <input type="hidden" name="_csrf" value="${csrfToken}">
              <input type="hidden" name="id" value="${category.id}">
              <input name="name" maxlength="50" value="${fn:escapeXml(category.name)}" aria-label="Name">
              <input type="color" name="color" value="${fn:escapeXml(category.color)}" aria-label="Colour">
              <button class="btn btn--sm btn--secondary" type="submit">Save</button>
            </form>
          </td>
          <td class="category__count">${counts[category.id] + 0}</td>
          <td>
            <form method="post" action="<c:url value='/categories/delete'/>" style="display:inline" data-confirm-title="${fn:escapeXml(category.name)}">
              <input type="hidden" name="_csrf" value="${csrfToken}">
              <input type="hidden" name="id" value="${category.id}">
              <button class="btn btn--sm btn--secondary" type="submit">Delete</button>
            </form>
          </td>
        </tr>
      </c:forEach>
      </tbody>
    </table>

    <h2>New category</h2>
    <form method="post" action="<c:url value='/categories/save'/>">
      <input type="hidden" name="_csrf" value="${csrfToken}">
      <input name="name" maxlength="50" required value="${fn:escapeXml(newForm.name)}" aria-label="Name">
      <input type="color" name="color" value="${fn:escapeXml(newForm.color)}" aria-label="Colour">
      <button class="btn btn--sm btn--primary" type="submit">Add category</button>
    </form>
<%@ include file="/WEB-INF/views/common/footer.jspf" %>
