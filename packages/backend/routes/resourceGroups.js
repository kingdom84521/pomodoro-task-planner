import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { successResponse } from '../utils/responseFormatter.js'
import {
  getResourceGroups,
  createResourceGroup,
  updateResourceGroup,
  deleteResourceGroup,
} from '../services/resourceGroupService.js'

const router = express.Router()

/**
 * GET /api/resource-groups
 * Get all resource groups for the current user
 */
router.get('/', asyncHandler(async (req, res) => {
  const groups = await getResourceGroups(req.user.id)
  res.json(successResponse({ resource_groups: groups }))
}))

/**
 * POST /api/resource-groups
 * Create a new resource group
 */
router.post('/', asyncHandler(async (req, res) => {
  const { name, percentage_limit } = req.body

  // Validate required fields
  if (!name || percentage_limit === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: name, percentage_limit',
    })
  }

  // Validate percentage_limit range
  if (percentage_limit < 0 || percentage_limit > 100) {
    return res.status(400).json({
      success: false,
      error: 'percentage_limit must be between 0 and 100',
    })
  }

  const group = await createResourceGroup({ name, percentage_limit }, req.user.id)
  res.json(successResponse({ resource_group: group }))
}))

/**
 * PUT /api/resource-groups/:id
 * Update a resource group
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const { name, percentage_limit } = req.body

  // Validate required fields
  if (!name || percentage_limit === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: name, percentage_limit',
    })
  }

  // Validate percentage_limit range
  if (percentage_limit < 0 || percentage_limit > 100) {
    return res.status(400).json({
      success: false,
      error: 'percentage_limit must be between 0 and 100',
    })
  }

  const group = await updateResourceGroup(
    parseInt(id),
    { name, percentage_limit },
    req.user.id
  )
  res.json(successResponse({ resource_group: group }))
}))

/**
 * DELETE /api/resource-groups/:id
 * Delete a resource group
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const group = await deleteResourceGroup(parseInt(id), req.user.id)
  res.json(successResponse({ resource_group: group }))
}))

export default router
