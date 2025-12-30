import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { successResponse } from '../utils/responseFormatter.js'
import { getUserSettings, updateUserSettings } from '../services/userSettingsService.js'

const router = express.Router()

/**
 * GET /api/user-settings
 * Get user settings (base64 encoded)
 */
router.get('/', asyncHandler(async (req, res) => {
  const settingsData = await getUserSettings(req.user.id)
  res.json(successResponse({ settings_data: settingsData }))
}))

/**
 * PUT /api/user-settings
 * Update user settings (base64 encoded)
 */
router.put('/', asyncHandler(async (req, res) => {
  const { settings_data } = req.body

  if (!settings_data) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: settings_data',
    })
  }

  // Validate base64 format
  try {
    atob(settings_data)
  } catch {
    return res.status(400).json({
      success: false,
      error: 'Invalid base64 format',
    })
  }

  const updated = await updateUserSettings(req.user.id, settings_data)

  if (!updated) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    })
  }

  res.json(successResponse({ success: true }))
}))

export default router
