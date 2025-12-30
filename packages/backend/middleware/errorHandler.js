import { errorResponse } from '../utils/responseFormatter.js'

/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function errorHandler(err, req, res, next) {
  console.error('Error:', err)

  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal server error'

  res.status(statusCode).json(errorResponse(message, {
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  }))
}

/**
 * Async route handler wrapper
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped function
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export default {
  errorHandler,
  asyncHandler,
}
