package com.taskflow.service;

import com.taskflow.dao.UserDao;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * S42 (42.07): every account's CURRENT state (enabled? which role?), kept in memory so the authentication filter can
 * check it on every request without a query. A session holds a COPY of the user taken at login; this is the truth
 * it's compared with. Same pattern as CategoryCatalog (38.06): a volatile, immutable snapshot, replaced as a whole
 * by refresh() after an admin changes an account.
 * One server only: with several, each would need to hear about the change (a shared cache, or a short expiry).
 */
public class AccountRegistry {

  public record State(boolean enabled, String role) {}

  private final UserDao users;
  private volatile Map<Long, State> states;

  public AccountRegistry(UserDao users) {
    this.users = users;
    refresh();
  }

  /** Empty for an unknown id (a deleted user): treat it like a disabled one. */
  public Optional<State> state(long userId) {
    return Optional.ofNullable(states.get(userId));
  }

  public void refresh() {
    states = users.findAccounts().stream()
        .collect(Collectors.toUnmodifiableMap(UserDao.Account::id, a -> new State(a.enabled(), a.role())));
  }
}
