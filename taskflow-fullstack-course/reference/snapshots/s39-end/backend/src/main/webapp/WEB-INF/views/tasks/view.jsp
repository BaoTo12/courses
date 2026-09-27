<%--
  One task. TaskViewServlet handled 400/404 and set "details" (a TaskDetails) and "pageTitle".
  S34 (34.09): EL only. S35: <c:out> for every piece of user text (its `default` replaces S34's `empty ? … : …`),
  and the comments section (35.18 Your Turn): an empty state, row numbers and zebra rows from varStatus,
  a label for comments written by admins. Comment bodies are stored as typed and escaped HERE (35.15).
  ${' '} before the badge: trimDirectiveWhitespaces deletes a plain leading space there (35.22).
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ include file="/WEB-INF/views/common/header.jspf" %>
    <nav class="text-muted"><a href="<c:url value='/tasks'/>">Tasks</a> › <c:out value="${details.task.title}"/></nav>
    <h1 class="page__title"><c:out value="${details.task.title}"/></h1>
    <p><span class="badge">${details.task.status}</span> <span class="badge">${details.task.priority}</span></p>
    <c:choose>
      <c:when test="${empty details.task.description}"><p class="text-muted">No description.</p></c:when>
      <c:otherwise><p class="task__description"><c:out value="${details.task.description}"/></p></c:otherwise>
    </c:choose>
    <dl>
      <dt>Category</dt><dd><c:out value="${details.category.name}" default="No category"/></dd>
      <dt>Owner</dt><dd><c:out value="${details.owner.displayName}"/> (<c:out value="${details.owner.username}"/>)</dd>
      <dt>Due</dt><dd><c:out value="${details.task.dueDate}" default="no due date"/></dd>
    </dl>

    <section id="comments">
      <h2>Comments (${fn:length(details.comments)})</h2>
      <c:choose>
        <c:when test="${empty details.comments}">
          <p class="text-muted">No comments yet.</p>
        </c:when>
        <c:otherwise>
          <table class="comments">
            <tbody>
            <c:forEach items="${details.comments}" var="item" varStatus="row">
              <tr class="${row.count % 2 == 0 ? 'comment--even' : 'comment--odd'}">
                <td class="row-number">#${row.count}</td>
                <td class="comment__author"><c:out value="${item.author.displayName}" default="Deleted user"/><c:if test="${item.author.admin}">${' '}<span class="badge">Admin</span></c:if></td>
                <td class="comment__body"><c:out value="${item.comment.body}"/></td>
                <td class="text-muted">${item.comment.createdAt}</td>
              </tr>
            </c:forEach>
            </tbody>
          </table>
        </c:otherwise>
      </c:choose>
      <form method="post" action="<c:url value='/tasks/comment'/>">
        <input type="hidden" name="_csrf" value="${csrfToken}">
        <input type="hidden" name="id" value="${details.task.id}">
        <textarea name="body" rows="3" maxlength="1000" required></textarea>
        <button class="btn btn--sm" type="submit">Add comment</button>
      </form>
    </section>

    <p>
      <a class="btn btn--secondary btn--sm" href="<c:url value='/tasks'/>">Back to the list</a>
      <a class="btn btn--secondary btn--sm" href="<c:url value='/tasks/edit?id=${details.task.id}'/>">Edit</a>
      <form method="post" action="<c:url value='/tasks/delete'/>" style="display:inline" data-confirm-title="${fn:escapeXml(details.task.title)}">
        <input type="hidden" name="_csrf" value="${csrfToken}">
        <input type="hidden" name="id" value="${details.task.id}">
        <button class="btn btn--secondary btn--sm" type="submit">Delete</button>
      </form>
    </p>
<%@ include file="/WEB-INF/views/common/footer.jspf" %>
