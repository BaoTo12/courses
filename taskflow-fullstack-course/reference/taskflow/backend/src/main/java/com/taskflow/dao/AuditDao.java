package com.taskflow.dao;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import javax.persistence.EntityManagerFactory;
import javax.persistence.Query;

/**
 * PROVIDED (S41): the append-only audit log (db/02-schema.sql: audit_events; the app may only INSERT and SELECT).
 * S45: reading it back for /admin/audit: optional filters by type and username, newest first, one page at a time.
 */
public class AuditDao extends JpaDao {

  private static final DateTimeFormatter AT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

  /** One event, as the audit page shows it. JavaBean getters for EL. `at` is UTC, as stored. */
  public record Event(long id, String type, String username, String ip, LocalDateTime at, String details) {
    public long getId() { return id; }
    public String getType() { return type; }
    public String getUsername() { return username; }
    public String getIp() { return ip; }
    public String getAt() { return at.format(AT); }
    public String getDetails() { return details; }
  }

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

  /** S45: newest first. type / username null = any. */
  public List<Event> find(String type, String username, int offset, int limit) {
    return read(em -> {
      Query query = em.createNativeQuery("SELECT id, type, username, ip, at, details FROM audit_events"
          + where(type, username) + " ORDER BY at DESC, id DESC LIMIT :limit OFFSET :offset");
      bind(query, type, username);
      query.setParameter("limit", limit).setParameter("offset", offset);
      @SuppressWarnings("unchecked")
      List<Object[]> rows = query.getResultList();
      List<Event> events = new ArrayList<>();
      for (Object[] row : rows) {
        LocalDateTime at = row[4] instanceof Timestamp t ? t.toLocalDateTime() : (LocalDateTime) row[4];
        events.add(new Event(((Number) row[0]).longValue(), (String) row[1], (String) row[2], (String) row[3], at, (String) row[5]));
      }
      return events;
    });
  }

  /** S51: one user's latest events of the given types (the activity feed). */
  public List<Event> findActivity(String username, List<String> types, int limit) {
    return read(em -> {
      Query query = em.createNativeQuery("SELECT id, type, username, ip, at, details FROM audit_events"
          + " WHERE username = :username AND type IN (:types) ORDER BY at DESC, id DESC LIMIT :limit");
      query.setParameter("username", username).setParameter("types", types).setParameter("limit", limit);
      @SuppressWarnings("unchecked")
      List<Object[]> rows = query.getResultList();
      List<Event> events = new ArrayList<>();
      for (Object[] row : rows) {
        LocalDateTime at = row[4] instanceof Timestamp t ? t.toLocalDateTime() : (LocalDateTime) row[4];
        events.add(new Event(((Number) row[0]).longValue(), (String) row[1], (String) row[2], (String) row[3], at, (String) row[5]));
      }
      return events;
    });
  }

  public long count(String type, String username) {
    return read(em -> {
      Query query = em.createNativeQuery("SELECT COUNT(*) FROM audit_events" + where(type, username));
      bind(query, type, username);
      return ((Number) query.getSingleResult()).longValue();
    });
  }

  private static String where(String type, String username) {
    if (type != null && username != null) return " WHERE type = :type AND username = :username";
    if (type != null) return " WHERE type = :type";
    if (username != null) return " WHERE username = :username";
    return "";
  }

  private static void bind(Query query, String type, String username) {
    if (type != null) query.setParameter("type", type);
    if (username != null) query.setParameter("username", username);
  }
}
