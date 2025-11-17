/**
 * Artillery Load Test Processor
 *
 * This module provides custom functions and hooks for Artillery load tests.
 * It can be used to generate dynamic data, validate responses, and collect custom metrics.
 */

module.exports = {
  /**
   * Generate a random date string for testing historical queries
   */
  generateRandomDate: function(requestParams, context, ee, next) {
    const year = 2024;
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');

    context.vars.randomDate = `${year}-${month}-${day}`;
    return next();
  },

  /**
   * Log response times for analysis
   */
  logResponse: function(requestParams, response, context, ee, next) {
    if (response.statusCode >= 400) {
      console.log(`Error response: ${response.statusCode} for ${requestParams.url}`);
    }
    return next();
  },

  /**
   * Before scenario hook - runs before each virtual user scenario
   */
  beforeScenario: function(userContext, events, done) {
    // Initialize custom variables
    userContext.vars.userId = Math.floor(Math.random() * 10000);
    return done();
  },

  /**
   * After response hook - runs after each HTTP response
   */
  afterResponse: function(requestParams, response, userContext, events, done) {
    // Check cache headers
    if (response.headers['x-cache-hit']) {
      events.emit('counter', 'cache.hits', 1);
    } else {
      events.emit('counter', 'cache.misses', 1);
    }

    return done();
  },

  /**
   * Custom metrics function
   */
  customMetrics: function(requestParams, response, context, ee, next) {
    // Track response sizes
    if (response.body) {
      const size = Buffer.byteLength(response.body);
      ee.emit('histogram', 'response.size.bytes', size);
    }

    return next();
  }
};
