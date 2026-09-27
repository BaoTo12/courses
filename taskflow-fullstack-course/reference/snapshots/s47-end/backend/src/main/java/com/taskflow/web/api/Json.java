package com.taskflow.web.api;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.io.IOException;
import java.io.InputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * PROVIDED (S46, 46.03): JSON in and out, with ONE configured Jackson ObjectMapper (thread-safe once configured:
 * share it, don't create one per request).
 *   - JavaTimeModule + no timestamps: Instant → "2026-09-01T08:00:00Z", LocalDate → "2026-10-03" (46.17)
 *   - unknown properties are IGNORED when reading: request DTOs only have the fields a client may set, so extra
 *     fields like "ownerId" simply have nowhere to go (46.11)
 * Bodies are read as a tree (JsonNode) where "absent" and "null" must be told apart (PATCH, 46.05).
 */
public final class Json {

  public static final ObjectMapper MAPPER = new ObjectMapper()
      .registerModule(new JavaTimeModule())
      .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
      .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);

  private Json() {}

  /** The request body as a JSON tree; an EMPTY body is an empty object. Invalid JSON → 400 MALFORMED_JSON. */
  public static JsonNode readTree(HttpServletRequest request) throws IOException {
    try (InputStream in = request.getInputStream()) {
      JsonNode node = MAPPER.readTree(in);
      return node == null || node.isMissingNode() ? JsonNodeFactory.instance.objectNode() : node;
    } catch (JsonProcessingException e) {
      throw ApiException.malformedJson();
    }
  }

  /** The request body bound to a request DTO. Wrong types or invalid JSON → 400 MALFORMED_JSON. */
  public static <T> T read(HttpServletRequest request, Class<T> type) throws IOException {
    JsonNode tree = readTree(request);
    try {
      return MAPPER.treeToValue(tree, type);
    } catch (JsonProcessingException e) {
      throw ApiException.malformedJson();
    }
  }

  /** Writes `body` as the response, with this status and UTF-8 JSON content type. */
  public static void write(HttpServletResponse response, int status, Object body) throws IOException {
    response.setStatus(status);
    response.setContentType("application/json;charset=UTF-8");
    MAPPER.writeValue(response.getWriter(), body);
  }
}
