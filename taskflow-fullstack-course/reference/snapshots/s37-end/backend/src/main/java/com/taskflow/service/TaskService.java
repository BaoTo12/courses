package com.taskflow.service;

import com.taskflow.dao.CategoryDao;
import com.taskflow.dao.CommentDao;
import com.taskflow.dao.TaskDao;
import com.taskflow.dao.TaskFilter;
import com.taskflow.dao.UserDao;
import com.taskflow.model.Category;
import com.taskflow.model.Comment;
import com.taskflow.model.Task;
import com.taskflow.model.TaskDetails;
import com.taskflow.model.TaskStatus;
import java.time.Clock;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.OptionalLong;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * PROVIDED (S36): the task use cases. Controllers call THIS, never a DAO directly (36.02).
 * It knows the domain rules ("toggle" means DONE ↔ TODO, a comment needs an existing task) and combines DAOs
 * (details = task + category + owner + comments). It knows nothing about HTTP: no request, no response, no JSP.
 * One instance per application, created by AppContextListener (36.04); it has no per-request state, so it's thread-safe.
 */
public class TaskService {

  private final TaskDao tasks;
  private final CategoryDao categories;
  private final UserDao users;
  private final CommentDao comments;
  private final Clock clock;

  public TaskService(TaskDao tasks, CategoryDao categories, UserDao users, CommentDao comments, Clock clock) {
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

  public List<Task> find(TaskFilter filter) {
    return tasks.find(filter);
  }

  /** Counts per status, keyed by the status NAME, every status present (34.20: the view reads ${stats['DONE']}). */
  public Map<String, Integer> countByStatus() {
    Map<String, Integer> stats = new LinkedHashMap<>();
    tasks.countByStatus().forEach((status, count) -> stats.put(status.name(), count));
    return stats;
  }

  public List<Category> categories() {
    return categories.findAll();
  }

  /** The details page's view model, or empty if there's no such task. */
  public Optional<TaskDetails> details(long id) {
    return tasks.findById(id).map(task -> new TaskDetails(
        task,
        task.getCategoryId() == null ? null : categories.findById(task.getCategoryId()).orElse(null),
        users.findById(task.getOwnerId()).orElse(null),
        comments.findByTask(id)));
  }

  /** The ids of the existing categories (a form's category must be one of them, 37.04). */
  public Set<Long> categoryIds() {
    return categories.findAll().stream().map(Category::getId).collect(Collectors.toSet());
  }

  public Optional<Task> task(long id) {
    return tasks.findById(id);
  }

  /** DuplicateKeyException if the owner already has a task with this title. */
  public Task create(Task task) {
    return tasks.insert(task);
  }

  /** Saves an edited task. False if it no longer exists. DuplicateKeyException: title already used (S37). */
  public boolean update(Task task) {
    return tasks.update(task);
  }

  /** DONE ↔ TODO. False if there's no such task. */
  public boolean toggle(long id) {
    Optional<Task> found = tasks.findById(id);
    if (found.isEmpty()) return false;
    return tasks.updateStatus(id, found.get().isDone() ? TaskStatus.TODO : TaskStatus.DONE);
  }

  public boolean delete(long id) {
    return tasks.delete(id);
  }

  public OptionalLong latestId() {
    return tasks.latestId();
  }

  /** False if the task doesn't exist. The body is stored as typed (35.15). */
  public boolean addComment(long taskId, long authorId, String body) {
    if (tasks.findById(taskId).isEmpty()) return false;
    Comment comment = new Comment();
    comment.setTaskId(taskId);
    comment.setAuthorId(authorId);
    comment.setBody(body);
    comments.insert(comment);
    return true;
  }
}
