package com.taskflow.web;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.LongAdder;

/**
 * S38 (38.07): live counters in APPLICATION scope: one object, shared by every request thread at once.
 * So every field is a thread-safe type: an `int` with `++` would lose updates under load (38.12).
 */
public class AppStats {

  public static final String ATTRIBUTE = AppStats.class.getName();

  private final LongAdder requests = new LongAdder();                          // many writers, rare readers: LongAdder
  private final AtomicInteger activeSessions = new AtomicInteger();
  private final Map<Long, LongAdder> taskViews = new ConcurrentHashMap<>();   // 38.10: "most viewed", since startup

  public void requestStarted() { requests.increment(); }
  public void sessionCreated() { activeSessions.incrementAndGet(); }
  public void sessionDestroyed() { activeSessions.decrementAndGet(); }

  public void taskViewed(long taskId) {
    taskViews.computeIfAbsent(taskId, id -> new LongAdder()).increment();    // atomic "create if missing"
  }

  public long getRequests() { return requests.sum(); }
  public int getActiveSessions() { return activeSessions.get(); }

  /** The n most viewed task ids with their counts, most viewed first. */
  public List<Map.Entry<Long, Long>> mostViewed(int n) {
    return taskViews.entrySet().stream()
        .map(e -> Map.entry(e.getKey(), e.getValue().sum()))
        .sorted(Map.Entry.<Long, Long>comparingByValue(Comparator.reverseOrder()))
        .limit(n)
        .toList();
  }
}
