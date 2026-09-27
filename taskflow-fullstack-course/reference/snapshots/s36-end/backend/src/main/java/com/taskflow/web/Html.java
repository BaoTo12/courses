package com.taskflow.web;

/**
 * S30 (30.14): HTML-escaping for text we write into HTML ourselves (println, later JSP scriptlets).
 * The five characters that can change the meaning of HTML text or of a QUOTED attribute value.
 * JSP pages will use {@code <c:out>} / {@code fn:escapeXml} instead (S35); the rule is the same.
 */
public final class Html {

  private Html() {}

  public static String escape(String text) {
    if (text == null) return "";
    StringBuilder out = new StringBuilder(text.length() + 16);
    for (int i = 0; i < text.length(); i++) {
      char c = text.charAt(i);
      switch (c) {
        case '&' -> out.append("&amp;");
        case '<' -> out.append("&lt;");
        case '>' -> out.append("&gt;");
        case '"' -> out.append("&quot;");
        case '\'' -> out.append("&#39;");
        default -> out.append(c);
      }
    }
    return out.toString();
  }
}
