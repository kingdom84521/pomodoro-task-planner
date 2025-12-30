import db from '../database/index.js'

/**
 * Get the week number of the month (incomplete week counts as week 1)
 * @param {Date} date - The date to check
 * @returns {number} Week number (1-5)
 */
function getWeekOfMonth(date) {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
  const dayOfMonth = date.getDate()
  const firstDayOfWeek = firstDayOfMonth.getDay() // 0 = Sunday

  // Calculate which week this day falls into
  // Week 1 starts from day 1, even if it's incomplete
  return Math.ceil((dayOfMonth + firstDayOfWeek) / 7)
}

/**
 * Check if a routine task should run on a given date based on recurrence rule
 * @param {Object} recurrenceRule - The recurrence rule object
 * @param {Date} date - The date to check
 * @returns {boolean} True if the task should run on this date
 */
export function shouldRunToday(recurrenceRule, date = new Date()) {
  if (!recurrenceRule) return false

  const { frequency, interval, daysOfWeek, weekFilter, daysOfMonth, timeRange, exceptions } = recurrenceRule

  // Check exceptions first
  const dateString = date.toISOString().split('T')[0]
  if (exceptions && exceptions.includes(dateString)) {
    return false
  }

  const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, etc.

  switch (frequency) {
    case 'daily':
      return true

    case 'weekly':
      // Check if today is one of the specified days
      if (daysOfWeek && !daysOfWeek.includes(dayOfWeek)) {
        return false
      }

      // Check week filter
      if (weekFilter) {
        const weekOfMonth = getWeekOfMonth(date)
        switch (weekFilter.type) {
          case 'odd':
            if (weekOfMonth % 2 === 0) return false
            break
          case 'even':
            if (weekOfMonth % 2 !== 0) return false
            break
          case 'specific':
            if (weekFilter.weeks && !weekFilter.weeks.includes(weekOfMonth)) return false
            break
          case 'all':
          default:
            // No filtering
            break
        }
      }

      return true

    case 'monthly':
      // Check if today is one of the specified days of month
      if (daysOfMonth && !daysOfMonth.includes(date.getDate())) {
        return false
      }
      return true

    case 'interval':
      // For interval-based, we need a reference start date
      // For simplicity, we check if (daysSinceEpoch % interval === 0)
      if (!interval || interval <= 0) return true
      const daysSinceEpoch = Math.floor(date.getTime() / (1000 * 60 * 60 * 24))
      return daysSinceEpoch % interval === 0

    default:
      return true
  }
}

/**
 * Check if current time is within the task's time range
 * @param {Object} recurrenceRule - The recurrence rule object
 * @param {Date} now - The current time
 * @returns {boolean} True if within time range (or no time range specified)
 */
export function isWithinTimeRange(recurrenceRule, now = new Date()) {
  if (!recurrenceRule || !recurrenceRule.timeRange) return true

  const { start, end } = recurrenceRule.timeRange
  if (!start) return true

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const [startHour, startMin] = start.split(':').map(Number)
  const startMinutes = startHour * 60 + startMin

  if (!end) {
    // No end time means the whole day after start
    return currentMinutes >= startMinutes
  }

  const [endHour, endMin] = end.split(':').map(Number)
  const endMinutes = endHour * 60 + endMin

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes
}

/**
 * Get all routine task definitions for a user
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of routine tasks
 */
export async function getRoutineTasks(userId) {
  const result = await db.query(
    'SELECT * FROM routine_tasks WHERE user_id = $1 ORDER BY id',
    [userId]
  )
  return result.rows
}

/**
 * Get a single routine task by ID
 * @param {number} id - Routine task ID
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} Routine task or null
 */
export async function getRoutineTaskById(id, userId) {
  const result = await db.query(
    'SELECT * FROM routine_tasks WHERE id = $1 AND user_id = $2',
    [id, userId]
  )
  return result.rows.length > 0 ? result.rows[0] : null
}

/**
 * Create a new routine task
 * @param {Object} data - Routine task data
 * @param {string} data.title - Task title
 * @param {number|null} data.resource_group_id - Resource group ID
 * @param {Object} data.recurrence_rule - Recurrence rule object
 * @param {boolean} data.is_active - Whether the task is active
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Created routine task
 */
