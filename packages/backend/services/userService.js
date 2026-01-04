import { eq } from 'drizzle-orm'
import { getDb, users } from '../database/drizzle.js'

/**
 * Convert user row from camelCase to snake_case for API compatibility
 */
function toSnakeCase(row) {
  if (!row) return null
  return {
    id: row.id,
    zitadel_sub: row.zitadelSub,
    email: row.email,
    name: row.name,
    email_verified: row.emailVerified,
    settings_data: row.settingsData,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  }
}

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
  const db = await getDb()

  // Check if user exists
  const existingUsers = await db
    .select()
    .from(users)
    .where(eq(users.zitadelSub, sub))

  if (existingUsers.length > 0) {
    const user = existingUsers[0]
    // Update user info if changed
    if (user.email !== email || user.name !== name) {
      const updated = await db
        .update(users)
        .set({
          email,
          name,
          emailVerified: email_verified,
          updatedAt: new Date(),
        })
        .where(eq(users.zitadelSub, sub))
        .returning()
      return toSnakeCase(updated[0])
    }
    return toSnakeCase(user)
  }

  // Create new user
  const newUser = await db
    .insert(users)
    .values({
      zitadelSub: sub,
      email,
      name,
      emailVerified: email_verified,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  return toSnakeCase(newUser[0])
}

/**
 * Get user by Zitadel sub
 * @param {string} sub - Zitadel user ID
 * @returns {Promise<Object|null>} User record or null
 */
export async function getUserBySub(sub) {
  const db = await getDb()
  const result = await db
    .select()
    .from(users)
    .where(eq(users.zitadelSub, sub))

  return toSnakeCase(result[0])
}

/**
 * Get user by database ID
 * @param {number} userId - Database user ID
 * @returns {Promise<Object|null>} User record or null
 */
export async function getUserById(userId) {
  const db = await getDb()
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))

  return toSnakeCase(result[0])
}

export default {
  findOrCreateUser,
  getUserBySub,
  getUserById,
}
