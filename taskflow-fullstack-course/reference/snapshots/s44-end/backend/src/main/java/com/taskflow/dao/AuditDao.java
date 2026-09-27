package com.taskflow.dao;

import javax.persistence.EntityManagerFactory;

/** PROVIDED (S41): the append-only audit log (db/02-schema.sql: audit_events; the app may only INSERT and SELECT). */
public class AuditDao extends JpaDao {

  public AuditDao(EntityManagerFactory entityManagerFactory) {
    super(entityManagerFactory);
  }

  public void record(String type, String username, String ip, String details) {
    write(em -> em.createNativeQuery("INSERT INTO audit_events (type, username, ip, details) VALUES (?1, ?2, ?3, ?4)")
        .setParameter(1, type)
        .setParameter(2, username == null ? null : username.substring(0, Math.min(50, username.length())))
        .setParameter(3, ip)
        .setParameter(4, details)
        .executeUpdate());
  }
}
