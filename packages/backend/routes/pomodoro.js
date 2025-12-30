import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { successResponse } from '../utils/responseFormatter.js'
import {
  startPomodoro,
  getPomodoroStatus,
  pausePomodoro,
  resumePomodoro,
  completePomodoro,
  cancelPomodoro,
} from '../services/pomodoroService.js'
import { updateNotionCompletedPomodoros } from '../services/notionSyncService.js'

const router = express.Router()

/**
 * POST /api/pomodoro/start
 * Start a new pomodoro session
 */
router.post('/start', asyncHandler(async (req, res) => {
  const { notion_page_id, duration_minutes = 25 } = req.body

  if (!notion_page_id) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: notion_page_id',
    })
  }

  const pomodoro = await startPomodoro(notion_page_id, duration_minutes)

  res.json(successResponse(pomodoro))
}))

/**
 * GET /api/pomodoro/status/:notion_page_id
 * Get current pomodoro status
 */
router.get('/status/:notion_page_id', asyncHandler(async (req, res) => {
  const { notion_page_id } = req.params

  const status = await getPomodoroStatus(notion_page_id)

  if (!status) {
    return res.json(successResponse(null, 'No active pomodoro'))
  }

  res.json(successResponse(status))
}))

/**
 * POST /api/pomodoro/pause
 * Pause an active pomodoro
 */
router.post('/pause', asyncHandler(async (req, res) => {
  const { notion_page_id, elapsed_seconds } = req.body

  if (!notion_page_id || elapsed_seconds === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: notion_page_id, elapsed_seconds',
    })
  }

  const result = await pausePomodoro(notion_page_id, elapsed_seconds)

  res.json(successResponse(result))
}))

/**
 * POST /api/pomodoro/resume
 * Resume a paused pomodoro
 */
router.post('/resume', asyncHandler(async (req, res) => {
  const { notion_page_id } = req.body

  if (!notion_page_id) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: notion_page_id',
    })
  }

  const result = await resumePomodoro(notion_page_id)

  res.json(successResponse(result))
}))

/**
 * POST /api/pomodoro/complete
 * Complete a pomodoro session
 */
router.post('/complete', asyncHandler(async (req, res) => {
  const { notion_page_id, actual_duration_minutes = 25 } = req.body

  if (!notion_page_id) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: notion_page_id',
    })
  }

  const result = await completePomodoro(notion_page_id, actual_duration_minutes)

  // Update Notion with new completed pomodoros count (async)
  updateNotionCompletedPomodoros(
    notion_page_id,
    result.task.completed_pomodoros
  ).catch(err => {
    console.error('Error updating Notion completed pomodoros:', err)
  })

  res.json(successResponse(result))
}))

/**
 * POST /api/pomodoro/cancel
 * Cancel an active pomodoro
 */
router.post('/cancel', asyncHandler(async (req, res) => {
  const { notion_page_id } = req.body

  if (!notion_page_id) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: notion_page_id',
    })
  }

  const result = await cancelPomodoro(notion_page_id)

  res.json(successResponse(result))
}))

export default router
