<%--
  S34 (34.16): EL's implicit objects for THIS request. ElDebugServlet (loopback only) forwards here.
  \${…} prints a literal "${…}" (34.02). Parameters, headers and cookies are attacker-controlled text: escaped (34.18).
  No loops yet (EL has no statements): S35 lists every header and cookie with <c:forEach>.
--%>
<%@ page contentType="text/html;charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="true" %>
<%@ page import="com.taskflow.web.Html" %>
<%@ include file="/WEB-INF/views/common/header.jspf" %>
    <h1 class="page__title">EL debug</h1>
    <p class="text-muted">Try <a href="?q=hello&amp;tag=a&amp;tag=b&amp;page=4">?q=hello&amp;tag=a&amp;tag=b&amp;page=4</a></p>
    <table>
      <thead><tr><th>Expression</th><th>Value</th></tr></thead>
      <tbody>
      <tr><td><code>\${param.q}</code></td><td>${Html.escape(param.q)}</td></tr>
      <tr><td><code>\${paramValues.tag[1]}</code></td><td>${Html.escape(paramValues.tag[1])}</td></tr>
      <tr><td><code>\${param.page + 1}</code></td><td>${param.page + 1}</td></tr>
      <tr><td><code>\${empty param.missing}</code></td><td>${empty param.missing}</td></tr>
      <tr><td><code>\${header['User-Agent']}</code></td><td>${Html.escape(header['User-Agent'])}</td></tr>
      <tr><td><code>\${cookie.tf_lang.value}</code></td><td>${Html.escape(cookie.tf_lang.value)}</td></tr>
      <tr><td><code>\${initParam.greeting}</code></td><td>${Html.escape(initParam.greeting)}</td></tr>
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
<%@ include file="/WEB-INF/views/common/footer.jspf" %>
