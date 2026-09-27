package com.taskflow.service;

import com.taskflow.dao.CommentDao;
import com.taskflow.dao.ShareDao;
import com.taskflow.dao.TaskDao;
import com.taskflow.dao.TaskFilter;
import com.taskflow.dao.TaskSort;
import com.taskflow.dao.UserDao;
import com.taskflow.model.Category;
import com.taskflow.model.Comment;
import com.taskflow.model.CommentDetails;
import com.taskflow.model.Task;
import com.taskflow.model.TaskDetails;
import com.taskflow.model.TaskStatus;
import com.taskflow.model.User;
import com.taskflow.security.AccessDeniedException;
import com.taskflow.security.AuthUser;
import com.taskflow.security.ReadOnlyException;
import java.time.Clock;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.OptionalLong;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * PROVIDED (S36): the task use cases. Controllers call THIS, never a DAO directly (36.02).
 * It knows the domain rules ("toggle" means DONE ↔ TODO, a comment needs an existing task) and combines DAOs
 * (details = task + category + owner + comments). It knows nothing about HTTP: no request, no response, no JSP.
 * One instance per application, created by AppContextListener (36.04); it has no per-request state, so it's thread-safe.
 *
 * S42: every use case takes the CALLER (the logged-in AuthUser). The access rules live in a few private methods:
 *   readable(id, caller)  one task to SEE: its owner, an admin, or (S51) a user it's shared with
 *   writable(id, caller)  one task to CHANGE: its owner or an admin; shared with you → ReadOnlyException (403)
 *   scope(filter, caller) lists: an admin sees every owner; a user their own tasks plus (S51) those shared with them
 *   ownerScope(caller)    counts and the dashboard: an admin every owner, a user only their own tasks
 * Someone else's task → AccessDeniedException (answered 404, 42.05).
 * S51: sharing (read-only), and TaskEvents for the activity feed.
 */
public class TaskService {

  /** S44 (44.04): tasks per page in the list. */
  public static final int PAGE_SIZE = 10;

  /** S51: what TaskService.share answers. */
  public enum ShareResult { SHARED, NO_SUCH_USER, OWNER, ALREADY_SHARED }

  private final TaskDao tasks;
  private final CategoryCatalog categories;   // S38: the application-scoped cache (38.06)
  private final UserDao users;
  private final CommentDao comments;
  private final ShareDao shares;
  private final Clock clock;
  private final List<TaskEvent.Listener> listeners = new CopyOnWriteArrayList<>();   // S51: added at startup, read per event

  public TaskService(TaskDao tasks, CategoryCatalog categories, UserDao users, CommentDao comments, ShareDao shares, Clock clock) {
    this.tasks = tasks;
    this.categories = categories;
    this.users = users;
    this.comments = comments;
    this.shares = shares;
    this.clock = clock;
  }

  /** S51: subscribe to task events (AppContextListener registers the ActivityRecorder). */
  public void addListener(TaskEvent.Listener listener) {
    listeners.add(listener);
  }

  /** "Today" for overdue checks: one clock for the whole application (S44: per user timezone). */
  public LocalDate today() {
    return LocalDate.now(clock);
  }

  public List<Task> find(TaskFilter filter, AuthUser caller) {
    return tasks.find(scope(filter, caller));
  }

  /** S46: page `number` (1-based) of `size` tasks, NOT clamped: past the end there are simply no items (the API contract). */
  public Page<Task> pageAt(TaskFilter filter, int number, int size, AuthUser caller) {
    TaskFilter scoped = scope(filter, caller);
    long total = tasks.count(scoped);
    long offset = (long) (number - 1) * size;
    List<Task> items = offset >= total ? List.of() : tasks.find(scoped, (int) offset, size);
    return new Page<>(items, number, size, total);
  }

