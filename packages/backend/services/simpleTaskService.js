import db from '../database/index.js'
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
  // Get resource groups
  const groupsResult = await db.query(
    'SELECT * FROM resource_groups WHERE user_id = $1',
    [userId]
  )
  const groups = groupsResult.rows

  // Build group limits
  const groupLimits = {}
  for (const group of groups) {
    groupLimits[group.id] = {
      limit: group.percentage_limit,
      remaining6M: group.percentage_limit,
      warning: false,
    }
  }

  // Calculate usage for each period
  const periods = {}
  const now = new Date()

  for (const [period, days] of Object.entries(PERIOD_DAYS)) {
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - days)

    // Get total duration in this period
    const totalResult = await db.query(
      `SELECT COALESCE(SUM(duration), 0) as total
       FROM work_records
       WHERE user_id = $1 AND completed_at >= $2`,
      [userId, startDate]
    )
    const totalDuration = parseInt(totalResult.rows[0].total, 10)

    // Get duration per resource group
    const groupResult = await db.query(
      `SELECT resource_group_id, COALESCE(SUM(duration), 0) as total
       FROM work_records
       WHERE user_id = $1 AND completed_at >= $2 AND resource_group_id IS NOT NULL
       GROUP BY resource_group_id`,
      [userId, startDate]
    )

    periods[period] = { groups: {} }

    for (const row of groupResult.rows) {
      const groupDuration = parseInt(row.total, 10)
      const percentage = totalDuration > 0
        ? (groupDuration / totalDuration) * 100
        : 0

      periods[period].groups[row.resource_group_id] = { percentage }

      // Update 6M remaining for half-year period
      if (period === '6M' && groupLimits[row.resource_group_id]) {
        const limit = groupLimits[row.resource_group_id].limit
        groupLimits[row.resource_group_id].remaining6M = limit - percentage
        groupLimits[row.resource_group_id].warning = percentage > limit
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
  const activeStatuses = getActiveStatuses()
  const placeholders = activeStatuses.map((_, i) => `$${i + 2}`).join(', ')

  // Get active tasks
  const result = await db.query(
    `SELECT * FROM tasks
     WHERE user_id = $1 AND status IN (${placeholders})
     ORDER BY id`,
    [userId, ...activeStatuses]
  )
  let tasks = result.rows

  if (order === 'id') {
    return tasks
  }

  if (order === 'category') {
    return tasks.sort((a, b) => {
      if (a.resource_group_id === null) return 1
      if (b.resource_group_id === null) return -1
      return a.resource_group_id - b.resource_group_id
    })
  }

  if (order === 'smart') {
    const resourceStats = await calculateResourceStats(userId)

    // Calculate priority score for each task
    const tasksWithScore = tasks.map(task => ({
      ...task,
      __priorityScore: calculateTaskPriorityScore(task, resourceStats),
    }))

    // Sort by score descending
    tasksWithScore.sort((a, b) => b.__priorityScore - a.__priorityScore)

    // Remove internal score field
    return tasksWithScore.map(({ __priorityScore, ...task }) => task)
  }

  return tasks
}

export default {
  getOrderedTasks,
  getActiveStatuses,
}
