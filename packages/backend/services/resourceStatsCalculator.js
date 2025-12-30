import db from '../database/index.js'

/**
 * Convert period string to number of days
 * @param {string} period - Period string (1D, 3D, 7D, 15D, 30D, 90D, 6M)
 * @returns {number} Number of days
 */
function periodToDays(period) {
  const map = {
    '1D': 1,
    '3D': 3,
    '7D': 7,
    '15D': 15,
    '30D': 30,
    '90D': 90,
    '6M': 180, // 6 months ≈ 180 days
  }
  return map[period] || 1
}

/**
 * Calculate category usage for a specific time period
 * @param {string} period - Period string (1D, 3D, 7D, etc.)
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Categories with usage percentages
 */
async function calculatePeriodUsage(period, userId) {
  const days = periodToDays(period)

  const result = await db.query(
    `SELECT
       category,
       COUNT(*) * 25 AS total_minutes
     FROM pomodoro_sessions
     WHERE completed_at >= NOW() - INTERVAL '${days} days' AND user_id = $1
     GROUP BY category`,
    [userId]
  )

  // Calculate total pomodoros in this period
  const totalMinutes = result.rows.reduce((sum, row) => sum + parseInt(row.total_minutes), 0)

  const categories = {}
  result.rows.forEach(row => {
    const percentage = totalMinutes > 0
      ? (parseInt(row.total_minutes) / totalMinutes) * 100
      : 0
    categories[row.category] = { percentage: parseFloat(percentage.toFixed(2)) }
  })

  return categories
}

/**
 * Calculate resource statistics for all categories and time periods
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Resource statistics object
 */
export async function calculateResourceStats(userId) {
  // Get category limits from database
  const limitsResult = await db.query(
    'SELECT category, limit_percentage FROM category_limits WHERE user_id = $1',
    [userId]
  )

  const categoryLimits = {}
  limitsResult.rows.forEach(row => {
    categoryLimits[row.category] = {
      limit: parseFloat(row.limit_percentage),
      remaining6M: 0,
      warning: false,
    }
  })

  // Calculate usage for each time period
  const periods = {}
  const periodKeys = ['1D', '3D', '7D', '15D', '30D', '90D', '6M']

  for (const period of periodKeys) {
    const categories = await calculatePeriodUsage(period, userId)
    periods[period] = { categories }
  }

  // Calculate remaining6M and warning flags
  const sixMonthUsage = periods['6M'].categories

  Object.keys(categoryLimits).forEach(category => {
    const used = sixMonthUsage[category]?.percentage || 0
    const limit = categoryLimits[category].limit
    const remaining = limit - used

    categoryLimits[category].remaining6M = parseFloat(remaining.toFixed(2))
    categoryLimits[category].warning = remaining < 0
  })

  return {
    categoryLimits,
    periods,
  }
}

export default {
  calculateResourceStats,
  calculatePeriodUsage,
  periodToDays,
}
