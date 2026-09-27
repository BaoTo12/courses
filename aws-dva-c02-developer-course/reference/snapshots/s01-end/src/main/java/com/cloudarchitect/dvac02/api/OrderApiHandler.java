package com.cloudarchitect.dvac02.api;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.LambdaLogger;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.cloudarchitect.dvac02.model.ErrorResponse;
import com.cloudarchitect.dvac02.model.OrderRequest;
import com.cloudarchitect.dvac02.model.OrderResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public class OrderApiHandler implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {

    // Instantiate ObjectMapper as a singleton outside handleRequest to reuse across warm invocations
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    // Default CORS & Content-Type response headers
    private static final Map<String, String> DEFAULT_HEADERS = Map.of(
        "Content-Type", "application/json",
        "Access-Control-Allow-Origin", "*",
        "Access-Control-Allow-Methods", "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers", "Content-Type,X-Amz-Date,Authorization,X-Api-Key"
    );

    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent input, Context context) {
        LambdaLogger logger = context.getLogger();
        String httpMethod = input.getHttpMethod() != null ? input.getHttpMethod() : "UNKNOWN";
        logger.log("Received " + httpMethod + " request. Request ID: " + context.getAwsRequestId());

        // 1. Handle CORS Pre-flight OPTIONS
        if ("OPTIONS".equalsIgnoreCase(httpMethod)) {
            return new APIGatewayProxyResponseEvent()
                .withStatusCode(200)
                .withHeaders(DEFAULT_HEADERS)
                .withBody("{\"status\":\"OK\"}");
        }

        // 2. Extract Greedy Path Variable {proxy+}
        Map<String, String> pathParams = input.getPathParameters();
        String categoryPath = (pathParams != null && pathParams.containsKey("proxy")) 
            ? pathParams.get("proxy") 
            : "default";

        // 3. Extract Query String Parameters
        Map<String, String> queryParams = input.getQueryStringParameters();
        String regionFilter = (queryParams != null && queryParams.containsKey("region"))
            ? queryParams.get("region")
            : "global";

        // 4. Route Handling
        if ("POST".equalsIgnoreCase(httpMethod)) {
            return handleCreateOrder(input.getBody(), categoryPath, regionFilter, logger);
        } else if ("GET".equalsIgnoreCase(httpMethod)) {
            return handleGetOrders(categoryPath, regionFilter, logger);
        } else {
            return buildErrorResponse(405, "MethodNotAllowed", "HTTP method " + httpMethod + " is not supported");
        }
    }

    private APIGatewayProxyResponseEvent handleCreateOrder(String body, String categoryPath, String regionFilter, LambdaLogger logger) {
        if (body == null || body.trim().isEmpty()) {
            return buildErrorResponse(400, "InvalidPayload", "Request body cannot be empty");
        }

        try {
            OrderRequest request = OBJECT_MAPPER.readValue(body, OrderRequest.class);

            if (request.getItemId() == null || request.getItemId().trim().isEmpty()) {
                return buildErrorResponse(400, "ValidationFailed", "Attribute 'itemId' is required");
            }
            if (request.getQuantity() <= 0) {
                return buildErrorResponse(400, "ValidationFailed", "Attribute 'quantity' must be greater than 0");
            }

            // Simulated business logic: generate order and price calculation
            String orderId = "ORD-" + UUID.randomUUID().toString();
            double unitPrice = 99.99;
            double totalPrice = unitPrice * request.getQuantity();

            OrderResponse response = new OrderResponse(
                orderId,
                "CREATED",
                request.getItemId(),
                request.getQuantity(),
                totalPrice,
                categoryPath,
                regionFilter
            );

            logger.log("Order created successfully: " + orderId + " in category: " + categoryPath);

            return new APIGatewayProxyResponseEvent()
                .withStatusCode(201)
                .withHeaders(DEFAULT_HEADERS)
                .withBody(OBJECT_MAPPER.writeValueAsString(response));

        } catch (JsonProcessingException e) {
            logger.log("Failed to parse JSON body: " + e.getMessage());
            return buildErrorResponse(400, "MalformedJson", "Invalid JSON syntax: " + e.getOriginalMessage());
        } catch (Exception e) {
            logger.log("Internal system error: " + e.getMessage());
            return buildErrorResponse(500, "InternalServerError", "An unexpected error occurred processing the order");
        }
    }

    private APIGatewayProxyResponseEvent handleGetOrders(String categoryPath, String regionFilter, LambdaLogger logger) {
        logger.log("Querying orders for category: " + categoryPath + ", region: " + regionFilter);
        String dummyList = "[{\"category\":\"" + categoryPath + "\",\"region\":\"" + regionFilter + "\",\"status\":\"HEALTHY\"}]";

        return new APIGatewayProxyResponseEvent()
            .withStatusCode(200)
            .withHeaders(DEFAULT_HEADERS)
            .withBody(dummyList);
    }

    private APIGatewayProxyResponseEvent buildErrorResponse(int statusCode, String error, String message) {
        try {
            ErrorResponse errorBody = new ErrorResponse(error, message, statusCode);
            return new APIGatewayProxyResponseEvent()
                .withStatusCode(statusCode)
                .withHeaders(DEFAULT_HEADERS)
                .withBody(OBJECT_MAPPER.writeValueAsString(errorBody));
        } catch (Exception e) {
            return new APIGatewayProxyResponseEvent()
                .withStatusCode(statusCode)
                .withHeaders(DEFAULT_HEADERS)
                .withBody("{\"error\":\"" + error + "\",\"message\":\"" + message + "\"}");
        }
    }
}
