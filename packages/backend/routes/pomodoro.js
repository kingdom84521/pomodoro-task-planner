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

const router = express.Router()

/**
 * POST /api/pomodoro/start
 * Start a new pomodoro session
 */
router.post('/start', asyncHandler(async (req, res) => {
  const { task_id, duration_minutes = 25 } = req.body

  if (!task_id) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: task_id',
    })
  }

  const pomodoro = await startPomodoro(task_id, duration_minutes)

  res.json(successResponse(pomodoro))
}))

/**
 * GET /api/pomodoro/status/:task_id
 * Get current pomodoro status
 */
router.get('/status/:task_id', asyncHandler(async (req, res) => {
  const { task_id } = req.params

  const status = await getPomodoroStatus(task_id)

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
  const { task_id, elapsed_seconds } = req.body

  if (!task_id || elapsed_seconds === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: task_id, elapsed_seconds',
    })
  }

  const result = await pausePomodoro(task_id, elapsed_seconds)

  res.json(successResponse(result))
}))

/**
 * POST /api/pomodoro/resume
 * Resume a paused pomodoro
 */
router.post('/resume', asyncHandler(async (req, res) => {
  const { task_id } = req.body

  if (!task_id) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: task_id',
    })
  }

  const result = await resumePomodoro(task_id)

  res.json(successResponse(result))
}))

/**
 * POST /api/pomodoro/complete
 * Complete a pomodoro session
 */
router.post('/complete', asyncHandler(async (req, res) => {
  const { task_id, actual_duration_minutes = 25 } = req.body

  if (!task_id) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: task_id',
    })
  }

  const result = await completePomodoro(task_id, actual_duration_minutes)

  res.json(successResponse(result))
}))

/**
 * POST /api/pomodoro/cancel
 * Cancel an active pomodoro
 */
router.post('/cancel', asyncHandler(async (req, res) => {
  const { task_id } = req.body

  if (!task_id) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: task_id',
    })
  }

  const result = await cancelPomodoro(task_id)

  res.json(successResponse(result))
}))

export default router
