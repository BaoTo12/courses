package com.taskflow.dao;

import com.taskflow.model.Comment;
import com.taskflow.model.CommentDetails;
import java.util.List;
import javax.persistence.EntityManagerFactory;

/**
 * PROVIDED (S36): comments in MySQL, through JPA. findByTask loads each comment WITH its author in ONE query.
 * Bodies are stored as typed: escaping is the view's job (35.15).
 */
public class CommentDao extends JpaDao {

  public CommentDao(EntityManagerFactory entityManagerFactory) {
    super(entityManagerFactory);
  }

  public List<CommentDetails> findByTask(long taskId) {
    return read(em -> em.createQuery(
            "select new com.taskflow.model.CommentDetails(c, u) from Comment c, User u"
                + " where u.id = c.authorId and c.taskId = :taskId order by c.createdAt, c.id", CommentDetails.class)
        .setParameter("taskId", taskId)
        .getResultList());
  }

  /** S46: returns the comment as stored (with its id and created_at), for the JSON API's 201 response. */
  public Comment insert(Comment comment) {
    return write(em -> {
      em.persist(comment);
      em.flush();
      em.refresh(comment);
      return comment;
    });
  }
}