export async function createRoutineTask(data, userId) {
  const {
    title,
    resource_group_id = null,
    recurrence_rule,
    is_active = true,
  } = data

  const result = await db.query(
    `INSERT INTO routine_tasks (user_id, title, resource_group_id, recurrence_rule, is_active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, title, resource_group_id, JSON.stringify(recurrence_rule), is_active]
  )

  return result.rows[0]
}

/**
 * Update an existing routine task
 * @param {number} id - Routine task ID
 * @param {Object} data - Updated data
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Updated routine task
 */
export async function updateRoutineTask(id, data, userId) {
  const {
    title,
    resource_group_id,
    recurrence_rule,
    is_active,
  } = data

  const result = await db.query(
    `UPDATE routine_tasks
     SET title = $1, resource_group_id = $2, recurrence_rule = $3, is_active = $4
     WHERE id = $5 AND user_id = $6
     RETURNING *`,
    [title, resource_group_id, JSON.stringify(recurrence_rule), is_active, id, userId]
  )

  if (result.rows.length === 0) {
    throw new Error(`Routine task not found: ${id}`)
  }

  return result.rows[0]
}

/**
 * Delete a routine task
 * @param {number} id - Routine task ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Deleted routine task
 */
export async function deleteRoutineTask(id, userId) {
  const result = await db.query(
    'DELETE FROM routine_tasks WHERE id = $1 AND user_id = $2 RETURNING *',
    [id, userId]
  )

  if (result.rows.length === 0) {
    throw new Error(`Routine task not found: ${id}`)
  }

  return result.rows[0]
}

/**
 * Get or create today's instances for all active routine tasks
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of instances with routine task info
 */
export async function getTodayInstances(userId) {
  const today = new Date().toISOString().split('T')[0]

  // Get all active routine tasks
  const routineTasks = await db.query(
    'SELECT * FROM routine_tasks WHERE user_id = $1 AND is_active = true',
    [userId]
  )

  const instances = []

  for (const task of routineTasks.rows) {
    // Check if this task should run today
    if (!shouldRunToday(task.recurrence_rule, new Date())) {
      continue
    }

    // Check if instance already exists for today
    const existingInstance = await db.query(
      'SELECT * FROM routine_task_instances WHERE routine_task_id = $1 AND scheduled_date = $2',
      [task.id, today]
    )

    let instance
    if (existingInstance.rows.length > 0) {
      instance = existingInstance.rows[0]
    } else {
      // Create new instance
      const newInstance = await db.query(
        `INSERT INTO routine_task_instances (routine_task_id, user_id, scheduled_date, status)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [task.id, userId, today, 'pending']
      )
      instance = newInstance.rows[0]
    }

    // Combine instance with task info
    instances.push({
      ...instance,
      routine_task: {
        id: task.id,
        title: task.title,
        resource_group_id: task.resource_group_id,
        recurrence_rule: task.recurrence_rule,
      },
    })
  }

  return instances
}

/**
 * Complete a routine task instance
 * @param {number} instanceId - Instance ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Updated instance
 */
export async function completeInstance(instanceId, userId) {
  const result = await db.query(
    `UPDATE routine_task_instances
     SET status = $1, completed_at = $2
     WHERE id = $3 AND user_id = $4
     RETURNING *`,
    ['completed', new Date(), instanceId, userId]
  )

  if (result.rows.length === 0) {
    throw new Error(`Instance not found: ${instanceId}`)
  }

  return result.rows[0]
}

/**
 * Skip a routine task instance
 * @param {number} instanceId - Instance ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Updated instance
 */
export async function skipInstance(instanceId, userId) {
  const result = await db.query(
    `UPDATE routine_task_instances
     SET status = $1, completed_at = $2
     WHERE id = $3 AND user_id = $4
     RETURNING *`,
    ['skipped', null, instanceId, userId]
  )

  if (result.rows.length === 0) {
    throw new Error(`Instance not found: ${instanceId}`)
  }

  return result.rows[0]
}

/**
 * Uncomplete a routine task instance (set back to pending)
 * @param {number} instanceId - Instance ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Updated instance
 */
export async function uncompleteInstance(instanceId, userId) {
  const result = await db.query(
    `UPDATE routine_task_instances
     SET status = $1, completed_at = $2
     WHERE id = $3 AND user_id = $4
     RETURNING *`,
    ['pending', null, instanceId, userId]
  )

  if (result.rows.length === 0) {
    throw new Error(`Instance not found: ${instanceId}`)
  }

  return result.rows[0]
}

export default {
  shouldRunToday,
  isWithinTimeRange,
  getRoutineTasks,
  getRoutineTaskById,
  createRoutineTask,
  updateRoutineTask,
  deleteRoutineTask,
  getTodayInstances,
  completeInstance,
  skipInstance,
  uncompleteInstance,
}
