import apiClient from './axios'

/**
 * Get all work records
 * @param {Object} params - Query parameters
 * @param {number} params.limit - Maximum number of records to return
 * @param {number} params.offset - Number of records to skip
 */
export const getWorkRecords = (params = {}) => {
  return apiClient.get('/work-records', { params })
}

/**
 * Get a single work record by ID
 * @param {number} id - Work record ID
 */
export const getWorkRecordById = (id) => {
  return apiClient.get(`/work-records/${id}`)
}

/**
 * Create a new work record
 * @param {Object} data - Work record data
 * @param {number} data.task_id - Task ID (optional)
 * @param {string} data.task_name - Task name
 * @param {number} data.duration - Duration in seconds
 * @param {string} data.completed_at - Completion time (ISO string, optional)
 */
export const createWorkRecord = (data) => {
  return apiClient.post('/work-records', data)
}

/**
 * Update a work record
 * @param {number} id - Work record ID
 * @param {Object} data - Updated data
 * @param {string} data.task_name - Task name
 * @param {number} data.duration - Duration in seconds
 * @param {string} data.completed_at - Completion time (ISO string)
 */
export const updateWorkRecord = (id, data) => {
  return apiClient.put(`/work-records/${id}`, data)
}

/**
 * Delete a work record
 * @param {number} id - Work record ID
 */
export const deleteWorkRecord = (id) => {
  return apiClient.delete(`/work-records/${id}`)
}

export default {
  getWorkRecords,
  getWorkRecordById,
  createWorkRecord,
  updateWorkRecord,
  deleteWorkRecord,
}
