import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { successResponse } from '../utils/responseFormatter.js'
import config from '../config/index.js'

const router = express.Router()

/**
 * GET /api/config/:moduleName
 * Get config by module name (camelCase)
 * Example: /api/config/taskStatus
 */
router.get('/:moduleName', asyncHandler(async (req, res) => {
  const { moduleName } = req.params

  if (!config[moduleName]) {
    return res.status(404).json({
      success: false,
      error: `Config module '${moduleName}' not found`,
    })
  }

  res.json(successResponse({ config: config[moduleName] }))
}))

export default router
