import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { successResponse } from '../utils/responseFormatter.js'
import { createSimpleTask } from '../services/taskService.js'
import { getOrderedTasks } from '../services/simpleTaskService.js'

const router = express.Router()

/**
 * GET /api/simple-tasks
 * Get all simple tasks for the current user
 * Query params:
 *   - order: 'id' | 'smart' | 'category' (default: 'id')
 */
router.get('/', asyncHandler(async (req, res) => {
  const { order = 'id' } = req.query

  if (!['id', 'smart', 'category'].includes(order)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid order parameter. Must be one of: id, smart, category',
    })
  }

  const tasks = await getOrderedTasks(req.user.id, order)
  res.json(successResponse({ tasks }))
}))

/**
 * POST /api/simple-tasks
 * Create a new simple task
 */
router.post('/', asyncHandler(async (req, res) => {
  const { title, status, resource_group_id } = req.body

  // Validate required fields
  if (!title) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: title',
    })
  }

  const task = await createSimpleTask(
    { title, status, resource_group_id },
    req.user.id
  )
  res.json(successResponse({ task }))
}))

export default router