  /** S44: one page of the list; a page number out of range becomes the nearest valid one. */
  public Page<Task> page(TaskFilter filter, int requestedPage, AuthUser caller) {
    TaskFilter scoped = scope(filter, caller);
    long total = tasks.count(scoped);
    int number = Page.clamp(requestedPage, total, PAGE_SIZE);
    return new Page<>(tasks.find(scoped, (number - 1) * PAGE_SIZE, PAGE_SIZE), number, PAGE_SIZE, total);
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

  /** S46: counts per priority, every priority present (the API's /api/stats). */
  public Map<String, Integer> countByPriority(AuthUser caller) {
    Map<String, Integer> counts = new LinkedHashMap<>();
    tasks.countByPriority(ownerScope(caller)).forEach((priority, count) -> counts.put(priority.name(), count));
    return counts;
  }

  public List<Category> categories() {
    return categories.all();
  }

  /** The details page's view model, or empty if there's no such task. */
  public Optional<TaskDetails> details(long id, AuthUser caller) {
    return readable(id, caller).map(task -> new TaskDetails(
        task,
        task.getCategoryId() == null ? null : categories.byId(task.getCategoryId()).orElse(null),
        users.findById(task.getOwnerId()).orElse(null),
        comments.findByTask(id)));
  }

  /** The ids of the existing categories (a form's category must be one of them, 37.04). */
  public Set<Long> categoryIds() {
    return categories.ids();
  }

  /** A task the caller may SEE (owner, admin, shared with them). */
  public Optional<Task> task(long id, AuthUser caller) {
    return readable(id, caller);
  }

  /** S51: a task the caller may CHANGE (the edit form): shared with them → ReadOnlyException. */
  public Optional<Task> taskForEdit(long id, AuthUser caller) {
    return writable(id, caller);
  }

  /** S51: may the caller change this task? (Views hide the edit/delete/toggle controls otherwise.) */
  public boolean canEdit(Task task, AuthUser caller) {
    return caller.isAdmin() || task.getOwnerId() == caller.getId();
  }

  /** For /debug/stats only (loopback, no user): NO access check. Never call it from a user-facing controller. */
  public Optional<Task> taskForDiagnostics(long id) {
    return tasks.findById(id);
  }

  /** DuplicateKeyException if the owner already has a task with this title. The owner is set by the controller. */
  public Task create(Task task, AuthUser caller) {
    Task saved = tasks.insert(task);
    publish(TaskEvent.Type.TASK_CREATED, caller, saved);
    return saved;
  }

  /**
   * Saves an edited task. False if it no longer exists. DuplicateKeyException: title already used (S37).
   * S42: checked against the STORED row, not the object passed in: its ownerId could have been changed by the caller.
   */
  public boolean update(Task task, AuthUser caller) {
    Optional<Task> stored = writable(task.getId(), caller);
    if (stored.isEmpty()) return false;
    task.setOwnerId(stored.get().getOwnerId());   // an edit never changes the owner (42.08)
    boolean updated = tasks.update(task);
    if (updated) publish(TaskEvent.Type.TASK_UPDATED, caller, task);
    return updated;
  }

  /** DONE ↔ TODO. False if there's no such task. */
  public boolean toggle(long id, AuthUser caller) {
    Optional<Task> found = writable(id, caller);
    if (found.isEmpty()) return false;
    boolean updated = tasks.updateStatus(id, found.get().isDone() ? TaskStatus.TODO : TaskStatus.DONE);
    if (updated) publish(TaskEvent.Type.TASK_UPDATED, caller, found.get());
    return updated;
  }

  public boolean delete(long id, AuthUser caller) {
    Optional<Task> found = writable(id, caller);
    if (found.isEmpty() || !tasks.delete(id)) return false;
    publish(TaskEvent.Type.TASK_DELETED, caller, found.get());
    return true;
  }

  public OptionalLong latestId(AuthUser caller) {
    return tasks.latestId(ownerScope(caller));
  }

  /** False if the task doesn't exist. The body is stored as typed (35.15). The author is the caller. */
  public boolean addComment(long taskId, AuthUser caller, String body) {
    return comment(taskId, caller, body).isPresent();
  }

  /** S46: the same, returning the stored comment. S51: commenting is a change: not on a task shared read-only. */
  public Optional<Comment> comment(long taskId, AuthUser caller, String body) {
    Optional<Task> task = writable(taskId, caller);
    if (task.isEmpty()) return Optional.empty();
    Comment comment = new Comment();
    comment.setTaskId(taskId);
    comment.setAuthorId(caller.getId());
    comment.setBody(body);
    Comment saved = comments.insert(comment);
    publish(TaskEvent.Type.COMMENT_ADDED, caller, task.get());
    return Optional.of(saved);
  }

  /** S46: a task's comments, oldest first; empty Optional if there's no such task. */
  public Optional<List<CommentDetails>> comments(long taskId, AuthUser caller) {
    return readable(taskId, caller).map(task -> comments.findByTask(taskId));
  }

  // ---- S51: sharing (read-only) ----

  /** Who the task is shared with; empty Optional if there's no such task. Only for those who may change it. */
  public Optional<List<ShareDao.Share>> shares(long taskId, AuthUser caller) {
    return writable(taskId, caller).map(task -> shares.findByTask(taskId));
  }

  /** Empty Optional if there's no such task; otherwise the outcome. The owner (or an admin) shares by username. */
  public Optional<ShareResult> share(long taskId, AuthUser caller, String username) {
    Optional<Task> task = writable(taskId, caller);
    if (task.isEmpty()) return Optional.empty();
    Optional<User> user = users.findByUsername(username == null ? "" : username.strip());
    if (user.isEmpty()) return Optional.of(ShareResult.NO_SUCH_USER);
    if (user.get().getId() == task.get().getOwnerId()) return Optional.of(ShareResult.OWNER);
    if (!shares.insert(taskId, user.get().getId())) return Optional.of(ShareResult.ALREADY_SHARED);
    publish(TaskEvent.Type.TASK_SHARED, caller, task.get());
    return Optional.of(ShareResult.SHARED);
  }

  /** False if the task or the share doesn't exist. */
  public boolean unshare(long taskId, AuthUser caller, long userId) {
    Optional<Task> task = writable(taskId, caller);
    if (task.isEmpty() || !shares.delete(taskId, userId)) return false;
    publish(TaskEvent.Type.TASK_UNSHARED, caller, task.get());
    return true;
  }

  // ---- the access rules (S42, S51): these methods, and nowhere else ----

  /** Empty if there's no such task; AccessDeniedException if the caller may not even see it. */
  private Optional<Task> readable(long id, AuthUser caller) {
    Optional<Task> task = tasks.findById(id);
    if (task.isEmpty() || canEdit(task.get(), caller) || shares.isShared(id, caller.getId())) return task;
    throw new AccessDeniedException("task " + id);
  }

  /** Empty if there's no such task; ReadOnlyException if it's only shared with the caller; else AccessDeniedException. */
  private Optional<Task> writable(long id, AuthUser caller) {
    Optional<Task> task = tasks.findById(id);
    if (task.isEmpty() || canEdit(task.get(), caller)) return task;
    if (shares.isShared(id, caller.getId())) throw new ReadOnlyException("task " + id + " (shared read-only)");
    throw new AccessDeniedException("task " + id);
  }

  /** Lists: admins see every owner; users their own tasks plus those shared with them. */
  private TaskFilter scope(TaskFilter filter, AuthUser caller) {
    if (caller.isAdmin()) return filter.withOwner(null).withShared(Set.of());
    return filter.withOwner(caller.getId()).withShared(shares.taskIdsSharedWith(caller.getId()));
  }

  /** The owner counts and the dashboard are restricted to: null (everyone) for admins, the caller's own id otherwise. */
  private static Long ownerScope(AuthUser caller) {
    return caller.isAdmin() ? null : caller.getId();
  }

  private List<Task> byDueDate(AuthUser caller) {
    return tasks.find(new TaskFilter(null, null, null, TaskSort.DUE, ownerScope(caller)));
  }

  private void publish(TaskEvent.Type type, AuthUser actor, Task task) {
    TaskEvent event = new TaskEvent(type, actor, task.getId(), task.getTitle());
    for (TaskEvent.Listener listener : listeners) listener.onTaskEvent(event);
  }
}
