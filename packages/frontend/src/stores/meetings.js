import { defineStore } from 'pinia'
import {
  getMeetings,
  getTodayMeetings,
  getUpcomingMeetings,
  getOverdueMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  startMeeting,
  endMeeting,
  skipMeeting,
} from '../api/meetings.js'
import { useUserSettingsStore } from './userSettings.js'

export const useMeetingsStore = defineStore('meetings', {
  state: () => ({
    // All meeting definitions
    meetings: [],

    // Today's meeting instances with meeting info
    todayMeetings: [],

    // Upcoming meetings (within reminder window)
    upcomingMeetings: [],

    // Overdue meetings (past scheduled time but not started)
    overdueMeetings: [],

    // Currently active meeting (in stopwatch mode)
    activeMeeting: null,

    // Stopwatch state
    stopwatch: {
      elapsed: 0,        // Elapsed time in seconds
      startedAt: null,   // Timestamp when started
      intervalId: null,  // setInterval ID
    },

    // Loading states
    loading: false,
    loadingToday: false,

    // Polling interval ID
    pollingIntervalId: null,
  }),

  getters: {
    /**
     * Get recurring meetings
     */
    recurringMeetings: (state) => {
      return (state.meetings || []).filter((m) => m.meeting_type === 'recurring' && m.is_active)
    },

    /**
     * Get one-time meetings
     */
    oneTimeMeetings: (state) => {
      return (state.meetings || []).filter((m) => m.meeting_type === 'one-time' && m.is_active)
    },

    /**
     * Get today's meetings sorted by time
     */
    todayMeetingsSorted: (state) => {
      return [...(state.todayMeetings || [])].sort((a, b) =>
        a.scheduled_time.localeCompare(b.scheduled_time)
      )
    },

    /**
     * Check if there's a pending reminder (upcoming or overdue)
     */
    hasPendingReminder: (state) => {
      return (state.upcomingMeetings || []).length > 0 || (state.overdueMeetings || []).length > 0
    },

    /**
     * Get the most urgent meeting (overdue first, then upcoming)
     */
    mostUrgentMeeting: (state) => {
      const overdue = state.overdueMeetings || []
      const upcoming = state.upcomingMeetings || []
      if (overdue.length > 0) {
        return { ...overdue[0], urgency: 'overdue' }
      }
      if (upcoming.length > 0) {
        return { ...upcoming[0], urgency: 'upcoming' }
      }
      return null
    },

    /**
     * Check if stopwatch is running
     */
    isStopwatchRunning: (state) => {
      return state.activeMeeting !== null && state.stopwatch.startedAt !== null
    },

    /**
     * Get current stopwatch display time
     */
    stopwatchDisplayTime: (state) => {
      return state.stopwatch.elapsed
    },

    /**
     * Check if there's an active meeting
     */
    hasActiveMeeting: (state) => {
      return state.activeMeeting !== null
    },
  },

  actions: {
    /**
     * Fetch all meeting definitions
     */
    async fetchMeetings() {
      this.loading = true
      try {
        const response = await getMeetings()
        this.meetings = response.data.meetings
      } catch (error) {
        console.error('Failed to fetch meetings:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Fetch today's meetings
     */
    async fetchTodayMeetings() {
      this.loadingToday = true
      try {
        const response = await getTodayMeetings()
        this.todayMeetings = response.data.instances
      } catch (error) {
        console.error('Failed to fetch today meetings:', error)
        throw error
      } finally {
        this.loadingToday = false
      }
    },

    /**
     * Check for upcoming meetings
     */
    async checkUpcomingMeetings() {
      const userSettingsStore = useUserSettingsStore()
      const reminderMinutes = userSettingsStore.meetingReminderMinutes || 5

      try {
        const [upcomingRes, overdueRes] = await Promise.all([
          getUpcomingMeetings(reminderMinutes),
          getOverdueMeetings(),
        ])
        this.upcomingMeetings = upcomingRes.data.instances
        this.overdueMeetings = overdueRes.data.instances
      } catch (error) {
        console.error('Failed to check upcoming meetings:', error)
      }
    },

    /**
     * Start polling for upcoming meetings
     */
    startPolling() {
      if (this.pollingIntervalId) {
        return // Already polling
      }

      // Check immediately
      this.checkUpcomingMeetings()

      // Then check every 30 seconds
      this.pollingIntervalId = setInterval(() => {
        this.checkUpcomingMeetings()
      }, 30000)
    },

    /**
     * Stop polling
     */
    stopPolling() {
      if (this.pollingIntervalId) {
        clearInterval(this.pollingIntervalId)
        this.pollingIntervalId = null
      }
    },

    /**
     * Create a new meeting
     * @param {Object} data - Meeting data
     */
    async createMeeting(data) {
      try {
        const response = await createMeeting(data)
        this.meetings.push(response.data.meeting)
        return response.data.meeting
      } catch (error) {
        console.error('Failed to create meeting:', error)
        throw error
      }
    },

    /**
     * Update a meeting
     * @param {number} id - Meeting ID
     * @param {Object} data - Updated data
     */
    async updateMeeting(id, data) {
      try {
        const response = await updateMeeting(id, data)
        const index = this.meetings.findIndex((m) => m.id === id)
        if (index !== -1) {
          this.meetings[index] = response.data.meeting
        }
        return response.data.meeting
      } catch (error) {
        console.error('Failed to update meeting:', error)
        throw error
      }
    },

    /**
     * Delete a meeting
     * @param {number} id - Meeting ID
     */
    async deleteMeeting(id) {
      try {
        await deleteMeeting(id)
        this.meetings = this.meetings.filter((m) => m.id !== id)
        // Also remove from today's meetings
        this.todayMeetings = this.todayMeetings.filter((inst) => inst.meeting?.id !== id)
      } catch (error) {
        console.error('Failed to delete meeting:', error)
        throw error
      }
    },

    /**
     * Start a meeting (begin stopwatch)
     * @param {Object} instance - Meeting instance
     */
    async startMeetingInstance(instance) {
      try {
        const response = await startMeeting(instance.id)

        // Update local state
        const index = this.todayMeetings.findIndex((inst) => inst.id === instance.id)
        if (index !== -1) {
          this.todayMeetings[index] = {
            ...this.todayMeetings[index],
            ...response.data.instance,
          }
        }

        // Remove from upcoming/overdue
        this.upcomingMeetings = this.upcomingMeetings.filter((m) => m.id !== instance.id)
        this.overdueMeetings = this.overdueMeetings.filter((m) => m.id !== instance.id)

        // Set as active meeting and start stopwatch
        this.activeMeeting = {
          ...instance,
          ...response.data.instance,
        }
        this.startStopwatch()

        return response.data.instance
      } catch (error) {
        console.error('Failed to start meeting:', error)
        throw error
      }
    },

    /**
     * End the active meeting
     */
    async endActiveMeeting() {
      if (!this.activeMeeting) return

      const duration = this.stopwatch.elapsed

      try {
        const response = await endMeeting(this.activeMeeting.id, duration)

        // Update local state
        const index = this.todayMeetings.findIndex((inst) => inst.id === this.activeMeeting.id)
        if (index !== -1) {
          this.todayMeetings[index] = {
            ...this.todayMeetings[index],
            ...response.data.instance,
          }
        }

        // Stop stopwatch and clear active meeting
        this.stopStopwatch()
        this.activeMeeting = null

        // Refresh meetings list to update duration stats
        this.fetchMeetings()

        return response.data.instance
      } catch (error) {
        console.error('Failed to end meeting:', error)
        throw error
      }
    },

    /**
     * Skip a meeting
     * @param {number} instanceId - Meeting instance ID
     */
    async skipMeetingInstance(instanceId) {
      try {
        const response = await skipMeeting(instanceId)

        // Update local state
        const index = this.todayMeetings.findIndex((inst) => inst.id === instanceId)
        if (index !== -1) {
          this.todayMeetings[index] = {
            ...this.todayMeetings[index],
            ...response.data.instance,
          }
        }

        // Remove from upcoming/overdue
        this.upcomingMeetings = this.upcomingMeetings.filter((m) => m.id !== instanceId)
        this.overdueMeetings = this.overdueMeetings.filter((m) => m.id !== instanceId)

        return response.data.instance
      } catch (error) {
        console.error('Failed to skip meeting:', error)
        throw error
      }
    },

    /**
     * Start the stopwatch
     */
    startStopwatch() {
      if (this.stopwatch.intervalId) {
        clearInterval(this.stopwatch.intervalId)
      }

      this.stopwatch.startedAt = Date.now()
      this.stopwatch.elapsed = 0

      this.stopwatch.intervalId = setInterval(() => {
        if (this.stopwatch.startedAt) {
          this.stopwatch.elapsed = Math.floor((Date.now() - this.stopwatch.startedAt) / 1000)
        }
      }, 1000)
    },

    /**
     * Stop the stopwatch
     */
    stopStopwatch() {
      if (this.stopwatch.intervalId) {
        clearInterval(this.stopwatch.intervalId)
        this.stopwatch.intervalId = null
      }
      this.stopwatch.startedAt = null
    },

    /**
     * Reset the stopwatch
     */
    resetStopwatch() {
      this.stopStopwatch()
      this.stopwatch.elapsed = 0
    },
  },
})
