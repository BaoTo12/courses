package com.taskflow.web.filters;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * S49 (49.10): TaskFlow Web (the full React SPA, built by `npm run build:war`) lives in the WAR under /app/.
 *   /app/assets/…-hash.js|css, /app/locales/…  → real files: the default servlet serves them (hashed assets: cached for a year)
 *   /app, /app/, /app/tasks/5, /app/login …     → index.html: React Router (basename /taskflow/app/) renders the route.
 *                                                Without this, a reload on /app/tasks/5 would be Tomcat's 404.
 * index.html is served with THIS response's CSP nonce in place of the build's placeholder (Vite's html.cspNonce puts
 * nonce="__CSP_NONCE__" on its script/link tags and a <meta property="csp-nonce"> for styled-components: 49.06), and
 * never cached (it names the current hashed assets).
 */
public class SpaFallbackFilter implements Filter {

  static final String PLACEHOLDER = "__CSP_NONCE__";
  private static final String INDEX = "/app/index.html";

  @Override
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
    HttpServletRequest request = (HttpServletRequest) req;
    HttpServletResponse response = (HttpServletResponse) res;
    String method = request.getMethod();
    if (!"GET".equals(method) && !"HEAD".equals(method)) {
      chain.doFilter(req, res);
      return;
    }
    String path = request.getServletPath() + (request.getPathInfo() == null ? "" : request.getPathInfo());
    if (path.equals("/app")) {                                   // /taskflow/app → /taskflow/app/ (relative URLs need the slash)
      response.sendRedirect(request.getContextPath() + "/app/");
      return;
    }
    ServletContext context = request.getServletContext();
    if (!path.endsWith("/") && !path.endsWith(".html") && isFile(context, path)) {
      if (path.startsWith("/app/assets/")) response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      chain.doFilter(req, res);
      return;
    }
    String html = readIndex(context);
    if (html == null) {
      response.sendError(HttpServletResponse.SC_NOT_FOUND);    // the SPA hasn't been built into the WAR
      return;
    }
    Object nonce = request.getAttribute(SecurityHeadersFilter.NONCE_ATTRIBUTE);
    response.setContentType("text/html;charset=UTF-8");
    response.setHeader("Cache-Control", "no-store");
    response.getWriter().write(html.replace(PLACEHOLDER, nonce == null ? "" : nonce.toString()));
  }

  private static boolean isFile(ServletContext context, String path) throws IOException {
    URL resource = context.getResource(path);
    return resource != null && !path.substring(path.lastIndexOf('/') + 1).isEmpty();
  }

  private static String readIndex(ServletContext context) throws IOException {
    try (InputStream in = context.getResourceAsStream(INDEX)) {
      return in == null ? null : new String(in.readAllBytes(), StandardCharsets.UTF_8);
    }
  }
}
