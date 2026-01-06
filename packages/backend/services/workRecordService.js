import { eq, and, desc, count, gte, lte } from 'drizzle-orm'
import { getDb, workRecords } from '../database/drizzle.js'
import { updateDailyAnalytics, formatDate } from './dailyAnalyticsService.js'
import { refreshAllPriorities } from './taskPriorityService.js'

/**
 * Convert work record row from camelCase to snake_case for API compatibility
 */
function toSnakeCase(row) {
  if (!row) return null
  return {
    id: row.id,
    user_id: row.userId,
    task_id: row.taskId,
    task_name: row.taskName,
    duration: row.duration,
    resource_group_id: row.resourceGroupId,
    completed_at: row.completedAt,
    created_at: row.createdAt,
  }
}

/**
 * Get all work records for a user
 * @param {number} userId - User ID
 * @param {Object} options - Query options
 * @param {string} options.startDate - Start date (YYYY-MM-DD), inclusive
 * @param {string} options.endDate - End date (YYYY-MM-DD), inclusive
 * @param {number} options.limit - Maximum number of records to return (optional, only used if no date range)
 * @param {number} options.offset - Number of records to skip
 * @returns {Promise<Array>} Array of work records
 */
export async function getWorkRecords(userId, options = {}) {
  const { startDate, endDate, limit, offset = 0 } = options

  const db = await getDb()

  // Build where conditions
  const conditions = [eq(workRecords.userId, userId)]

  if (startDate) {
    // Start of the day
    const startDateTime = new Date(`${startDate}T00:00:00`)
    conditions.push(gte(workRecords.completedAt, startDateTime))
  }

  if (endDate) {
    // End of the day (23:59:59.999)
    const endDateTime = new Date(`${endDate}T23:59:59.999`)
    conditions.push(lte(workRecords.completedAt, endDateTime))
  }

  let query = db
    .select()
    .from(workRecords)
    .where(and(...conditions))
    .orderBy(desc(workRecords.completedAt))
    .offset(offset)

  // Only apply limit if provided (for backward compatibility)
  if (limit) {
    query = query.limit(limit)
  }

  const result = await query

  return result.map(toSnakeCase)
}

/**
 * Get a single work record by ID
 * @param {number} recordId - Work record ID
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} Work record or null
 */
export async function getWorkRecordById(recordId, userId) {
  const db = await getDb()
  const result = await db
    .select()
    .from(workRecords)
    .where(and(eq(workRecords.id, recordId), eq(workRecords.userId, userId)))

  return result.length > 0 ? toSnakeCase(result[0]) : null
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

  const db = await getDb()
  const completedDate = completed_at ? new Date(completed_at) : new Date()

  const result = await db
    .insert(workRecords)
    .values({
      userId,
      taskId: task_id || null,
      taskName: task_name,
      duration,
      resourceGroupId: resource_group_id || null,
      completedAt: completedDate,
      createdAt: new Date(),
    })
    .returning()

  // Trigger daily analytics update (non-blocking)
  updateDailyAnalytics(userId, formatDate(completedDate)).catch(console.error)

  // Trigger task priority refresh (non-blocking)
  refreshAllPriorities(userId).catch(console.error)

  return toSnakeCase(result[0])
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

  const db = await getDb()

  // Get original record to check if date changed
  const original = await db
    .select()
    .from(workRecords)
    .where(and(eq(workRecords.id, recordId), eq(workRecords.userId, userId)))
    .limit(1)

  const completedDate = completed_at ? new Date(completed_at) : new Date()

  const result = await db
    .update(workRecords)
    .set({
      taskName: task_name,
      duration,
      completedAt: completedDate,
    })
    .where(and(eq(workRecords.id, recordId), eq(workRecords.userId, userId)))
    .returning()

  if (result.length === 0) {
    throw new Error('Work record not found')
  }

  // Trigger daily analytics update for new date (non-blocking)
  updateDailyAnalytics(userId, formatDate(completedDate)).catch(console.error)

  // If date changed, also update the old date
  if (original.length > 0 && original[0].completedAt) {
    const oldDate = formatDate(new Date(original[0].completedAt))
    const newDate = formatDate(completedDate)
    if (oldDate !== newDate) {
      updateDailyAnalytics(userId, oldDate).catch(console.error)
    }
  }

  // Trigger task priority refresh (non-blocking)
  refreshAllPriorities(userId).catch(console.error)

  return toSnakeCase(result[0])
}

/**
 * Delete a work record
 * @param {number} recordId - Work record ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Deleted work record
 */
export async function deleteWorkRecord(recordId, userId) {
  const db = await getDb()

  // Get the record first to know the date
  const original = await db
    .select()
    .from(workRecords)
    .where(and(eq(workRecords.id, recordId), eq(workRecords.userId, userId)))
    .limit(1)

  const result = await db
    .delete(workRecords)
    .where(and(eq(workRecords.id, recordId), eq(workRecords.userId, userId)))
    .returning()

  if (result.length === 0) {
    throw new Error('Work record not found')
  }

  // Trigger daily analytics update for the deleted record's date (non-blocking)
  if (original.length > 0 && original[0].completedAt) {
    updateDailyAnalytics(userId, formatDate(new Date(original[0].completedAt))).catch(
      console.error
    )
  }

  // Trigger task priority refresh (non-blocking)
  refreshAllPriorities(userId).catch(console.error)

  return toSnakeCase(result[0])
}

/**
 * Get work records count for a user
 * @param {number} userId - User ID
 * @returns {Promise<number>} Total count
 */
export async function getWorkRecordsCount(userId) {
  const db = await getDb()
  const result = await db
    .select({ count: count() })
    .from(workRecords)
    .where(eq(workRecords.userId, userId))

  return result[0].count
}

export default {
  getWorkRecords,
  getWorkRecordById,
  createWorkRecord,
  updateWorkRecord,
  deleteWorkRecord,
  getWorkRecordsCount,
}
