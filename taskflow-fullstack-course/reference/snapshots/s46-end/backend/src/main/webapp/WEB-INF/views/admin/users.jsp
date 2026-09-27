<%--
  S42 (42.07): user management. AdminUsersServlet set: accounts (UserDao.Account), roles, csrfToken (the filter).
  The admin's own row has no forms: the service refuses self-changes anyway (defence in depth, 42.06).
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ include file="/WEB-INF/views/common/header.jspf" %>
    <h1 class="page__title">Users</h1>

    <table class="users">
      <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
      <tbody>
      <c:forEach items="${accounts}" var="account">
        <tr class="${account.enabled ? '' : 'is-disabled'}">
          <td><c:out value="${account.displayName}"/> (<c:out value="${account.username}"/>)</td>
          <td><c:out value="${account.email}"/></td>
          <c:choose>
            <c:when test="${account.id == currentUser.id}">
              <td>${account.role}</td>
              <td>Enabled (you)</td>
            </c:when>
            <c:otherwise>
              <td>
                <form method="post" action="<c:url value='/admin/users/role'/>" class="inline-form">
                  <input type="hidden" name="_csrf" value="${csrfToken}">
                  <input type="hidden" name="id" value="${account.id}">
                  <select name="role" aria-label="Role of ${fn:escapeXml(account.username)}">
                    <c:forEach items="${roles}" var="role">
                      <option value="${role}"${role == account.role ? ' selected' : ''}>${role}</option>
                    </c:forEach>
                  </select>
                  <button class="btn btn--sm btn--secondary" type="submit">Change role</button>
                </form>
              </td>
              <td>
                <c:set var="statusAction" value="${account.enabled ? '/admin/users/disable' : '/admin/users/enable'}"/>
                <form method="post" action="<c:url value='${statusAction}'/>" class="inline-form">
                  <input type="hidden" name="_csrf" value="${csrfToken}">
                  <input type="hidden" name="id" value="${account.id}">
                  ${account.enabled ? 'Enabled' : 'Disabled'}
                  <button class="btn btn--sm btn--secondary" type="submit">${account.enabled ? 'Disable' : 'Enable'}</button>
                </form>
              </td>
            </c:otherwise>
          </c:choose>
        </tr>
      </c:forEach>
      </tbody>
    </table>
<%@ include file="/WEB-INF/views/common/footer.jspf" %>
