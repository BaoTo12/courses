package com.taskflow.store;

import com.taskflow.model.Priority;
import com.taskflow.model.Task;
import com.taskflow.model.TaskStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * PROVIDED (S31–S35): tasks in memory, until the database arrives in S36 (TaskDao replaces it).
 * - Thread-safe: servlets are called by many threads at once (30.05); a ConcurrentHashMap + AtomicLong ids.
 * - Returns COPIES: a servlet changing a Task it got doesn't change the store (only save() does).
 * - One shared instance for the web app: {@link #shared()}. (S38 moves it into application scope via a listener.)
 * Data is lost at every restart, on purpose: it's a stand-in.
 */
public final class InMemoryTaskStore {

  private static final InMemoryTaskStore SHARED = seeded();

  private final ConcurrentMap<Long, Task> tasks = new ConcurrentHashMap<>();
  private final AtomicLong nextId = new AtomicLong(1);

  public static InMemoryTaskStore shared() {
    return SHARED;
  }

  /** All tasks, by id. */
  public List<Task> findAll() {
    return tasks.values().stream().sorted(Comparator.comparingLong(Task::getId)).map(Task::copy).toList();
  }

  /** Tasks with this status, by id. */
  public List<Task> findByStatus(TaskStatus status) {
    return findAll().stream().filter(t -> t.getStatus() == status).toList();
  }

  public Optional<Task> findById(long id) {
    Task task = tasks.get(id);
    return task == null ? Optional.empty() : Optional.of(task.copy());
  }

  /** Inserts (id 0) or replaces (existing id). Returns the stored copy, with its id. */
  public Task save(Task task) {
    Task stored = task.copy();
    Instant now = Instant.now();
    if (stored.getId() == 0) {
      stored.setId(nextId.getAndIncrement());
      stored.setCreatedAt(now);
    }
    stored.setUpdatedAt(now);
    tasks.put(stored.getId(), stored);
    return stored.copy();
  }

  /** True if something was deleted. */
  public boolean delete(long id) {
    return tasks.remove(id) != null;
  }

  private static InMemoryTaskStore seeded() {
    InMemoryTaskStore store = new InMemoryTaskStore();
    store.save(task("Write quarterly report", TaskStatus.IN_PROGRESS, Priority.HIGH, "2026-10-03"));
    store.save(task("Fix login redirect bug", TaskStatus.TODO, Priority.HIGH, "2026-09-30"));
    store.save(task("Book flights for the offsite", TaskStatus.DONE, Priority.MEDIUM, null));
    store.save(task("Review PR #42", TaskStatus.TODO, Priority.LOW, null));
    return store;
  }

  private static Task task(String title, TaskStatus status, Priority priority, String dueDate) {
    Task t = new Task();
    t.setTitle(title);
    t.setStatus(status);
    t.setPriority(priority);
    t.setDueDate(dueDate == null ? null : LocalDate.parse(dueDate));
    t.setOwnerId(1);
    return t;
  }
}
