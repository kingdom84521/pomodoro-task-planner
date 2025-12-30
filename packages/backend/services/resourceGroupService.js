import db from '../database/index.js'

/**
 * Get all resource groups for a user
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of resource groups
 */
export async function getResourceGroups(userId) {
  const result = await db.query(
    `SELECT * FROM resource_groups WHERE user_id = $1 ORDER BY created_at ASC`,
    [userId]
  )
  return result.rows
}

/**
 * Create a new resource group
 * @param {Object} groupData - Resource group data
 * @param {string} groupData.name - Resource group name
 * @param {number} groupData.percentage_limit - Percentage limit (0-100)
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Created resource group
 */
export async function createResourceGroup(groupData, userId) {
  const { name, percentage_limit } = groupData

  const result = await db.query(
    `INSERT INTO resource_groups (user_id, name, percentage_limit)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, name, percentage_limit]
  )

  return result.rows[0]
}

/**
 * Update a resource group
 * @param {number} groupId - Resource group ID
 * @param {Object} groupData - Updated data
 * @param {string} groupData.name - Resource group name
 * @param {number} groupData.percentage_limit - Percentage limit (0-100)
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Updated resource group
 */
export async function updateResourceGroup(groupId, groupData, userId) {
  const { name, percentage_limit } = groupData

  const result = await db.query(
    `UPDATE resource_groups
     SET name = $1, percentage_limit = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3 AND user_id = $4
     RETURNING *`,
    [name, percentage_limit, groupId, userId]
  )

  if (result.rows.length === 0) {
    throw new Error('Resource group not found')
  }

  return result.rows[0]
}

/**
 * Delete a resource group
 * @param {number} groupId - Resource group ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Deleted resource group
 */
export async function deleteResourceGroup(groupId, userId) {
  const result = await db.query(
    `DELETE FROM resource_groups
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [groupId, userId]
  )

  if (result.rows.length === 0) {
    throw new Error('Resource group not found')
  }

  return result.rows[0]
}

export default {
  getResourceGroups,
  createResourceGroup,
  updateResourceGroup,
  deleteResourceGroup,
}
