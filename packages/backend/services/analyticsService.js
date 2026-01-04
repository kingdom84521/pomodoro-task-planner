/**
 * Analytics Service
 *
 * Provides aggregated analytics data for the Statistics page.
 * Uses pre-calculated data from daily_analytics table for fast queries.
 */

import { eq, and, between, desc, sql } from 'drizzle-orm'
import {
  getDb,
  dailyAnalytics,
  workRecords,
  meetingInstances,
  meetings,
  routineTaskInstances,
  routineTasks,
  resourceGroups,
} from '../database/drizzle.js'
import {
  formatDate,
  subDays,
  getAllDatesInRange,
  calculateOnTheFly,
  backfillMissingDates,
} from './dailyAnalyticsService.js'

/**
 * Get overview statistics for a date range
 * @param {number} userId
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Object>}
 */
export async function getOverview(userId, startDate, endDate) {
  const db = await getDb()

  // Get daily analytics for the range
  const dailyStats = await db
    .select()
    .from(dailyAnalytics)
    .where(
      and(
        eq(dailyAnalytics.userId, userId),
        between(dailyAnalytics.date, startDate, endDate)
      )
    )

  // Calculate totals
  let totalWorkDuration = 0
  let totalMeetingDuration = 0
  const resourceDurations = {}

  for (const day of dailyStats) {
    totalWorkDuration += day.totalWorkDuration
    totalMeetingDuration += day.totalMeetingDuration

    // Aggregate resource durations
    if (day.workDurationByResource) {
      const byResource =
        typeof day.workDurationByResource === 'string'
          ? JSON.parse(day.workDurationByResource)
          : day.workDurationByResource

      for (const [resourceId, duration] of Object.entries(byResource)) {
        resourceDurations[resourceId] =
          (resourceDurations[resourceId] || 0) + duration
      }
    }
  }

  // Get resource names
  const resourceGroupsResult = await db
    .select()
    .from(resourceGroups)
    .where(eq(resourceGroups.userId, userId))

  const resourceMap = {}
  for (const rg of resourceGroupsResult) {
    resourceMap[rg.id] = rg.name
  }

  // Build resource distribution with names and percentages
  const resourceDistribution = Object.entries(resourceDurations).map(
    ([resourceId, duration]) => ({
      resourceId: resourceId === 'null' ? null : parseInt(resourceId),
      name: resourceId === 'null' ? '未分類' : resourceMap[resourceId] || '未知',
      duration,
      percentage:
        totalWorkDuration > 0 ? (duration / totalWorkDuration) * 100 : 0,
    })
  )

  // Sort by duration descending
  resourceDistribution.sort((a, b) => b.duration - a.duration)

  return {
    totalWorkDuration,
    totalMeetingDuration,
    totalTimeSpan: totalWorkDuration + totalMeetingDuration,
    resourceDistribution,
    daysCovered: dailyStats.length,
  }
}

/**
 * Get sliding window data for resource usage percentages
 * @param {number} userId
 * @param {number} windowDays - Window size in days
 * @param {number|null} resourceGroupId - Filter by resource (null = all)
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Object>}
 */
export async function getSlidingWindow(
  userId,
  windowDays,
  resourceGroupId,
  startDate,
  endDate
) {
  const db = await getDb()

  // Get daily analytics for the range
  const dailyStats = await db
    .select()
    .from(dailyAnalytics)
    .where(
      and(
        eq(dailyAnalytics.userId, userId),
        between(dailyAnalytics.date, startDate, endDate)
      )
    )
    .orderBy(dailyAnalytics.date)

  // Check for missing dates
  const existingDates = new Set(dailyStats.map((s) => s.date))
  const allDates = getAllDatesInRange(startDate, endDate)
  const missingDates = allDates.filter((d) => !existingDates.has(d))

  let hasGaps = false
  let stats = dailyStats

  if (missingDates.length > 0) {
    hasGaps = true

    // Trigger background backfill
    backfillMissingDates(userId, missingDates).catch(console.error)

    // Calculate on-the-fly for missing dates
    const fallbackStats = await calculateOnTheFly(userId, missingDates)

    // Merge and sort
    stats = [...dailyStats, ...fallbackStats].sort((a, b) =>
      a.date.localeCompare(b.date)
    )
  }

  // Get resource names
  const resourceGroupsResult = await db
    .select()
    .from(resourceGroups)
    .where(eq(resourceGroups.userId, userId))

  const resourceMap = {}
  for (const rg of resourceGroupsResult) {
    resourceMap[rg.id] = { name: rg.name, percentageLimit: rg.percentageLimit }
  }

  // Calculate sliding window percentages
  const dataPoints = calculateSlidingWindowPercentages(
    stats,
    windowDays,
    resourceGroupId,
    resourceMap
  )

  // Get target line (percentage limit) if filtering by single resource
  let targetLine = null
  if (resourceGroupId !== null && resourceMap[resourceGroupId]) {
    targetLine = resourceMap[resourceGroupId].percentageLimit
  }

  return {
    dataPoints,
    targetLine,
    hasGaps,
    windowDays,
    resourceGroupId,
  }
}

