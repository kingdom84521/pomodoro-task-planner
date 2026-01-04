import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { successResponse } from '../utils/responseFormatter.js'
import { createOrUpdateTask, getAllTasks } from '../services/taskService.js'
import { getSortedTasks, refreshAllPriorities } from '../services/taskPriorityService.js'

const router = express.Router()

/**
 * POST /api/tasks
 * Create or update a task
 */
router.post('/', asyncHandler(async (req, res) => {
  const { task_id, title, category, priority, estimated_pomodoros } = req.body

  // Validate required fields
  if (!title || !category) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: title, category',
    })
  }

  // Create or update task for this user
  const task = await createOrUpdateTask({
    id: task_id,
    title,
    category,
    priority,
    estimated_pomodoros,
  }, req.user.id)

  // Calculate priorities for this user
  const tasksWithRanks = await refreshAllPriorities(req.user.id)

  res.json(successResponse({
    task,
    priorities_updated: true,
  }))
}))

/**
 * GET /api/tasks
 * Get sorted tasks by priority
 */
router.get('/', asyncHandler(async (req, res) => {
  const { status = 'active', limit } = req.query

  const result = await getSortedTasks({
    status,
    limit: limit ? parseInt(limit) : undefined,
  }, req.user.id)

  res.json(successResponse(result))
}))

/**
 * POST /api/tasks/refresh-priorities
 * Manually refresh all task priorities
 */
router.post('/refresh-priorities', asyncHandler(async (req, res) => {
  const tasksWithRanks = await refreshAllPriorities(req.user.id)

  res.json(successResponse({
    updated: tasksWithRanks.length,
    tasks: tasksWithRanks,
  }))
}))

export default router
