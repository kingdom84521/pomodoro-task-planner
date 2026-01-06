import { eq, and, gte, desc, inArray } from 'drizzle-orm'
import { getDb, tasks, routineTasks, resourceGroups, workRecords, taskPriorities } from '../database/drizzle.js'
import config from '../config/index.js'

// ========== CONSTANTS ==========

const PERIOD_WEIGHTS = {
  '1D': 1,
  '3D': 2,
  '7D': 4,
  '15D': 8,
  '30D': 16,
  '90D': 32,
  '6M': 1000,
}

const PERIOD_DAYS = {
  '1D': 1,
  '3D': 3,
  '7D': 7,
  '15D': 15,
  '30D': 30,
  '90D': 90,
  '6M': 180,
}

// ========== HELPERS ==========

/**
 * Get active status names from config
 * @returns {string[]} Array of active status display names
 */
function getActiveStatuses() {
  return config.taskStatus
    .filter(s => s.isActive)
    .map(s => s.displayName)
}

/**
 * Convert task row to snake_case for API response
 */
function taskToSnakeCase(row) {
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
 * Convert routine task row to snake_case for API response
 */
function routineTaskToSnakeCase(row) {
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

// ========== RESOURCE STATS CALCULATION ==========

/**
 * Calculate resource statistics for a user
 * Used for priority score calculation
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Resource statistics
 */
async function calculateResourceStats(userId) {
  const db = await getDb()

  // Get resource groups
  const groups = await db
    .select()
    .from(resourceGroups)
    .where(eq(resourceGroups.userId, userId))

  // Build group limits
  const groupLimits = {}
  for (const group of groups) {
    groupLimits[group.id] = {
      limit: group.percentageLimit || 0,
      remaining6M: group.percentageLimit || 0,
      warning: false,
      overLimitPeriods: 0, // Count how many periods exceed limit
    }
  }

  // Calculate usage for each period
  const periods = {}
  const now = new Date()

  for (const [period, days] of Object.entries(PERIOD_DAYS)) {
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - days)

    // Get all work records in this period
    const records = await db
      .select()
      .from(workRecords)
      .where(and(
        eq(workRecords.userId, userId),
        gte(workRecords.completedAt, startDate)
      ))

    // Calculate total duration
    const totalDuration = records.reduce((sum, r) => sum + (r.duration || 0), 0)

    // Calculate duration per resource group
    const groupDurations = {}
    for (const record of records) {
      if (record.resourceGroupId) {
        groupDurations[record.resourceGroupId] = (groupDurations[record.resourceGroupId] || 0) + (record.duration || 0)
      }
    }

    periods[period] = { groups: {} }

    for (const [groupId, duration] of Object.entries(groupDurations)) {
      const percentage = totalDuration > 0
        ? (duration / totalDuration) * 100
        : 0

      periods[period].groups[groupId] = { percentage }

      // Track over-limit for ALL periods (not just 6M)
      if (groupLimits[groupId]) {
        const limit = groupLimits[groupId].limit
        if (percentage > limit) {
          groupLimits[groupId].overLimitPeriods++
        }

        // Update 6M remaining for half-year period
        if (period === '6M') {
          groupLimits[groupId].remaining6M = limit - percentage
        }
      }
    }
  }

  // Set warning if over limit in ANY period (especially short-term)
  for (const groupId of Object.keys(groupLimits)) {
    if (groupLimits[groupId].overLimitPeriods > 0) {
      groupLimits[groupId].warning = true
    }
  }

  return { groupLimits, periods }
}

// ========== PRIORITY SCORE CALCULATION ==========

/**
 * Calculate task priority score based on resource allocation
 * @param {Object} task - Task object with resource_group_id
 * @param {Object} resourceStats - Resource statistics from calculateResourceStats
 * @returns {number} Priority score (higher = more priority)
 */
function calculateTaskPriorityScore(task, resourceStats) {
  const groupId = task.resource_group_id
  if (!groupId || !resourceStats.groupLimits[groupId]) {
    return 0 // No resource group assigned
  }

  const groupLimit = resourceStats.groupLimits[groupId]
  let score = 0

  // 1. Half-year remaining quota (weight 1000) - most important
  score += groupLimit.remaining6M * PERIOD_WEIGHTS['6M']

  // 2. Other periods remaining quota (weighted)
  for (const [period, weight] of Object.entries(PERIOD_WEIGHTS)) {
    if (period === '6M') continue

    const periodData = resourceStats.periods[period]
    if (periodData && periodData.groups[groupId]) {
      const usedInPeriod = periodData.groups[groupId].percentage
      const remaining = groupLimit.limit - usedInPeriod
      score += remaining * weight
    } else {
      // No records in this period = full quota available
      score += groupLimit.limit * weight
    }
  }

  // 3. Warning penalty for over-limit (scaled by number of over-limit periods)
  // More periods over limit = worse penalty (up to -70000 for all 7 periods)
  if (groupLimit.warning && groupLimit.overLimitPeriods > 0) {
    score -= 10000 * groupLimit.overLimitPeriods
  }

  return Math.round(score)
}

// ========== PERSISTENCE ==========

/**
 * Refresh all task priorities for a user
 * Calculates scores for both simple tasks and routine tasks, persists to DB
 * @param {number} userId - User ID
 * @returns {Promise<void>}
 */
export async function refreshAllPriorities(userId) {
  const db = await getDb()
  const activeStatuses = getActiveStatuses()

  // Get resource stats once
  const resourceStats = await calculateResourceStats(userId)

  // Get all active simple tasks
  const simpleTasks = await db
    .select()
    .from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      inArray(tasks.status, activeStatuses)
    ))

  // Get all active routine tasks
  const routines = await db
    .select()
    .from(routineTasks)
    .where(and(
      eq(routineTasks.userId, userId),
      eq(routineTasks.isActive, true)
    ))

  // Calculate scores for simple tasks
  const simpleScores = simpleTasks.map(task => ({
    userId,
    targetType: 'simple',
    targetId: task.id,
    priorityScore: calculateTaskPriorityScore(taskToSnakeCase(task), resourceStats),
    calculatedAt: new Date(),
  }))

  // Calculate scores for routine tasks
  const routineScores = routines.map(task => ({
    userId,
    targetType: 'routine',
    targetId: task.id,
    priorityScore: calculateTaskPriorityScore(routineTaskToSnakeCase(task), resourceStats),
    calculatedAt: new Date(),
  }))

  const allScores = [...simpleScores, ...routineScores]

  // Delete old priorities for this user
  await db
    .delete(taskPriorities)
    .where(eq(taskPriorities.userId, userId))

  // Insert new priorities (if any)
  if (allScores.length > 0) {
    await db.insert(taskPriorities).values(allScores)
  }

  console.log(`✓ Refreshed priorities for user ${userId}: ${simpleTasks.length} simple tasks, ${routines.length} routine tasks`)
}