/**
 * Calculate sliding window percentages using O(n) algorithm
 */
function calculateSlidingWindowPercentages(
  dailyStats,
  windowDays,
  resourceGroupId,
  resourceMap
) {
  const result = []
  const windowSum = {} // { resourceId: totalDuration }
  let windowTotal = 0

  for (let i = 0; i < dailyStats.length; i++) {
    const currentDay = dailyStats[i]
    const byResource =
      typeof currentDay.workDurationByResource === 'string'
        ? JSON.parse(currentDay.workDurationByResource || '{}')
        : currentDay.workDurationByResource || {}

    // Add current day to window
    for (const [resourceId, duration] of Object.entries(byResource)) {
      windowSum[resourceId] = (windowSum[resourceId] || 0) + duration
      windowTotal += duration
    }

    // Remove day that falls out of window
    if (i >= windowDays) {
      const dayToRemove = dailyStats[i - windowDays]
      const removeByResource =
        typeof dayToRemove.workDurationByResource === 'string'
          ? JSON.parse(dayToRemove.workDurationByResource || '{}')
          : dayToRemove.workDurationByResource || {}

      for (const [resourceId, duration] of Object.entries(removeByResource)) {
        windowSum[resourceId] = (windowSum[resourceId] || 0) - duration
        windowTotal -= duration
      }
    }

    // Calculate percentages
    let percentages
    if (resourceGroupId !== null) {
      // Single resource mode
      const duration = windowSum[resourceGroupId] || 0
      percentages = [
        {
          resourceId: resourceGroupId,
          name: resourceMap[resourceGroupId]?.name || '未知',
          percentage: windowTotal > 0 ? (duration / windowTotal) * 100 : 0,
        },
      ]
    } else {
      // All resources mode
      percentages = Object.entries(windowSum)
        .filter(([, duration]) => duration > 0)
        .map(([resourceId, duration]) => ({
          resourceId: resourceId === 'null' ? null : parseInt(resourceId),
          name:
            resourceId === 'null'
              ? '未分類'
              : resourceMap[resourceId]?.name || '未知',
          percentage: windowTotal > 0 ? (duration / windowTotal) * 100 : 0,
        }))
    }

    result.push({
      date: currentDay.date,
      percentages,
      totalDuration: windowTotal,
    })
  }

  return result
}

/**
 * Get routine task statistics
 * @param {number} userId
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Object>}
 */
export async function getRoutineTaskStats(userId, startDate, endDate) {
  const db = await getDb()
  const today = formatDate(new Date())

  // Get all routine task instances in range
  const instances = await db
    .select()
    .from(routineTaskInstances)
    .where(
      and(
        eq(routineTaskInstances.userId, userId),
        between(routineTaskInstances.scheduledDate, startDate, endDate)
      )
    )

  // Get routine task definitions for names
  const tasksResult = await db
    .select()
    .from(routineTasks)
    .where(eq(routineTasks.userId, userId))

  const taskMap = {}
  for (const task of tasksResult) {
    taskMap[task.id] = task.title
  }

  // Calculate overall rate (only count dates up to today)
  const pastInstances = instances.filter((i) => i.scheduledDate <= today)
  const completed = pastInstances.filter((i) => i.status === 'completed')
  const overallRate =
    pastInstances.length > 0
      ? (completed.length / pastInstances.length) * 100
      : 0

  // Calculate rate by task
  const byTaskStats = {}
  for (const instance of pastInstances) {
    const taskId = instance.routineTaskId
    if (!byTaskStats[taskId]) {
      byTaskStats[taskId] = { completed: 0, total: 0 }
    }
    byTaskStats[taskId].total++
    if (instance.status === 'completed') {
      byTaskStats[taskId].completed++
    }
  }

  const byTask = Object.entries(byTaskStats).map(([taskId, stats]) => ({
    routineTaskId: parseInt(taskId),
    title: taskMap[taskId] || '未知',
    completedCount: stats.completed,
    totalCount: stats.total,
    rate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
  }))

  // Sort by rate descending
  byTask.sort((a, b) => b.rate - a.rate)

  // Calculate streak (consecutive days with all tasks completed)
  const streak = calculateStreak(instances, today)

  // Calculate weekly trend
  const trend = calculateWeeklyTrend(instances, startDate, endDate, today)

  return {
    overallRate,
    streak,
    byTask,
    trend,
    totalCompleted: completed.length,
    totalInstances: pastInstances.length,
  }
}

