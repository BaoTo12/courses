package com.taskflow.store;

import com.taskflow.model.Comment;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * PROVIDED (S35): comments in memory (same rules as InMemoryTaskStore: thread-safe, copies), until S36's CommentDao.
 * Seeded with the comments of db/03-seed.sql. Saves the body AS IS: no filtering on input (35.15 explains why).
 */
public final class InMemoryCommentStore {

  private static final InMemoryCommentStore SHARED = seeded();

  private final ConcurrentMap<Long, Comment> comments = new ConcurrentHashMap<>();
  private final AtomicLong nextId = new AtomicLong(1);

  public static InMemoryCommentStore shared() {
    return SHARED;
  }

  /** A task's comments, oldest first. */
  public List<Comment> findByTask(long taskId) {
    return comments.values().stream()
        .filter(c -> c.getTaskId() == taskId)
        .sorted(Comparator.comparingLong(Comment::getId))
        .map(Comment::copy)
        .toList();
  }

  /** Inserts a new comment (id 0). Returns the stored copy, with its id and createdAt. */
  public Comment add(Comment comment) {
    Comment stored = comment.copy();
    stored.setId(nextId.getAndIncrement());
    if (stored.getCreatedAt() == null) stored.setCreatedAt(Instant.now());
    comments.put(stored.getId(), stored);
    return stored.copy();
  }

  private static InMemoryCommentStore seeded() {
    InMemoryCommentStore store = new InMemoryCommentStore();
    store.add(comment(1, 1, "Numbers from finance arrive on Monday.", "2026-09-02T09:00:00Z"));
    store.add(comment(1, 3, "Please add the churn chart.", "2026-09-03T10:30:00Z"));
    store.add(comment(2, 1, "Reproduced with an expired session cookie.", "2026-09-04T14:15:00Z"));
    return store;
  }

  private static Comment comment(long taskId, long authorId, String body, String createdAt) {
    Comment c = new Comment();
    c.setTaskId(taskId);
    c.setAuthorId(authorId);
    c.setBody(body);
    c.setCreatedAt(Instant.parse(createdAt));
    return c;
  }
}
