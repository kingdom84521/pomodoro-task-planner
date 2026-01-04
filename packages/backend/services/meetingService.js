import { eq, and, asc } from 'drizzle-orm'
import { getDb, meetings, meetingInstances } from '../database/drizzle.js'
import { shouldRunToday } from './routineTaskService.js'
import { updateDailyAnalytics } from './dailyAnalyticsService.js'

/**
 * Convert meeting row to snake_case
 */
function meetingToSnakeCase(row) {
  if (!row) return null
  return {
    id: row.id,
    user_id: row.userId,
    title: row.title,
    meeting_type: row.meetingType,
    recurrence_rule: row.recurrenceRule,
    scheduled_time: row.scheduledTime,
    scheduled_date: row.scheduledDate,
    is_active: row.isActive,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  }
}

/**
 * Convert meeting instance row to snake_case
 */
function instanceToSnakeCase(row) {
  if (!row) return null
  return {
    id: row.id,
    meeting_id: row.meetingId,
    user_id: row.userId,
    scheduled_date: row.scheduledDate,
    scheduled_time: row.scheduledTime,
    status: row.status,
    started_at: row.startedAt,
    ended_at: row.endedAt,
    actual_duration: row.actualDuration,
    is_ad_hoc: row.isAdHoc,
    created_at: row.createdAt,
  }
}

/**
 * Get all meeting definitions for a user (with duration stats)
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of meetings with duration stats
 */
export async function getMeetings(userId) {
  const db = await getDb()

  // Get all meetings
  const meetingsResult = await db
    .select()
    .from(meetings)
    .where(eq(meetings.userId, userId))
    .orderBy(asc(meetings.id))

  // Get all completed instances for stats calculation
  const instancesResult = await db
    .select()
    .from(meetingInstances)
    .where(eq(meetingInstances.status, 'completed'))

  // Calculate stats for each meeting
  return meetingsResult.map(meeting => {
    const completedInstances = instancesResult.filter(
      inst => inst.meetingId === meeting.id && inst.actualDuration !== null
    )

    // Total duration includes all instances (including ad-hoc)
    const totalDuration = completedInstances.reduce(
      (sum, inst) => sum + (inst.actualDuration || 0),
      0
    )

    // Completed count excludes ad-hoc instances (for average calculation)
    const scheduledInstances = completedInstances.filter(inst => !inst.isAdHoc)
    const completedCount = scheduledInstances.length

    // Average = total / scheduled count (not ad-hoc count)
    const avgDuration = completedCount > 0 ? totalDuration / completedCount : 0

    return {
      ...meetingToSnakeCase(meeting),
      total_duration: totalDuration,
      avg_duration: avgDuration,
      completed_count: completedCount,
    }
  })
}

/**
 * Get a single meeting by ID
 */
export async function getMeetingById(id, userId) {
  const db = await getDb()
  const result = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, id), eq(meetings.userId, userId)))

  return result.length > 0 ? meetingToSnakeCase(result[0]) : null
}

/**
 * Create a new meeting
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

  const db = await getDb()
  const result = await db
    .insert(meetings)
    .values({
      userId,
      title,
      meetingType: meeting_type,
      recurrenceRule: recurrence_rule,
      scheduledTime: scheduled_time,
      scheduledDate: scheduled_date,
      isActive: is_active,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  return meetingToSnakeCase(result[0])
}

/**
 * Update an existing meeting
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

  const db = await getDb()
  const result = await db
    .update(meetings)
    .set({
      title,
      meetingType: meeting_type,
      recurrenceRule: recurrence_rule,
      scheduledTime: scheduled_time,
      scheduledDate: scheduled_date,
      isActive: is_active,
      updatedAt: new Date(),
    })
    .where(and(eq(meetings.id, id), eq(meetings.userId, userId)))
    .returning()

  if (result.length === 0) {
    throw new Error(`Meeting not found: ${id}`)
  }

  return meetingToSnakeCase(result[0])
}

/**
 * Delete a meeting
 */
