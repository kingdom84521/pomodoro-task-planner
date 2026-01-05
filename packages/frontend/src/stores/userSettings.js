import { defineStore } from 'pinia'
import { getUserSettings, updateUserSettings } from '../api/userSettings.js'

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayString() {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

/**
 * Get tomorrow's date in YYYY-MM-DD format
 */
function getTomorrowString() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
}

export const useUserSettingsStore = defineStore('userSettings', {
  state: () => ({
    isSynced: true,    // true = in sync with cloud
    pomodoro: {
      // Currently effective settings
      current: {
        focusDuration: 1500,      // 25 min (seconds)
        shortBreakDuration: 300,  // 5 min
        longBreakDuration: 900,   // 15 min
        longBreakInterval: 4,     // 4 focus sessions before long break
      },
      // Pending settings (effective from tomorrow)
      pending: null,
      pendingEffectiveDate: null, // YYYY-MM-DD
    },
    // Meeting settings
    meetingReminderMinutes: 5,    // Minutes before meeting to show reminder
    meetingWarningThreshold: {    // Meeting time warning thresholds
      yellow: 30,                 // Yellow warning when meeting ratio >= 30%
      red: 50,                    // Red warning when meeting ratio >= 50%
    },
    // Time settings
    timeSettings: {
      quarterMonths: 3,                       // 一季幾個月
      quarterStartDate: { month: 1, day: 1 }, // 季度起始日 (月/日)
      workHours: {
        start: '09:00',                       // 工作開始時間 (HH:mm)
        end: '18:00',                         // 工作結束時間 (HH:mm)
      },
      workDays: [1, 2, 3, 4, 5],              // 工作日 (0=週日, 1=週一, ..., 6=週六)
    },
  }),

  getters: {
    /**
     * Get display settings (pending if exists, otherwise current)
     */
    displaySettings: (state) => {
      return state.pomodoro.pending || state.pomodoro.current
    },

    /**
     * Get effective settings for pomodoro timer
     */
    effectiveSettings: (state) => {
      return state.pomodoro.current
    },

    /**
     * Check if there are pending changes
     */
    hasPendingChanges: (state) => {
      return state.pomodoro.pending !== null
    },
  },

  actions: {
    /**
     * Apply pending settings if effective date has arrived
     */
    applyPendingIfReady() {
      if (!this.pomodoro.pending || !this.pomodoro.pendingEffectiveDate) {
        return false
      }

      const today = getTodayString()
      if (today >= this.pomodoro.pendingEffectiveDate) {
        this.pomodoro.current = { ...this.pomodoro.pending }
        this.pomodoro.pending = null
        this.pomodoro.pendingEffectiveDate = null
        return true
      }

      return false
    },

    /**
     * Update pomodoro settings
     * @param {Object} settings - New settings
     * @param {boolean} immediate - If true, apply immediately; if false, apply tomorrow
     */
    updatePomodoroSettings(settings, immediate = false) {
      if (immediate) {
        // Apply immediately
        this.pomodoro.current = { ...settings }
        this.pomodoro.pending = null
        this.pomodoro.pendingEffectiveDate = null
      } else {
        // Schedule for tomorrow
        this.pomodoro.pending = { ...settings }
        this.pomodoro.pendingEffectiveDate = getTomorrowString()
      }
      this.isSynced = false
    },

    /**
     * Update meeting reminder minutes
     * @param {number} minutes - Minutes before meeting to show reminder
     */
    updateMeetingReminderMinutes(minutes) {
      this.meetingReminderMinutes = minutes
      this.isSynced = false
    },

    /**
     * Update meeting warning thresholds
     * @param {Object} thresholds - { yellow: number, red: number }
     */
    updateMeetingWarningThreshold(thresholds) {
      this.meetingWarningThreshold = { ...this.meetingWarningThreshold, ...thresholds }
      this.isSynced = false
    },

    /**
     * Update time settings
     * @param {Object} settings - Time settings object
     */
    updateTimeSettings(settings) {
      this.timeSettings = { ...this.timeSettings, ...settings }
      this.isSynced = false
    },

    /**
     * Upload settings to cloud
     */
    async uploadSettings() {
      const data = {
        pomodoro: {
          current: this.pomodoro.current,
          pending: this.pomodoro.pending,
          pendingEffectiveDate: this.pomodoro.pendingEffectiveDate,
        },
        meetingReminderMinutes: this.meetingReminderMinutes,
        meetingWarningThreshold: this.meetingWarningThreshold,
        timeSettings: this.timeSettings,
      }

      const base64 = btoa(JSON.stringify(data))
      await updateUserSettings(base64)

      this.isSynced = true
    },

    /**
     * Download settings from cloud
     */
    async downloadSettings() {
      const result = await getUserSettings()

      if (!result.settings_data) {
        return false
      }

      try {
        const data = JSON.parse(atob(result.settings_data))

        if (data.pomodoro) {
          if (data.pomodoro.current) {
            this.pomodoro.current = data.pomodoro.current
          }
          if (data.pomodoro.pending) {
            this.pomodoro.pending = data.pomodoro.pending
          }
          if (data.pomodoro.pendingEffectiveDate) {
            this.pomodoro.pendingEffectiveDate = data.pomodoro.pendingEffectiveDate
          }
        }

        if (data.meetingReminderMinutes !== undefined) {
          this.meetingReminderMinutes = data.meetingReminderMinutes
        }

        if (data.meetingWarningThreshold) {
          this.meetingWarningThreshold = { ...this.meetingWarningThreshold, ...data.meetingWarningThreshold }
        }

        if (data.timeSettings) {
          this.timeSettings = { ...this.timeSettings, ...data.timeSettings }
        }

        this.isSynced = true

        // Check and apply pending settings
        this.applyPendingIfReady()

        return true
      } catch {
        console.error('Failed to parse settings data')
        return false
      }
    },
  },

  persist: true,
})
