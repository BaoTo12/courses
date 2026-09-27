package com.taskflow.web.api.dto;

import com.taskflow.dao.AuditDao;
import com.taskflow.dao.ShareDao;
import com.taskflow.model.Category;
import com.taskflow.model.Comment;
import com.taskflow.model.Priority;
import com.taskflow.model.Task;
import com.taskflow.model.TaskStatus;
import com.taskflow.model.User;
import com.taskflow.service.Page;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * S46 (46.09): RESPONSE DTOs: exactly the fields of the API contract (frontend src/domain/types.ts), built from
 * entities by hand. An entity is never serialised directly: a field added to it later (a password hash, an internal
 * flag, a lazy relation) would appear in every response without anyone deciding so ("excessive data exposure").
 */
public final class Dtos {

  private Dtos() {}

  public record TaskDto(long id, String title, String description, TaskStatus status, Priority priority, LocalDate dueDate,
                        Long categoryId, long ownerId, Instant createdAt, Instant updatedAt) {
    public static TaskDto from(Task t) {
      return new TaskDto(t.getId(), t.getTitle(), t.getDescription(), t.getStatus(), t.getPriority(), t.getDueDate(),
          t.getCategoryId(), t.getOwnerId(), t.getCreatedAt(), t.getUpdatedAt());
    }
  }

  public record CommentDto(long id, long taskId, long authorId, String body, Instant createdAt) {
    public static CommentDto from(Comment c) {
      return new CommentDto(c.getId(), c.getTaskId(), c.getAuthorId(), c.getBody(), c.getCreatedAt());
    }
  }

  public record CategoryDto(long id, String name, String color) {
    public static CategoryDto from(Category c) {
      return new CategoryDto(c.getId(), c.getName(), c.getColor());
    }
  }

  /** No email, no password hash, no "enabled": what the SPA needs to show who is logged in. */
  public record UserDto(long id, String username, String displayName, String role, String locale) {
    public static UserDto from(User u) {
      return new UserDto(u.getId(), u.getUsername(), u.getDisplayName(), u.getRole(), u.getLocale() == null ? "en" : u.getLocale());
    }
  }

  /** The list envelope. `page` is 0-based in the API (the service's Page is 1-based). */
  public record PageDto<T>(List<T> items, int page, int size, long totalItems, int totalPages) {
    public static <E, T> PageDto<T> from(Page<E> page, Function<E, T> mapper) {
      int totalPages = (int) ((page.total() + page.size() - 1) / page.size());
      return new PageDto<>(page.items().stream().map(mapper).toList(), page.number() - 1, page.size(), page.total(), totalPages);
    }
  }

  /** S51: a user a task is shared with. */
  public record ShareDto(long userId, String username, String displayName) {
    public static ShareDto from(ShareDao.Share s) {
      return new ShareDto(s.userId(), s.username(), s.displayName());
    }
  }

  /** S51: one entry of the activity feed. details is "task 5: <title>": user data, escaped by whoever renders it. */
  public record ActivityDto(long id, String type, String details, String at) {
    public static ActivityDto from(AuditDao.Event e) {
      return new ActivityDto(e.id(), e.type(), e.details(), e.at().toString() + "Z");   // stored in UTC
    }
  }

  public record StatsDto(long total, Map<String, Integer> byStatus, Map<String, Integer> byPriority) {}
}
