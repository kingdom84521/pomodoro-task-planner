import db from '../database/index.js'

/**
 * Create or update a task
 * @param {Object} taskData - Task data
 * @param {string} taskData.notion_page_id - Notion page ID
 * @param {string} taskData.title - Task title
 * @param {string} taskData.category - Task category
 * @param {string} taskData.priority - Task priority (高/中/低)
 * @param {number} taskData.estimated_pomodoros - Estimated pomodoros
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Created or updated task
 */
export async function createOrUpdateTask(taskData, userId) {
  const {
    notion_page_id,
    title,
    category,
    priority,
    estimated_pomodoros = 1,
  } = taskData

  // Check if task already exists for this user
  const existing = await db.query(
    'SELECT * FROM tasks WHERE notion_page_id = $1 AND user_id = $2',
    [notion_page_id, userId]
  )

  let result

  if (existing.rows.length > 0) {
    // Update existing task
    result = await db.query(
      `UPDATE tasks
       SET title = $1, category = $2, priority = $3,
           estimated_pomodoros = $4, last_synced_at = NOW()
       WHERE notion_page_id = $5 AND user_id = $6
       RETURNING *`,
      [title, category, priority, estimated_pomodoros, notion_page_id, userId]
    )
  } else {
    // Insert new task
    result = await db.query(
      `INSERT INTO tasks
       (notion_page_id, title, category, priority, estimated_pomodoros, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [notion_page_id, title, category, priority, estimated_pomodoros, userId]
    )
  }

  return result.rows[0]
}

/**
 * Get task by Notion page ID
 * @param {string} notionPageId - Notion page ID
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} Task object or null if not found
 */
export async function getTaskByNotionPageId(notionPageId, userId) {
  const result = await db.query(
    'SELECT * FROM tasks WHERE notion_page_id = $1 AND user_id = $2',
    [notionPageId, userId]
  )

  return result.rows.length > 0 ? result.rows[0] : null
}

/**
 * Update task status
 * @param {string} notionPageId - Notion page ID
 * @param {string} status - New status
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Updated task
 */
export async function updateTaskStatus(notionPageId, status, userId) {
  const result = await db.query(
    `UPDATE tasks
     SET status = $1, completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END
     WHERE notion_page_id = $2 AND user_id = $3
     RETURNING *`,
    [status, notionPageId, userId]
  )

  if (result.rows.length === 0) {
    throw new Error(`Task not found: ${notionPageId}`)
  }

  return result.rows[0]
}

/**
 * Increment completed pomodoros count
 * @param {string} notionPageId - Notion page ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Updated task
 */
export async function incrementCompletedPomodoros(notionPageId, userId) {
  const result = await db.query(
    `UPDATE tasks
     SET completed_pomodoros = completed_pomodoros + 1
     WHERE notion_page_id = $1 AND user_id = $2
     RETURNING *`,
    [notionPageId, userId]
  )

  if (result.rows.length === 0) {
    throw new Error(`Task not found: ${notionPageId}`)
  }

  const task = result.rows[0]

  // Auto-complete if all pomodoros are done
  if (task.completed_pomodoros >= task.estimated_pomodoros) {
    return await updateTaskStatus(notionPageId, 'completed', userId)
  }

  return task
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

  let query = 'SELECT * FROM tasks WHERE user_id = $1'
  const params = [userId]

  if (status) {
    query += ' AND status = $2'
    params.push(status)
  }

  query += ' ORDER BY created_at DESC'

  if (limit) {
    query += ` LIMIT $${params.length + 1}`
    params.push(limit)
  }

  const result = await db.query(query, params)
  return result.rows
}

/**
 * Create a simple task (for UI, not Notion sync)
 * @param {Object} taskData - Task data
 * @param {string} taskData.title - Task title
 * @param {string} taskData.status - Task status (optional, defaults to '待處理')
 * @param {number} taskData.resource_group_id - Resource group ID (optional)
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Created task
 */
export async function createSimpleTask(taskData, userId) {
  const {
    title,
    status = '待處理',
    resource_group_id = null,
  } = taskData

  const result = await db.query(
    `INSERT INTO tasks (user_id, title, status, resource_group_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, title, status, resource_group_id]
  )

  return result.rows[0]
}

/**
 * Get all simple tasks (without Notion integration)
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of tasks
 */
export async function getSimpleTasks(userId) {
  const result = await db.query(
    `SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  )
  return result.rows
}

export default {
  createOrUpdateTask,
  getTaskByNotionPageId,
  updateTaskStatus,
  incrementCompletedPomodoros,
  getAllTasks,
  createSimpleTask,
  getSimpleTasks,
}
