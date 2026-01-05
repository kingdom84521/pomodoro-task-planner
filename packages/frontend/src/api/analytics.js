/**
 * Analytics API
 *
 * API calls for the Statistics/Analytics page.
 */

import axios from './axios.js'

/**
 * Get overview statistics
 * @param {Object} params
 * @param {string} params.startDate - YYYY-MM-DD (optional)
 * @param {string} params.endDate - YYYY-MM-DD (optional)
 * @returns {Promise<Object>}
 */
export async function getOverview(params = {}) {
  const response = await axios.get('/analytics/overview', { params })
  return response.data
}

/**
 * Get sliding window resource usage data
 * @param {Object} params
 * @param {number} params.windowDays - Window size (7, 30, 90, 180)
 * @param {number|null} params.resourceGroupId - Filter by resource (null for all)
 * @param {string} params.startDate - YYYY-MM-DD (optional)
 * @param {string} params.endDate - YYYY-MM-DD (optional)
 * @returns {Promise<Object>}
 */
export async function getSlidingWindow(params = {}) {
  const response = await axios.get('/analytics/sliding-window', { params })
  return response.data
}

/**
 * Get routine task completion statistics
 * @param {Object} params
 * @param {string} params.startDate - YYYY-MM-DD (optional)
 * @param {string} params.endDate - YYYY-MM-DD (optional)
 * @returns {Promise<Object>}
 */
export async function getRoutineTaskStats(params = {}) {
  const response = await axios.get('/analytics/routine-tasks', { params })
  return response.data
}

/**
 * Get meeting time statistics
 * @param {Object} params
 * @param {string} params.startDate - YYYY-MM-DD (optional)
 * @param {string} params.endDate - YYYY-MM-DD (optional)
 * @returns {Promise<Object>}
 */
export async function getMeetingStats(params = {}) {
  const response = await axios.get('/analytics/meetings', { params })
  return response.data
}

/**
 * Get work records in a date range
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Object>}
 */
export async function getWorkRecordsInRange(startDate, endDate) {
  const response = await axios.get('/analytics/work-records', {
    params: { startDate, endDate },
  })
  return response.data
}

/**
 * Trigger backfill for missing analytics data
 * @param {Object} params
 * @param {string} params.startDate - YYYY-MM-DD (optional)
 * @param {string} params.endDate - YYYY-MM-DD (optional)
 * @returns {Promise<Object>}
 */
export async function triggerBackfill(params = {}) {
  const response = await axios.post('/analytics/backfill', params)
  return response.data
}

/**
 * Get available two-quarter periods with data
 * @param {Object} params
 * @param {number} params.quarterStartMonth - 1-12
 * @param {number} params.quarterStartDay - 1-31
 * @param {number} params.quarterMonths - months per quarter (default 3)
 * @returns {Promise<Object>}
 */
export async function getAvailablePeriods(params = {}) {
  const response = await axios.get('/analytics/available-periods', { params })
  return response.data
}

/**
 * Check if quarter settings can be modified
 * @param {Object} params
 * @param {number} params.quarterStartMonth - 1-12
 * @param {number} params.quarterStartDay - 1-31
 * @param {number} params.quarterMonths - months per quarter (default 3)
 * @returns {Promise<Object>}
 */
export async function getQuarterSettingsStatus(params = {}) {
  const response = await axios.get('/analytics/quarter-settings-status', {
    params,
  })
  return response.data
}

export default {
  getOverview,
  getSlidingWindow,
  getRoutineTaskStats,
  getMeetingStats,
  getWorkRecordsInRange,
  triggerBackfill,
  getAvailablePeriods,
  getQuarterSettingsStatus,
}
