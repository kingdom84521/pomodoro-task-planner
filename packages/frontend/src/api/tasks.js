import apiClient from './axios'

export const tasksApi = {
  /**
   * Get all tasks with optional filters
   * @param {Object} params - Query parameters
   * @param {string} params.status - Filter by status ('active', 'completed')
   * @param {number} params.limit - Limit number of results
   */
  getAllTasks(params = {}) {
    return apiClient.get('/tasks', { params })
  },

  /**
   * Create or update a task
   * @param {Object} taskData - Task data
   */
  createOrUpdateTask(taskData) {
    return apiClient.post('/tasks', taskData)
  },

  /**
   * Refresh priorities for all tasks
   */
  refreshPriorities() {
    return apiClient.post('/tasks/refresh-priorities')
  },
}

export default tasksApi
