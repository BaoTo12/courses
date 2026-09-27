package com.taskflow.web.categories;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;
import javax.servlet.http.HttpServletRequest;

/** S37 (37.15): the category form, as typed: a name and a colour (#rrggbb, what <input type="color"> sends). */
public class CategoryForm {

  public static final int NAME_MAX = 50;                          // = categories.name
  private static final Pattern COLOR = Pattern.compile("#[0-9a-fA-F]{6}");

  private String name = "";
  private String color = "#64748b";

  public static CategoryForm from(HttpServletRequest request) {
    CategoryForm form = new CategoryForm();
    form.name = request.getParameter("name") == null ? "" : request.getParameter("name").strip();
    form.color = request.getParameter("color") == null ? "" : request.getParameter("color").strip();
    return form;
  }

  public Map<String, String> validate() {
    Map<String, String> errors = new LinkedHashMap<>();
    if (name.isEmpty()) errors.put("name", "Name must not be blank");
    else if (name.length() > NAME_MAX) errors.put("name", "Name must be at most " + NAME_MAX + " characters");
    if (!COLOR.matcher(color).matches()) errors.put("color", "Colour must look like #2563eb");
    return errors;
  }

  public String getName() { return name; }
  public String getColor() { return color; }
}
