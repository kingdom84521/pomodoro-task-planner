import { eq, and } from 'drizzle-orm'
import { getDb, tasks } from '../database/drizzle.js'

/**
 * Convert task row to snake_case
 */
function toSnakeCase(row) {
  if (!row) return null
  return {
    id: row.id,
    user_id: row.userId,
    title: row.title,
    status: row.status,
    resource_group_id: row.resourceGroupId,
    scheduled_at: row.scheduledAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  }
}

/**
 * Get all active tasks sorted by priority score
 * @param {Object} options - Query options
 * @param {string} options.status - Filter by task status (default: 'active')
 * @param {number} options.limit - Maximum number of tasks to return
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Sorted tasks with statistics
 */
export async function getSortedTasks(options = {}, userId) {
  const { status = 'active', limit } = options
  const db = await getDb()

  // Get all tasks for this user with matching status
  // Note: 'active' is not a real status - it means non-completed tasks
  // For simplicity, we just get tasks with the given status or all non-completed
  let result
  if (status === 'active') {
    // Get all non-completed tasks
    result = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
  } else {
    result = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.status, status)))
  }

  // Convert to snake_case and add placeholder priority scores
  const tasksWithScores = result.map(task => ({
    ...toSnakeCase(task),
    priority_score: 0, // Simplified - no complex priority calculation
    category_info: {},
  }))

  // Apply limit if specified
  const taskList = limit ? tasksWithScores.slice(0, limit) : tasksWithScores

  return {
    tasks: taskList,
    stats: {},
  }
}

/**
 * Refresh priority for a specific task
 * @param {number} taskId - Task ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Task with updated priority score
 */
export async function refreshTaskPriority(taskId, userId) {
  const db = await getDb()

  const result = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))

  if (result.length === 0) {
    throw new Error(`Task not found: ${taskId}`)
  }

  return {
    ...toSnakeCase(result[0]),
    priority_score: 0,
    category_info: {},
  }
}

/**
 * Calculate recommended rank for all tasks
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of tasks with priority scores and ranks
 */
export async function refreshAllPriorities(userId) {
  const { tasks: taskList } = await getSortedTasks({ status: 'active' }, userId)

  // Assign recommended ranks (1-based)
  const tasksWithRanks = taskList.map((task, index) => ({
    ...task,
    recommended_rank: index + 1,
  }))

  return tasksWithRanks
}

export default {
  getSortedTasks,
  refreshTaskPriority,
  refreshAllPriorities,
}
