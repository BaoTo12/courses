package com.taskflow.web.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Map;

/**
 * S46: the standard error body of EVERY non-2xx API response (the contract React's ApiRequestError parses, S13):
 *   {"status":400,"error":"VALIDATION_FAILED","message":"…","fieldErrors":{"title":"…"},"path":"/api/tasks","timestamp":"…"}
 * fieldErrors is left out when there are none. Never a stack trace, an exception class or SQL.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(int status, String error, String message, Map<String, String> fieldErrors, String path, String timestamp) {}