/**
 * Calculate consecutive completion streak
 */
function calculateStreak(instances, today) {
  // Early return if no instances
  if (!instances || instances.length === 0) {
    return 0
  }

  let streak = 0
  let currentDate = new Date(today)
  let daysWithoutTasks = 0
  const maxDaysWithoutTasks = 30

  // Find the earliest scheduled date to limit how far back we search
  const sortedDates = instances
    .map((i) => i.scheduledDate)
    .filter(Boolean)
    .sort()
  const earliestDate = sortedDates[0]

  if (!earliestDate) {
    return 0
  }

  while (true) {
    const dateStr = formatDate(currentDate)

    // Stop if we've gone past the earliest instance date
    if (dateStr < earliestDate) {
      break
    }

    const dayInstances = instances.filter((i) => i.scheduledDate === dateStr)

    // If no tasks scheduled for this day, skip
    if (dayInstances.length === 0) {
      daysWithoutTasks++
      // Don't count more than 30 days of no tasks
      if (daysWithoutTasks >= maxDaysWithoutTasks) {
        break
      }
      currentDate = subDays(currentDate, 1)
      continue
    }

    // Reset counter when we find tasks
    daysWithoutTasks = 0

    // Check if all tasks completed
    const allCompleted = dayInstances.every((i) => i.status === 'completed')
    if (allCompleted) {
      streak++
      currentDate = subDays(currentDate, 1)
    } else {
      break
    }
  }

  return streak
}

/**
 * Calculate weekly completion trend
 */
function calculateWeeklyTrend(instances, startDate, endDate, today) {
  const trend = []
  const dates = getAllDatesInRange(startDate, endDate).filter((d) => d <= today)

  // Group by week
  const weeks = {}
  for (const date of dates) {
    const weekStart = getWeekStart(date)
    if (!weeks[weekStart]) {
      weeks[weekStart] = { completed: 0, total: 0 }
    }
  }

  for (const instance of instances) {
    if (instance.scheduledDate > today) continue

    const weekStart = getWeekStart(instance.scheduledDate)
    if (!weeks[weekStart]) {
      weeks[weekStart] = { completed: 0, total: 0 }
    }
    weeks[weekStart].total++
    if (instance.status === 'completed') {
      weeks[weekStart].completed++
    }
  }

  // Convert to trend array
  for (const [period, stats] of Object.entries(weeks)) {
    trend.push({
      period,
      rate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
      completed: stats.completed,
      total: stats.total,
    })
  }

  // Sort by period
  trend.sort((a, b) => a.period.localeCompare(b.period))

  return trend
}

/**
 * Get week start date (Monday) for a given date
 */
function getWeekStart(dateStr) {
  const date = new Date(dateStr)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(date.setDate(diff))
  return formatDate(monday)
}

/**
 * Get meeting statistics
 * @param {number} userId
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Object>}
 */
