import { eq, and, asc } from 'drizzle-orm'
import { getDb, routineTasks, routineTaskInstances } from '../database/drizzle.js'
import pkg from 'rrule'
const { RRule } = pkg

// Note: We import updateDailyAnalytics lazily to avoid circular dependency
let updateDailyAnalytics = null
async function getDailyAnalyticsUpdater() {
  if (!updateDailyAnalytics) {
    const module = await import('./dailyAnalyticsService.js')
    updateDailyAnalytics = module.updateDailyAnalytics
  }
  return updateDailyAnalytics
}

/**
 * Weekday mapping from our format (0=Sunday) to RRule format
 */
const WEEKDAY_MAP = {
  0: RRule.SU,
  1: RRule.MO,
  2: RRule.TU,
  3: RRule.WE,
  4: RRule.TH,
  5: RRule.FR,
  6: RRule.SA,
}

/**
 * Frequency mapping from our format to RRule format
 */
const FREQUENCY_MAP = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  yearly: RRule.YEARLY,
}

/**
 * Get ISO week number of a date
 * ISO 8601: Week 1 is the week containing the first Thursday of the year
 * @param {Date} date - The date to check
 * @returns {number} ISO week number (1-53)
 */
function getISOWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  return weekNo
}

/**
 * Build RRule from our recurrence rule format
 */
function buildRRule(rule, dtstart) {
  const startDate = new Date(Date.UTC(
    dtstart.getFullYear(),
    dtstart.getMonth(),
    dtstart.getDate()
  ))

  const frequency = rule.frequency === 'interval' ? 'daily' : rule.frequency

  const options = {
    freq: FREQUENCY_MAP[frequency] ?? RRule.DAILY,
    dtstart: startDate,
  }

  if (rule.frequency === 'interval' && rule.interval) {
    options.interval = rule.interval
  } else if (rule.interval && rule.interval > 1) {
    options.interval = rule.interval
  }

  const weekdays = rule.byweekday ?? rule.daysOfWeek
  if (weekdays && weekdays.length > 0) {
    options.byweekday = weekdays.map(d => {
      if (typeof d === 'number') {
        return WEEKDAY_MAP[d]
      }
      if (d.day !== undefined && d.n !== undefined) {
        return WEEKDAY_MAP[d.day].nth(d.n)
      }
      return WEEKDAY_MAP[d]
    })
  }

  const monthdays = rule.bymonthday ?? rule.daysOfMonth
  if (monthdays && monthdays.length > 0) {
    options.bymonthday = monthdays
  }

  if (rule.bymonth && rule.bymonth.length > 0) {
    options.bymonth = rule.bymonth
  }

  if (rule.bysetpos && rule.bysetpos.length > 0) {
    options.bysetpos = rule.bysetpos
  }

  return new RRule(options)
}

/**
 * Check if a routine task should run on a given date based on recurrence rule
 */
export function shouldRunToday(recurrenceRule, date = new Date()) {
  if (!recurrenceRule) return false

  const dateString = date.toISOString().split('T')[0]
  if (recurrenceRule.exceptions && recurrenceRule.exceptions.includes(dateString)) {
    return false
  }

  if (recurrenceRule.weekFilter && recurrenceRule.weekFilter.type !== 'all') {
    const isoWeek = getISOWeekNumber(date)
    if (recurrenceRule.weekFilter.type === 'odd' && isoWeek % 2 === 0) {
      return false
    }
    if (recurrenceRule.weekFilter.type === 'even' && isoWeek % 2 !== 0) {
      return false
    }
  }

  const startOfDay = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ))
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1)

  try {
    const rrule = buildRRule(recurrenceRule, startOfDay)
    const occurrences = rrule.between(startOfDay, endOfDay, true)
    return occurrences.length > 0
  } catch (error) {
    console.error('Error evaluating recurrence rule:', error)
    return false
  }
}

/**
 * Check if current time is within the task's time range
 */
export function isWithinTimeRange(recurrenceRule, now = new Date()) {
  if (!recurrenceRule || !recurrenceRule.timeRange) return true

  const { start, end } = recurrenceRule.timeRange
  if (!start) return true

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const [startHour, startMin] = start.split(':').map(Number)
  const startMinutes = startHour * 60 + startMin

  if (!end) {
    return currentMinutes >= startMinutes
  }

  const [endHour, endMin] = end.split(':').map(Number)
  const endMinutes = endHour * 60 + endMin

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes
}

