package com.taskflow.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URLEncoder;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

/** S37 Your Turn (37.15): category management with validation, "in use" protection, PRG and CSRF. */
class S37CategoriesTest extends TomcatTest {

  private static String enc(String s) {
    return URLEncoder.encode(s, StandardCharsets.UTF_8);
  }

  @Test
  void theListShowsEveryCategoryWithItsTaskCount() throws Exception {
    String page = get(CONTEXT + "/categories").body();
    assertTrue(page.contains("value=\"Engineering\""), page);
    assertTrue(page.matches("(?s).*<td class=\"category__count\">\\d+</td>.*"));
  }

  @Test
  void createRenameAndDeleteAnUnusedCategory() throws Exception {
    String name = "Research " + System.nanoTime();
    HttpResponse<String> created = postForm(CONTEXT + "/categories/save", "name=" + enc(name) + "&color=%23112233");
    assertEquals(303, created.statusCode());
    assertEquals(CONTEXT + "/categories", created.headers().firstValue("Location").orElseThrow());
    String page = get(CONTEXT + "/categories").body();
    assertTrue(page.contains("Category &#034;" + name + "&#034; created."), page);
    String id = page.replaceAll("(?s).*name=\"id\" value=\"(\\d+)\">\\s*<input name=\"name\" maxlength=\"50\" value=\"" + name + "\".*", "$1");

    String renamed = name + " (renamed)";
    assertEquals(303, postForm(CONTEXT + "/categories/save", "id=" + id + "&name=" + enc(renamed) + "&color=%23445566").statusCode());
    assertTrue(get(CONTEXT + "/categories").body().contains("value=\"" + renamed + "\""));

    assertEquals(303, postForm(CONTEXT + "/categories/delete", "id=" + id).statusCode());
    String after = get(CONTEXT + "/categories").body();
    assertTrue(after.contains("deleted."));
    assertFalse(after.contains("value=\"" + renamed + "\""));
  }

  @Test
  void aCategoryInUseIsNotDeleted() throws Exception {
    HttpResponse<String> refused = postForm(CONTEXT + "/categories/delete", "id=1");   // "Work": used by seeded tasks
    assertEquals(303, refused.statusCode());
    String page = get(CONTEXT + "/categories").body();
    assertTrue(page.matches("(?s).*Category &#034;Work&#034; is used by \\d+ tasks: move them to another category first\\..*"), page);
    assertTrue(page.contains("value=\"Work\""));
  }

  @Test
  void invalidOrDuplicateNamesComeBackAs400WithErrors() throws Exception {
    HttpResponse<String> duplicate = postForm(CONTEXT + "/categories/save", "name=" + enc("work") + "&color=%23000000");
    assertEquals(400, duplicate.statusCode());                                         // "Work" exists: _ci collation
    assertTrue(duplicate.body().contains("A category named &#034;work&#034; already exists"));
    assertTrue(duplicate.body().contains("value=\"work\""));                          // the new-category form keeps it

    HttpResponse<String> invalid = postForm(CONTEXT + "/categories/save", "name=&color=red");
    assertEquals(400, invalid.statusCode());
    assertTrue(invalid.body().contains("Name must not be blank"));
    assertTrue(invalid.body().contains("Colour must look like #2563eb"));
  }

  @Test
  void everyWriteNeedsTheToken() throws Exception {
    HttpResponse<String> forged = send(HttpRequest.newBuilder(uri(CONTEXT + "/categories/delete"))
        .header("Content-Type", "application/x-www-form-urlencoded").POST(HttpRequest.BodyPublishers.ofString("id=4")).build());
    assertEquals(403, forged.statusCode());
  }
}
