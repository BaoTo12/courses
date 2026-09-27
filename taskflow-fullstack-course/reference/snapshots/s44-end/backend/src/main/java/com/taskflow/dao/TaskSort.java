package com.taskflow.dao;

import java.util.Locale;

/**
 * S36 (36.09): the ALLOW-LIST of sort orders. The request chooses a CONSTANT by name; the query fragment comes from
 * the constant, never from the request. "order by " + request.getParameter("sort") would be injectable.
 * S44 (44.16): each order also has a DESCENDING fragment (?dir=desc), equally fixed. Tasks without a due date stay last.
 */
public enum TaskSort {
  ID("Oldest first", "t.id", "t.id desc"),
  NEWEST("Newest first", "t.id desc", "t.id"),
  DUE("Due date", "case when t.dueDate is null then 1 else 0 end, t.dueDate, t.id",
      "case when t.dueDate is null then 1 else 0 end, t.dueDate desc, t.id desc"),
  PRIORITY("Priority", PriorityOrder.EXPRESSION + ", t.id", PriorityOrder.EXPRESSION + " desc, t.id desc"),
  TITLE("Title", "t.title, t.id", "t.title desc, t.id desc");

  private final String label;
  private final String ascending;
  private final String descending;

  TaskSort(String label, String ascending, String descending) {
    this.label = label;
    this.ascending = ascending;
    this.descending = descending;
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
  String orderBy(boolean desc) { return desc ? descending : ascending; } // package-private: only the DAO sees queries

  private static final class PriorityOrder {
    static final String EXPRESSION = "case when t.priority = com.taskflow.model.Priority.HIGH then 0"
        + " when t.priority = com.taskflow.model.Priority.MEDIUM then 1 else 2 end";
  }
}
