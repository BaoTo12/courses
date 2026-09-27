package com.taskflow.web.tags;

import java.util.Locale;
import javax.servlet.jsp.PageContext;
import javax.servlet.jsp.jstl.core.Config;

/** S44: the locale JSTL's fmt tags use for this request (set by LocaleFilter), so custom tags format the same way. */
final class Locales {

  private Locales() {}

  static Locale current(PageContext pageContext) {
    Object value = Config.find(pageContext, Config.FMT_LOCALE);   // page → request → session → application scope
    if (value instanceof Locale locale) return locale;
    if (value instanceof String tag) return Locale.forLanguageTag(tag.replace('_', '-'));
    return pageContext.getRequest().getLocale();
  }
}