export async function getMeetingStats(userId, startDate, endDate) {
  const db = await getDb()

  // Get completed meeting instances in range
  const instances = await db
    .select()
    .from(meetingInstances)
    .where(
      and(
        eq(meetingInstances.userId, userId),
        eq(meetingInstances.status, 'completed'),
        between(meetingInstances.scheduledDate, startDate, endDate)
      )
    )

  // Get meeting definitions for expected durations
  const meetingsResult = await db
    .select()
    .from(meetings)
    .where(eq(meetings.userId, userId))

  const meetingMap = {}
  for (const meeting of meetingsResult) {
    meetingMap[meeting.id] = meeting
  }

  // Calculate statistics
  const totalDuration = instances.reduce(
    (sum, i) => sum + (i.actualDuration || 0),
    0
  )
  const meetingCount = instances.length
  const averageDuration = meetingCount > 0 ? totalDuration / meetingCount : 0

  // Calculate daily average
  const dates = getAllDatesInRange(startDate, endDate)
  const dailyAverage = dates.length > 0 ? meetingCount / dates.length : 0

  // Overtime rate: not implemented yet (needs expected_duration field in meetings table)
  const overtimeRate = null

  // Get total work duration for ratio calculation
  const dailyStats = await db
    .select()
    .from(dailyAnalytics)
    .where(
      and(
        eq(dailyAnalytics.userId, userId),
        between(dailyAnalytics.date, startDate, endDate)
      )
    )

  const totalWorkDuration = dailyStats.reduce(
    (sum, d) => sum + d.totalWorkDuration,
    0
  )
  const totalTime = totalWorkDuration + totalDuration
  const meetingRatio = totalTime > 0 ? (totalDuration / totalTime) * 100 : 0

  // Calculate trend (compare to previous period)
  const periodDays = dates.length
  const prevEndDate = formatDate(subDays(new Date(startDate), 1))
  const prevStartDate = formatDate(subDays(new Date(startDate), periodDays))

  const prevInstances = await db
    .select()
    .from(meetingInstances)
    .where(
      and(
        eq(meetingInstances.userId, userId),
        eq(meetingInstances.status, 'completed'),
        between(meetingInstances.scheduledDate, prevStartDate, prevEndDate)
      )
    )

  const prevDuration = prevInstances.reduce(
    (sum, i) => sum + (i.actualDuration || 0),
    0
  )

  const changePercent =
    prevDuration > 0
      ? ((totalDuration - prevDuration) / prevDuration) * 100
      : totalDuration > 0
        ? 100
        : 0

  // Determine warning level
  const warningThresholds = { yellow: 30, red: 50 }
  let warning = 'none'
  if (meetingRatio >= warningThresholds.red) {
    warning = 'red'
  } else if (meetingRatio >= warningThresholds.yellow) {
    warning = 'yellow'
  }

  return {
    meetingRatio,
    totalDuration,
    averageDuration,
    dailyAverage,
    overtimeRate,
    meetingCount,
    trend: {
      currentPeriod: totalDuration,
      previousPeriod: prevDuration,
      changePercent,
      warning,
    },
  }
}

/**
 * Get work records in a date range (for displaying when clicking on chart)
 * @param {number} userId
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Array>}
 */
export async function getWorkRecordsInRange(userId, startDate, endDate) {
  const db = await getDb()

  // Convert date strings to timestamps
  const startTime = new Date(startDate)
  startTime.setHours(0, 0, 0, 0)
  const endTime = new Date(endDate)
  endTime.setHours(23, 59, 59, 999)

  const records = await db
    .select()
    .from(workRecords)
    .where(
      and(
        eq(workRecords.userId, userId),
        between(workRecords.completedAt, startTime, endTime)
      )
    )
    .orderBy(desc(workRecords.completedAt))

  // Get resource names
  const resourceGroupsResult = await db
    .select()
    .from(resourceGroups)
    .where(eq(resourceGroups.userId, userId))

  const resourceMap = {}
  for (const rg of resourceGroupsResult) {
    resourceMap[rg.id] = rg.name
  }

  return records.map((r) => ({
    id: r.id,
    task_name: r.taskName,
    duration: r.duration,
    resource_group_id: r.resourceGroupId,
    resource_name: r.resourceGroupId
      ? resourceMap[r.resourceGroupId] || '未知'
      : '未分類',
    completed_at: r.completedAt,
  }))
}

// ============================================
// Quarter Calculation Functions
// ============================================

/**
 * Get quarter info for a given date
 * @param {string} dateStr - YYYY-MM-DD format
 * @param {number} quarterStartMonth - 1-12
 * @param {number} quarterStartDay - 1-31
 * @param {number} quarterMonths - months per quarter (e.g., 3)
 * @returns {{ year: number, quarter: number }}
 */
