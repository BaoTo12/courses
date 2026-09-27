package com.taskflow.dao;

import com.taskflow.model.User;
import java.util.Optional;
import javax.persistence.EntityManagerFactory;

/** PROVIDED (S36): users as the views see them (the User entity doesn't map password_hash). */
public class UserDao extends JpaDao {

  public UserDao(EntityManagerFactory entityManagerFactory) {
    super(entityManagerFactory);
  }

  public Optional<User> findById(long id) {
    return read(em -> Optional.ofNullable(em.find(User.class, id)));
  }
}
