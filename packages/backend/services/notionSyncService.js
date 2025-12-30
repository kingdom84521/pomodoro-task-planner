import { Client } from '@notionhq/client'

// Check if Notion is configured
const isNotionConfigured = !!process.env.NOTION_API_KEY

// Initialize Notion client (only if configured)
const notion = isNotionConfigured ? new Client({
  auth: process.env.NOTION_API_KEY,
}) : null

// Helper to check if Notion operations should run
function checkNotionAvailable() {
  if (!isNotionConfigured) {
    console.log('⚠️  Notion API not configured - skipping sync')
    return false
  }
  return true
}

/**
 * Update task priority and rank in Notion
 * @param {string} pageId - Notion page ID
 * @param {Object} data - Data to update
 * @param {number} data.priority_score - Priority score
 * @param {number} data.recommended_rank - Recommended rank
 * @returns {Promise<Object>} Updated page
 */
export async function updateNotionTaskPriority(pageId, data) {
  if (!checkNotionAvailable()) return null

  try {
    const { priority_score, recommended_rank } = data

    const properties = {}

    if (priority_score !== undefined) {
      properties['Priority Score'] = {
        number: priority_score,
      }
    }

    if (recommended_rank !== undefined) {
      properties['Recommended Rank'] = {
        number: recommended_rank,
      }
    }

    const response = await notion.pages.update({
      page_id: pageId,
      properties,
    })

    return response
  } catch (error) {
    console.error('Error updating Notion task priority:', error.message)
    throw error
  }
}

/**
 * Update completed pomodoros count in Notion
 * @param {string} pageId - Notion page ID
 * @param {number} count - Completed pomodoros count
 * @returns {Promise<Object>} Updated page
 */
export async function updateNotionCompletedPomodoros(pageId, count) {
  if (!checkNotionAvailable()) return null

  try {
    const response = await notion.pages.update({
      page_id: pageId,
      properties: {
        'Completed Pomodoros': {
          number: count,
        },
      },
    })

    return response
  } catch (error) {
    console.error('Error updating Notion completed pomodoros:', error.message)
    throw error
  }
}

/**
 * Update task status in Notion
 * @param {string} pageId - Notion page ID
 * @param {string} status - Task status
 * @returns {Promise<Object>} Updated page
 */
export async function updateNotionTaskStatus(pageId, status) {
  if (!checkNotionAvailable()) return null

  try {
    // Map internal status to Notion status
    const statusMap = {
      active: 'Active',
      completed: 'Completed',
      paused: 'Paused',
    }

    const response = await notion.pages.update({
      page_id: pageId,
      properties: {
        'Status': {
          status: {
            name: statusMap[status] || status,
          },
        },
      },
    })

    return response
  } catch (error) {
    console.error('Error updating Notion task status:', error.message)
    throw error
  }
}

/**
 * Batch update priorities for multiple tasks
 * @param {Array} tasks - Array of tasks with pageId, priority_score, and recommended_rank
 * @returns {Promise<Array>} Array of update results
 */
export async function batchUpdatePriorities(tasks) {
  const promises = tasks.map(task =>
    updateNotionTaskPriority(task.notion_page_id, {
      priority_score: task.priority_score,
      recommended_rank: task.recommended_rank,
    })
  )

  try {
    const results = await Promise.allSettled(promises)

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`Batch update completed: ${succeeded} succeeded, ${failed} failed`)

    return results
  } catch (error) {
    console.error('Error in batch update:', error.message)
    throw error
  }
}

export default {
  updateNotionTaskPriority,
  updateNotionCompletedPomodoros,
  updateNotionTaskStatus,
  batchUpdatePriorities,
}
