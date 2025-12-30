import db from '../database/index.js'

/**
 * Get all work records for a user
 * @param {number} userId - User ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of records to return
 * @param {number} options.offset - Number of records to skip
 * @returns {Promise<Array>} Array of work records
 */
export async function getWorkRecords(userId, options = {}) {
  const { limit = 50, offset = 0 } = options

  const result = await db.query(
    `SELECT * FROM work_records
     WHERE user_id = $1
     ORDER BY completed_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  )
  return result.rows
}

/**
 * Get a single work record by ID
 * @param {number} recordId - Work record ID
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} Work record or null
 */
export async function getWorkRecordById(recordId, userId) {
  const result = await db.query(
    `SELECT * FROM work_records WHERE id = $1 AND user_id = $2`,
    [recordId, userId]
  )
  return result.rows[0] || null
}

/**
 * Create a new work record
 * @param {Object} recordData - Work record data
 * @param {number} recordData.task_id - Task ID (optional)
 * @param {string} recordData.task_name - Task name
 * @param {number} recordData.duration - Duration in seconds
 * @param {number} recordData.resource_group_id - Resource group ID (optional)
 * @param {Date} recordData.completed_at - Completion time (optional, defaults to now)
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Created work record
 */
export async function createWorkRecord(recordData, userId) {
  const { task_id, task_name, duration, resource_group_id, completed_at } = recordData

  const result = await db.query(
    `INSERT INTO work_records (user_id, task_id, task_name, duration, resource_group_id, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, task_id || null, task_name, duration, resource_group_id || null, completed_at || new Date()]
  )

  return result.rows[0]
}

/**
 * Update a work record
 * @param {number} recordId - Work record ID
 * @param {Object} recordData - Updated data
 * @param {string} recordData.task_name - Task name
 * @param {number} recordData.duration - Duration in seconds
 * @param {Date} recordData.completed_at - Completion time
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Updated work record
 */
export async function updateWorkRecord(recordId, recordData, userId) {
  const { task_name, duration, completed_at } = recordData

  const result = await db.query(
    `UPDATE work_records
     SET task_name = $1, duration = $2, completed_at = $3
     WHERE id = $4 AND user_id = $5
     RETURNING *`,
    [task_name, duration, completed_at, recordId, userId]
  )

  if (result.rows.length === 0) {
    throw new Error('Work record not found')
  }

  return result.rows[0]
}

/**
 * Delete a work record
 * @param {number} recordId - Work record ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Deleted work record
 */
export async function deleteWorkRecord(recordId, userId) {
  const result = await db.query(
    `DELETE FROM work_records
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [recordId, userId]
  )

  if (result.rows.length === 0) {
    throw new Error('Work record not found')
  }

  return result.rows[0]
}

/**
 * Get work records count for a user
 * @param {number} userId - User ID
 * @returns {Promise<number>} Total count
 */
export async function getWorkRecordsCount(userId) {
  const result = await db.query(
    `SELECT COUNT(*) as count FROM work_records WHERE user_id = $1`,
    [userId]
  )
  return parseInt(result.rows[0].count, 10)
}

export default {
  getWorkRecords,
  getWorkRecordById,
  createWorkRecord,
  updateWorkRecord,
  deleteWorkRecord,
  getWorkRecordsCount,
}
