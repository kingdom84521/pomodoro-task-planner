import db from '../database/index.js'
import { calculateResourceStats } from './resourceStatsCalculator.js'
import { calculateTaskPriorityScore } from '../utils/taskOrderAlgorithm.js'

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

  // Get resource statistics
  const resourceStats = await calculateResourceStats(userId)

  // Get all tasks for this user
  const tasksResult = await db.query(
    'SELECT * FROM tasks WHERE status = $1 AND user_id = $2',
    [status, userId]
  )

  // Calculate priority score for each task
  const tasksWithScores = tasksResult.rows.map(task => {
    const priorityScore = calculateTaskPriorityScore(task, resourceStats)
    const categoryInfo = resourceStats.categoryLimits[task.category] || {}

    return {
      ...task,
      priority_score: priorityScore,
      category_info: {
        remaining_6M: categoryInfo.remaining6M,
        warning: categoryInfo.warning,
      },
    }
  })

  // Sort by priority score (descending)
  tasksWithScores.sort((a, b) => b.priority_score - a.priority_score)

  // Apply limit if specified
  const tasks = limit ? tasksWithScores.slice(0, limit) : tasksWithScores

  return {
    tasks,
    stats: resourceStats,
  }
}

/**
 * Refresh priority for a specific task
 * @param {string} notionPageId - Notion page ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Task with updated priority score
 */
export async function refreshTaskPriority(notionPageId, userId) {
  const resourceStats = await calculateResourceStats(userId)

  const result = await db.query(
    'SELECT * FROM tasks WHERE notion_page_id = $1 AND user_id = $2',
    [notionPageId, userId]
  )

  if (result.rows.length === 0) {
    throw new Error(`Task not found: ${notionPageId}`)
  }

  const task = result.rows[0]
  const priorityScore = calculateTaskPriorityScore(task, resourceStats)
  const categoryInfo = resourceStats.categoryLimits[task.category] || {}

  return {
    ...task,
    priority_score: priorityScore,
    category_info: {
      remaining_6M: categoryInfo.remaining6M,
      warning: categoryInfo.warning,
    },
  }
}

/**
 * Calculate recommended rank for all tasks and update Notion
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of tasks with priority scores and ranks
 */
export async function refreshAllPriorities(userId) {
  const { tasks } = await getSortedTasks({ status: 'active' }, userId)

  // Assign recommended ranks (1-based)
  const tasksWithRanks = tasks.map((task, index) => ({
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
