package com.taskflow.web.tags;

import java.io.IOException;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import javax.servlet.jsp.PageContext;
import javax.servlet.jsp.jstl.fmt.LocaleSupport;
import javax.servlet.jsp.tagext.SimpleTagSupport;

/**
 * S44 (44.13): <tf:relativeTime value="${task.dueDate}" today="${today}"/> → "Due in 3 days" / "Còn 3 ngày",
 * "Due today", "2 days overdue". The TEXT comes from the same resource bundle as <fmt:message> (LocaleSupport), with
 * MessageFormat's choice format for singular/plural; the tag only does the date arithmetic.
 * `today` is an attribute, not LocalDate.now(): the controller's clock decides (testable, one "today" per page).
 */
public class RelativeTimeTag extends SimpleTagSupport {

  private LocalDate value;
  private LocalDate today;

  public void setValue(LocalDate value) { this.value = value; }
  public void setToday(LocalDate today) { this.today = today; }

  @Override
  public void doTag() throws IOException {
    if (value == null || today == null) return;
    long days = ChronoUnit.DAYS.between(today, value);
    PageContext pageContext = (PageContext) getJspContext();
    String text;
    if (days == 0) text = LocaleSupport.getLocalizedMessage(pageContext, "due.today");
    else if (days > 0) text = LocaleSupport.getLocalizedMessage(pageContext, "due.inDays", new Object[] {days});
    else text = LocaleSupport.getLocalizedMessage(pageContext, "due.overdueDays", new Object[] {-days});
    getJspContext().getOut().write(text);         // our own bundle text + a number: nothing user-controlled
  }
}
