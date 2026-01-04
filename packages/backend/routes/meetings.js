import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { successResponse } from '../utils/responseFormatter.js'
import {
  getMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getTodayMeetings,
  getUpcomingMeetings,
  getOverdueMeetings,
  startMeeting,
  endMeeting,
  skipMeeting,
  startMeetingNow,
  convertToRecurring,
} from '../services/meetingService.js'

const router = express.Router()

/**
 * GET /api/meetings
 * Get all meeting definitions for the current user
 */
router.get('/', asyncHandler(async (req, res) => {
  const meetings = await getMeetings(req.user.id)
  res.json(successResponse({ meetings }))
}))

/**
 * GET /api/meetings/today
 * Get today's meeting instances (auto-generated)
 */
router.get('/today', asyncHandler(async (req, res) => {
  const instances = await getTodayMeetings(req.user.id)
  res.json(successResponse({ instances }))
}))

/**
 * GET /api/meetings/upcoming
 * Get meetings that are about to start
 * Query params: minutes (default: 5)
 */
router.get('/upcoming', asyncHandler(async (req, res) => {
  const { minutes = 5 } = req.query
  const instances = await getUpcomingMeetings(req.user.id, parseInt(minutes))
  res.json(successResponse({ instances }))
}))

/**
 * GET /api/meetings/overdue
 * Get meetings that are past their scheduled time but not started
 */
router.get('/overdue', asyncHandler(async (req, res) => {
  const instances = await getOverdueMeetings(req.user.id)
  res.json(successResponse({ instances }))
}))

/**
 * GET /api/meetings/:id
 * Get a single meeting by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const meeting = await getMeetingById(parseInt(id), req.user.id)

  if (!meeting) {
    return res.status(404).json({
      success: false,
      error: 'Meeting not found',
    })
  }

  res.json(successResponse({ meeting }))
}))

/**
 * POST /api/meetings
 * Create a new meeting
 */
router.post('/', asyncHandler(async (req, res) => {
  const { title, meeting_type, recurrence_rule, scheduled_time, scheduled_date, is_active } = req.body

  // Validate required fields
  if (!title) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: title',
    })
  }

  if (!meeting_type || !['recurring', 'one-time'].includes(meeting_type)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid meeting_type. Must be "recurring" or "one-time"',
    })
  }

  if (!scheduled_time) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: scheduled_time',
    })
  }

  // Recurring meetings need recurrence_rule
  if (meeting_type === 'recurring' && !recurrence_rule) {
    return res.status(400).json({
      success: false,
      error: 'Recurring meetings require recurrence_rule',
    })
  }

  // One-time meetings need scheduled_date
  if (meeting_type === 'one-time' && !scheduled_date) {
    return res.status(400).json({
      success: false,
      error: 'One-time meetings require scheduled_date',
    })
  }

  const meeting = await createMeeting(
    { title, meeting_type, recurrence_rule, scheduled_time, scheduled_date, is_active },
    req.user.id
  )
  res.json(successResponse({ meeting }))
}))

/**
 * PUT /api/meetings/:id
 * Update a meeting
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const { title, meeting_type, recurrence_rule, scheduled_time, scheduled_date, is_active } = req.body

  // Validate required fields
  if (!title) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: title',
    })
  }

  if (!meeting_type || !['recurring', 'one-time'].includes(meeting_type)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid meeting_type. Must be "recurring" or "one-time"',
    })
  }

  if (!scheduled_time) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: scheduled_time',
    })
  }

  const meeting = await updateMeeting(
    parseInt(id),
    { title, meeting_type, recurrence_rule, scheduled_time, scheduled_date, is_active },
    req.user.id
  )
  res.json(successResponse({ meeting }))
}))

/**
 * DELETE /api/meetings/:id
 * Delete a meeting
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const meeting = await deleteMeeting(parseInt(id), req.user.id)
  res.json(successResponse({ meeting }))
}))

/**
 * POST /api/meetings/instances/:id/start
 * Start a meeting
 */
router.post('/instances/:id/start', asyncHandler(async (req, res) => {
  const { id } = req.params
  const instance = await startMeeting(parseInt(id), req.user.id)
  res.json(successResponse({ instance }))
}))

/**
 * POST /api/meetings/instances/:id/end
 * End a meeting
 */
router.post('/instances/:id/end', asyncHandler(async (req, res) => {
  const { id } = req.params
  const { actual_duration } = req.body

  console.log('[DEBUG] POST /instances/:id/end - id:', id, 'actual_duration:', actual_duration)

  if (actual_duration === undefined || actual_duration < 0) {
    return res.status(400).json({
      success: false,
      error: 'Missing or invalid required field: actual_duration',
    })
  }

  const instance = await endMeeting(parseInt(id), actual_duration, req.user.id)
  console.log('[DEBUG] POST /instances/:id/end - result instance:', instance)
  res.json(successResponse({ instance }))
}))

/**
 * POST /api/meetings/instances/:id/skip
 * Skip a meeting
 */
router.post('/instances/:id/skip', asyncHandler(async (req, res) => {
  const { id } = req.params
  const instance = await skipMeeting(parseInt(id), req.user.id)
  res.json(successResponse({ instance }))
}))

/**
 * POST /api/meetings/:id/start-now
 * Start a meeting now (create ad-hoc instance and start it)
 */
router.post('/:id/start-now', asyncHandler(async (req, res) => {
  const { id } = req.params
  const instance = await startMeetingNow(parseInt(id), req.user.id)
  res.json(successResponse({ instance }))
}))

/**
 * POST /api/meetings/:id/convert-to-recurring
 * Convert a one-time meeting to a recurring meeting
 */
router.post('/:id/convert-to-recurring', asyncHandler(async (req, res) => {
  const { id } = req.params
  const meeting = await convertToRecurring(parseInt(id), req.user.id)
  res.json(successResponse({ meeting }))
}))

export default router
