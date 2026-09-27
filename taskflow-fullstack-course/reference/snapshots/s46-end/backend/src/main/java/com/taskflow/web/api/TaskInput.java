package com.taskflow.web.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.taskflow.model.Priority;
import com.taskflow.model.Task;
import com.taskflow.model.TaskStatus;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * S46 (46.05, 46.11): the REQUEST side of a task: the six fields a client may set, validated with the contract's
 * messages. It's the JSON counterpart of TaskForm (37.03): raw input in, errors or typed values out.
 *   POST, PUT  (partial = false): every field is checked, absent ones included (title/status/priority are required)
 *   PATCH      (partial = true):  only the fields PRESENT in the body; "absent" ≠ null ("dueDate": null clears the date)
 * Anything else in the body (id, ownerId, createdAt, role…) is never read: mass assignment has nowhere to land (46.10).
 */
public final class TaskInput {

  static final int TITLE_MAX = 120;
  static final int DESCRIPTION_MAX = 2000;

  private final Map<String, String> errors = new LinkedHashMap<>();
  private final JsonNode body;
  private final boolean partial;
  private String title;
  private String description;
  private TaskStatus status;
  private Priority priority;
  private LocalDate dueDate;
  private Long categoryId;

  private TaskInput(JsonNode body, boolean partial) {
    this.body = body;
    this.partial = partial;
  }

  public static TaskInput parse(JsonNode body, boolean partial, Set<Long> categoryIds) {
    if (!body.isObject()) throw ApiException.badRequest("The request body must be a JSON object");
    TaskInput input = new TaskInput(body, partial);
    input.validate(categoryIds);
    return input;
  }

  public Map<String, String> errors() {
    return errors;
  }

  /** Copies the validated fields that were checked (all of them, or the present ones for PATCH) onto the task. */
  public void applyTo(Task task) {
    if (checks("title")) task.setTitle(title);
    if (checks("description")) task.setDescription(description);
    if (checks("status")) task.setStatus(status);
    if (checks("priority")) task.setPriority(priority);
    if (checks("dueDate")) task.setDueDate(dueDate);
    if (checks("categoryId")) task.setCategoryId(categoryId);
  }

  private boolean checks(String field) {
    return !partial || body.has(field);
  }

  private void validate(Set<Long> categoryIds) {
    if (checks("title")) {
      JsonNode node = body.get("title");
      String value = node != null && node.isTextual() ? node.asText().strip() : "";
      if (value.isEmpty()) errors.put("title", "must not be blank");
      else if (value.length() > TITLE_MAX) errors.put("title", "size must be at most " + TITLE_MAX);
      else title = value;
    }
    if (checks("description")) {
      JsonNode node = body.get("description");
      if (node == null || node.isNull()) description = "";
      else if (!node.isTextual()) errors.put("description", "must be a string");
      else if (node.asText().length() > DESCRIPTION_MAX) errors.put("description", "size must be at most " + DESCRIPTION_MAX);
      else description = node.asText().strip();
    }
    if (checks("status")) {
      status = TaskStatus.parse(text(body.get("status")));
      if (status == null) errors.put("status", "must be one of TODO, IN_PROGRESS, DONE");
    }
    if (checks("priority")) {
      priority = Priority.parse(text(body.get("priority")));
      if (priority == null) errors.put("priority", "must be one of LOW, MEDIUM, HIGH");
    }
    if (checks("dueDate")) {
      JsonNode node = body.get("dueDate");
      if (node != null && !node.isNull()) {
        try {
          if (!node.isTextual() || !node.asText().matches("\\d{4}-\\d{2}-\\d{2}")) throw new DateTimeParseException("", "", 0);
          dueDate = LocalDate.parse(node.asText());
        } catch (DateTimeParseException e) {
          errors.put("dueDate", "must be null or YYYY-MM-DD");
        }
      }
    }
    if (checks("categoryId")) {
      JsonNode node = body.get("categoryId");
      if (node != null && !node.isNull()) {
        if (node.canConvertToExactIntegral() && categoryIds.contains(node.asLong())) categoryId = node.asLong();
        else errors.put("categoryId", "unknown category");
      }
    }
  }

  private static String text(JsonNode node) {
    return node != null && node.isTextual() ? node.asText() : null;
  }
}
