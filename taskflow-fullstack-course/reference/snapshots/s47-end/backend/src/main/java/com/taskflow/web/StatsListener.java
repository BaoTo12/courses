package com.taskflow.web;

import javax.servlet.ServletRequestEvent;
import javax.servlet.ServletRequestListener;
import javax.servlet.annotation.WebListener;
import javax.servlet.http.HttpSessionEvent;
import javax.servlet.http.HttpSessionListener;

/**
 * S38 (38.07): the container calls these for EVERY request and EVERY session, on whichever thread handles them.
 * They only update AppStats (application scope), which is built for concurrent use.
 */
@WebListener
public class StatsListener implements ServletRequestListener, HttpSessionListener {

  @Override
  public void requestInitialized(ServletRequestEvent event) {
    stats(event.getServletContext()).requestStarted();
  }

  @Override
  public void sessionCreated(HttpSessionEvent event) {
    stats(event.getSession().getServletContext()).sessionCreated();
  }

  @Override
  public void sessionDestroyed(HttpSessionEvent event) {  // invalidate() or the 30-minute timeout (web.xml)
    stats(event.getSession().getServletContext()).sessionDestroyed();
  }

  private static AppStats stats(javax.servlet.ServletContext application) {
    return (AppStats) application.getAttribute(AppStats.ATTRIBUTE);
  }
}
