package com.taskflow.dao;

import java.util.Locale;

/**
 * S36 (36.09): the ALLOW-LIST of sort orders. The request chooses a CONSTANT by name; the query fragment comes from
 * the constant, never from the request. "order by " + request.getParameter("sort") would be injectable.
 */
public enum TaskSort {
  ID("Oldest first", "t.id"),
  NEWEST("Newest first", "t.id desc"),
  DUE("Due date", "case when t.dueDate is null then 1 else 0 end, t.dueDate, t.id"),   // tasks without a due date last
  PRIORITY("Priority", "case when t.priority = com.taskflow.model.Priority.HIGH then 0"
      + " when t.priority = com.taskflow.model.Priority.MEDIUM then 1 else 2 end, t.id"),
  TITLE("Title", "t.title, t.id");

  private final String label;
  private final String orderBy;

  TaskSort(String label, String orderBy) {
    this.label = label;
    this.orderBy = orderBy;
  }

  /** "due" → DUE; null, "", unknown or malicious → ID (the default). */
  public static TaskSort parse(String value) {
    if (value == null) return ID;
    for (TaskSort sort : values()) {
      if (sort.getParam().equals(value)) return sort;
    }
    return ID;
  }

  public String getParam() { return name().toLowerCase(Locale.ROOT); }  // the value in URLs: ?sort=due
  public String getLabel() { return label; }
  String orderBy() { return orderBy; }                                    // package-private: only the DAO sees queries
}
