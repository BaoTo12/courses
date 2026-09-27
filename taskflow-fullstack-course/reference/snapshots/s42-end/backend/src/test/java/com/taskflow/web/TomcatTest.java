package com.taskflow.web;

import com.taskflow.db.TestDatabase;
import java.io.File;
import java.io.IOException;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.catalina.Context;
import org.apache.catalina.LifecycleException;
import org.apache.catalina.WebResourceRoot;
import org.apache.catalina.startup.Tomcat;
import org.apache.catalina.webresources.DirResourceSet;
import org.apache.catalina.webresources.StandardRoot;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;

/**
 * PROVIDED test harness (S30): starts a real, embedded Tomcat 9 with THIS project's webapp, as deployed:
 * docBase = src/main/webapp (web.xml, static files, later JSPs), and target/classes mounted at WEB-INF/classes,
 * so @WebServlet annotations are scanned exactly as in a WAR. Tests then talk HTTP to it.
 * Subclasses share one server per test class. Redirects are NOT followed: tests see the 302 itself.
 * S36: every Tomcat talks to the same real MySQL (TestDatabase), so tests create the data they change.
 * S37: the client keeps cookies (the session holds the CSRF token); postForm() adds the token to every form.
 * S41: every test class starts LOGGED IN as alice; loggedInClient() opens a second browser as another user.
 */
public abstract class TomcatTest {

  protected static final String CONTEXT = "/taskflow";
  private static Tomcat tomcat;
  private static int port;
  private static final CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
  private static final HttpClient client =
      HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).cookieHandler(cookies).build();
  private static final Pattern CSRF_FIELD = Pattern.compile("name=\"_csrf\" value=\"([^\"]+)\"");
  private static String csrfToken;

  @BeforeAll
  static void startTomcat() throws LifecycleException, IOException, InterruptedException {
    TestDatabase.start(); // S36: the app's listener opens a connection pool at startup (36.04)
    cookies.getCookieStore().removeAll(); // S37: a new server, a new session
    csrfToken = null;
    tomcat = new Tomcat();
    File baseDir = new File("target/tomcat");
    deleteRecursively(baseDir); // fresh JSP translations every run: Jasper doesn't notice web.xml changes (33.04)
    tomcat.setBaseDir(baseDir.getAbsolutePath());
    tomcat.setPort(0); // any free port
    tomcat.getConnector(); // creates the default HTTP connector
    Context ctx = tomcat.addWebapp(CONTEXT, new File("src/main/webapp").getAbsolutePath());
    WebResourceRoot resources = new StandardRoot(ctx);
    resources.addPreResources(new DirResourceSet(resources, "/WEB-INF/classes", new File("target/classes").getAbsolutePath(), "/"));
    ctx.setResources(resources);
    tomcat.start();
    port = tomcat.getConnector().getLocalPort();
    login(client, "alice", "alice123");  // S41: every page except /login and a few public ones needs a user
  }

  @AfterAll
  static void stopTomcat() throws LifecycleException {
    tomcat.stop();
    tomcat.destroy();
  }

  private static void deleteRecursively(File file) {
    File[] children = file.listFiles();
    if (children != null) for (File child : children) deleteRecursively(child);
    file.delete();
  }

  protected static URI uri(String pathAndQuery) {
    return URI.create("http://localhost:" + port + pathAndQuery);
  }

  protected static HttpResponse<String> get(String pathAndQuery) throws IOException, InterruptedException {
    return client.send(HttpRequest.newBuilder(uri(pathAndQuery)).GET().build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
  }

  protected static HttpResponse<String> send(HttpRequest request) throws IOException, InterruptedException {
    return client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
  }

  /** S37: this client's session CSRF token, read once from a page with a form. */
  protected static String csrfToken() throws IOException, InterruptedException {
    if (csrfToken == null) {
      Matcher m = CSRF_FIELD.matcher(get(CONTEXT + "/tasks/new").body());
      if (!m.find()) throw new IllegalStateException("No CSRF field on /tasks/new");
      csrfToken = m.group(1);
    }
    return csrfToken;
  }

  /** S37: POSTs an urlencoded form body, with this session's CSRF token added (as a browser's form would). */
  protected static HttpResponse<String> postForm(String pathAndQuery, String urlEncodedBody) throws IOException, InterruptedException {
    String token = "_csrf=" + URLEncoder.encode(csrfToken(), StandardCharsets.UTF_8);
    String body = urlEncodedBody.isEmpty() ? token : urlEncodedBody + "&" + token;
    return send(HttpRequest.newBuilder(uri(pathAndQuery))
        .header("Content-Type", "application/x-www-form-urlencoded")
        .POST(HttpRequest.BodyPublishers.ofString(body)).build());
  }

  /** S41: a separate browser (its own cookies), logged in as this user. */
  protected static HttpClient loggedInClient(String username, String password) throws IOException, InterruptedException {
    HttpClient other = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER)
        .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL)).build();
    login(other, username, password);
    return other;
  }

  /** S41: GET /login (a pre-login session + its token), then POST the credentials; expects the 303 of a success. */
  protected static void login(HttpClient browser, String username, String password) throws IOException, InterruptedException {
    String page = browser.send(HttpRequest.newBuilder(uri(CONTEXT + "/login")).GET().build(),
        HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)).body();
    Matcher m = CSRF_FIELD.matcher(page);
    if (!m.find()) throw new IllegalStateException("No CSRF field on /login");
    String body = "username=" + URLEncoder.encode(username, StandardCharsets.UTF_8)
        + "&password=" + URLEncoder.encode(password, StandardCharsets.UTF_8)
        + "&_csrf=" + URLEncoder.encode(m.group(1), StandardCharsets.UTF_8);
    HttpResponse<String> response = browser.send(HttpRequest.newBuilder(uri(CONTEXT + "/login"))
        .header("Content-Type", "application/x-www-form-urlencoded")
        .POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    if (response.statusCode() != 303) throw new IllegalStateException("Login as " + username + " failed: " + response.statusCode());
    if (browser == client) csrfToken = null;   // the token changes at login (41.11)
  }
}
