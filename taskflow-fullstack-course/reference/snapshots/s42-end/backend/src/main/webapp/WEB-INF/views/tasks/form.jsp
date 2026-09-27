<%--
  S37 (37.06): ONE form for creating and editing a task. TaskFormPage set: form (the values AS TYPED), errors
  (field → message; empty when there are none), taskId (null when creating), formAction, priorities, categories,
  and csrfToken. Values are echoed into attributes, so they're escaped (fn:escapeXml, 35.04).
  Choices compare STRINGS (p.name() == form.priority): a form value can be anything, even "URGENT", and comparing
  it with an enum would make EL convert it, and fail (34.13).
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ include file="/WEB-INF/views/common/header.jspf" %>
    <h1 class="page__title"><c:out value="${pageTitle}"/></h1>

    <form class="form" method="post" action="<c:url value='${formAction}'/>">
      <input type="hidden" name="_csrf" value="${csrfToken}">
      <c:if test="${not empty taskId}"><input type="hidden" name="id" value="${taskId}"></c:if>

      <div class="form-field${empty errors.title ? '' : ' form-field--error'}">
        <label class="form-field__label">Title
          <input class="form-field__input" name="title" maxlength="120" required value="${fn:escapeXml(form.title)}">
        </label>
        <c:if test="${not empty errors.title}"><span class="form-field__error"><c:out value="${errors.title}"/></span></c:if>
      </div>

      <div class="form-field${empty errors.description ? '' : ' form-field--error'}">
        <label class="form-field__label">Description
          <textarea class="form-field__input" name="description" rows="4" maxlength="2000"><c:out value="${form.description}"/></textarea>
        </label>
        <c:if test="${not empty errors.description}"><span class="form-field__error"><c:out value="${errors.description}"/></span></c:if>
      </div>

      <div class="form-field${empty errors.priority ? '' : ' form-field--error'}">
        <label class="form-field__label">Priority
          <select class="form-field__input" name="priority">
            <c:forEach items="${priorities}" var="p">
              <option${p.name() == form.priority ? ' selected' : ''}>${p}</option>
            </c:forEach>
          </select>
        </label>
        <c:if test="${not empty errors.priority}"><span class="form-field__error"><c:out value="${errors.priority}"/></span></c:if>
      </div>

      <div class="form-field${empty errors.dueDate ? '' : ' form-field--error'}">
        <label class="form-field__label">Due date
          <input class="form-field__input" type="date" name="dueDate" value="${fn:escapeXml(form.dueDate)}">
        </label>
        <c:if test="${not empty errors.dueDate}"><span class="form-field__error"><c:out value="${errors.dueDate}"/></span></c:if>
      </div>

      <div class="form-field${empty errors.categoryId ? '' : ' form-field--error'}">
        <label class="form-field__label">Category
          <select class="form-field__input" name="categoryId">
            <option value="">No category</option>
            <c:forEach items="${categories}" var="category">
              <option value="${category.id}"${category.id.toString() == form.categoryId ? ' selected' : ''}><c:out value="${category.name}"/></option>
            </c:forEach>
          </select>
        </label>
        <c:if test="${not empty errors.categoryId}"><span class="form-field__error"><c:out value="${errors.categoryId}"/></span></c:if>
      </div>

      <div class="form__actions">
        <button class="btn btn--primary" type="submit">${empty taskId ? 'Create task' : 'Save changes'}</button>
        <a class="btn btn--secondary" href="<c:url value='${empty taskId ? "/tasks" : "/tasks/view?id="}'/>${taskId}">Cancel</a>
      </div>
    </form>
<%@ include file="/WEB-INF/views/common/footer.jspf" %>
