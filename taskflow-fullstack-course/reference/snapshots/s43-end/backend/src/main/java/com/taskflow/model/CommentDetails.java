package com.taskflow.model;

/**
 * S35 (35.18): a comment with its author, for the view: ${c.comment.body}, ${c.author.displayName}, ${c.author.admin}.
 * author is null if the user no longer exists.
 */
public class CommentDetails {

  private final Comment comment;
  private final User author;

  public CommentDetails(Comment comment, User author) {
    this.comment = comment;
    this.author = author;
  }

  public Comment getComment() { return comment; }
  public User getAuthor() { return author; }
}
