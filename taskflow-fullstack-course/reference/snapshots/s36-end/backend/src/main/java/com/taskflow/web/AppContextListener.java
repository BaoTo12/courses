package com.taskflow.web;

import com.mysql.cj.jdbc.AbandonedConnectionCleanupThread;
import com.taskflow.dao.CategoryDao;
import com.taskflow.dao.CommentDao;
import com.taskflow.dao.TaskDao;
import com.taskflow.dao.UserDao;
import com.taskflow.db.DataSourceProvider;
import com.taskflow.service.TaskService;
import com.zaxxer.hikari.HikariDataSource;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import javax.persistence.EntityManagerFactory;
import javax.persistence.Persistence;
import javax.servlet.ServletContext;
import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;
import javax.servlet.annotation.WebListener;

/**
 * S36 (36.04): builds the application's long-lived objects ONCE, when the web app starts, and shares them through
 * the ServletContext (application scope, 30.13). Servlets fetch them in init(). At shutdown, everything is closed.
 *
 *   startup:  connection pool → data layer (PROVIDED, JPA) → DAOs → TaskService → servletContext.setAttribute(…)
 *   shutdown: close the data layer and the pool (or Tomcat reports leaks on redeploy)
 */
@WebListener
public class AppContextListener implements ServletContextListener {

  private static final String TASK_SERVICE = TaskService.class.getName();

  private HikariDataSource dataSource;
  private EntityManagerFactory entityManagerFactory;

  @Override
  public void contextInitialized(ServletContextEvent event) {
    dataSource = DataSourceProvider.create(); // fails fast if MySQL is unreachable: the app doesn't start
    entityManagerFactory = Persistence.createEntityManagerFactory("taskflow", Map.of(
        "javax.persistence.nonJtaDataSource", dataSource,
        // load entity classes with THIS web app's class loader (matters when Hibernate isn't in WEB-INF/lib, e.g. tests)
        "hibernate.classLoaders", List.of(AppContextListener.class.getClassLoader())));
    TaskService taskService = new TaskService(
        new TaskDao(entityManagerFactory), new CategoryDao(entityManagerFactory), new UserDao(entityManagerFactory),
        new CommentDao(entityManagerFactory), Clock.systemDefaultZone());
    event.getServletContext().setAttribute(TASK_SERVICE, taskService);
    event.getServletContext().log("TaskFlow started: the database is ready");
  }

  @Override
  public void contextDestroyed(ServletContextEvent event) {
    if (entityManagerFactory != null) entityManagerFactory.close();
    if (dataSource != null) dataSource.close();
    AbandonedConnectionCleanupThread.checkedShutdown(); // a MySQL driver thread, or Tomcat reports a leak on redeploy
  }

  /** For servlets' init(): the one TaskService of this application. */
  public static TaskService taskService(ServletContext context) {
    return (TaskService) context.getAttribute(TASK_SERVICE);
  }
}
