import db from '../database/index.js'
import { shouldRunToday } from './routineTaskService.js'

/**
 * Get all meeting definitions for a user (with duration stats)
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of meetings with duration stats
 */
export async function getMeetings(userId) {
  // Get meetings with duration stats from completed instances
  const result = await db.query(
    `SELECT m.*,
       COALESCE(stats.total_duration, 0) as total_duration,
       COALESCE(stats.avg_duration, 0) as avg_duration,
       COALESCE(stats.completed_count, 0) as completed_count
     FROM meetings m
     LEFT JOIN (
       SELECT meeting_id,
         SUM(actual_duration) as total_duration,
         AVG(actual_duration) as avg_duration,
         COUNT(*) as completed_count
       FROM meeting_instances
       WHERE status = 'completed' AND actual_duration IS NOT NULL
       GROUP BY meeting_id
     ) stats ON m.id = stats.meeting_id
     WHERE m.user_id = $1
     ORDER BY m.id`,
    [userId]
  )
  return result.rows
}

/**
 * Get a single meeting by ID
 * @param {number} id - Meeting ID
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} Meeting or null
 */
export async function getMeetingById(id, userId) {
  const result = await db.query(
    'SELECT * FROM meetings WHERE id = $1 AND user_id = $2',
    [id, userId]
  )
  return result.rows.length > 0 ? result.rows[0] : null
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
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Created meeting
 */
export async function createMeeting(data, userId) {
  const {
    title,
    meeting_type,
    recurrence_rule = null,
    scheduled_time,
    scheduled_date = null,
    is_active = true,
  } = data

  const result = await db.query(
    `INSERT INTO meetings (user_id, title, meeting_type, recurrence_rule, scheduled_time, scheduled_date, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      userId,
      title,
      meeting_type,
      recurrence_rule ? JSON.stringify(recurrence_rule) : null,
      scheduled_time,
      scheduled_date,
      is_active,
    ]
  )

  return result.rows[0]
}

/**
 * Update an existing meeting
 * @param {number} id - Meeting ID
 * @param {Object} data - Updated data
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Updated meeting
 */
export async function updateMeeting(id, data, userId) {
  const {
    title,
    meeting_type,
    recurrence_rule,
    scheduled_time,
    scheduled_date,
    is_active,
  } = data

  const result = await db.query(
    `UPDATE meetings
     SET title = $1, meeting_type = $2, recurrence_rule = $3, scheduled_time = $4, scheduled_date = $5, is_active = $6
     WHERE id = $7 AND user_id = $8
     RETURNING *`,
    [
      title,
      meeting_type,
      recurrence_rule ? JSON.stringify(recurrence_rule) : null,
      scheduled_time,
      scheduled_date,
      is_active,
      id,
      userId,
    ]
  )

  if (result.rows.length === 0) {
    throw new Error(`Meeting not found: ${id}`)
  }

  return result.rows[0]
}

/**
 * Delete a meeting
 * @param {number} id - Meeting ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Deleted meeting
 */
export async function deleteMeeting(id, userId) {
  const result = await db.query(
    'DELETE FROM meetings WHERE id = $1 AND user_id = $2 RETURNING *',
    [id, userId]
  )

  if (result.rows.length === 0) {
    throw new Error(`Meeting not found: ${id}`)
  }

  return result.rows[0]
}

/**
 * Get or create today's meeting instances
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of meeting instances with meeting info
 */
export async function getTodayMeetings(userId) {
  const today = new Date().toISOString().split('T')[0]

  // Get all active meetings
  const meetings = await db.query(
    'SELECT * FROM meetings WHERE user_id = $1 AND is_active = true',
    [userId]
  )

  const instances = []

  for (const meeting of meetings.rows) {
    let shouldInclude = false

    if (meeting.meeting_type === 'one-time') {
      // One-time meeting: check if scheduled_date is today
      shouldInclude = meeting.scheduled_date === today
    } else {
      // Recurring meeting: check recurrence rule
      shouldInclude = shouldRunToday(meeting.recurrence_rule, new Date())
    }

    if (!shouldInclude) continue

    // Check if instance already exists for today
    const existingInstance = await db.query(
      'SELECT * FROM meeting_instances WHERE meeting_id = $1 AND scheduled_date = $2',
      [meeting.id, today]
    )

    let instance
    if (existingInstance.rows.length > 0) {
      instance = existingInstance.rows[0]
    } else {
      // Create new instance
      const newInstance = await db.query(
        `INSERT INTO meeting_instances (meeting_id, user_id, scheduled_date, scheduled_time, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [meeting.id, userId, today, meeting.scheduled_time, 'pending']
      )
      instance = newInstance.rows[0]
    }

    // Combine instance with meeting info
    instances.push({
      ...instance,
      meeting: {
        id: meeting.id,
        title: meeting.title,
        meeting_type: meeting.meeting_type,
        recurrence_rule: meeting.recurrence_rule,
      },
    })
  }

  // Sort by scheduled_time
  instances.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time))

  return instances
}

