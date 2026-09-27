package com.taskflow.web.island;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.taskflow.web.api.Json;

/**
 * S49 (49.05): JSON that is safe to place INSIDE an HTML <script type="application/json"> element.
 * The HTML parser ends a script element at the first "</script" — whatever JSON thinks — so a task titled
 * "</script><script>alert(1)</script>" would break out. Escaping <, > and & as <, >, & keeps the JSON
 * identical for JSON.parse and gives the HTML parser nothing to see. U+2028/U+2029 are escaped too (they end lines
 * in older JavaScript parsers). The page reads it with textContent + JSON.parse: never executed.
 */
public final class ScriptJson {

  private ScriptJson() {}

  public static String of(Object value) {
    try {
      return escape(Json.MAPPER.writeValueAsString(value));
    } catch (JsonProcessingException e) {
      throw new IllegalStateException("Cannot serialise initial data", e);
    }
  }

  static String escape(String json) {
    StringBuilder out = new StringBuilder(json.length() + 16);
    for (int i = 0; i < json.length(); i++) {
      char c = json.charAt(i);
      switch (c) {
        case '<' -> out.append("\\u003c");
        case '>' -> out.append("\\u003e");
        case '&' -> out.append("\\u0026");
        case ' ' -> out.append("\\u2028");
        case ' ' -> out.append("\\u2029");
        default -> out.append(c);
      }
    }
    return out.toString();
  }
}
