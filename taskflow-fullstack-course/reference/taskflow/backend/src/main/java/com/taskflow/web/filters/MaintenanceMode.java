package com.taskflow.web.filters;

/**
 * S40 (40.15): is the application in maintenance? One object in APPLICATION scope (38.04): the initial value comes
 * from the context param taskflow.maintenance, and it can be switched at runtime (/debug/maintenance).
 * volatile: a switch by one thread is seen by every request thread immediately.
 */
public class MaintenanceMode {

  public static final String ATTRIBUTE = MaintenanceMode.class.getName();

  private volatile boolean enabled;

  public MaintenanceMode(boolean enabled) {
    this.enabled = enabled;
  }

  public boolean isEnabled() { return enabled; }
  public void setEnabled(boolean enabled) { this.enabled = enabled; }
}
