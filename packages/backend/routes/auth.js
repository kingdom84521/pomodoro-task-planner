import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { jwtCheck, extractUserInfo } from '../middleware/auth.js'
import { successResponse } from '../utils/responseFormatter.js'
import { findOrCreateUser } from '../services/userService.js'

const router = express.Router()

/**
 * GET /api/auth/me
 * Get current authenticated user information
 * Automatically syncs user to database on first access
 */
router.get('/me', jwtCheck, extractUserInfo, asyncHandler(async (req, res) => {
  // Sync user to database (creates if not exists)
  const user = await findOrCreateUser(req.user)

  res.json(successResponse({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      email_verified: user.email_verified,
      created_at: user.created_at,
    }
  }))
}))

/**
 * POST /api/auth/sync
 * Manually sync user data (optional endpoint for debugging)
 */
router.post('/sync', jwtCheck, extractUserInfo, asyncHandler(async (req, res) => {
  const user = await findOrCreateUser(req.user)

  res.json(successResponse({
    message: 'User synced successfully',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    }
  }))
}))

export default router
