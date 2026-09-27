package com.cloudarchitect.dvac02.api;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.LambdaLogger;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class S01OrderApiHandlerTest {

    private OrderApiHandler handler;
    private Context mockContext;

    @BeforeEach
    public void setUp() {
        handler = new OrderApiHandler();
        mockContext = new MockLambdaContext();
    }

    @Test
    public void testCreateOrder_whenValidPayload_returns201Created() {
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent()
            .withHttpMethod("POST")
            .withPathParameters(Map.of("proxy", "electronics/phones"))
            .withQueryStringParameters(Map.of("region", "us-east-1"))
            .withBody("{\"itemId\":\"PHONE-12\",\"quantity\":2,\"customerEmail\":\"dev@cloudorder.internal\"}");

        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);

        assertEquals(201, response.getStatusCode());
        assertTrue(response.getHeaders().containsKey("Access-Control-Allow-Origin"));
        assertTrue(response.getBody().contains("ORD-"));
        assertTrue(response.getBody().contains("PHONE-12"));
        assertTrue(response.getBody().contains("electronics/phones"));
        assertTrue(response.getBody().contains("us-east-1"));
    }

    @Test
    public void testCorsPreflightOptions_returns200OkWithCorsHeaders() {
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent()
            .withHttpMethod("OPTIONS");

        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);

        assertEquals(200, response.getStatusCode());
        assertEquals("*", response.getHeaders().get("Access-Control-Allow-Origin"));
        assertTrue(response.getHeaders().get("Access-Control-Allow-Methods").contains("POST"));
    }

    @Test
    public void testMalformedJson_returns400BadRequest() {
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent()
            .withHttpMethod("POST")
            .withBody("{not-a-valid-json");

        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);

        assertEquals(400, response.getStatusCode());
        assertTrue(response.getBody().contains("MalformedJson"));
    }

    // Minimal Mock Context
    private static class MockLambdaContext implements Context {
        @Override public String getAwsRequestId() { return "test-request-id-12345"; }
        @Override public String getLogGroupName() { return "/aws/lambda/test"; }
        @Override public String getLogStreamName() { return "2026/09/27/[$LATEST]"; }
        @Override public String getFunctionName() { return "OrderApiHandler"; }
        @Override public String getFunctionVersion() { return "$LATEST"; }
        @Override public String getInvokedFunctionArn() { return "arn:aws:lambda:us-east-1:123456789012:function:OrderApiHandler"; }
        @Override public com.amazonaws.services.lambda.runtime.CognitoIdentity getIdentity() { return null; }
        @Override public com.amazonaws.services.lambda.runtime.ClientContext getClientContext() { return null; }
        @Override public int getRemainingTimeInMillis() { return 30000; }
        @Override public int getMemoryLimitInMB() { return 1769; }
        @Override public LambdaLogger getLogger() {
            return new LambdaLogger() {
                @Override public void log(String message) { System.out.println("[LAMBDA] " + message); }
                @Override public void log(byte[] message) { System.out.println("[LAMBDA] " + new String(message)); }
            };
        }
    }
}
