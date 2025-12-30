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
 */
export const createSimpleTask = (data) => {
  return apiClient.post('/simple-tasks', data)
}

export default {
  getSimpleTasks,
  createSimpleTask,
}
