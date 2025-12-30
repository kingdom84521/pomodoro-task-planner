import { defineStore } from 'pinia'
import { useUserSettingsStore } from './userSettings.js'

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayString() {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

export const usePomodoroStore = defineStore('pomodoro', {
  state: () => ({
    // Current task (previously currentPomodoroTask)
    currentTask: null,

    // Timer state (previously pomodoroTimerState)
    timer: {
      status: 'idle',     // 'idle' | 'timing' | 'paused'
      mode: 'focus',      // 'focus' | 'short-break' | 'long-break'
      duration: 0,        // Elapsed time in seconds
      total: 1500,        // Total time in seconds
      startedAt: null,    // Timestamp when timer was started
    },

    // Session tracking
    session: {
      validDate: null,    // YYYY-MM-DD
      completedFocusCount: 0,
    },
  }),

  getters: {
    /**
     * Get current focus duration from settings
     */
    focusDuration() {
      const settingsStore = useUserSettingsStore()
      return settingsStore.effectiveSettings.focusDuration
    },

    /**
     * Get current short break duration from settings
     */
    shortBreakDuration() {
      const settingsStore = useUserSettingsStore()
      return settingsStore.effectiveSettings.shortBreakDuration
    },

    /**
     * Get current long break duration from settings
     */
    longBreakDuration() {
      const settingsStore = useUserSettingsStore()
      return settingsStore.effectiveSettings.longBreakDuration
    },

    /**
     * Get long break interval from settings
     */
    longBreakInterval() {
      const settingsStore = useUserSettingsStore()
      return settingsStore.effectiveSettings.longBreakInterval
    },

    /**
     * Determine next break mode based on completed focus count
     */
    nextBreakMode(state) {
      const interval = this.longBreakInterval
      // After completing interval number of focus sessions, take long break
      if ((state.session.completedFocusCount + 1) % interval === 0) {
        return 'long-break'
      }
      return 'short-break'
    },

    /**
     * Get duration for current mode
     */
    currentModeDuration(state) {
      switch (state.timer.mode) {
        case 'focus':
          return this.focusDuration
        case 'short-break':
          return this.shortBreakDuration
        case 'long-break':
          return this.longBreakDuration
        default:
          return this.focusDuration
      }
    },

    /**
     * Check if there's an active task
     */
    hasTask: (state) => state.currentTask !== null,

    /**
     * Check if timer is running
     */
    isRunning: (state) => state.timer.status === 'timing',

    /**
     * Check if timer is paused
     */
    isPaused: (state) => state.timer.status === 'paused',

    /**
     * Check if timer is idle
     */
    isIdle: (state) => state.timer.status === 'idle',
  },

  actions: {
    /**
     * Set current task
     */
    setCurrentTask(task) {
      this.currentTask = task
    },

    /**
     * Clear current task
     */
    clearCurrentTask() {
      this.currentTask = null
    },

    /**
     * Check and reset session if date has changed
     */
    checkAndResetSession() {
      const today = getTodayString()
      if (this.session.validDate !== today) {
        this.session.validDate = today
        this.session.completedFocusCount = 0
      }
    },

    /**
     * Increment completed focus count
     */
    incrementFocusCount() {
      this.checkAndResetSession()
      this.session.completedFocusCount++
    },

    /**
     * Start timer
     */
    startTimer() {
      this.timer.status = 'timing'
      this.timer.startedAt = Date.now()
      this.timer.total = this.currentModeDuration
    },

    /**
     * Pause timer
     */
    pauseTimer(duration) {
      this.timer.status = 'paused'
      this.timer.duration = duration
      this.timer.startedAt = null
    },

    /**
     * Reset timer to idle
     */
    resetTimer() {
      this.timer.status = 'idle'
      this.timer.mode = 'focus'
      this.timer.duration = 0
      this.timer.total = this.focusDuration
      this.timer.startedAt = null
    },

    /**
     * Complete focus and switch to break mode
     */
    completeFocus() {
      this.incrementFocusCount()
      const breakMode = this.nextBreakMode
      this.timer.mode = breakMode
      this.timer.status = 'idle'
      this.timer.duration = 0
      this.timer.total = breakMode === 'long-break'
        ? this.longBreakDuration
        : this.shortBreakDuration
      this.timer.startedAt = null
    },

    /**
     * Complete break and switch to focus mode
     */
    completeBreak() {
      this.timer.mode = 'focus'
      this.timer.status = 'idle'
      this.timer.duration = 0
      this.timer.total = this.focusDuration
      this.timer.startedAt = null
    },

    /**
     * Set timer mode
     */
    setMode(mode) {
      this.timer.mode = mode
      switch (mode) {
        case 'focus':
          this.timer.total = this.focusDuration
          break
        case 'short-break':
          this.timer.total = this.shortBreakDuration
          break
        case 'long-break':
          this.timer.total = this.longBreakDuration
          break
      }
    },

    /**
     * Update timer state for restoration
     */
    restoreTimer(status, duration, total, startedAt, mode = 'focus') {
      this.timer.status = status
      this.timer.duration = duration
      this.timer.total = total
      this.timer.startedAt = startedAt
      this.timer.mode = mode
    },
  },

  persist: true,
})
