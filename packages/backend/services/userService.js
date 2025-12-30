import { query } from '../database/index.js'

/**
 * Find or create user by Zitadel sub (user ID)
 * @param {Object} userInfo - User information from JWT
 * @param {string} userInfo.sub - Zitadel user ID
 * @param {string} userInfo.email - User email
 * @param {string} userInfo.name - User name
 * @param {boolean} userInfo.email_verified - Email verification status
 * @returns {Promise<Object>} User record with database ID
 */
export async function findOrCreateUser(userInfo) {
  const { sub, email, name, email_verified } = userInfo

  // Check if user exists
  const existingUser = await query(
    'SELECT * FROM users WHERE zitadel_sub = $1',
    [sub]
  )

  if (existingUser.rows.length > 0) {
    // Update user info if changed
    const user = existingUser.rows[0]
    if (user.email !== email || user.name !== name) {
      const updated = await query(
        `UPDATE users
         SET email = $1, name = $2, email_verified = $3, updated_at = CURRENT_TIMESTAMP
         WHERE zitadel_sub = $4
         RETURNING *`,
        [email, name, email_verified, sub]
      )
      return updated.rows[0]
    }
    return user
  }

  // Create new user
  const newUser = await query(
    `INSERT INTO users (zitadel_sub, email, name, email_verified)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [sub, email, name, email_verified]
  )

  return newUser.rows[0]
}

/**
 * Get user by Zitadel sub
 * @param {string} sub - Zitadel user ID
 * @returns {Promise<Object|null>} User record or null
 */
export async function getUserBySub(sub) {
  const result = await query(
    'SELECT * FROM users WHERE zitadel_sub = $1',
    [sub]
  )
  return result.rows[0] || null
}

/**
 * Get user by database ID
 * @param {number} userId - Database user ID
 * @returns {Promise<Object|null>} User record or null
 */
export async function getUserById(userId) {
  const result = await query(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  )
  return result.rows[0] || null
}

export default {
  findOrCreateUser,
  getUserBySub,
  getUserById,
}
