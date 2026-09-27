<%--
  S49: a JSP page with a React ISLAND. Everything outside #board-root is server-rendered (layout, nav, the heading, the
  noscript text); #board-root is React's. Order of events (49.02):
    1. ReactBoardServlet → this JSP → HTML with the JSON data block and an EMPTY #board-root
    2. the browser parses it; the module script is deferred by nature: it runs after parsing, so #board-root exists
    3. the island reads #board-data (textContent + JSON.parse), seeds its Redux store, and mounts React into #board-root
  The script carries this response's CSP nonce (49.06). ${initialJson} is already escaped for a script element (49.05):
  written WITHOUT <c:out>, which would HTML-escape the quotes and break the JSON.
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<fmt:message key="board.title" var="boardTitle"/>
<t:layout title="${boardTitle}">
    <h1 class="page__title">${boardTitle}</h1>
    <p class="text-muted"><fmt:message key="board.intro"/></p>

    <script type="application/json" id="board-data">${initialJson}</script>
    <div id="board-root" class="island" data-app-base="<c:url value='/app/'/>">
      <noscript><fmt:message key="board.noscript"/></noscript>
    </div>

    <c:choose>
      <c:when test="${not empty island}">
        <c:forEach items="${island.styles}" var="css">
          <link rel="stylesheet" href="<c:url value='${css}'/>">
        </c:forEach>
        <script type="module" nonce="${cspNonce}" src="<c:url value='${island.script}'/>"></script>
      </c:when>
      <c:otherwise>
        <p class="text-danger"><fmt:message key="board.notBuilt"/></p>
      </c:otherwise>
    </c:choose>
</t:layout>
