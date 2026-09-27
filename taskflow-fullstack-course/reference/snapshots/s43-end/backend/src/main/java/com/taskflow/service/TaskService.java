package com.taskflow.service;

import com.taskflow.dao.CommentDao;
import com.taskflow.dao.TaskDao;
import com.taskflow.dao.TaskFilter;
import com.taskflow.dao.TaskSort;
import com.taskflow.dao.UserDao;
import com.taskflow.model.Category;
import com.taskflow.model.Comment;
import com.taskflow.model.Task;
import com.taskflow.model.TaskDetails;
import com.taskflow.model.TaskStatus;
import com.taskflow.security.AccessDeniedException;
import com.taskflow.security.AuthUser;
import java.time.Clock;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.OptionalLong;
import java.util.Set;

/**
 * PROVIDED (S36): the task use cases. Controllers call THIS, never a DAO directly (36.02).
 * It knows the domain rules ("toggle" means DONE ↔ TODO, a comment needs an existing task) and combines DAOs
 * (details = task + category + owner + comments). It knows nothing about HTTP: no request, no response, no JSP.
 * One instance per application, created by AppContextListener (36.04); it has no per-request state, so it's thread-safe.
 *
 * S42: every use case takes the CALLER (the logged-in AuthUser). The access rule lives in exactly two methods:
 *   visible(id, caller)  one task: its owner or an admin; someone else's task → AccessDeniedException (42.05)
 *   ownerScope(caller)   lists and counts: an admin sees every owner (null), a user only themselves (42.09)
 * No controller, filter or view repeats the rule: they can't forget it, and changing it is a one-place change.
 */
public class TaskService {

  private final TaskDao tasks;
  private final CategoryCatalog categories;   // S38: the application-scoped cache (38.06)
  private final UserDao users;
  private final CommentDao comments;
  private final Clock clock;

  public TaskService(TaskDao tasks, CategoryCatalog categories, UserDao users, CommentDao comments, Clock clock) {
    this.tasks = tasks;
    this.categories = categories;
    this.users = users;
    this.comments = comments;
    this.clock = clock;
  }

  /** "Today" for overdue checks: one clock for the whole application (S44: per user timezone). */
  public LocalDate today() {
    return LocalDate.now(clock);
  }

  public List<Task> find(TaskFilter filter, AuthUser caller) {
    return tasks.find(filter.withOwner(ownerScope(caller)));
  }

  /** S39: not done and due before today (the dashboard). */
  public List<Task> overdue(AuthUser caller) {
    LocalDate today = today();
    return byDueDate(caller).stream().filter(task -> task.isOverdue(today)).toList();
  }

  /** S39: not done and due between today and today + days (the dashboard). */
  public List<Task> dueWithin(int days, AuthUser caller) {
    LocalDate today = today();
    LocalDate last = today.plusDays(days);
    return byDueDate(caller).stream()
        .filter(task -> !task.isDone() && task.getDueDate() != null
            && !task.getDueDate().isBefore(today) && !task.getDueDate().isAfter(last))
        .toList();
  }

  /** Counts per status, keyed by the status NAME, every status present (34.20: the view reads ${stats['DONE']}). */
  public Map<String, Integer> countByStatus(AuthUser caller) {
    Map<String, Integer> stats = new LinkedHashMap<>();
    tasks.countByStatus(ownerScope(caller)).forEach((status, count) -> stats.put(status.name(), count));
    return stats;
  }

  public List<Category> categories() {
    return categories.all();
  }

  /** The details page's view model, or empty if there's no such task. */
  public Optional<TaskDetails> details(long id, AuthUser caller) {
    return visible(id, caller).map(task -> new TaskDetails(
        task,
        task.getCategoryId() == null ? null : categories.byId(task.getCategoryId()).orElse(null),
        users.findById(task.getOwnerId()).orElse(null),
        comments.findByTask(id)));
  }

  /** The ids of the existing categories (a form's category must be one of them, 37.04). */
  public Set<Long> categoryIds() {
    return categories.ids();
  }

  public Optional<Task> task(long id, AuthUser caller) {
    return visible(id, caller);
  }

  /** For /debug/stats only (loopback, no user): NO access check. Never call it from a user-facing controller. */
  public Optional<Task> taskForDiagnostics(long id) {
    return tasks.findById(id);
  }

  /** DuplicateKeyException if the owner already has a task with this title. The owner is set by the controller. */
  public Task create(Task task) {
    return tasks.insert(task);
  }

  /**
   * Saves an edited task. False if it no longer exists. DuplicateKeyException: title already used (S37).
   * S42: checked against the STORED row, not the object passed in: its ownerId could have been changed by the caller.
   */
  public boolean update(Task task, AuthUser caller) {
    Optional<Task> stored = visible(task.getId(), caller);
    if (stored.isEmpty()) return false;
    task.setOwnerId(stored.get().getOwnerId());   // an edit never changes the owner (42.08)
    return tasks.update(task);
  }

  /** DONE ↔ TODO. False if there's no such task. */
  public boolean toggle(long id, AuthUser caller) {
    Optional<Task> found = visible(id, caller);
    if (found.isEmpty()) return false;
    return tasks.updateStatus(id, found.get().isDone() ? TaskStatus.TODO : TaskStatus.DONE);
  }

  public boolean delete(long id, AuthUser caller) {
    return visible(id, caller).isPresent() && tasks.delete(id);
  }

  public OptionalLong latestId(AuthUser caller) {
    return tasks.latestId(ownerScope(caller));
  }

  /** False if the task doesn't exist. The body is stored as typed (35.15). The author is the caller. */
  public boolean addComment(long taskId, AuthUser caller, String body) {
    if (visible(taskId, caller).isEmpty()) return false;
    Comment comment = new Comment();
    comment.setTaskId(taskId);
    comment.setAuthorId(caller.getId());
    comment.setBody(body);
    comments.insert(comment);
    return true;
  }

  // ---- the access rule (S42): these two methods, and nowhere else ----

  /** Empty if there's no such task; AccessDeniedException if it exists but isn't the caller's (and they aren't an admin). */
  private Optional<Task> visible(long id, AuthUser caller) {
    Optional<Task> task = tasks.findById(id);
    if (task.isPresent() && !caller.isAdmin() && task.get().getOwnerId() != caller.getId()) {
      throw new AccessDeniedException("task " + id);
    }
    return task;
  }

  /** The owner a list or count is restricted to: null (everyone) for admins, the caller's own id otherwise. */
  private static Long ownerScope(AuthUser caller) {
    return caller.isAdmin() ? null : caller.getId();
  }

  private List<Task> byDueDate(AuthUser caller) {
    return tasks.find(new TaskFilter(null, null, null, TaskSort.DUE, ownerScope(caller)));
  }
}
