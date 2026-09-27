package com.taskflow.web;

import com.mysql.cj.jdbc.AbandonedConnectionCleanupThread;
import com.taskflow.dao.AuditDao;
import com.taskflow.dao.CategoryDao;
import com.taskflow.dao.CommentDao;
import com.taskflow.dao.TaskDao;
import com.taskflow.dao.UserDao;
import com.taskflow.db.DataSourceProvider;
import com.taskflow.security.LoginThrottle;
import com.taskflow.security.PasswordHasher;
import com.taskflow.service.AccountRegistry;
import com.taskflow.service.AuditService;
import com.taskflow.service.AuthService;
import com.taskflow.service.CategoryCatalog;
import com.taskflow.service.CategoryService;
import com.taskflow.service.TaskService;
import com.taskflow.service.UserAdminService;
import com.zaxxer.hikari.HikariDataSource;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
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
  private static final String CATEGORY_SERVICE = CategoryService.class.getName();
  private static final String AUTH_SERVICE = AuthService.class.getName();
  private static final String AUDIT_SERVICE = AuditService.class.getName();
  private static final String ACCOUNT_REGISTRY = AccountRegistry.class.getName();
  private static final String USER_ADMIN_SERVICE = UserAdminService.class.getName();
  private static final String SESSION_REGISTRY = SessionRegistry.class.getName();
  private static final String EXPORT_EXECUTOR = "taskflow.exportExecutor";

  private HikariDataSource dataSource;
  private EntityManagerFactory entityManagerFactory;
  private ExecutorService exportExecutor;

  @Override
  public void contextInitialized(ServletContextEvent event) {
    dataSource = DataSourceProvider.create(); // fails fast if MySQL is unreachable: the app doesn't start
    entityManagerFactory = Persistence.createEntityManagerFactory("taskflow", Map.of(
        "javax.persistence.nonJtaDataSource", dataSource,
        // load entity classes with THIS web app's class loader (matters when Hibernate isn't in WEB-INF/lib, e.g. tests)
        "hibernate.classLoaders", List.of(AppContextListener.class.getClassLoader())));
    CategoryDao categoryDao = new CategoryDao(entityManagerFactory);
    UserDao userDao = new UserDao(entityManagerFactory);
    AuditDao auditDao = new AuditDao(entityManagerFactory);
    CategoryCatalog catalog = new CategoryCatalog(categoryDao);            // S38: loaded once, shared by all (38.06)
    TaskService taskService = new TaskService(
        new TaskDao(entityManagerFactory), catalog, userDao,
        new CommentDao(entityManagerFactory), Clock.systemDefaultZone());
    ServletContext application = event.getServletContext();
    application.setAttribute(TASK_SERVICE, taskService);
    application.setAttribute(CATEGORY_SERVICE, new CategoryService(categoryDao, catalog)); // S37
    application.setAttribute(AppStats.ATTRIBUTE, new AppStats());         // S38: live counters (38.07)
    LoginThrottle throttle = new LoginThrottle(5, 20, Duration.ofMinutes(15), Clock.systemUTC()); // S41 (41.15)
    application.setAttribute(AUTH_SERVICE, new AuthService(userDao, auditDao, new PasswordHasher(), throttle));
    AuditService auditService = new AuditService(auditDao);                // S42
    AccountRegistry accounts = new AccountRegistry(userDao);              // S42: accounts' current state (42.07)
    application.setAttribute(AUDIT_SERVICE, auditService);
    application.setAttribute(ACCOUNT_REGISTRY, accounts);
    application.setAttribute(USER_ADMIN_SERVICE, new UserAdminService(userDao, accounts, auditService));
    // S45 (45.05, 45.09): a listener WITH dependencies, registered in code (a @WebListener gets no constructor arguments)
    SessionRegistry sessions = new SessionRegistry(auditService);
    application.addListener(sessions);
    application.setAttribute(SESSION_REGISTRY, sessions);
    // S45 (45.14): a small pool for CSV exports, OUR threads (not Tomcat's request threads); shut down below
    exportExecutor = Executors.newFixedThreadPool(2);
    application.setAttribute(EXPORT_EXECUTOR, exportExecutor);
    event.getServletContext().log("TaskFlow started: the database is ready");
  }

  @Override
  public void contextDestroyed(ServletContextEvent event) {
    if (exportExecutor != null) exportExecutor.shutdownNow();  // S45: no thread may outlive the web app (45.18)
    if (entityManagerFactory != null) entityManagerFactory.close();
    if (dataSource != null) dataSource.close();
    AbandonedConnectionCleanupThread.checkedShutdown(); // a MySQL driver thread, or Tomcat reports a leak on redeploy
  }

  /** For servlets' init(): the one TaskService of this application. */
  public static TaskService taskService(ServletContext context) {
    return (TaskService) context.getAttribute(TASK_SERVICE);
  }

  /** S41: the one AuthService of this application. */
  public static AuthService authService(ServletContext context) {
    return (AuthService) context.getAttribute(AUTH_SERVICE);
  }

  /** S42: the audit log. */
  public static AuditService auditService(ServletContext context) {
    return (AuditService) context.getAttribute(AUDIT_SERVICE);
  }

  /** S42: every account's current state (enabled, role). */
  public static AccountRegistry accountRegistry(ServletContext context) {
    return (AccountRegistry) context.getAttribute(ACCOUNT_REGISTRY);
  }

  /** S42: user management for admins. */
  public static UserAdminService userAdminService(ServletContext context) {
    return (UserAdminService) context.getAttribute(USER_ADMIN_SERVICE);
  }

  /** S45: who is logged in now. */
  public static SessionRegistry sessionRegistry(ServletContext context) {
    return (SessionRegistry) context.getAttribute(SESSION_REGISTRY);
  }

  /** S45: the thread pool for async exports. */
  public static ExecutorService exportExecutor(ServletContext context) {
    return (ExecutorService) context.getAttribute(EXPORT_EXECUTOR);
  }

  /** S37: the one CategoryService of this application. */
  public static CategoryService categoryService(ServletContext context) {
    return (CategoryService) context.getAttribute(CATEGORY_SERVICE);
  }
}
