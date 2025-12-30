/**
 * Format successful response
 * @param {Object} data - Response data
 * @param {string} message - Optional success message
 * @returns {Object} Formatted response
 */
export function successResponse(data, message = 'Success') {
  return {
    success: true,
    message,
    data,
  }
}

/**
 * Format error response
 * @param {string} message - Error message
 * @param {Object} details - Optional error details
 * @returns {Object} Formatted error response
 */
export function errorResponse(message, details = null) {
  const response = {
    success: false,
    error: message,
  }

  if (details) {
    response.details = details
  }

  return response
}

export default {
  successResponse,
  errorResponse,
}
