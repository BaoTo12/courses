package com.taskflow.web;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
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
 */
public abstract class TomcatTest {

  protected static final String CONTEXT = "/taskflow";
  private static Tomcat tomcat;
  private static int port;
  private static final HttpClient client = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).build();

  @BeforeAll
  static void startTomcat() throws LifecycleException {
    tomcat = new Tomcat();
    tomcat.setBaseDir(new File("target/tomcat").getAbsolutePath());
    tomcat.setPort(0); // any free port
    tomcat.getConnector(); // creates the default HTTP connector
    Context ctx = tomcat.addWebapp(CONTEXT, new File("src/main/webapp").getAbsolutePath());
    WebResourceRoot resources = new StandardRoot(ctx);
    resources.addPreResources(new DirResourceSet(resources, "/WEB-INF/classes", new File("target/classes").getAbsolutePath(), "/"));
    ctx.setResources(resources);
    tomcat.start();
    port = tomcat.getConnector().getLocalPort();
  }

  @AfterAll
  static void stopTomcat() throws LifecycleException {
    tomcat.stop();
    tomcat.destroy();
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
}