/**
 * Get upcoming meetings within N minutes
 * @param {number} userId - User ID
 * @param {number} minutes - Minutes ahead to check (default: 5)
 * @returns {Promise<Array>} Array of upcoming meeting instances
 */
export async function getUpcomingMeetings(userId, minutes = 5) {
  const todayMeetings = await getTodayMeetings(userId)
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  return todayMeetings.filter((instance) => {
    // Skip already completed or in-progress meetings
    if (instance.status === 'completed' || instance.status === 'in_progress') {
      return false
    }

    const [hours, mins] = instance.scheduled_time.split(':').map(Number)
    const meetingMinutes = hours * 60 + mins

    // Meeting is upcoming if it's within the next N minutes
    const diff = meetingMinutes - currentMinutes
    return diff >= 0 && diff <= minutes
  })
}

/**
 * Get meetings that are past their scheduled time but not started
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of overdue meeting instances
 */
export async function getOverdueMeetings(userId) {
  const todayMeetings = await getTodayMeetings(userId)
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  return todayMeetings.filter((instance) => {
    // Only pending meetings
    if (instance.status !== 'pending') {
      return false
    }

    const [hours, mins] = instance.scheduled_time.split(':').map(Number)
    const meetingMinutes = hours * 60 + mins

    // Meeting is overdue if scheduled time has passed
    return currentMinutes > meetingMinutes
  })
}

/**
 * Start a meeting
 * @param {number} instanceId - Meeting instance ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Updated instance
 */
export async function startMeeting(instanceId, userId) {
  const result = await db.query(
    `UPDATE meeting_instances
     SET status = $1, started_at = $2
     WHERE id = $3 AND user_id = $4
     RETURNING *`,
    ['in_progress', new Date(), instanceId, userId]
  )

  if (result.rows.length === 0) {
    throw new Error(`Meeting instance not found: ${instanceId}`)
  }

  return result.rows[0]
}

/**
 * End a meeting
 * @param {number} instanceId - Meeting instance ID
 * @param {number} actualDuration - Actual duration in seconds
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Updated instance
 */
export async function endMeeting(instanceId, actualDuration, userId) {
  // First get the instance to retrieve started_at
  const existing = await db.query(
    'SELECT * FROM meeting_instances WHERE id = $1 AND user_id = $2',
    [instanceId, userId]
  )

  if (existing.rows.length === 0) {
    throw new Error(`Meeting instance not found: ${instanceId}`)
  }

  const result = await db.query(
    `UPDATE meeting_instances
     SET status = $1, started_at = $2, ended_at = $3, actual_duration = $4
     WHERE id = $5 AND user_id = $6
     RETURNING *`,
    [
      'completed',
      existing.rows[0].started_at,
      new Date(),
      actualDuration,
      instanceId,
      userId,
    ]
  )

  return result.rows[0]
}

/**
 * Skip a meeting
 * @param {number} instanceId - Meeting instance ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Updated instance
 */
export async function skipMeeting(instanceId, userId) {
  const result = await db.query(
    `UPDATE meeting_instances
     SET status = $1
     WHERE id = $2 AND user_id = $3
     RETURNING *`,
    ['skipped', instanceId, userId]
  )

  if (result.rows.length === 0) {
    throw new Error(`Meeting instance not found: ${instanceId}`)
  }

  return result.rows[0]
}

export default {
  getMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getTodayMeetings,
  getUpcomingMeetings,
  getOverdueMeetings,
  startMeeting,
  endMeeting,
  skipMeeting,
}
