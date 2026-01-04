import { eq, and, asc, gte, sql, inArray } from 'drizzle-orm'
import { getDb, tasks, resourceGroups, workRecords } from '../database/drizzle.js'
import config from '../config/index.js'

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

/**
 * Convert task row to snake_case
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
 * Get active status names from config
 * @returns {string[]} Array of active status display names
 */
function getActiveStatuses() {
  return config.taskStatus
    .filter(s => s.isActive)
    .map(s => s.displayName)
}

/**
 * Calculate task priority score based on resource allocation
 * @param {Object} task - Task object with resource_group_id and priority
 * @param {Object} resourceStats - Resource statistics
 * @returns {number} Priority score
 */
function calculateTaskPriorityScore(task, resourceStats) {
  const groupId = task.resource_group_id
  if (!groupId || !resourceStats.groupLimits[groupId]) {
    return 0
  }

  const groupLimit = resourceStats.groupLimits[groupId]
  let score = 0

  // 1. Half-year remaining quota (weight 1000)
  score += groupLimit.remaining6M * PERIOD_WEIGHTS['6M']

  // 2. Other periods remaining quota
  for (const [period, weight] of Object.entries(PERIOD_WEIGHTS)) {
    if (period === '6M') continue

    const periodData = resourceStats.periods[period]
    if (periodData && periodData.groups[groupId]) {
      const usedInPeriod = periodData.groups[groupId].percentage
      const remaining = groupLimit.limit - usedInPeriod
      score += remaining * weight
    } else {
      score += groupLimit.limit * weight
    }
  }

  // 3. Warning penalty
  if (groupLimit.warning) {
    score -= 10000
  }

  // 4. User priority bonus
  if (task.priority) {
    const priorityBonus = { '高': 100, '中': 50, '低': 0 }
    score += priorityBonus[task.priority] || 0
  }

  return Math.round(score)
}

/**
 * Calculate resource statistics for a user
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
      limit: group.percentageLimit,
      remaining6M: group.percentageLimit,
      warning: false,
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

      // Update 6M remaining for half-year period
      if (period === '6M' && groupLimits[groupId]) {
        const limit = groupLimits[groupId].limit
        groupLimits[groupId].remaining6M = limit - percentage
        groupLimits[groupId].warning = percentage > limit
      }
    }
  }

  return { groupLimits, periods }
}

/**
 * Get ordered tasks for a user
 * @param {number} userId - User ID
 * @param {string} order - Order type: 'id', 'smart', 'category'
 * @returns {Promise<Array>} Ordered tasks
 */
export async function getOrderedTasks(userId, order = 'id') {
  const db = await getDb()
  const activeStatuses = getActiveStatuses()

  // Get active tasks
  const result = await db
    .select()
    .from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      inArray(tasks.status, activeStatuses)
    ))
    .orderBy(asc(tasks.id))

  let taskList = result.map(taskToSnakeCase)

  if (order === 'id') {
    return taskList
  }

  if (order === 'category') {
    return taskList.sort((a, b) => {
      if (a.resource_group_id === null) return 1
      if (b.resource_group_id === null) return -1
      return a.resource_group_id - b.resource_group_id
    })
  }

  if (order === 'smart') {
    const resourceStats = await calculateResourceStats(userId)

    // Calculate priority score for each task
    const tasksWithScore = taskList.map(task => ({
      ...task,
      __priorityScore: calculateTaskPriorityScore(task, resourceStats),
    }))

    // Sort by score descending
    tasksWithScore.sort((a, b) => b.__priorityScore - a.__priorityScore)

    // Remove internal score field
    return tasksWithScore.map(({ __priorityScore, ...task }) => task)
  }

  return taskList
}

export default {
  getOrderedTasks,
  getActiveStatuses,
}
