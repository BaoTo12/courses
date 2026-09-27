package com.taskflow;

import com.taskflow.db.TestDatabase;
import java.io.File;
import org.apache.catalina.Context;
import org.apache.catalina.connector.Connector;
import org.apache.catalina.WebResourceRoot;
import org.apache.catalina.startup.Tomcat;
import org.apache.catalina.valves.ErrorReportValve;
import org.apache.catalina.webresources.DirResourceSet;
import org.apache.catalina.webresources.StandardRoot;
import org.apache.tomcat.util.net.SSLHostConfig;
import org.apache.tomcat.util.net.SSLHostConfigCertificate;

/**
 * PROVIDED (S48, 48.02): TaskFlow's backend for local development WITHOUT a Tomcat install or image:
 * a real MySQL in a container (Testcontainers, like the tests: db/01–04 are applied) + an embedded Tomcat 9 on
 * http://localhost:8080/taskflow, serving src/main/webapp and target/classes exactly like the test harness.
 *
 *   cd backend && mvn -q test-compile
 *   mvn -q dependency:build-classpath -Dmdep.outputFile=target/cp.txt
 *   java -cp "target/classes;target/test-classes;<contents of target/cp.txt>" com.taskflow.DevServer     (":" on macOS/Linux)
 *
 * Stop with Ctrl+C: the container is removed. The data is fresh at every start (the seed of db/03-seed.sql).
 * With Docker Compose (28.01) you don't need this: `docker compose up` gives the same URLs.
 */
public final class DevServer {

  private DevServer() {}

  public static void main(String[] args) throws Exception {
    TestDatabase.start();                                   // sets taskflow.db.* system properties for DataSourceProvider
    Tomcat tomcat = new Tomcat();
    File baseDir = new File("target/dev-tomcat");
    tomcat.setBaseDir(baseDir.getAbsolutePath());
    tomcat.setPort(Integer.getInteger("port", 8080));
    tomcat.getConnector();
    ErrorReportValve errorReport = new ErrorReportValve();  // as in tomcat/server.xml (43.10)
    errorReport.setShowReport(false);
    errorReport.setShowServerInfo(false);
    tomcat.getHost().getPipeline().addValve(errorReport);
    String keystore = System.getProperty("https.keystore");     // S50 (50.07): -Dhttps.keystore=target/dev-keystore.p12
    if (keystore != null) tomcat.getService().addConnector(httpsConnector(keystore));
    Context ctx = tomcat.addWebapp("/taskflow", new File("src/main/webapp").getAbsolutePath());
    WebResourceRoot resources = new StandardRoot(ctx);
    resources.addPreResources(new DirResourceSet(resources, "/WEB-INF/classes", new File("target/classes").getAbsolutePath(), "/"));
    ctx.setResources(resources);
    tomcat.start();
    System.out.println("TaskFlow backend on http://localhost:" + tomcat.getConnector().getLocalPort() + "/taskflow  (Ctrl+C to stop)");
    tomcat.getServer().await();
  }

  /**
   * S50 (50.07): an HTTPS connector on -Dhttps.port (8443) with the self-signed key from scripts/make-dev-keystore.*.
   * Requests arriving here have request.isSecure() = true: JSESSIONID and TaskFlow's cookies get Secure, and HSTS is sent.
   */
  private static Connector httpsConnector(String keystore) {
    Connector https = new Connector("org.apache.coyote.http11.Http11NioProtocol");
    https.setPort(Integer.getInteger("https.port", 8443));
    https.setScheme("https");
    https.setSecure(true);
    https.setProperty("SSLEnabled", "true");
    SSLHostConfig ssl = new SSLHostConfig();
    SSLHostConfigCertificate certificate = new SSLHostConfigCertificate(ssl, SSLHostConfigCertificate.Type.RSA);
    certificate.setCertificateKeystoreFile(new File(keystore).getAbsolutePath());
    certificate.setCertificateKeystorePassword(System.getProperty("https.password", "changeit"));
    certificate.setCertificateKeyAlias("taskflow");
    ssl.addCertificate(certificate);
    https.addSslHostConfig(ssl);
    return https;
  }
}
