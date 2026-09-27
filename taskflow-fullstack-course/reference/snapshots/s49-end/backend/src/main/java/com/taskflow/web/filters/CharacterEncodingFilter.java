package com.taskflow.web.filters;

import java.io.IOException;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;

/**
 * S40 (40.05): request bodies are read as UTF-8, for EVERY request, before anything reads a parameter.
 * Replaces the request.setCharacterEncoding("UTF-8") line S31–S39 repeated in each POST servlet.
 * Must be FIRST in the chain: once a parameter has been read, the encoding can no longer change (40.19).
 */
public class CharacterEncodingFilter implements Filter {

  private String encoding = "UTF-8";

  @Override
  public void init(FilterConfig config) {
    String configured = config.getInitParameter("encoding"); // web.xml <init-param>
    if (configured != null && !configured.isBlank()) encoding = configured;
  }

  @Override
  public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
    if (request.getCharacterEncoding() == null) {   // respect an explicit charset sent by the client
      request.setCharacterEncoding(encoding);
    }
    chain.doFilter(request, response);
  }
}
