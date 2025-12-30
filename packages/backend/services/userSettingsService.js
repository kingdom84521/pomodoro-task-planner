import db from '../database/index.js'

/**
 * Get user settings data
 * @param {number} userId - User ID
 * @returns {Promise<string|null>} Base64 encoded settings data or null
 */
export async function getUserSettings(userId) {
  const result = await db.query(
    'SELECT settings_data FROM users WHERE id = $1',
    [userId]
  )

  if (result.rows.length === 0) {
    return null
  }

  return result.rows[0].settings_data
}

/**
 * Update user settings data
 * @param {number} userId - User ID
 * @param {string} settingsData - Base64 encoded settings data
 * @returns {Promise<boolean>} True if updated successfully
 */
export async function updateUserSettings(userId, settingsData) {
  const result = await db.query(
    'UPDATE users SET settings_data = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [settingsData, userId]
  )

  return result.rows.length > 0
}

export default {
  getUserSettings,
  updateUserSettings,
}