// ========== QUERY ==========

/**
 * Get all tasks sorted by priority score
 * Returns a unified list of both simple and routine tasks
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Sorted task list with unified format
 */
export async function getSortedAllTasks(userId) {
  const db = await getDb()
  const activeStatuses = getActiveStatuses()

  // Get priorities
  const priorities = await db
    .select()
    .from(taskPriorities)
    .where(eq(taskPriorities.userId, userId))
    .orderBy(desc(taskPriorities.priorityScore))

  // Build priority map
  const priorityMap = {}
  for (const p of priorities) {
    const key = `${p.targetType}-${p.targetId}`
    priorityMap[key] = p.priorityScore
  }

  // Get simple tasks
  const simpleTasks = await db
    .select()
    .from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      inArray(tasks.status, activeStatuses)
    ))

  // Get routine tasks
  const routines = await db
    .select()
    .from(routineTasks)
    .where(and(
      eq(routineTasks.userId, userId),
      eq(routineTasks.isActive, true)
    ))

  // Build unified list
  const result = []

  for (const task of simpleTasks) {
    const key = `simple-${task.id}`
    result.push({
      type: 'simple',
      ...taskToSnakeCase(task),
      priority_score: priorityMap[key] ?? 0,
    })
  }

  for (const task of routines) {
    const key = `routine-${task.id}`
    result.push({
      type: 'routine',
      ...routineTaskToSnakeCase(task),
      priority_score: priorityMap[key] ?? 0,
    })
  }

  // Sort by priority score descending
  result.sort((a, b) => b.priority_score - a.priority_score)

  return result
}

/**
 * Legacy function for compatibility - wraps getSortedAllTasks
 */
export async function getSortedTasks(options = {}, userId) {
  const tasks = await getSortedAllTasks(userId)
  const { limit } = options

  return {
    tasks: limit ? tasks.slice(0, limit) : tasks,
    stats: {},
  }
}

/**
 * Legacy function for compatibility
 */
export async function refreshTaskPriority(taskId, userId) {
  await refreshAllPriorities(userId)

  const db = await getDb()
  const result = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))

  if (result.length === 0) {
    throw new Error(`Task not found: ${taskId}`)
  }

  const priority = await db
    .select()
    .from(taskPriorities)
    .where(and(
      eq(taskPriorities.userId, userId),
      eq(taskPriorities.targetType, 'simple'),
      eq(taskPriorities.targetId, taskId)
    ))

  return {
    ...taskToSnakeCase(result[0]),
    priority_score: priority[0]?.priorityScore ?? 0,
  }
}

export default {
  getSortedTasks,
  getSortedAllTasks,
  refreshTaskPriority,
  refreshAllPriorities,
}
