import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { successResponse } from '../utils/responseFormatter.js'
import {
  getRoutineTasks,
  getRoutineTaskById,
  createRoutineTask,
  updateRoutineTask,
  deleteRoutineTask,
  getTodayInstances,
  completeInstance,
  skipInstance,
  uncompleteInstance,
} from '../services/routineTaskService.js'

const router = express.Router()

/**
 * GET /api/routine-tasks
 * Get all routine task definitions for the current user
 */
router.get('/', asyncHandler(async (req, res) => {
  const tasks = await getRoutineTasks(req.user.id)
  res.json(successResponse({ routine_tasks: tasks }))
}))

/**
 * GET /api/routine-tasks/today
 * Get today's routine task instances (auto-generated)
 */
router.get('/today', asyncHandler(async (req, res) => {
  const instances = await getTodayInstances(req.user.id)
  res.json(successResponse({ instances }))
}))

/**
 * GET /api/routine-tasks/:id
 * Get a single routine task by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const task = await getRoutineTaskById(parseInt(id), req.user.id)

  if (!task) {
    return res.status(404).json({
      success: false,
      error: 'Routine task not found',
    })
  }

  res.json(successResponse({ routine_task: task }))
}))

/**
 * POST /api/routine-tasks
 * Create a new routine task
 */
router.post('/', asyncHandler(async (req, res) => {
  const { title, resource_group_id, recurrence_rule, is_active } = req.body

  // Validate required fields
  if (!title) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: title',
    })
  }

  if (!recurrence_rule) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: recurrence_rule',
    })
  }

  const task = await createRoutineTask(
    { title, resource_group_id, recurrence_rule, is_active },
    req.user.id
  )
  res.json(successResponse({ routine_task: task }))
}))

/**
 * PUT /api/routine-tasks/:id
 * Update a routine task
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const { title, resource_group_id, recurrence_rule, is_active } = req.body

  // Validate required fields
  if (!title) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: title',
    })
  }

  if (!recurrence_rule) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: recurrence_rule',
    })
  }

  const task = await updateRoutineTask(
    parseInt(id),
    { title, resource_group_id, recurrence_rule, is_active },
    req.user.id
  )
  res.json(successResponse({ routine_task: task }))
}))

/**
 * DELETE /api/routine-tasks/:id
 * Delete a routine task
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const task = await deleteRoutineTask(parseInt(id), req.user.id)
  res.json(successResponse({ routine_task: task }))
}))

/**
 * POST /api/routine-tasks/instances/:id/complete
 * Complete a routine task instance
 */
router.post('/instances/:id/complete', asyncHandler(async (req, res) => {
  const { id } = req.params
  const instance = await completeInstance(parseInt(id), req.user.id)
  res.json(successResponse({ instance }))
}))

/**
 * POST /api/routine-tasks/instances/:id/skip
 * Skip a routine task instance
 */
router.post('/instances/:id/skip', asyncHandler(async (req, res) => {
  const { id } = req.params
  const instance = await skipInstance(parseInt(id), req.user.id)
  res.json(successResponse({ instance }))
}))

/**
 * POST /api/routine-tasks/instances/:id/uncomplete
 * Uncomplete a routine task instance (set back to pending)
 */
router.post('/instances/:id/uncomplete', asyncHandler(async (req, res) => {
  const { id } = req.params
  const instance = await uncompleteInstance(parseInt(id), req.user.id)
  res.json(successResponse({ instance }))
}))

export default router