export async function deleteMeeting(id, userId) {
  const db = await getDb()

  // Delete all instances first
  await db
    .delete(meetingInstances)
    .where(eq(meetingInstances.meetingId, id))

  // Then delete the meeting
  const result = await db
    .delete(meetings)
    .where(and(eq(meetings.id, id), eq(meetings.userId, userId)))
    .returning()

  if (result.length === 0) {
    throw new Error(`Meeting not found: ${id}`)
  }

  return meetingToSnakeCase(result[0])
}

/**
 * Get or create today's meeting instances
 */
export async function getTodayMeetings(userId) {
  const today = new Date().toISOString().split('T')[0]
  const db = await getDb()

  // Get all active meetings
  const meetingsResult = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.userId, userId), eq(meetings.isActive, true)))

  const instances = []

  for (const meeting of meetingsResult) {
    let shouldInclude = false

    if (meeting.meetingType === 'one-time') {
      shouldInclude = meeting.scheduledDate === today
    } else {
      shouldInclude = shouldRunToday(meeting.recurrenceRule, new Date())
    }

    if (!shouldInclude) continue

    // Check if instance already exists for today
    const existingInstances = await db
      .select()
      .from(meetingInstances)
      .where(and(
        eq(meetingInstances.meetingId, meeting.id),
        eq(meetingInstances.scheduledDate, today)
      ))

    let instance
    if (existingInstances.length > 0) {
      instance = existingInstances[0]
    } else {
      // Create new instance
      const newInstances = await db
        .insert(meetingInstances)
        .values({
          meetingId: meeting.id,
          userId,
          scheduledDate: today,
          scheduledTime: meeting.scheduledTime,
          status: 'pending',
          createdAt: new Date(),
        })
        .returning()
      instance = newInstances[0]
    }

    instances.push({
      ...instanceToSnakeCase(instance),
      meeting: {
        id: meeting.id,
        title: meeting.title,
        meeting_type: meeting.meetingType,
        recurrence_rule: meeting.recurrenceRule,
      },
    })
  }

  // Sort by scheduled_time
  instances.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time))

  return instances
}

/**
 * Get upcoming meetings within N minutes
 */
export async function getUpcomingMeetings(userId, minutes = 5) {
  const todayMeetings = await getTodayMeetings(userId)
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  return todayMeetings.filter((instance) => {
    if (instance.status === 'completed' || instance.status === 'in_progress') {
      return false
    }

    const [hours, mins] = instance.scheduled_time.split(':').map(Number)
    const meetingMinutes = hours * 60 + mins

    const diff = meetingMinutes - currentMinutes
    return diff >= 0 && diff <= minutes
  })
}

/**
 * Get meetings that are past their scheduled time but not started
 */
export async function getOverdueMeetings(userId) {
  const todayMeetings = await getTodayMeetings(userId)
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  return todayMeetings.filter((instance) => {
    if (instance.status !== 'pending') {
      return false
    }

    const [hours, mins] = instance.scheduled_time.split(':').map(Number)
    const meetingMinutes = hours * 60 + mins

    return currentMinutes > meetingMinutes
  })
}

/**
 * Start a meeting
 */
export async function startMeeting(instanceId, userId) {
  const db = await getDb()
  const result = await db
    .update(meetingInstances)
    .set({
      status: 'in_progress',
      startedAt: new Date(),
    })
    .where(and(
      eq(meetingInstances.id, instanceId),
      eq(meetingInstances.userId, userId)
    ))
    .returning()

  if (result.length === 0) {
    throw new Error(`Meeting instance not found: ${instanceId}`)
  }

  return instanceToSnakeCase(result[0])
}

/**
 * End a meeting
 */
