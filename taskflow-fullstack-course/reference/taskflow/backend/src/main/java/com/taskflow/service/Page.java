package com.taskflow.service;

import java.util.List;

/**
 * S44 (44.04): one page of a longer list, and what the view needs to draw the pagination: the page number (1-based),
 * the page size, the total, and the derived values. JavaBean getters so EL can read them: ${taskPage.totalPages}.
 */
public record Page<T>(List<T> items, int number, int size, long total) {

  public List<T> getItems() { return items; }
  public int getNumber() { return number; }
  public int getSize() { return size; }
  public long getTotal() { return total; }
  public int getTotalPages() { return total == 0 ? 1 : (int) ((total + size - 1) / size); }
  public boolean isHasPrevious() { return number > 1; }
  public boolean isHasNext() { return number < getTotalPages(); }
  /** How many rows come before this page: the row numbers continue across pages (1–10, 11–20, …). */
  public int getOffset() { return (number - 1) * size; }

  /** A requested page number, made valid: below 1 → 1, beyond the last page → the last page. */
  static int clamp(int requested, long total, int size) {
    int last = total == 0 ? 1 : (int) ((total + size - 1) / size);
    return Math.max(1, Math.min(requested, last));
  }
}
