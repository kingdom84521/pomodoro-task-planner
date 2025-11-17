import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface Interruption {
  type: 'urgent' | 'break';
  duration: number;
  timestamp: string;
  notes?: string;
}

export interface PomodoroSession {
  _id: string;
  userId: string;
  taskId: string;
  startTime: string;
  endTime?: string;
  duration: number;
  completed: boolean;
  interruptions: Interruption[];
  createdAt: string;
  updatedAt: string;
}

export interface TimerState {
  remaining: number; // milliseconds
  elapsed: number; // milliseconds
  progress: number; // percentage 0-100
  isRunning: boolean;
  isPaused: boolean;
}

export interface BreakTimerState {
  type: 'short' | 'long' | null;
  duration: number; // milliseconds
  remaining: number; // milliseconds
  isRunning: boolean;
}

export const usePomodoroStore = defineStore('pomodoro', () => {
  // State
  const activeSession = ref<PomodoroSession | null>(null);
  const sessions = ref<PomodoroSession[]>([]);
  const timerState = ref<TimerState>({
    remaining: 0,
    elapsed: 0,
    progress: 0,
    isRunning: false,
    isPaused: false,
  });
  const breakTimerState = ref<BreakTimerState>({
    type: null,
    duration: 0,
    remaining: 0,
    isRunning: false,
  });
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Timer interval IDs
  let timerInterval: number | null = null;
  let breakTimerInterval: number | null = null;

  // Getters
  const hasActiveSession = computed(() => !!activeSession.value);
  const isTimerRunning = computed(() => timerState.value.isRunning);
  const currentTaskId = computed(() => activeSession.value?.taskId || null);

  const completedSessionsToday = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return sessions.value.filter(s => {
      const sessionDate = new Date(s.startTime);
      return s.completed && sessionDate >= today;
    }).length;
  });

  const totalPomodorosCompleted = computed(() => {
    return sessions.value.filter(s => s.completed).length;
  });

  // Actions
  const setActiveSession = (session: PomodoroSession | null): void => {
    activeSession.value = session;
    if (session) {
      startTimerTicking(session);
    } else {
      stopTimerTicking();
    }
  };

  const updateTimerState = (updates: Partial<TimerState>): void => {
    timerState.value = { ...timerState.value, ...updates };
  };

  const startTimerTicking = (session: PomodoroSession): void => {
    stopTimerTicking(); // Clear any existing timer

    const startTime = new Date(session.startTime).getTime();
    const duration = session.duration;

    const tick = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = Math.max(0, duration - elapsed);
      const progress = Math.min(100, (elapsed / duration) * 100);

      updateTimerState({
        elapsed,
        remaining,
        progress,
        isRunning: remaining > 0,
        isPaused: false,
      });

      // Stop timer when complete
      if (remaining <= 0) {
        stopTimerTicking();
      }
    };

    // Initial tick
    tick();

    // Update every second
    timerInterval = window.setInterval(tick, 1000);
  };

  const stopTimerTicking = (): void => {
    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    updateTimerState({
      isRunning: false,
    });
  };

  const pauseTimer = (): void => {
    stopTimerTicking();
    updateTimerState({
      isPaused: true,
      isRunning: false,
    });
  };

  const resumeTimer = (): void => {
    if (activeSession.value) {
      startTimerTicking(activeSession.value);
      updateTimerState({
        isPaused: false,
      });
    }
  };

  const addSession = (session: PomodoroSession): void => {
    sessions.value.unshift(session);
  };

  const updateSession = (sessionId: string, updates: Partial<PomodoroSession>): void => {
    const index = sessions.value.findIndex(s => s._id === sessionId);
    if (index !== -1) {
      sessions.value[index] = { ...sessions.value[index], ...updates };
    }
  };

  const setSessions = (newSessions: PomodoroSession[]): void => {
    sessions.value = newSessions;
  };

  const setLoading = (isLoading: boolean): void => {
    loading.value = isLoading;
  };

  const setError = (errorMessage: string | null): void => {
    error.value = errorMessage;
  };

  const clearError = (): void => {
    error.value = null;
  };

  // Format time for display (MM:SS)
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formattedRemaining = computed(() => formatTime(timerState.value.remaining));
  const formattedElapsed = computed(() => formatTime(timerState.value.elapsed));
  const formattedBreakRemaining = computed(() => formatTime(breakTimerState.value.remaining));
  const hasActiveBreak = computed(() => breakTimerState.value.type !== null);

  // Break Timer Actions
  const startBreakTimer = (type: 'short' | 'long', duration: number): void => {
    stopBreakTimer(); // Clear any existing break timer

    breakTimerState.value = {
      type,
      duration,
      remaining: duration,
      isRunning: true,
    };

    const startTime = Date.now();

    const tick = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = Math.max(0, duration - elapsed);

      breakTimerState.value.remaining = remaining;
      breakTimerState.value.isRunning = remaining > 0;

      // Stop timer when complete
      if (remaining <= 0) {
        stopBreakTimer();
      }
    };

    // Initial tick
    tick();

    // Update every second
    breakTimerInterval = window.setInterval(tick, 1000);
  };

  const stopBreakTimer = (): void => {
    if (breakTimerInterval !== null) {
      clearInterval(breakTimerInterval);
      breakTimerInterval = null;
    }
    breakTimerState.value = {
      type: null,
      duration: 0,
      remaining: 0,
      isRunning: false,
    };
  };

  // Reset store
  const $reset = (): void => {
    stopTimerTicking();
    stopBreakTimer();
    activeSession.value = null;
    sessions.value = [];
    timerState.value = {
      remaining: 0,
      elapsed: 0,
      progress: 0,
      isRunning: false,
      isPaused: false,
    };
    breakTimerState.value = {
      type: null,
      duration: 0,
      remaining: 0,
      isRunning: false,
    };
    loading.value = false;
    error.value = null;
  };

  return {
    // State
    activeSession,
    sessions,
    timerState,
    breakTimerState,
    loading,
    error,

    // Getters
    hasActiveSession,
    isTimerRunning,
    currentTaskId,
    completedSessionsToday,
    totalPomodorosCompleted,
    formattedRemaining,
    formattedElapsed,
    formattedBreakRemaining,
    hasActiveBreak,

    // Actions
    setActiveSession,
    updateTimerState,
    startTimerTicking,
    stopTimerTicking,
    pauseTimer,
    resumeTimer,
    addSession,
    updateSession,
    setSessions,
    setLoading,
    setError,
    clearError,
    formatTime,
    startBreakTimer,
    stopBreakTimer,
    $reset,
  };
});
