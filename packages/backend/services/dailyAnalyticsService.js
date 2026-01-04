/**
 * Daily Analytics Service
 *
 * Handles pre-calculation of daily statistics for the analytics page.
 * Statistics are stored in the daily_analytics table for fast querying.
 */

import { eq, and, between, desc, sql } from 'drizzle-orm'
import {
  getDb,
  dailyAnalytics,
  cronJobLog,
  workRecords,
  meetingInstances,
  routineTaskInstances,
  users,
} from '../database/drizzle.js'

/**
 * Format date to YYYY-MM-DD string
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get all dates in a range (inclusive)
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {string[]}
 */
function getAllDatesInRange(startDate, endDate) {
  const dates = []
  const current = new Date(startDate)
  const end = new Date(endDate)

  while (current <= end) {
    dates.push(formatDate(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

/**
 * Add days to a date
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Subtract days from a date
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
function subDays(date, days) {
  return addDays(date, -days)
}

/**
 * Get work records for a specific date
 * @param {number} userId
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<Array>}
 */
async function getWorkRecordsForDate(userId, date) {
  const db = await getDb()

  // Convert date string to timestamp range
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const records = await db
    .select()
    .from(workRecords)
    .where(
      and(
        eq(workRecords.userId, userId),
        between(workRecords.completedAt, startOfDay, endOfDay)
      )
    )

  return records
}

/**
 * Get meeting instances for a specific date
 * @param {number} userId
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<Array>}
 */
async function getMeetingInstancesForDate(userId, date) {
  const db = await getDb()

  const instances = await db
    .select()
    .from(meetingInstances)
    .where(
      and(
        eq(meetingInstances.userId, userId),
        eq(meetingInstances.scheduledDate, date),
        eq(meetingInstances.status, 'completed')
      )
    )

  return instances
}

/**
 * Get routine task instances for a specific date
 * @param {number} userId
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<Array>}
 */
async function getRoutineInstancesForDate(userId, date) {
  const db = await getDb()

  const instances = await db
    .select()
    .from(routineTaskInstances)
    .where(
      and(
        eq(routineTaskInstances.userId, userId),
        eq(routineTaskInstances.scheduledDate, date)
      )
    )

  return instances
}

/**
 * Update daily analytics for a specific user and date
 * @param {number} userId
 * @param {string} date - YYYY-MM-DD
 */
export async function updateDailyAnalytics(userId, date) {
  const db = await getDb()

  try {
    // Get all data for the date
    const [records, meetings, routines] = await Promise.all([
      getWorkRecordsForDate(userId, date),
      getMeetingInstancesForDate(userId, date),
      getRoutineInstancesForDate(userId, date),
    ])

    // Calculate work duration by resource
    const workDurationByResource = {}
    let totalWorkDuration = 0

    for (const record of records) {
      const resourceId = record.resourceGroupId || 'null'
      workDurationByResource[resourceId] =
        (workDurationByResource[resourceId] || 0) + record.duration
      totalWorkDuration += record.duration
    }

    // Calculate meeting statistics
    const meetingCount = meetings.length
    const totalMeetingDuration = meetings.reduce(
      (sum, m) => sum + (m.actualDuration || 0),
      0
    )

    // Calculate routine task statistics
    const routineCompleted = routines.filter(
      (r) => r.status === 'completed'
    ).length
    const routineTotal = routines.length

    // Upsert the daily analytics record
    const existing = await db
      .select()
      .from(dailyAnalytics)
      .where(and(eq(dailyAnalytics.userId, userId), eq(dailyAnalytics.date, date)))
      .limit(1)

    const now = new Date()

    if (existing.length > 0) {
      // Update existing record
      await db
        .update(dailyAnalytics)
        .set({
          workDurationByResource,
          totalWorkDuration,
          meetingCount,
          totalMeetingDuration,
          routineCompleted,
          routineTotal,
          updatedAt: now,
        })
        .where(eq(dailyAnalytics.id, existing[0].id))
    } else {
      // Insert new record
      await db.insert(dailyAnalytics).values({
        userId,
        date,
        workDurationByResource,
        totalWorkDuration,
        meetingCount,
        totalMeetingDuration,
        routineCompleted,
        routineTotal,
        createdAt: now,
        updatedAt: now,
      })
    }

    console.log(`[DailyAnalytics] Updated for user ${userId}, date ${date}`)
  } catch (error) {
    console.error(
      `[DailyAnalytics] Error updating for user ${userId}, date ${date}:`,
      error
    )
    throw error
  }
}

/**
 * Backfill missing dates for a user
 * @param {number} userId
 * @param {string[]} dates - Array of YYYY-MM-DD strings
 */
export async function backfillMissingDates(userId, dates) {
  console.log(
    `[DailyAnalytics] Backfilling ${dates.length} dates for user ${userId}`
  )

  for (const date of dates) {
    await updateDailyAnalytics(userId, date)
  }

  console.log(`[DailyAnalytics] Backfill completed for user ${userId}`)
}

/**
 * Calculate statistics on-the-fly (fallback for missing data)
 * @param {number} userId
 * @param {string[]} dates - Array of YYYY-MM-DD strings
 * @returns {Promise<Array>}
 */
export async function calculateOnTheFly(userId, dates) {
  const results = []

  for (const date of dates) {
    const [records, meetings, routines] = await Promise.all([
      getWorkRecordsForDate(userId, date),
      getMeetingInstancesForDate(userId, date),
      getRoutineInstancesForDate(userId, date),
    ])

    const workDurationByResource = {}
    let totalWorkDuration = 0

    for (const record of records) {
      const resourceId = record.resourceGroupId || 'null'
      workDurationByResource[resourceId] =
        (workDurationByResource[resourceId] || 0) + record.duration
      totalWorkDuration += record.duration
    }

    results.push({
      date,
      workDurationByResource,
      totalWorkDuration,
      meetingCount: meetings.length,
      totalMeetingDuration: meetings.reduce(
        (sum, m) => sum + (m.actualDuration || 0),
        0
      ),
      routineCompleted: routines.filter((r) => r.status === 'completed').length,
      routineTotal: routines.length,
    })
  }

  return results
}

/**
 * Recalculate yesterday's statistics for all users
 * Called by the daily cron job
 */
export async function recalculateYesterdayForAllUsers() {
  const db = await getDb()
  const yesterday = formatDate(subDays(new Date(), 1))

  console.log(`[DailyAnalytics] Recalculating for all users, date: ${yesterday}`)

  const allUsers = await db.select({ id: users.id }).from(users)

  for (const user of allUsers) {
    await updateDailyAnalytics(user.id, yesterday)
  }

  console.log(
    `[DailyAnalytics] Recalculation completed for ${allUsers.length} users`
  )
}

/**
 * Check for missed cron jobs on server startup and backfill if needed
 */
export async function onServerStart() {
  console.log('[Startup] Checking for missed daily analytics jobs...')

  const db = await getDb()

  // Get the last successful run
  const lastRun = await db
    .select()
    .from(cronJobLog)
    .where(
      and(
        eq(cronJobLog.jobName, 'daily_analytics'),
        eq(cronJobLog.status, 'completed')
      )
    )
    .orderBy(desc(cronJobLog.lastRunDate))
    .limit(1)

  const lastRunDate = lastRun.length > 0 ? lastRun[0].lastRunDate : null

  const yesterday = formatDate(subDays(new Date(), 1))

  if (!lastRunDate) {
    console.log(
      '[Startup] No previous cron run found. Skipping startup backfill.'
    )
    return
  }

  // Check if we missed any days
  if (lastRunDate < yesterday) {
    console.log(
      `[Startup] Missed jobs detected. Last run: ${lastRunDate}, catching up...`
    )

    const missedDates = getAllDatesInRange(
      formatDate(addDays(new Date(lastRunDate), 1)),
      yesterday
    )

    const allUsers = await db.select({ id: users.id }).from(users)

    for (const date of missedDates) {
      console.log(`[Startup] Backfilling ${date}...`)

      for (const user of allUsers) {
        await updateDailyAnalytics(user.id, date)
      }

      // Log the backfill
      await db.insert(cronJobLog).values({
        jobName: 'daily_analytics',
        lastRunDate: date,
        status: 'completed',
        createdAt: new Date(),
      })
    }

    console.log('[Startup] Backfill completed.')
  } else {
    console.log('[Startup] No missed jobs. All caught up.')
  }
}

/**
 * Log cron job execution result
 * @param {string} date - YYYY-MM-DD
 * @param {'completed' | 'failed'} status
 * @param {string} [errorMessage]
 */
export async function logCronJobResult(date, status, errorMessage = null) {
  const db = await getDb()

  await db.insert(cronJobLog).values({
    jobName: 'daily_analytics',
    lastRunDate: date,
    status,
    errorMessage,
    createdAt: new Date(),
  })
}

// Export utility functions for use in other services
export { formatDate, getAllDatesInRange, addDays, subDays }
