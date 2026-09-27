package com.cloudarchitect.dvac02.security.handler;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayCustomAuthorizerEvent;
import com.auth0.jwt.JWT;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.cloudarchitect.dvac02.security.model.AuthPolicyResponse;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/**
 * AWS Lambda Custom Token Authorizer for Amazon API Gateway.
 * Validates Cognito User Pool issued RS256 JWTs and outputs IAM Authorization Policies.
 */
public class CognitoJwtAuthorizerHandler implements RequestHandler<APIGatewayCustomAuthorizerEvent, AuthPolicyResponse> {

    private final String expectedIssuer;
    private final String expectedClientId;

    public CognitoJwtAuthorizerHandler() {
        this(
                System.getenv("COGNITO_ISSUER"),
                System.getenv("COGNITO_CLIENT_ID")
        );
    }

    public CognitoJwtAuthorizerHandler(String expectedIssuer, String expectedClientId) {
        this.expectedIssuer = expectedIssuer;
        this.expectedClientId = expectedClientId;
    }

    @Override
    public AuthPolicyResponse handleRequest(APIGatewayCustomAuthorizerEvent event, Context context) {
        String methodArn = event.getMethodArn();
        String rawToken = event.getAuthorizationToken();

        if (rawToken == null || rawToken.isBlank()) {
            System.err.println("[AUTHORIZER] Missing authorization token");
            return AuthPolicyResponse.deny("anonymous", methodArn);
        }

        String jwtString = rawToken.startsWith("Bearer ") ? rawToken.substring(7) : rawToken;

        try {
            DecodedJWT jwt = JWT.decode(jwtString);

            // 1. Validate Expiration (exp)
            Date expiresAt = jwt.getExpiresAt();
            if (expiresAt == null || expiresAt.before(new Date())) {
                System.err.println("[AUTHORIZER] Token expired at: " + expiresAt);
                return AuthPolicyResponse.deny("anonymous", methodArn);
            }

            // 2. Validate Issuer (iss)
            if (expectedIssuer != null && !expectedIssuer.equals(jwt.getIssuer())) {
                System.err.println("[AUTHORIZER] Invalid issuer: " + jwt.getIssuer());
                return AuthPolicyResponse.deny("anonymous", methodArn);
            }

            // 3. Validate Token Use (token_use must be 'access' or 'id')
            String tokenUse = jwt.getClaim("token_use").asString();
            if (tokenUse == null || (!"access".equals(tokenUse) && !"id".equals(tokenUse))) {
                System.err.println("[AUTHORIZER] Invalid token_use: " + tokenUse);
                return AuthPolicyResponse.deny("anonymous", methodArn);
            }

            // 4. Validate Client ID / Audience
            if (expectedClientId != null) {
                String clientId = "access".equals(tokenUse) ? jwt.getClaim("client_id").asString() : jwt.getAudience().get(0);
                if (!expectedClientId.equals(clientId)) {
                    System.err.println("[AUTHORIZER] Audience / Client ID mismatch: " + clientId);
                    return AuthPolicyResponse.deny("anonymous", methodArn);
                }
            }

            // Extract Principal & Context Claims
            String principalId = jwt.getSubject() != null ? jwt.getSubject() : "authenticated-user";
            Map<String, Object> authContext = new HashMap<>();
            
            String customerId = jwt.getClaim("custom:customerId").asString();
            authContext.put("customerId", customerId != null ? customerId : principalId);
            
            String role = jwt.getClaim("custom:role").asString();
            authContext.put("role", role != null ? role : "CUSTOMER");

            System.out.printf("[AUTHORIZER-ALLOW] User: %s | Role: %s | MethodArn: %s%n", principalId, role, methodArn);
            return AuthPolicyResponse.allow(principalId, methodArn, authContext);

        } catch (Exception e) {
            System.err.println("[AUTHORIZER-ERROR] Failed to parse JWT: " + e.getMessage());
            return AuthPolicyResponse.deny("anonymous", methodArn);
        }
    }
}