/**
 * Convert routine task row to snake_case
 */
function taskToSnakeCase(row) {
  if (!row) return null
  return {
    id: row.id,
    user_id: row.userId,
    title: row.title,
    resource_group_id: row.resourceGroupId,
    recurrence_rule: row.recurrenceRule,
    is_active: row.isActive,
    starts_at: row.startsAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  }
}

/**
 * Convert routine task instance row to snake_case
 */
function instanceToSnakeCase(row) {
  if (!row) return null
  return {
    id: row.id,
    routine_task_id: row.routineTaskId,
    user_id: row.userId,
    scheduled_date: row.scheduledDate,
    status: row.status,
    scheduled_at: row.scheduledAt,
    completed_at: row.completedAt,
    created_at: row.createdAt,
  }
}

/**
 * Get all routine task definitions for a user
 */
export async function getRoutineTasks(userId) {
  const db = await getDb()
  const result = await db
    .select()
    .from(routineTasks)
    .where(eq(routineTasks.userId, userId))
    .orderBy(asc(routineTasks.id))

  return result.map(taskToSnakeCase)
}

/**
 * Get a single routine task by ID
 */
export async function getRoutineTaskById(id, userId) {
  const db = await getDb()
  const result = await db
    .select()
    .from(routineTasks)
    .where(and(eq(routineTasks.id, id), eq(routineTasks.userId, userId)))

  return result.length > 0 ? taskToSnakeCase(result[0]) : null
}

/**
 * Create a new routine task
 */
