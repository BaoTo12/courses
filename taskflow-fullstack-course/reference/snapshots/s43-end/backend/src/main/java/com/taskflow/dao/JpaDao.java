package com.taskflow.dao;

import java.util.function.Function;
import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import javax.persistence.EntityTransaction;
import javax.persistence.PersistenceException;

/** PROVIDED (S36): the JPA plumbing shared by the DAOs: one EntityManager per call, a transaction for writes. */
abstract class JpaDao {

  private final EntityManagerFactory entityManagerFactory;

  JpaDao(EntityManagerFactory entityManagerFactory) {
    this.entityManagerFactory = entityManagerFactory;
  }

  protected <T> T read(Function<EntityManager, T> work) {
    EntityManager em = entityManagerFactory.createEntityManager();
    try {
      return work.apply(em);
    } catch (PersistenceException e) {
      throw DaoException.from(e);
    } finally {
      em.close();
    }
  }

  protected <T> T write(Function<EntityManager, T> work) {
    EntityManager em = entityManagerFactory.createEntityManager();
    EntityTransaction transaction = em.getTransaction();
    try {
      transaction.begin();
      T result = work.apply(em);
      transaction.commit();
      return result;
    } catch (PersistenceException e) {
      if (transaction.isActive()) transaction.rollback();
      throw DaoException.from(e);
    } finally {
      em.close();
    }
  }
}
