import { eq, and, desc, inArray } from 'drizzle-orm'
import { getDb, tasks } from '../database/drizzle.js'

/**
 * Convert task row from camelCase to snake_case for API compatibility
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
 * Create a simple task (for UI, not Notion sync)
 * @param {Object} taskData - Task data
 * @param {string} taskData.title - Task title
 * @param {string} taskData.status - Task status (optional, defaults to '待處理')
 * @param {number} taskData.resource_group_id - Resource group ID (optional)
 * @param {Date|string} taskData.scheduled_at - Scheduled start time (optional)
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Created task
 */
export async function createSimpleTask(taskData, userId) {
  const {
    title,
    status = '待處理',
    resource_group_id = null,
    scheduled_at = null,
  } = taskData

  const db = await getDb()
  const result = await db
    .insert(tasks)
    .values({
      userId,
      title,
      status,
      resourceGroupId: resource_group_id,
      scheduledAt: scheduled_at ? new Date(scheduled_at) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  return toSnakeCase(result[0])
}

/**
 * Get task by ID
 * @param {number} taskId - Task ID
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} Task object or null if not found
 */
export async function getTaskById(taskId, userId) {
  const db = await getDb()
  const result = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))

  return result.length > 0 ? toSnakeCase(result[0]) : null
}

/**
 * Update task status
 * @param {number} taskId - Task ID
 * @param {string} status - New status
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Updated task
 */
export async function updateTaskStatus(taskId, status, userId) {
  const db = await getDb()
  const result = await db
    .update(tasks)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning()

  if (result.length === 0) {
    throw new Error(`Task not found: ${taskId}`)
  }

  return toSnakeCase(result[0])
}

/**
 * Get all tasks
 * @param {Object} options - Query options
 * @param {string} options.status - Filter by status
 * @param {number} options.limit - Maximum number of tasks
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of tasks
 */
export async function getAllTasks(options = {}, userId) {
  const { status, limit } = options
  const db = await getDb()

  let query = db.select().from(tasks).where(eq(tasks.userId, userId))

  if (status) {
    query = db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.status, status)))
  }

  let result = await query.orderBy(desc(tasks.createdAt))

  if (limit) {
    result = result.slice(0, limit)
  }

  return result.map(toSnakeCase)
}

/**
 * Update a simple task
 * @param {number} taskId - Task ID
 * @param {Object} taskData - Task data to update
 * @param {string} taskData.title - Task title
 * @param {string} taskData.status - Task status
 * @param {number} taskData.resource_group_id - Resource group ID
 * @param {Date|string|null} taskData.scheduled_at - Scheduled start time
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Updated task
 */
export async function updateSimpleTask(taskId, taskData, userId) {
  const { title, status, resource_group_id, scheduled_at } = taskData

  const db = await getDb()
  const result = await db
    .update(tasks)
    .set({
      title,
      status,
      resourceGroupId: resource_group_id,
      scheduledAt: scheduled_at ? new Date(scheduled_at) : null,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning()

  if (result.length === 0) {
    throw new Error(`Task not found: ${taskId}`)
  }

  return toSnakeCase(result[0])
}

/**
 * Delete a simple task
 * @param {number} taskId - Task ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Deleted task
 */
export async function deleteSimpleTask(taskId, userId) {
  const db = await getDb()
  const result = await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning()

  if (result.length === 0) {
    throw new Error(`Task not found: ${taskId}`)
  }

  return toSnakeCase(result[0])
}

/**
 * Get all simple tasks (without Notion integration)
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of tasks
 */
export async function getSimpleTasks(userId) {
  const db = await getDb()
  const result = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(desc(tasks.createdAt))

  return result.map(toSnakeCase)
}

/**
 * Get tasks by status list
 * @param {number} userId - User ID
 * @param {string[]} statuses - Array of status values
 * @returns {Promise<Array>} Array of tasks
 */
export async function getTasksByStatuses(userId, statuses) {
  const db = await getDb()
  const result = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), inArray(tasks.status, statuses)))
    .orderBy(tasks.id)

  return result.map(toSnakeCase)
}

/**
 * Create or update a task (legacy API compatibility)
 * @param {Object} taskData - Task data
 * @param {number} taskData.id - Task ID (for update, optional)
 * @param {string} taskData.title - Task title
 * @param {string} taskData.category - Category (maps to resource_group_id)
 * @param {string} taskData.priority - Priority level
 * @param {number} taskData.estimated_pomodoros - Estimated pomodoros
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Created or updated task
 */
export async function createOrUpdateTask(taskData, userId) {
  const { id, title, category, priority, estimated_pomodoros } = taskData
  const db = await getDb()

  if (id) {
    // Update existing task
    const result = await db
      .update(tasks)
      .set({
        title,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning()

    if (result.length === 0) {
      throw new Error(`Task not found: ${id}`)
    }

    return toSnakeCase(result[0])
  } else {
    // Create new task
    const result = await db
      .insert(tasks)
      .values({
        userId,
        title,
        status: '待處理',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    return toSnakeCase(result[0])
  }
}

/**
 * Increment completed pomodoros count (legacy API compatibility)
 * Note: The current schema doesn't have completed_pomodoros field
 * This is a stub that returns the task unchanged
 * @param {number} taskId - Task ID
 * @returns {Promise<Object>} Task object
 */
export async function incrementCompletedPomodoros(taskId) {
  const db = await getDb()
  const result = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))

  if (result.length === 0) {
    throw new Error(`Task not found: ${taskId}`)
  }

  return toSnakeCase(result[0])
}

export default {
  createSimpleTask,
  createOrUpdateTask,
  getTaskById,
  updateTaskStatus,
  getAllTasks,
  updateSimpleTask,
  deleteSimpleTask,
  getSimpleTasks,
  getTasksByStatuses,
  incrementCompletedPomodoros,
}
