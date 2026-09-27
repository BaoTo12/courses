package com.taskflow.web.debug;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.TextNode;
import com.taskflow.web.api.Json;
import java.io.CharArrayWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpServletResponseWrapper;

/**
 * PROVIDED LAB TOOL (S48, 48.05): when switched on (POST /debug/contract-drift, loopback only), rewrites every /api/*
 * JSON response to break the contract in SIX ways a real integration often does. The API code itself stays correct:
 * this filter only simulates "the backend team changed something". Off by default; switch it off after the lab.
 *   1. dates         "2026-10-03"          → "03/10/2026"
 *   2. enum casing   "IN_PROGRESS"         → "in_progress"
 *   3. page fields   "totalItems"          → "total"
 *   4. error shape   {status,error,message} → {"code":…,"detail":…}
 *   5. 204 bodies    204 (empty)           → 200 {"ok":true}
 *   6. id types      "id": 5               → "id": "5"
 * Uses a response WRAPPER (40.09) that buffers what the servlet writes, then transforms and writes it for real.
 */
public class ContractDriftFilter implements Filter {

  public static final String ATTRIBUTE = ContractDriftFilter.class.getName() + ".enabled";
  private static final Set<String> ENUM_FIELDS = Set.of("status", "priority", "role");
  private static final Set<String> ID_FIELDS = Set.of("id", "taskId", "ownerId", "authorId", "categoryId");

  @Override
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
    if (!Boolean.TRUE.equals(req.getServletContext().getAttribute(ATTRIBUTE))) {
      chain.doFilter(req, res);
      return;
    }
    HttpServletResponse response = (HttpServletResponse) res;
    Buffered buffered = new Buffered(response);
    chain.doFilter(req, buffered);
    String body = buffered.text();
    if (response.getStatus() == 204) {                              // 5.
      Json.write(response, 200, Map.of("ok", true));
      return;
    }
    if (body.isEmpty() || response.getContentType() == null || !response.getContentType().startsWith("application/json")) {
      response.getWriter().write(body);
      return;
    }
    JsonNode tree = Json.MAPPER.readTree(body);
    Json.write(response, response.getStatus(), drift(tree, response.getStatus() >= 400));
  }

  private static JsonNode drift(JsonNode node, boolean error) {
    if (error && node.isObject() && node.has("error")) {            // 4.
      ObjectNode changed = Json.MAPPER.createObjectNode();
      changed.set("code", node.get("error"));
      changed.set("detail", node.get("message"));
      return changed;
    }
    if (node.isArray()) {
      ArrayNode array = Json.MAPPER.createArrayNode();
      node.forEach(item -> array.add(drift(item, false)));
      return array;
    }
    if (!node.isObject()) return node;
    ObjectNode object = Json.MAPPER.createObjectNode();
    List<String> names = new ArrayList<>();
    node.fieldNames().forEachRemaining(names::add);
    for (String name : names) {
      JsonNode value = node.get(name);
      String key = name.equals("totalItems") ? "total" : name;                                          // 3.
      if (ENUM_FIELDS.contains(name) && value.isTextual()) value = TextNode.valueOf(value.asText().toLowerCase()); // 2.
      else if (ID_FIELDS.contains(name) && value.isNumber()) value = TextNode.valueOf(value.asText());           // 6.
      else if (value.isTextual() && value.asText().matches("\\d{4}-\\d{2}-\\d{2}")) {                            // 1.
        String[] ymd = value.asText().split("-");
        value = TextNode.valueOf(ymd[2] + "/" + ymd[1] + "/" + ymd[0]);
      } else value = drift(value, false);
      object.set(key, value);
    }
    return object;
  }

  /** Keeps the servlet's output instead of sending it (writer only: the API writes text). */
  private static final class Buffered extends HttpServletResponseWrapper {
    private final CharArrayWriter buffer = new CharArrayWriter();
    private final PrintWriter writer = new PrintWriter(buffer);

    Buffered(HttpServletResponse response) {
      super(response);
    }

    @Override
    public PrintWriter getWriter() {
      return writer;
    }

    @Override
    public ServletOutputStream getOutputStream() {
      throw new IllegalStateException("The contract-drift lab only supports getWriter()");
    }

    @Override
    public void resetBuffer() {
      buffer.reset();
    }

    @Override
    public void flushBuffer() {
      writer.flush();                                 // don't commit the real response yet
    }

    String text() {
      writer.flush();
      return buffer.toString();
    }
  }
}
