package com.taskflow.web.tasks;

import com.taskflow.model.Priority;
import com.taskflow.model.Task;
import com.taskflow.web.Params;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import javax.servlet.http.HttpServletRequest;

/**
 * S37 (37.05): the task form's fields AS TYPED (strings), so an invalid form can be shown again with the user's own
 * values: ${form.title}. validate() checks and converts them; applyTo() copies ONLY these five fields onto a Task.
 * Never an id, an owner or a status from the form: that's mass assignment (37.11).
 */
public class TaskForm {

  public static final int TITLE_MAX = 120;         // = the tasks.title column (28.07)
  public static final int DESCRIPTION_MAX = 2000;

  private String title = "";
  private String description = "";
  private String priority = "MEDIUM";
  private String dueDate = "";
  private String categoryId = "";

  private Priority parsedPriority;
  private LocalDate parsedDueDate;
  private Long parsedCategoryId;

  /** The five fields this form knows. Any other parameter in the request is ignored. */
  public static TaskForm from(HttpServletRequest request) {
    TaskForm form = new TaskForm();
    form.title = trimmed(request.getParameter("title"));
    form.description = trimmed(request.getParameter("description"));
    form.priority = trimmed(request.getParameter("priority"));
    form.dueDate = trimmed(request.getParameter("dueDate"));
    form.categoryId = trimmed(request.getParameter("categoryId"));
    return form;
  }

  /** An edit form, pre-filled from a stored task. */
  public static TaskForm of(Task task) {
    TaskForm form = new TaskForm();
    form.title = task.getTitle();
    form.description = task.getDescription();
    form.priority = task.getPriority().name();
    form.dueDate = task.getDueDate() == null ? "" : task.getDueDate().toString();
    form.categoryId = task.getCategoryId() == null ? "" : task.getCategoryId().toString();
    return form;
  }

  /** Field name → message, in form order; empty when valid. Server-side, always: the browser's checks are UX (37.04). */
  public Map<String, String> validate(Set<Long> existingCategoryIds) {
    Map<String, String> errors = new LinkedHashMap<>();
    if (title.isEmpty()) errors.put("title", "must not be blank");
    else if (title.length() > TITLE_MAX) errors.put("title", "size must be at most " + TITLE_MAX);

    if (description.length() > DESCRIPTION_MAX) errors.put("description", "size must be at most " + DESCRIPTION_MAX);

    parsedPriority = Priority.parse(priority);                      // an allow-list: the enum
    if (parsedPriority == null) errors.put("priority", "must be one of LOW, MEDIUM, HIGH");

    parsedDueDate = null;
    if (!dueDate.isEmpty()) {
      try {
        parsedDueDate = LocalDate.parse(dueDate);                   // yyyy-MM-dd, what <input type="date"> sends
      } catch (DateTimeParseException e) {
        errors.put("dueDate", "must be a date (YYYY-MM-DD)");
      }
    }

    parsedCategoryId = null;
    if (!categoryId.isEmpty()) {
      parsedCategoryId = Params.positiveId(categoryId);
      if (parsedCategoryId == null || !existingCategoryIds.contains(parsedCategoryId)) {
        errors.put("categoryId", "must be one of the listed categories");
      }
    }
    return errors;
  }

  /** Copies the validated fields onto a task. Call only after validate() returned no errors. */
  public void applyTo(Task task) {
    task.setTitle(title);
    task.setDescription(description);
    task.setPriority(parsedPriority);
    task.setDueDate(parsedDueDate);
    task.setCategoryId(parsedCategoryId);
  }

  // Getters for the view: the raw strings, exactly as typed.
  public String getTitle() { return title; }
  public String getDescription() { return description; }
  public String getPriority() { return priority; }
  public String getDueDate() { return dueDate; }
  public String getCategoryId() { return categoryId; }

  private static String trimmed(String value) {
    return value == null ? "" : value.strip();
  }
}
