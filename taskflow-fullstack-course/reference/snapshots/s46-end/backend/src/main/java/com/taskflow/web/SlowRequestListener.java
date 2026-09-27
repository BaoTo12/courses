package com.taskflow.web;

import com.taskflow.security.AuthUser;
import com.taskflow.service.AuditService;
import javax.servlet.ServletContext;
import javax.servlet.ServletRequestEvent;
import javax.servlet.ServletRequestListener;
import javax.servlet.annotation.WebListener;
import javax.servlet.http.HttpServletRequest;

/**
 * S45 (45.16, Your Turn): every request slower than the context param taskflow.slowRequestMillis (web.xml, 500)
 * becomes a SLOW_REQUEST audit event: "GET /taskflow/tasks 734ms".
 * Thread-safe by construction: the start time lives in the REQUEST (one per thread), the threshold is read once
 * and never changes (final), and AuditService is itself safe for concurrent use. No field is written per request.
 */
@WebListener
public class SlowRequestListener implements ServletRequestListener {

  private static final String STARTED = SlowRequestListener.class.getName() + ".started";

  @Override
  public void requestInitialized(ServletRequestEvent event) {
    event.getServletRequest().setAttribute(STARTED, System.nanoTime());
  }

  @Override
  public void requestDestroyed(ServletRequestEvent event) {
    Object started = event.getServletRequest().getAttribute(STARTED);
    if (!(started instanceof Long) || !(event.getServletRequest() instanceof HttpServletRequest request)) return;
    long millis = (System.nanoTime() - (Long) started) / 1_000_000;
    ServletContext application = event.getServletContext();
    if (millis < threshold(application)) return;
    AuditService audit = AppContextListener.auditService(application);
    if (audit == null) return;                                    // the app failed to start: nothing to write to
    AuthUser user = CurrentUser.get(request);
    audit.record("SLOW_REQUEST", user == null ? null : user.getUsername(), request.getRemoteAddr(),
        request.getMethod() + " " + request.getRequestURI() + " " + millis + "ms");
  }

  private static long threshold(ServletContext application) {
    String value = application.getInitParameter("taskflow.slowRequestMillis");
    return value == null ? 500 : Long.parseLong(value.trim());
  }
}
