package com.taskflow.model;

/** PROVIDED (S31). Same values as the database ENUM and the JSON API. */
public enum Priority {
  LOW,
  MEDIUM,
  HIGH;

  public static Priority parse(String value) {
    if (value == null) return null;
    for (Priority priority : values()) {
      if (priority.name().equals(value)) return priority;
    }
    return null;
  }
}
