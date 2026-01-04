import { eq } from 'drizzle-orm'
import { getDb, users } from '../database/drizzle.js'

/**
 * Get user settings data
 * @param {number} userId - User ID
 * @returns {Promise<string|null>} Base64 encoded settings data or null
 */
export async function getUserSettings(userId) {
  const db = await getDb()
  const result = await db
    .select({ settingsData: users.settingsData })
    .from(users)
    .where(eq(users.id, userId))

  if (result.length === 0) {
    return null
  }

  return result[0].settingsData
}

/**
 * Update user settings data
 * @param {number} userId - User ID
 * @param {string} settingsData - Base64 encoded settings data
 * @returns {Promise<boolean>} True if updated successfully
 */
export async function updateUserSettings(userId, settingsData) {
  const db = await getDb()
  const result = await db
    .update(users)
    .set({
      settingsData,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning()

  return result.length > 0
}

export default {
  getUserSettings,
  updateUserSettings,
}
