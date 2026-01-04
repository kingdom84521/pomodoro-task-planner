import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { successResponse } from '../utils/responseFormatter.js'
import {
  getWorkRecords,
  getWorkRecordById,
  createWorkRecord,
  updateWorkRecord,
  deleteWorkRecord,
  getWorkRecordsCount,
} from '../services/workRecordService.js'

const router = express.Router()

/**
 * GET /api/work-records
 * Get all work records for the current user
 * Query params:
 *   - startDate: Start date (YYYY-MM-DD), inclusive
 *   - endDate: End date (YYYY-MM-DD), inclusive
 *   - limit: Max records (optional, ignored if date range provided)
 *   - offset: Skip records
 */
router.get('/', asyncHandler(async (req, res) => {
  const { startDate, endDate, limit, offset = 0 } = req.query
  const records = await getWorkRecords(req.user.id, {
    startDate,
    endDate,
    limit: limit ? parseInt(limit) : undefined,
    offset: parseInt(offset),
  })
  const total = await getWorkRecordsCount(req.user.id)
  res.json(successResponse({ work_records: records, total }))
}))

/**
 * GET /api/work-records/:id
 * Get a single work record by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const record = await getWorkRecordById(parseInt(id), req.user.id)

  if (!record) {
    return res.status(404).json({
      success: false,
      error: 'Work record not found',
    })
  }

  res.json(successResponse({ work_record: record }))
}))

/**
 * POST /api/work-records
 * Create a new work record
 */
router.post('/', asyncHandler(async (req, res) => {
  const { task_id, task_name, duration, resource_group_id, completed_at } = req.body

  // Validate required fields
  if (!task_name || duration === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: task_name, duration',
    })
  }

  // Validate duration is positive
  if (duration <= 0) {
    return res.status(400).json({
      success: false,
      error: 'duration must be a positive number',
    })
  }

  const record = await createWorkRecord(
    { task_id, task_name, duration, resource_group_id, completed_at },
    req.user.id
  )
  res.json(successResponse({ work_record: record }))
}))

/**
 * PUT /api/work-records/:id
 * Update a work record
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const { task_name, duration, completed_at } = req.body

  // Validate required fields
  if (!task_name || duration === undefined || !completed_at) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: task_name, duration, completed_at',
    })
  }

  // Validate duration is positive
  if (duration <= 0) {
    return res.status(400).json({
      success: false,
      error: 'duration must be a positive number',
    })
  }

  const record = await updateWorkRecord(
    parseInt(id),
    { task_name, duration, completed_at },
    req.user.id
  )
  res.json(successResponse({ work_record: record }))
}))

/**
 * DELETE /api/work-records/:id
 * Delete a work record
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const record = await deleteWorkRecord(parseInt(id), req.user.id)
  res.json(successResponse({ work_record: record }))
}))

export default router
