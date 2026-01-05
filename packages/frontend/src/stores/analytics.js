/**
 * Analytics Store
 *
 * Pinia store for managing analytics/statistics page state.
 */

import { defineStore } from 'pinia'
import {
  getOverview,
  getSlidingWindow,
  getRoutineTaskStats,
  getMeetingStats,
  getWorkRecordsInRange,
  getAvailablePeriods,
} from '../api/analytics.js'
import { useUserSettingsStore } from './userSettings.js'

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Subtract days from date
 */
function subDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() - days)
  return result
}

export const useAnalyticsStore = defineStore('analytics', {
  state: () => ({
    // Available periods (two-quarter periods with data)
    availablePeriods: [],
    selectedPeriod: null, // { year, startQ, label, startDate, endDate }

    // Date range (derived from selected period)
    startDate: null,
    endDate: null,

    // Overview data
    overview: null,

    // Sliding window data
    windowData: [],
    selectedWindow: 30, // 7, 30, quarterDays, 2*quarterDays
    selectedResource: null, // null = all, number = specific resource ID
    targetLine: null, // percentage_limit for selected resource

    // Selected date/point for highlighting
    selectedDate: null,
    highlightedPointIndex: null,

    // Work records for selected window
    workRecordsInWindow: [],

    // Routine task stats
    routineTaskStats: null,

    // Meeting stats
    meetingStats: null,

    // Data quality flags
    isDataPartial: false,

    // Loading states
    loading: {
      availablePeriods: false,
      overview: false,
      slidingWindow: false,
      routineTasks: false,
      meetings: false,
      workRecords: false,
    },

    // Cache
    cache: {
      overview: { data: null, fetchedAt: null },
      slidingWindow: new Map(),
      routineTasks: { data: null, fetchedAt: null },
      meetings: { data: null, fetchedAt: null },
    },
  }),

  getters: {
    /**
     * Get quarter days from user settings
     */
    quarterDays() {
      const userSettingsStore = useUserSettingsStore()
      const quarterMonths = userSettingsStore.timeSettings?.quarterMonths || 3
      return quarterMonths * 30 // Approximate
    },

    /**
     * Get available window sizes
     */
    windowSizes() {
      return [
        { value: 7, label: '7天' },
        { value: 30, label: '30天' },
        { value: this.quarterDays, label: '1季' },
        { value: this.quarterDays * 2, label: '2季' },
      ]
    },

    /**
     * Check if any data is loading
     */
    isLoading() {
      return Object.values(this.loading).some((v) => v)
    },

    /**
     * Check if there are available periods
     */
    hasAvailablePeriods() {
      return this.availablePeriods.length > 0
    },

    /**
     * Get formatted total work duration
     */
    formattedTotalWorkDuration() {
      if (!this.overview) return '0h'
      const hours = Math.round(this.overview.totalWorkDuration / 3600)
      return `${hours}h`
    },

    /**
     * Get formatted meeting duration
     */
    formattedMeetingDuration() {
      if (!this.overview) return '0h'
      const hours = Math.round(this.overview.totalMeetingDuration / 3600)
      return `${hours}h`
    },

    /**
     * Get formatted total time span
     */
    formattedTotalTimeSpan() {
      if (!this.overview) return '0h'
      const hours = Math.round(this.overview.totalTimeSpan / 3600)
      return `${hours}h`
    },
  },

  actions: {
    /**
     * Initialize date range based on quarter settings
     */
    initializeDateRange() {
      const today = new Date()
      this.endDate = formatDate(today)
      this.startDate = formatDate(subDays(today, this.quarterDays * 2))
    },

    /**
     * Fetch overview data
     */
    async fetchOverview(forceRefresh = false) {
      // Check cache (5 minutes)
      const cached = this.cache.overview
      if (
        !forceRefresh &&
        cached.data &&
        Date.now() - cached.fetchedAt < 5 * 60 * 1000
      ) {
        this.overview = cached.data
        return
      }

      this.loading.overview = true
      try {
        const data = await getOverview({
          startDate: this.startDate,
          endDate: this.endDate,
        })

        this.overview = data
        this.cache.overview = { data, fetchedAt: Date.now() }
      } catch (error) {
        console.error('Failed to fetch overview:', error)
        throw error
      } finally {
        this.loading.overview = false
      }
    },

    /**
     * Fetch sliding window data
     */
    async fetchSlidingWindowData(forceRefresh = false) {
      const cacheKey = `${this.selectedWindow}-${this.selectedResource}-${this.startDate}-${this.endDate}`

      // Check cache
      const cached = this.cache.slidingWindow.get(cacheKey)
      if (
        !forceRefresh &&
        cached &&
        Date.now() - cached.fetchedAt < 5 * 60 * 1000
      ) {
        this.windowData = cached.data.dataPoints
        this.targetLine = cached.data.targetLine
        this.isDataPartial = cached.data.hasGaps
        return
      }

      this.loading.slidingWindow = true
      try {
        const data = await getSlidingWindow({
          windowDays: this.selectedWindow,
          resourceGroupId: this.selectedResource,
          startDate: this.startDate,
          endDate: this.endDate,
        })

        this.windowData = data.dataPoints
        this.targetLine = data.targetLine
        this.isDataPartial = data.hasGaps

        this.cache.slidingWindow.set(cacheKey, { data, fetchedAt: Date.now() })

        // If data is partial, schedule a refresh
        if (data.hasGaps) {
          setTimeout(() => {
            this.fetchSlidingWindowData(true)
          }, 5000)
        }
      } catch (error) {
        console.error('Failed to fetch sliding window data:', error)
        throw error
      } finally {
        this.loading.slidingWindow = false
      }
    },

    /**
     * Fetch routine task stats
     */
    async fetchRoutineTaskStats(forceRefresh = false) {
      const cached = this.cache.routineTasks
      if (
        !forceRefresh &&
        cached.data &&
        Date.now() - cached.fetchedAt < 5 * 60 * 1000
      ) {
        this.routineTaskStats = cached.data
        return
      }

      this.loading.routineTasks = true
      try {
        const data = await getRoutineTaskStats({
          startDate: this.startDate,
          endDate: this.endDate,
        })

        this.routineTaskStats = data
        this.cache.routineTasks = { data, fetchedAt: Date.now() }
      } catch (error) {
        console.error('Failed to fetch routine task stats:', error)
        throw error
      } finally {
        this.loading.routineTasks = false
      }
    },

    /**
     * Fetch meeting stats
     */
    async fetchMeetingStats(forceRefresh = false) {
      const cached = this.cache.meetings
      if (
        !forceRefresh &&
        cached.data &&
        Date.now() - cached.fetchedAt < 5 * 60 * 1000
      ) {
        this.meetingStats = cached.data
        return
      }

      this.loading.meetings = true
      try {
        const data = await getMeetingStats({
          startDate: this.startDate,
          endDate: this.endDate,
        })

        this.meetingStats = data
        this.cache.meetings = { data, fetchedAt: Date.now() }
      } catch (error) {
        console.error('Failed to fetch meeting stats:', error)
        throw error
      } finally {
        this.loading.meetings = false
      }
    },

    /**
     * Fetch work records for a specific date range (e.g., when clicking a data point)
     */
    async fetchWorkRecordsForWindow(startDate, endDate) {
      this.loading.workRecords = true
      try {
        const data = await getWorkRecordsInRange(startDate, endDate)
        this.workRecordsInWindow = data.records
      } catch (error) {
        console.error('Failed to fetch work records:', error)
        throw error
      } finally {
        this.loading.workRecords = false
      }
    },

    /**
     * Set selected window size
     */
    setSelectedWindow(windowDays) {
      this.selectedWindow = windowDays
      this.fetchSlidingWindowData()
    },

    /**
     * Set selected resource
     */
    setSelectedResource(resourceId) {
      this.selectedResource = resourceId
      this.fetchSlidingWindowData()
    },

    /**
     * Calculate the effective start date for work records window
     * (cannot be earlier than period start date)
     */
    getEffectiveWindowStartDate(endDate) {
      const windowStartDate = formatDate(
        subDays(new Date(endDate), this.selectedWindow - 1)
      )
      // Clamp to period start date
      console.log('[Analytics] getEffectiveWindowStartDate:', {
        endDate,
        windowStartDate,
        periodStartDate: this.startDate,
        selectedWindow: this.selectedWindow,
      })
      if (this.startDate && windowStartDate < this.startDate) {
        return this.startDate
      }
      return windowStartDate
    },

    /**
     * Set selected date and highlight corresponding point
     */
    async setSelectedDate(date) {
      this.selectedDate = date

      // Find the index of the data point for this date
      const index = this.windowData.findIndex((d) => d.date === date)
      this.highlightedPointIndex = index >= 0 ? index : null

      // Calculate window range and fetch work records
      if (date) {
        const endDate = date
        const startDate = this.getEffectiveWindowStartDate(endDate)
        await this.fetchWorkRecordsForWindow(startDate, endDate)
      } else {
        this.workRecordsInWindow = []
      }
    },

    /**
     * Set highlighted point by index
     */
    async setHighlightedPoint(index) {
      this.highlightedPointIndex = index

      if (index !== null && this.windowData[index]) {
        const date = this.windowData[index].date
        this.selectedDate = date

        const endDate = date
        const startDate = this.getEffectiveWindowStartDate(endDate)
        await this.fetchWorkRecordsForWindow(startDate, endDate)
      } else {
        this.selectedDate = null
        this.workRecordsInWindow = []
      }
    },

    /**
     * Clear selection
     */
    clearSelection() {
      this.selectedDate = null
      this.highlightedPointIndex = null
      this.workRecordsInWindow = []
    },

    /**
     * Fetch available periods from backend
     */
    async fetchAvailablePeriods() {
      this.loading.availablePeriods = true
      try {
        const userSettingsStore = useUserSettingsStore()
        const timeSettings = userSettingsStore.timeSettings || {}
        const quarterStartMonth = timeSettings.quarterStartDate?.month || 1
        const quarterStartDay = timeSettings.quarterStartDate?.day || 1
        const quarterMonths = timeSettings.quarterMonths || 3

        const data = await getAvailablePeriods({
          quarterStartMonth,
          quarterStartDay,
          quarterMonths,
        })

        this.availablePeriods = data.periods || []

        // Select period if none selected or if current period changed
        if (this.availablePeriods.length > 0) {
          const currentPeriod = this.availablePeriods.find((p) => p.isCurrent)

          // Check if we need to change the selected period
          const needsUpdate = !this.selectedPeriod || (
            currentPeriod &&
            (this.selectedPeriod.startDate !== currentPeriod.startDate ||
             this.selectedPeriod.endDate !== currentPeriod.endDate)
          )

          if (needsUpdate) {
            if (currentPeriod) {
              await this.setSelectedPeriod(currentPeriod)
            } else {
              await this.setSelectedPeriod(this.availablePeriods[0])
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch available periods:', error)
        this.availablePeriods = []
      } finally {
        this.loading.availablePeriods = false
      }
    },

    /**
     * Set selected period and reload all data
     */
    async setSelectedPeriod(period) {
      if (!period) return

      this.selectedPeriod = period
      this.startDate = period.startDate
      this.endDate = period.endDate

      // Clear cache when period changes
      this.clearCache()

      // Clear selection
      this.clearSelection()

      // Reload all data for the new period
      await Promise.all([
        this.fetchOverview(true),
        this.fetchSlidingWindowData(true),
        this.fetchRoutineTaskStats(true),
        this.fetchMeetingStats(true),
      ])
    },

    /**
     * Refresh all data
     * Fetches available periods first, then loads data for the selected period
     */
    async refreshAll() {
      // Fetch available periods - this will also select the first period
      // and load all data for it
      await this.fetchAvailablePeriods()

      // If no periods available, fall back to default date range
      if (this.availablePeriods.length === 0) {
        this.initializeDateRange()
        await Promise.all([
          this.fetchOverview(true),
          this.fetchSlidingWindowData(true),
          this.fetchRoutineTaskStats(true),
          this.fetchMeetingStats(true),
        ])
      }
    },

    /**
     * Clear cache
     */
    clearCache() {
      this.cache.overview = { data: null, fetchedAt: null }
      this.cache.slidingWindow.clear()
      this.cache.routineTasks = { data: null, fetchedAt: null }
      this.cache.meetings = { data: null, fetchedAt: null }
    },
  },
})