export function getQuarterInfo(
  dateStr,
  quarterStartMonth,
  quarterStartDay,
  quarterMonths
) {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1 // 1-12
  const day = date.getDate()

  // Find the "quarter year" start
  // Quarter year starts on quarterStartMonth/quarterStartDay
  let quarterYear = date.getFullYear()

  // Check if date is before this year's quarter start
  if (
    month < quarterStartMonth ||
    (month === quarterStartMonth && day < quarterStartDay)
  ) {
    quarterYear -= 1
  }

  // Calculate quarter start date for this quarter year
  const quarterYearStart = new Date(
    quarterYear,
    quarterStartMonth - 1,
    quarterStartDay
  )

  // Calculate days since quarter year start
  const diffTime = date.getTime() - quarterYearStart.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  // Approximate days per quarter
  const daysPerQuarter = quarterMonths * 30

  // Calculate which quarter (1-based)
  const quarter = Math.floor(diffDays / daysPerQuarter) + 1

  // Cap at 4 quarters max
  const cappedQuarter = Math.min(quarter, 4)

  return { year: quarterYear, quarter: cappedQuarter }
}

/**
 * Get date range for a specific quarter
 * @param {number} year - Quarter year
 * @param {number} quarter - 1-4
 * @param {number} quarterStartMonth - 1-12
 * @param {number} quarterStartDay - 1-31
 * @param {number} quarterMonths - months per quarter
 * @returns {{ startDate: string, endDate: string }}
 */
export function getQuarterDateRange(
  year,
  quarter,
  quarterStartMonth,
  quarterStartDay,
  quarterMonths
) {
  // Calculate start date
  const startMonth = quarterStartMonth + (quarter - 1) * quarterMonths
  let startYear = year
  let adjustedStartMonth = startMonth

  // Handle month overflow
  while (adjustedStartMonth > 12) {
    adjustedStartMonth -= 12
    startYear += 1
  }

  const startDate = new Date(startYear, adjustedStartMonth - 1, quarterStartDay)

  // Calculate end date (day before next quarter starts)
  const endMonth = startMonth + quarterMonths
  let endYear = year
  let adjustedEndMonth = endMonth

  while (adjustedEndMonth > 12) {
    adjustedEndMonth -= 12
    endYear += 1
  }

  const nextQuarterStart = new Date(
    endYear,
    adjustedEndMonth - 1,
    quarterStartDay
  )
  const endDate = new Date(nextQuarterStart.getTime() - 1000 * 60 * 60 * 24)

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  }
}

/**
 * Get date range for two consecutive quarters
 * @param {number} year - Quarter year
 * @param {number} startQuarter - 1 or 3 (start of the two-quarter period)
 * @param {number} quarterStartMonth - 1-12
 * @param {number} quarterStartDay - 1-31
 * @param {number} quarterMonths - months per quarter
 * @returns {{ startDate: string, endDate: string, label: string }}
 */
export function getTwoQuartersDateRange(
  year,
  startQuarter,
  quarterStartMonth,
  quarterStartDay,
  quarterMonths
) {
  const firstQuarter = getQuarterDateRange(
    year,
    startQuarter,
    quarterStartMonth,
    quarterStartDay,
    quarterMonths
  )

  const secondQuarter = getQuarterDateRange(
    year,
    startQuarter + 1,
    quarterStartMonth,
    quarterStartDay,
    quarterMonths
  )

  const endQuarter = startQuarter + 1
  const label = `${year} Q${startQuarter}~Q${endQuarter}`

  return {
    startDate: firstQuarter.startDate,
    endDate: secondQuarter.endDate,
    label,
  }
}

/**
 * Get current quarter date range (from quarter start to today)
 * @param {number} quarterStartMonth - 1-12
 * @param {number} quarterStartDay - 1-31
 * @param {number} quarterMonths - months per quarter
 * @returns {{ year: number, quarter: number, startDate: string, endDate: string, label: string }}
 */
export function getCurrentQuarterDateRange(
  quarterStartMonth,
  quarterStartDay,
  quarterMonths
) {
  const today = new Date()
  const todayStr = formatDate(today)

  // Get current quarter info
  const { year, quarter } = getQuarterInfo(
    todayStr,
    quarterStartMonth,
    quarterStartDay,
    quarterMonths
  )

  // Get current quarter's start date
  const range = getQuarterDateRange(
    year,
    quarter,
    quarterStartMonth,
    quarterStartDay,
    quarterMonths
  )

  return {
    year,
    quarter,
    startDate: range.startDate,
    endDate: todayStr, // End date is today, not quarter end
    label: '目前',
  }
}

