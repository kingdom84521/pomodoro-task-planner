import apiClient from './axios'

/**
 * Get all routine task definitions
 */
export const getRoutineTasks = () => {
  return apiClient.get('/routine-tasks')
}

/**
 * Get a single routine task by ID
 * @param {number} id - Routine task ID
 */
export const getRoutineTaskById = (id) => {
  return apiClient.get(`/routine-tasks/${id}`)
}

/**
 * Get today's routine task instances
 */
export const getTodayInstances = () => {
  return apiClient.get('/routine-tasks/today')
}

/**
 * Create a new routine task
 * @param {Object} data - Routine task data
 * @param {string} data.title - Task title
 * @param {number|null} data.resource_group_id - Resource group ID
 * @param {Object} data.recurrence_rule - Recurrence rule object
 * @param {boolean} data.is_active - Whether the task is active
 */
export const createRoutineTask = (data) => {
  return apiClient.post('/routine-tasks', data)
}

/**
 * Update a routine task
 * @param {number} id - Routine task ID
 * @param {Object} data - Updated data
 */
export const updateRoutineTask = (id, data) => {
  return apiClient.put(`/routine-tasks/${id}`, data)
}

/**
 * Delete a routine task
 * @param {number} id - Routine task ID
 */
export const deleteRoutineTask = (id) => {
  return apiClient.delete(`/routine-tasks/${id}`)
}

/**
 * Complete a routine task instance
 * @param {number} instanceId - Instance ID
 */
export const completeInstance = (instanceId) => {
  return apiClient.post(`/routine-tasks/instances/${instanceId}/complete`)
}

/**
 * Skip a routine task instance
 * @param {number} instanceId - Instance ID
 */
export const skipInstance = (instanceId) => {
  return apiClient.post(`/routine-tasks/instances/${instanceId}/skip`)
}

/**
 * Uncomplete a routine task instance
 * @param {number} instanceId - Instance ID
 */
export const uncompleteInstance = (instanceId) => {
  return apiClient.post(`/routine-tasks/instances/${instanceId}/uncomplete`)
}

export default {
  getRoutineTasks,
  getRoutineTaskById,
  getTodayInstances,
  createRoutineTask,
  updateRoutineTask,
  deleteRoutineTask,
  completeInstance,
  skipInstance,
  uncompleteInstance,
}