export async function endMeeting(instanceId, actualDuration, userId) {
  const db = await getDb()

  // First get the instance to retrieve started_at
  const existing = await db
    .select()
    .from(meetingInstances)
    .where(and(
      eq(meetingInstances.id, instanceId),
      eq(meetingInstances.userId, userId)
    ))

  if (existing.length === 0) {
    throw new Error(`Meeting instance not found: ${instanceId}`)
  }

  const result = await db
    .update(meetingInstances)
    .set({
      status: 'completed',
      startedAt: existing[0].startedAt,
      endedAt: new Date(),
      actualDuration,
    })
    .where(and(
      eq(meetingInstances.id, instanceId),
      eq(meetingInstances.userId, userId)
    ))
    .returning()

  // Trigger daily analytics update for the meeting date (non-blocking)
  updateDailyAnalytics(userId, result[0].scheduledDate).catch(console.error)

  return instanceToSnakeCase(result[0])
}

/**
 * Skip a meeting
 */
export async function skipMeeting(instanceId, userId) {
  const db = await getDb()
  const result = await db
    .update(meetingInstances)
    .set({
      status: 'skipped',
    })
    .where(and(
      eq(meetingInstances.id, instanceId),
      eq(meetingInstances.userId, userId)
    ))
    .returning()

  if (result.length === 0) {
    throw new Error(`Meeting instance not found: ${instanceId}`)
  }

  return instanceToSnakeCase(result[0])
}

/**
 * Start a meeting now (create ad-hoc instance and start it)
 */
export async function startMeetingNow(meetingId, userId) {
  const meeting = await getMeetingById(meetingId, userId)
  if (!meeting) {
    throw new Error(`Meeting not found: ${meetingId}`)
  }

  const today = new Date().toISOString().split('T')[0]
  const now = new Date()
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  const db = await getDb()
  let instance

  if (meeting.meeting_type === 'recurring') {
    // For recurring meetings, always create a new ad-hoc instance
    const newInstances = await db
      .insert(meetingInstances)
      .values({
        meetingId,
        userId,
        scheduledDate: today,
        scheduledTime: currentTime,
        status: 'in_progress',
        startedAt: now,
        isAdHoc: true,
        createdAt: new Date(),
      })
      .returning()
    instance = newInstances[0]
  } else {
    // For one-time meetings, find or create today's instance
    const existingInstances = await db
      .select()
      .from(meetingInstances)
      .where(and(
        eq(meetingInstances.meetingId, meetingId),
        eq(meetingInstances.scheduledDate, today)
      ))

    if (existingInstances.length > 0) {
      // Start existing instance
      const updated = await db
        .update(meetingInstances)
        .set({
          status: 'in_progress',
          startedAt: now,
        })
        .where(and(
          eq(meetingInstances.id, existingInstances[0].id),
          eq(meetingInstances.userId, userId)
        ))
        .returning()
      instance = updated[0]
    } else {
      // Create new ad-hoc instance for today
      const newInstances = await db
        .insert(meetingInstances)
        .values({
          meetingId,
          userId,
          scheduledDate: today,
          scheduledTime: currentTime,
          status: 'in_progress',
          startedAt: now,
          isAdHoc: true,
          createdAt: new Date(),
        })
        .returning()
      instance = newInstances[0]
    }
  }

  return {
    ...instanceToSnakeCase(instance),
    meeting: {
      id: meeting.id,
      title: meeting.title,
      meeting_type: meeting.meeting_type,
      recurrence_rule: meeting.recurrence_rule,
    },
  }
}

/**
 * Convert a one-time meeting to a recurring meeting
 */
export async function convertToRecurring(meetingId, userId) {
  const meeting = await getMeetingById(meetingId, userId)
  if (!meeting) {
    throw new Error(`Meeting not found: ${meetingId}`)
  }

  if (meeting.meeting_type !== 'one-time') {
    throw new Error(`Meeting is already recurring: ${meetingId}`)
  }

  return await updateMeeting(meetingId, {
    title: meeting.title,
    meeting_type: 'recurring',
    recurrence_rule: { frequency: 'daily' },
    scheduled_time: meeting.scheduled_time,
    scheduled_date: null,
    is_active: meeting.is_active,
  }, userId)
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
  startMeetingNow,
  convertToRecurring,
}
