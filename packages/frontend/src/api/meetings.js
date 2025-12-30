import apiClient from './axios'

/**
 * Get all meeting definitions
 */
export const getMeetings = () => {
  return apiClient.get('/meetings')
}

/**
 * Get a single meeting by ID
 * @param {number} id - Meeting ID
 */
export const getMeetingById = (id) => {
  return apiClient.get(`/meetings/${id}`)
}

/**
 * Get today's meeting instances
 */
export const getTodayMeetings = () => {
  return apiClient.get('/meetings/today')
}

/**
 * Get upcoming meetings within N minutes
 * @param {number} minutes - Minutes ahead to check (default: 5)
 */
export const getUpcomingMeetings = (minutes = 5) => {
  return apiClient.get('/meetings/upcoming', { params: { minutes } })
}

/**
 * Get overdue meetings
 */
export const getOverdueMeetings = () => {
  return apiClient.get('/meetings/overdue')
}

/**
 * Create a new meeting
 * @param {Object} data - Meeting data
 * @param {string} data.title - Meeting title
 * @param {string} data.meeting_type - 'recurring' or 'one-time'
 * @param {Object|null} data.recurrence_rule - Recurrence rule (for recurring meetings)
 * @param {string} data.scheduled_time - Scheduled start time (HH:mm)
 * @param {string|null} data.scheduled_date - Scheduled date (for one-time meetings)
 * @param {boolean} data.is_active - Whether the meeting is active
 */
export const createMeeting = (data) => {
  return apiClient.post('/meetings', data)
}

/**
 * Update a meeting
 * @param {number} id - Meeting ID
 * @param {Object} data - Updated data
 */
export const updateMeeting = (id, data) => {
  return apiClient.put(`/meetings/${id}`, data)
}

/**
 * Delete a meeting
 * @param {number} id - Meeting ID
 */
export const deleteMeeting = (id) => {
  return apiClient.delete(`/meetings/${id}`)
}

/**
 * Start a meeting
 * @param {number} instanceId - Meeting instance ID
 */
export const startMeeting = (instanceId) => {
  return apiClient.post(`/meetings/instances/${instanceId}/start`)
}

/**
 * End a meeting
 * @param {number} instanceId - Meeting instance ID
 * @param {number} actualDuration - Actual duration in seconds
 */
export const endMeeting = (instanceId, actualDuration) => {
  return apiClient.post(`/meetings/instances/${instanceId}/end`, {
    actual_duration: actualDuration,
  })
}

/**
 * Skip a meeting
 * @param {number} instanceId - Meeting instance ID
 */
export const skipMeeting = (instanceId) => {
  return apiClient.post(`/meetings/instances/${instanceId}/skip`)
}

export default {
  getMeetings,
  getMeetingById,
  getTodayMeetings,
  getUpcomingMeetings,
  getOverdueMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  startMeeting,
  endMeeting,
  skipMeeting,
}
