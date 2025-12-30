import express from 'express'
import crypto from 'crypto'
import { asyncHandler } from '../middleware/errorHandler.js'
import { successResponse } from '../utils/responseFormatter.js'
import { createOrUpdateTask } from '../services/taskService.js'
import { refreshAllPriorities } from '../services/taskPriorityService.js'
import { batchUpdatePriorities } from '../services/notionSyncService.js'

const router = express.Router()

/**
 * Verify Notion webhook signature
 * @param {string} body - Request body as string
 * @param {string} signature - Signature from Notion-Signature header
 * @param {string} secret - Your webhook secret
 * @returns {boolean} Is signature valid
 */
function verifyNotionSignature(body, signature, secret) {
  if (!secret || !signature) return false

  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(body, 'utf8')
  const expectedSignature = hmac.digest('base64')

  return signature === expectedSignature
}

/**
 * POST /api/webhooks/notion
 * Receive webhook events from Notion API
 *
 * Notion sends events when:
 * - Page is created in database
 * - Page is updated
 * - Page content changes
 */
router.post('/notion', express.raw({ type: 'application/json' }), asyncHandler(async (req, res) => {
  const signature = req.headers['notion-signature']
  const secret = process.env.NOTION_WEBHOOK_SECRET

  // Verify signature (optional but recommended)
  if (secret && signature) {
    const isValid = verifyNotionSignature(req.body.toString(), signature, secret)
    if (!isValid) {
      console.error('❌ Invalid webhook signature')
      return res.status(401).json({ error: 'Invalid signature' })
    }
  }

  // Parse body
  const event = JSON.parse(req.body.toString())

  console.log('📥 Received Notion webhook:', event.type)

  // Handle different event types
  switch (event.type) {
    case 'page.content_updated':
    case 'page.created':
      await handlePageEvent(event)
      break

    default:
      console.log(`ℹ️  Unhandled event type: ${event.type}`)
  }

  // Always return 200 to acknowledge receipt
  res.json(successResponse({ received: true }))
}))

/**
 * Handle page created or updated events
 * Extract task information and sync to our database
 */
async function handlePageEvent(event) {
  try {
    const pageId = event.data?.page_id || event.data?.id

    if (!pageId) {
      console.error('❌ No page ID in event')
      return
    }

    console.log(`📄 Processing page: ${pageId}`)

    // Fetch page details from Notion API
    const { Client } = await import('@notionhq/client')
    const notion = new Client({ auth: process.env.NOTION_API_KEY })

    const page = await notion.pages.retrieve({ page_id: pageId })

    // Extract properties
    const props = page.properties

    // Skip if not in our task database (check if it has required properties)
    if (!props.Name || !props.Category) {
      console.log('ℹ️  Page is not a task (missing required properties)')
      return
    }

    // Extract task data
    const taskData = {
      notion_page_id: pageId,
      title: props.Name?.title?.[0]?.plain_text || 'Untitled',
      category: props.Category?.select?.name || '工作',
      priority: props.Priority?.select?.name || '中',
      estimated_pomodoros: props['Estimated Pomodoros']?.number || 1,
    }

    // Check status - only sync active tasks
    const status = props.Status?.status?.name || props.Status?.select?.name
    if (status && status !== 'Active') {
      console.log(`ℹ️  Task status is ${status}, skipping`)
      return
    }

    console.log(`✅ Syncing task: ${taskData.title}`)

    // Create or update task
    await createOrUpdateTask(taskData)

    // Recalculate priorities
    const tasksWithRanks = await refreshAllPriorities()

    // Update Notion with new priorities (async)
    batchUpdatePriorities(tasksWithRanks).catch(err => {
      console.error('Error updating Notion priorities:', err)
    })

    console.log('✅ Task synced successfully')

  } catch (error) {
    console.error('❌ Error handling page event:', error.message)
  }
}

export default router
