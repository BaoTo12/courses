<%--
  S34 (34.16): EL's implicit objects for THIS request. ElDebugServlet (loopback only) forwards here.
  \${…} prints a literal "${…}" (34.02). Parameters, headers and cookies are attacker-controlled text: escaped (34.18).
  S35 (35.07): fn:escapeXml instead of Html.escape, and every header and cookie listed with <c:forEach> over a Map.
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ include file="/WEB-INF/views/common/header.jspf" %>
    <h1 class="page__title">EL debug</h1>
    <p class="text-muted">Try <a href="?q=hello&amp;tag=a&amp;tag=b&amp;page=4">?q=hello&amp;tag=a&amp;tag=b&amp;page=4</a></p>
    <table>
      <thead><tr><th>Expression</th><th>Value</th></tr></thead>
      <tbody>
      <tr><td><code>\${param.q}</code></td><td>${fn:escapeXml(param.q)}</td></tr>
      <tr><td><code>\${paramValues.tag[1]}</code></td><td>${fn:escapeXml(paramValues.tag[1])}</td></tr>
      <tr><td><code>\${param.page + 1}</code></td><td>${param.page + 1}</td></tr>
      <tr><td><code>\${empty param.missing}</code></td><td>${empty param.missing}</td></tr>
      <tr><td><code>\${header['User-Agent']}</code></td><td>${fn:escapeXml(header['User-Agent'])}</td></tr>
      <tr><td><code>\${cookie.tf_lang.value}</code></td><td>${fn:escapeXml(cookie.tf_lang.value)}</td></tr>
      <tr><td><code>\${initParam.greeting}</code></td><td>${fn:escapeXml(initParam.greeting)}</td></tr>
      <tr><td><code>\${pageContext.request.contextPath}</code></td><td>${pageContext.request.contextPath}</td></tr>
      <tr><td><code>\${pageContext.request.method}</code></td><td>${pageContext.request.method}</td></tr>
      <tr><td><code>\${requestScope.scopeDemo}</code></td><td>${requestScope.scopeDemo}</td></tr>
      <tr><td><code>\${applicationScope.scopeDemo}</code></td><td>${applicationScope.scopeDemo}</td></tr>
      <tr><td><code>\${scopeDemo}</code></td><td>${scopeDemo}</td></tr>
      <%-- Not \${sessionScope.…}: in a session="false" page it THROWS IllegalStateException (34.25). --%>
      <tr><td><code>\${empty pageContext.session}</code></td><td>${empty pageContext.session}</td></tr>
      <tr><td><code>\${'5' == 5}</code></td><td>${'5' == 5}</td></tr>
      </tbody>
    </table>

    <h2>All headers</h2>
    <table class="debug-headers">
      <tbody>
      <c:forEach items="${header}" var="h">
        <tr><td><c:out value="${h.key}"/></td><td><c:out value="${h.value}"/></td></tr>
      </c:forEach>
      </tbody>
    </table>

    <h2>All cookies</h2>
    <table class="debug-cookies">
      <tbody>
      <%-- ${cookie} is a Map<String, Cookie>: entry.value is the Cookie, entry.value.value its value (34.14). --%>
      <c:forEach items="${cookie}" var="entry">
        <tr><td><c:out value="${entry.key}"/></td><td><c:out value="${entry.value.value}"/></td></tr>
      </c:forEach>
      </tbody>
    </table>
<%@ include file="/WEB-INF/views/common/footer.jspf" %>
