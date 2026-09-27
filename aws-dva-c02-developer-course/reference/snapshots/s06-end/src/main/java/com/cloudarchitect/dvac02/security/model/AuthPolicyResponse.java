package com.cloudarchitect.dvac02.security.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

/**
 * Standard API Gateway Custom Authorizer Policy Response.
 */
public record AuthPolicyResponse(
        @JsonProperty("principalId") String principalId,
        @JsonProperty("policyDocument") PolicyDocument policyDocument,
        @JsonProperty("context") Map<String, Object> context
) {
    public record PolicyDocument(
            @JsonProperty("Version") String version,
            @JsonProperty("Statement") List<Statement> statement
    ) {}

    public record Statement(
            @JsonProperty("Action") String action,
            @JsonProperty("Effect") String effect,
            @JsonProperty("Resource") String resource
    ) {}

    public static AuthPolicyResponse allow(String principalId, String methodArn, Map<String, Object> context) {
        Statement statement = new Statement("execute-api:Invoke", "Allow", methodArn);
        PolicyDocument policyDoc = new PolicyDocument("2012-10-17", List.of(statement));
        return new AuthPolicyResponse(principalId, policyDoc, context);
    }

    public static AuthPolicyResponse deny(String principalId, String methodArn) {
        Statement statement = new Statement("execute-api:Invoke", "Deny", methodArn);
        PolicyDocument policyDoc = new PolicyDocument("2012-10-17", List.of(statement));
        return new AuthPolicyResponse(principalId, policyDoc, Map.of());
    }
}
