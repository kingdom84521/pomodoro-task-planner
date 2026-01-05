import apiClient from './axios'

/**
 * Get all simple tasks
 */
export const getSimpleTasks = () => {
  return apiClient.get('/simple-tasks')
}

/**
 * Create a new simple task
 * @param {Object} data - Task data
 * @param {string} data.title - Task title
 * @param {string} data.status - Task status (optional, defaults to '待處理')
 * @param {number} data.resource_group_id - Resource group ID (optional)
 * @param {string|Date} data.scheduled_at - Scheduled start time (optional)
 */
export const createSimpleTask = (data) => {
  return apiClient.post('/simple-tasks', data)
}

/**
 * Update a simple task
 * @param {number} id - Task ID
 * @param {Object} data - Updated task data
 * @param {string} data.title - Task title
 * @param {string} data.status - Task status
 * @param {number} data.resource_group_id - Resource group ID
 * @param {string|Date|null} data.scheduled_at - Scheduled start time
 */
export const updateSimpleTask = (id, data) => {
  return apiClient.put(`/simple-tasks/${id}`, data)
}

/**
 * Delete a simple task
 * @param {number} id - Task ID
 */
export const deleteSimpleTask = (id) => {
  return apiClient.delete(`/simple-tasks/${id}`)
}

export default {
  getSimpleTasks,
  createSimpleTask,
  updateSimpleTask,
  deleteSimpleTask,
}
