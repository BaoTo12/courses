package com.taskflow.model;

/** PROVIDED (S31). Same values as the database ENUM and the JSON API. */
public enum TaskStatus {
  TODO,
  IN_PROGRESS,
  DONE;

  /** "TODO" → TODO; anything else (null, "done", "DELETED") → null. Parameters are untrusted strings (29.09). */
  public static TaskStatus parse(String value) {
    if (value == null) return null;
    for (TaskStatus status : values()) {
      if (status.name().equals(value)) return status;
    }
    return null;
  }
}