/**
 * Get available periods (two-quarter periods with data)
 * @param {number} userId
 * @param {number} quarterStartMonth
 * @param {number} quarterStartDay
 * @param {number} quarterMonths
 * @returns {Promise<Array>}
 */
export async function getAvailablePeriods(
  userId,
  quarterStartMonth,
  quarterStartDay,
  quarterMonths
) {
  const db = await getDb()

  // Get all dates with data
  const datesWithData = await db
    .select({ date: dailyAnalytics.date })
    .from(dailyAnalytics)
    .where(eq(dailyAnalytics.userId, userId))
    .orderBy(desc(dailyAnalytics.date))

  if (datesWithData.length === 0) {
    return []
  }

  // Convert dates to two-quarter periods
  const periodsSet = new Set()
  const periods = []

  for (const row of datesWithData) {
    const { year, quarter } = getQuarterInfo(
      row.date,
      quarterStartMonth,
      quarterStartDay,
      quarterMonths
    )

    // Determine which two-quarter period this belongs to
    // Q1~Q2 or Q3~Q4
    const startQ = quarter <= 2 ? 1 : 3
    const periodKey = `${year}-${startQ}`

    if (!periodsSet.has(periodKey)) {
      periodsSet.add(periodKey)

      const range = getTwoQuartersDateRange(
        year,
        startQ,
        quarterStartMonth,
        quarterStartDay,
        quarterMonths
      )

      periods.push({
        year,
        startQ,
        label: range.label,
        startDate: range.startDate,
        endDate: range.endDate,
      })
    }
  }

  // Filter out periods:
  // 1. Older than 2 years
  // 2. Not yet completed (endDate > today)
  const today = new Date()
  const todayStr = formatDate(today)
  const twoYearsAgo = new Date()
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
  const twoYearsAgoStr = formatDate(twoYearsAgo)

  const filteredPeriods = periods.filter(
    (p) => p.endDate >= twoYearsAgoStr && p.endDate <= todayStr
  )

  // Sort by newest first (already sorted by date desc from query)
  filteredPeriods.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return b.startQ - a.startQ
  })

  // Add "current" period at the beginning
  const currentPeriod = getCurrentQuarterDateRange(
    quarterStartMonth,
    quarterStartDay,
    quarterMonths
  )

  filteredPeriods.unshift({
    year: currentPeriod.year,
    startQ: currentPeriod.quarter,
    label: currentPeriod.label,
    startDate: currentPeriod.startDate,
    endDate: currentPeriod.endDate,
    isCurrent: true,
  })

  return filteredPeriods
}

/**
 * Check if quarter settings can be modified
 * @param {number} userId
 * @param {number} quarterStartMonth
 * @param {number} quarterStartDay
 * @param {number} quarterMonths
 * @returns {Promise<Object>}
 */
export async function getQuarterSettingsStatus(
  userId,
  quarterStartMonth,
  quarterStartDay,
  quarterMonths
) {
  const db = await getDb()
  const today = formatDate(new Date())

  // Get current two-quarter period
  const { year, quarter } = getQuarterInfo(
    today,
    quarterStartMonth,
    quarterStartDay,
    quarterMonths
  )

  const startQ = quarter <= 2 ? 1 : 3
  const currentPeriod = getTwoQuartersDateRange(
    year,
    startQ,
    quarterStartMonth,
    quarterStartDay,
    quarterMonths
  )

  // Check if there's any data in current period
  const dataInPeriod = await db
    .select({ count: sql`count(*)` })
    .from(dailyAnalytics)
    .where(
      and(
        eq(dailyAnalytics.userId, userId),
        between(dailyAnalytics.date, currentPeriod.startDate, currentPeriod.endDate)
      )
    )

  const hasData = parseInt(dataInPeriod[0].count) > 0

  // Calculate next modifiable date (day after current period ends)
  const nextModifiableDate = formatDate(
    new Date(new Date(currentPeriod.endDate).getTime() + 1000 * 60 * 60 * 24)
  )

  return {
    canModify: !hasData,
    nextModifiableDate,
    minAllowedDate: {
      month: quarterStartMonth,
      day: quarterStartDay,
    },
  }
}

export default {
  getOverview,
  getSlidingWindow,
  getRoutineTaskStats,
  getMeetingStats,
  getWorkRecordsInRange,
  getQuarterInfo,
  getQuarterDateRange,
  getTwoQuartersDateRange,
  getAvailablePeriods,
  getQuarterSettingsStatus,
}
