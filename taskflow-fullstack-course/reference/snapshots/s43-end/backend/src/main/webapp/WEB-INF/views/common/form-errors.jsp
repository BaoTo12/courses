<%--
  S39 (39.05, 39.06): a summary of a form's errors, reusable by any form page:
    <jsp:include page="/WEB-INF/views/common/form-errors.jsp">
      <jsp:param name="title" value="The category wasn't saved:"/>
    </jsp:include>
  Data in: the request attribute "errors" (Map field → message) and the parameter "title" (${param.title}).
--%>
<%@ page pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<c:if test="${not empty errors}">
      <div class="form-errors" role="alert">
        <p class="form-errors__title"><c:out value="${empty param.title ? 'Please fix the following:' : param.title}"/></p>
        <c:forEach items="${errors}" var="error"><p class="form-field__error"><c:out value="${error.value}"/></p></c:forEach>
      </div>
</c:if>
