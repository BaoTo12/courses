package com.taskflow.security;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * S41 (41.15): slows down password guessing. Failed logins are counted per ACCOUNT and per client IP, in a time
 * window; over the limit, logins are refused (even with the right password) until the window ends.
 * In memory, application-wide, thread-safe (38.04): ConcurrentHashMap.compute is atomic per key.
 * Limits of this design: per server (a cluster needs a shared store), lost on restart, and the map grows with the
 * number of distinct keys (expired windows are dropped when touched).
 */
public class LoginThrottle {

  private record Window(int failures, Instant start) {}

  private final int maxPerAccount;
  private final int maxPerIp;
  private final Duration period;
  private final Clock clock;
  private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

  public LoginThrottle(int maxPerAccount, int maxPerIp, Duration period, Clock clock) {
    this.maxPerAccount = maxPerAccount;
    this.maxPerIp = maxPerIp;
    this.period = period;
    this.clock = clock;
  }

  public boolean isBlocked(String username, String ip) {
    return failures("user:" + username) >= maxPerAccount || failures("ip:" + ip) >= maxPerIp;
  }

  public void recordFailure(String username, String ip) {
    fail("user:" + username);
    fail("ip:" + ip);
  }

  public void recordSuccess(String username) {
    windows.remove("user:" + username);
  }

  public Duration period() {
    return period;
  }

  private void fail(String key) {
    Instant now = clock.instant();
    windows.compute(key, (k, w) -> w == null || expired(w, now) ? new Window(1, now) : new Window(w.failures() + 1, w.start()));
  }

  private int failures(String key) {
    Instant now = clock.instant();
    Window w = windows.get(key);
    if (w == null) return 0;
    if (expired(w, now)) {
      windows.remove(key, w);
      return 0;
    }
    return w.failures();
  }

  private boolean expired(Window w, Instant now) {
    return w.start().plus(period).isBefore(now);
  }
}
