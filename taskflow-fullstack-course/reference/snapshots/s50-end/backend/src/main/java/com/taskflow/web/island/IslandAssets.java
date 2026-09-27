package com.taskflow.web.island;

import com.fasterxml.jackson.databind.JsonNode;
import com.taskflow.web.api.Json;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import javax.servlet.ServletContext;

/**
 * S49 (49.07): where the built island files are. `npm run build:island` (frontend) writes hashed files such as
 * static/island/assets/boardIsland-3f9a1c.js plus .vite/manifest.json, which maps each ENTRY to its current file names.
 * JSPs ask this class instead of hard-coding a hash that changes with every build.
 *   manifest["src/island/boardIsland.tsx"] = {"file":"assets/boardIsland-….js","css":["assets/…css"],"imports":[…]}
 * Read on every call while developing (the build may change under a running server); cheap: a small JSON file.
 */
public final class IslandAssets {

  public static final String BASE = "/static/island/";
  private static final String MANIFEST = BASE + ".vite/manifest.json";

  /** An entry's script and stylesheets, as context-relative paths (the JSP puts them through <c:url>). */
  public record Entry(String script, List<String> styles) {
    public String getScript() { return script; }
    public List<String> getStyles() { return styles; }
  }

  private IslandAssets() {}

  /** The built files of this entry, or null when the island hasn't been built (the page shows a hint instead). */
  public static Entry entry(ServletContext context, String entryName) {
    try (InputStream in = context.getResourceAsStream(MANIFEST)) {
      if (in == null) return null;
      JsonNode chunk = Json.MAPPER.readTree(in).get(entryName);
      if (chunk == null) return null;
      List<String> styles = new ArrayList<>();
      if (chunk.has("css")) chunk.get("css").forEach(css -> styles.add(BASE + css.asText()));
      return new Entry(BASE + chunk.get("file").asText(), styles);
    } catch (IOException e) {
      throw new IllegalStateException("Unreadable island manifest " + MANIFEST, e);
    }
  }
}
