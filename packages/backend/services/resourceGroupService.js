import { eq, and, asc } from 'drizzle-orm'
import { getDb, resourceGroups, tasks } from '../database/drizzle.js'

/**
 * Get all resource groups for a user
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of resource groups
 */
export async function getResourceGroups(userId) {
  const db = await getDb()
  const result = await db
    .select()
    .from(resourceGroups)
    .where(eq(resourceGroups.userId, userId))
    .orderBy(asc(resourceGroups.createdAt))

  // Convert to snake_case for API compatibility
  return result.map(row => ({
    id: row.id,
    user_id: row.userId,
    name: row.name,
    percentage_limit: row.percentageLimit,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  }))
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
  const db = await getDb()

  const result = await db
    .insert(resourceGroups)
    .values({
      userId,
      name,
      percentageLimit: percentage_limit,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  const row = result[0]
  return {
    id: row.id,
    user_id: row.userId,
    name: row.name,
    percentage_limit: row.percentageLimit,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  }
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
  const db = await getDb()

  const result = await db
    .update(resourceGroups)
    .set({
      name,
      percentageLimit: percentage_limit,
      updatedAt: new Date(),
    })
    .where(and(eq(resourceGroups.id, groupId), eq(resourceGroups.userId, userId)))
    .returning()

  if (result.length === 0) {
    throw new Error('Resource group not found')
  }

  const row = result[0]
  return {
    id: row.id,
    user_id: row.userId,
    name: row.name,
    percentage_limit: row.percentageLimit,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  }
}

/**
 * Delete a resource group
 * @param {number} groupId - Resource group ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Deleted resource group
 */
export async function deleteResourceGroup(groupId, userId) {
  const db = await getDb()

  // First, set resource_group_id to null for all tasks that reference this group
  await db
    .update(tasks)
    .set({ resourceGroupId: null })
    .where(eq(tasks.resourceGroupId, groupId))

  // Then delete the resource group
  const result = await db
    .delete(resourceGroups)
    .where(and(eq(resourceGroups.id, groupId), eq(resourceGroups.userId, userId)))
    .returning()

  if (result.length === 0) {
    throw new Error('Resource group not found')
  }

  const row = result[0]
  return {
    id: row.id,
    user_id: row.userId,
    name: row.name,
    percentage_limit: row.percentageLimit,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  }
}

export default {
  getResourceGroups,
  createResourceGroup,
  updateResourceGroup,
  deleteResourceGroup,
}
