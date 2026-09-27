package com.taskflow.model;

import java.time.Instant;

/**
 * PROVIDED (S35): a comment on a task (db/02-schema.sql: comments, body up to 1000 characters).
 * A mutable JavaBean like Task: S36's CommentDao fills it from a ResultSet.
 * The body is stored EXACTLY as typed, HTML included: it's escaped when it's rendered (35.15).
 */
public class Comment {

  public static final int MAX_BODY_LENGTH = 1000;

  private long id;
  private long taskId;
  private long authorId;
  private String body;
  private Instant createdAt;

  public Comment() {}

  public Comment copy() {
    Comment c = new Comment();
    c.id = id;
    c.taskId = taskId;
    c.authorId = authorId;
    c.body = body;
    c.createdAt = createdAt;
    return c;
  }

  public long getId() { return id; }
  public void setId(long id) { this.id = id; }
  public long getTaskId() { return taskId; }
  public void setTaskId(long taskId) { this.taskId = taskId; }
  public long getAuthorId() { return authorId; }
  public void setAuthorId(long authorId) { this.authorId = authorId; }
  public String getBody() { return body; }
  public void setBody(String body) { this.body = body; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
