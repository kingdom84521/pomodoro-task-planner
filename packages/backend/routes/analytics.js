/**
 * Analytics API Routes
 *
 * Provides endpoints for the Statistics/Analytics page.
 */

import { Router } from 'express'
import { successResponse, errorResponse } from '../utils/responseFormatter.js'
import {
  getOverview,
  getSlidingWindow,
  getRoutineTaskStats,
  getMeetingStats,
  getWorkRecordsInRange,
  getAvailablePeriods,
  getQuarterSettingsStatus,
} from '../services/analyticsService.js'
import {
  formatDate,
  subDays,
  backfillMissingDates,
  getAllDatesInRange,
} from '../services/dailyAnalyticsService.js'

const router = Router()

/**
 * Helper to get default date range (2 quarters)
 * @param {number} quarterMonths - Months per quarter (default 3)
 * @returns {{ startDate: string, endDate: string }}
 */
function getDefaultDateRange(quarterMonths = 3) {
  const today = new Date()
  const twoQuartersDays = quarterMonths * 2 * 30 // Approximate
  const startDate = formatDate(subDays(today, twoQuartersDays))
  const endDate = formatDate(today)
  return { startDate, endDate }
}

/**
 * GET /api/analytics/overview
 * Get overall statistics for a date range
 *
 * Query params:
 * - startDate: YYYY-MM-DD (optional, defaults to 2 quarters ago)
 * - endDate: YYYY-MM-DD (optional, defaults to today)
 */
router.get('/overview', async (req, res, next) => {
  try {
    const userId = req.user.id
    const defaults = getDefaultDateRange()
    const startDate = req.query.startDate || defaults.startDate
    const endDate = req.query.endDate || defaults.endDate

    const overview = await getOverview(userId, startDate, endDate)

    res.json(
      successResponse({
        ...overview,
        dateRange: { startDate, endDate },
      })
    )
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/analytics/sliding-window
 * Get sliding window resource usage data
 *
 * Query params:
 * - windowDays: number (7, 30, 90, 180) - required
 * - resourceGroupId: number (optional, null for all resources)
 * - startDate: YYYY-MM-DD (optional)
 * - endDate: YYYY-MM-DD (optional)
 */
router.get('/sliding-window', async (req, res, next) => {
  try {
    const userId = req.user.id
    const windowDays = parseInt(req.query.windowDays) || 30
    const resourceGroupId = req.query.resourceGroupId
      ? parseInt(req.query.resourceGroupId)
      : null

    const defaults = getDefaultDateRange()
    const startDate = req.query.startDate || defaults.startDate
    const endDate = req.query.endDate || defaults.endDate

    const data = await getSlidingWindow(
      userId,
      windowDays,
      resourceGroupId,
      startDate,
      endDate
    )

    res.json(
      successResponse({
        ...data,
        dateRange: { startDate, endDate },
      })
    )
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/analytics/routine-tasks
 * Get routine task completion statistics
 *
 * Query params:
 * - startDate: YYYY-MM-DD (optional)
 * - endDate: YYYY-MM-DD (optional)
 */
router.get('/routine-tasks', async (req, res, next) => {
  try {
    const userId = req.user.id
    const defaults = getDefaultDateRange()
    const startDate = req.query.startDate || defaults.startDate
    const endDate = req.query.endDate || defaults.endDate

    const stats = await getRoutineTaskStats(userId, startDate, endDate)

    res.json(
      successResponse({
        ...stats,
        dateRange: { startDate, endDate },
      })
    )
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/analytics/meetings
 * Get meeting time statistics
 *
 * Query params:
 * - startDate: YYYY-MM-DD (optional)
 * - endDate: YYYY-MM-DD (optional)
 */
router.get('/meetings', async (req, res, next) => {
  try {
    const userId = req.user.id
    const defaults = getDefaultDateRange()
    const startDate = req.query.startDate || defaults.startDate
    const endDate = req.query.endDate || defaults.endDate

    const stats = await getMeetingStats(userId, startDate, endDate)

    res.json(
      successResponse({
        ...stats,
        dateRange: { startDate, endDate },
      })
    )
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/analytics/work-records
 * Get work records in a date range (for chart click details)
 *
 * Query params:
 * - startDate: YYYY-MM-DD (required)
 * - endDate: YYYY-MM-DD (required)
 */
router.get('/work-records', async (req, res, next) => {
  try {
    const userId = req.user.id
    const { startDate, endDate } = req.query

    if (!startDate || !endDate) {
      return res.status(400).json(
        errorResponse('startDate and endDate are required')
      )
    }

    const records = await getWorkRecordsInRange(userId, startDate, endDate)

    res.json(
      successResponse({
        records,
        count: records.length,
        dateRange: { startDate, endDate },
      })
    )
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/analytics/backfill
 * Trigger backfill for missing analytics data (admin use)
 *
 * Body:
 * - startDate: YYYY-MM-DD (optional)
 * - endDate: YYYY-MM-DD (optional, defaults to yesterday)
 */
router.post('/backfill', async (req, res, next) => {
  try {
    const userId = req.user.id
    const endDate = req.body.endDate || formatDate(subDays(new Date(), 1))
    const startDate =
      req.body.startDate || formatDate(subDays(new Date(endDate), 180))

    const dates = getAllDatesInRange(startDate, endDate)

    // Run backfill in background
    backfillMissingDates(userId, dates).catch(console.error)

    res.json(
      successResponse({
        message: 'Backfill started in background',
        dateRange: { startDate, endDate },
        daysToProcess: dates.length,
      })
    )
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/analytics/available-periods
 * Get available two-quarter periods with data
 *
 * Query params:
 * - quarterStartMonth: 1-12 (required)
 * - quarterStartDay: 1-31 (required)
 * - quarterMonths: number (default 3)
 */
router.get('/available-periods', async (req, res, next) => {
  try {
    const userId = req.user.id
    const quarterStartMonth = parseInt(req.query.quarterStartMonth) || 1
    const quarterStartDay = parseInt(req.query.quarterStartDay) || 1
    const quarterMonths = parseInt(req.query.quarterMonths) || 3

    const periods = await getAvailablePeriods(
      userId,
      quarterStartMonth,
      quarterStartDay,
      quarterMonths
    )

    res.json(
      successResponse({
        periods,
      })
    )
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/analytics/quarter-settings-status
 * Check if quarter settings can be modified
 *
 * Query params:
 * - quarterStartMonth: 1-12 (required)
 * - quarterStartDay: 1-31 (required)
 * - quarterMonths: number (default 3)
 */
router.get('/quarter-settings-status', async (req, res, next) => {
  try {
    const userId = req.user.id
    const quarterStartMonth = parseInt(req.query.quarterStartMonth) || 1
    const quarterStartDay = parseInt(req.query.quarterStartDay) || 1
    const quarterMonths = parseInt(req.query.quarterMonths) || 3

    const status = await getQuarterSettingsStatus(
      userId,
      quarterStartMonth,
      quarterStartDay,
      quarterMonths
    )

    res.json(successResponse(status))
  } catch (error) {
    next(error)
  }
})

export default router