export async function createRoutineTask(data, userId) {
  const {
    title,
    resource_group_id = null,
    recurrence_rule,
    is_active = true,
    starts_at = null,
  } = data

  const db = await getDb()
  const result = await db
    .insert(routineTasks)
    .values({
      userId,
      title,
      resourceGroupId: resource_group_id,
      recurrenceRule: recurrence_rule,
      isActive: is_active,
      startsAt: starts_at ? new Date(starts_at) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  return taskToSnakeCase(result[0])
}

/**
 * Update an existing routine task
 */
export async function updateRoutineTask(id, data, userId) {
  const {
    title,
    resource_group_id,
    recurrence_rule,
    is_active,
    starts_at,
  } = data

  const db = await getDb()
  const result = await db
    .update(routineTasks)
    .set({
      title,
      resourceGroupId: resource_group_id,
      recurrenceRule: recurrence_rule,
      isActive: is_active,
      startsAt: starts_at ? new Date(starts_at) : null,
      updatedAt: new Date(),
    })
    .where(and(eq(routineTasks.id, id), eq(routineTasks.userId, userId)))
    .returning()

  if (result.length === 0) {
    throw new Error(`Routine task not found: ${id}`)
  }

  return taskToSnakeCase(result[0])
}

/**
 * Delete a routine task
 */
export async function deleteRoutineTask(id, userId) {
  const db = await getDb()

  // Delete all instances first
  await db
    .delete(routineTaskInstances)
    .where(eq(routineTaskInstances.routineTaskId, id))

  // Then delete the task
  const result = await db
    .delete(routineTasks)
    .where(and(eq(routineTasks.id, id), eq(routineTasks.userId, userId)))
    .returning()

  if (result.length === 0) {
    throw new Error(`Routine task not found: ${id}`)
  }

  return taskToSnakeCase(result[0])
}

/**
 * Get or create today's instances for all active routine tasks
 */
export async function getTodayInstances(userId) {
  const today = new Date().toISOString().split('T')[0]
  const todayDate = new Date(today)

  const db = await getDb()

  // Get all active routine tasks
  const tasksResult = await db
    .select()
    .from(routineTasks)
    .where(and(eq(routineTasks.userId, userId), eq(routineTasks.isActive, true)))

  const instances = []

  for (const task of tasksResult) {
    // Check if today is before starts_at date (if set)
    if (task.startsAt) {
      const startsAtDate = new Date(task.startsAt)
      const startsAtDateOnly = new Date(startsAtDate.toISOString().split('T')[0])
      if (todayDate < startsAtDateOnly) {
        continue
      }
    }

    // Check if this task should run today
    if (!shouldRunToday(task.recurrenceRule, new Date())) {
      continue
    }

    // Check if instance already exists for today
    const existingInstances = await db
      .select()
      .from(routineTaskInstances)
      .where(and(
        eq(routineTaskInstances.routineTaskId, task.id),
        eq(routineTaskInstances.scheduledDate, today)
      ))

    let instance
    if (existingInstances.length > 0) {
      instance = existingInstances[0]
    } else {
      // Compute scheduled_at from today + time portion of starts_at
      let scheduledAt = null
      if (task.startsAt) {
        const startsAtDate = new Date(task.startsAt)
        const hours = startsAtDate.getHours().toString().padStart(2, '0')
        const minutes = startsAtDate.getMinutes().toString().padStart(2, '0')
        scheduledAt = new Date(`${today}T${hours}:${minutes}:00`)
      }

      // Create new instance
      const newInstances = await db
        .insert(routineTaskInstances)
        .values({
          routineTaskId: task.id,
          userId,
          scheduledDate: today,
          status: 'pending',
          scheduledAt,
          createdAt: new Date(),
        })
        .returning()
      instance = newInstances[0]
    }

    // Combine instance with task info
    instances.push({
      ...instanceToSnakeCase(instance),
      routine_task: {
        id: task.id,
        title: task.title,
        resource_group_id: task.resourceGroupId,
        recurrence_rule: task.recurrenceRule,
        starts_at: task.startsAt,
      },
    })
  }

  return instances
}

/**
 * Complete a routine task instance
 */
export async function completeInstance(instanceId, userId) {
  const db = await getDb()
  const result = await db
    .update(routineTaskInstances)
    .set({
      status: 'completed',
      completedAt: new Date(),
    })
    .where(and(
      eq(routineTaskInstances.id, instanceId),
      eq(routineTaskInstances.userId, userId)
    ))
    .returning()

  if (result.length === 0) {
    throw new Error(`Instance not found: ${instanceId}`)
  }

  // Trigger daily analytics update for the instance date (non-blocking)
  getDailyAnalyticsUpdater().then(update => {
    update(userId, result[0].scheduledDate).catch(console.error)
  })

  return instanceToSnakeCase(result[0])
}

/**
 * Skip a routine task instance
 */
export async function skipInstance(instanceId, userId) {
  const db = await getDb()
  const result = await db
    .update(routineTaskInstances)
    .set({
      status: 'skipped',
      completedAt: null,
    })
    .where(and(
      eq(routineTaskInstances.id, instanceId),
      eq(routineTaskInstances.userId, userId)
    ))
    .returning()

  if (result.length === 0) {
    throw new Error(`Instance not found: ${instanceId}`)
  }

  // Trigger daily analytics update for the instance date (non-blocking)
  getDailyAnalyticsUpdater().then(update => {
    update(userId, result[0].scheduledDate).catch(console.error)
  })

  return instanceToSnakeCase(result[0])
}

/**
 * Uncomplete a routine task instance (set back to pending)
 */
export async function uncompleteInstance(instanceId, userId) {
  const db = await getDb()
  const result = await db
    .update(routineTaskInstances)
    .set({
      status: 'pending',
      completedAt: null,
    })
    .where(and(
      eq(routineTaskInstances.id, instanceId),
      eq(routineTaskInstances.userId, userId)
    ))
    .returning()

  if (result.length === 0) {
    throw new Error(`Instance not found: ${instanceId}`)
  }

  return instanceToSnakeCase(result[0])
}

/**
 * Clear scheduled_at for an instance (execute now)
 */
export async function clearInstanceScheduledAt(instanceId, userId) {
  const db = await getDb()
  const result = await db
    .update(routineTaskInstances)
    .set({
      scheduledAt: null,
    })
    .where(and(
      eq(routineTaskInstances.id, instanceId),
      eq(routineTaskInstances.userId, userId)
    ))
    .returning()

  if (result.length === 0) {
    throw new Error(`Instance not found: ${instanceId}`)
  }

  return instanceToSnakeCase(result[0])
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
  clearInstanceScheduledAt,
}
