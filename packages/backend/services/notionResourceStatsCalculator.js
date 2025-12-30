import { Client } from '@notionhq/client'

const isNotionConfigured = !!(
  process.env.NOTION_API_KEY &&
  process.env.NOTION_SESSIONS_DATABASE_ID
)

const notion = isNotionConfigured
  ? new Client({ auth: process.env.NOTION_API_KEY })
  : null

const SESSIONS_DATABASE_ID = process.env.NOTION_SESSIONS_DATABASE_ID

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
 * Fetch pomodoro sessions from Notion for a specific time period
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} Array of session objects
 */
async function fetchSessionsFromNotion(days) {
  if (!isNotionConfigured) {
    console.warn('⚠️  Notion Sessions Database not configured')
    return []
  }

  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.setDate() - days)
    const cutoffISO = cutoffDate.toISOString()

    const response = await notion.databases.query({
      database_id: SESSIONS_DATABASE_ID,
      filter: {
        property: 'Completed At',
        date: {
          on_or_after: cutoffISO,
        },
      },
      page_size: 100, // Notion API limit per page
    })

    // Parse sessions from Notion pages
    const sessions = response.results.map(page => {
      const props = page.properties

      return {
        category: props.Category?.select?.name || '工作',
        duration: props.Duration?.number || 25,
        completed_at: props['Completed At']?.date?.start || null,
      }
    })

    // Handle pagination if there are more results
    let hasMore = response.has_more
    let nextCursor = response.next_cursor

    while (hasMore) {
      const nextResponse = await notion.databases.query({
        database_id: SESSIONS_DATABASE_ID,
        filter: {
          property: 'Completed At',
          date: {
            on_or_after: cutoffISO,
          },
        },
        start_cursor: nextCursor,
        page_size: 100,
      })

      const moreSessions = nextResponse.results.map(page => {
        const props = page.properties
        return {
          category: props.Category?.select?.name || '工作',
          duration: props.Duration?.number || 25,
          completed_at: props['Completed At']?.date?.start || null,
        }
      })

      sessions.push(...moreSessions)
      hasMore = nextResponse.has_more
      nextCursor = nextResponse.next_cursor
    }

    return sessions
  } catch (error) {
    console.error('❌ Failed to fetch sessions from Notion:', error.message)
    return []
  }
}

/**
 * Calculate category usage for a specific time period
 * @param {string} period - Period string (1D, 3D, 7D, etc.)
 * @returns {Promise<Object>} Categories with usage percentages
 */
async function calculatePeriodUsage(period) {
  const days = periodToDays(period)
  const sessions = await fetchSessionsFromNotion(days)

  if (sessions.length === 0) {
    return {}
  }

  // Group by category and sum durations
  const categoryMinutes = {}
  let totalMinutes = 0

  sessions.forEach(session => {
    const category = session.category
    const duration = session.duration

    if (!categoryMinutes[category]) {
      categoryMinutes[category] = 0
    }

    categoryMinutes[category] += duration
    totalMinutes += duration
  })

  // Calculate percentages
  const categories = {}
  Object.entries(categoryMinutes).forEach(([category, minutes]) => {
    const percentage = totalMinutes > 0
      ? (minutes / totalMinutes) * 100
      : 0
    categories[category] = { percentage: parseFloat(percentage.toFixed(2)) }
  })

  return categories
}

/**
 * Get category limits
 * These are hardcoded default values, can be customized per user
 * @returns {Object} Category limits
 */
function getCategoryLimits() {
  return {
    '工作': { limit: 40, remaining6M: 0, warning: false },
    '學習': { limit: 30, remaining6M: 0, warning: false },
    '娛樂': { limit: 20, remaining6M: 0, warning: false },
    '健康': { limit: 10, remaining6M: 0, warning: false },
  }
}

/**
 * Calculate resource statistics for all categories and time periods
 * Uses Notion Sessions Database as data source
 * @returns {Promise<Object>} Resource statistics object
 */
export async function calculateResourceStats() {
  const categoryLimits = getCategoryLimits()

  // Calculate usage for each time period
  const periods = {}
  const periodKeys = ['1D', '3D', '7D', '15D', '30D', '90D', '6M']

  for (const period of periodKeys) {
    const categories = await calculatePeriodUsage(period)
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
  fetchSessionsFromNotion,
}
