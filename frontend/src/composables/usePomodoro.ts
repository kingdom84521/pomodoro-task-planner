import { computed, watch, onBeforeUnmount } from 'vue';
import { usePomodoroStore } from '../stores/pomodoroStore';
import {
  startPomodoro as startPomodoroApi,
  completePomodoro as completePomodoroApi,
  pausePomodoro as pausePomodoroApi,
  getActiveSession as getActiveSessionApi,
  getPomodoroSessions as getPomodoroSessionsApi,
  getSuggestedBreak as getSuggestedBreakApi,
} from '../services/pomodoroApi';
import type { StartPomodoroInput } from '../services/pomodoroApi';

/**
 * Composable for Pomodoro timer operations
 * Provides reactive timer state and session management
 */
export function usePomodoro() {
  const pomodoroStore = usePomodoroStore();

  // Computed properties
  const activeSession = computed(() => pomodoroStore.activeSession);
  const sessions = computed(() => pomodoroStore.sessions);
  const timerState = computed(() => pomodoroStore.timerState);
  const breakTimerState = computed(() => pomodoroStore.breakTimerState);
  const isTimerRunning = computed(() => pomodoroStore.isTimerRunning);
  const hasActiveSession = computed(() => pomodoroStore.hasActiveSession);
  const hasActiveBreak = computed(() => pomodoroStore.hasActiveBreak);
  const completedSessionsToday = computed(() => pomodoroStore.completedSessionsToday);
  const formattedRemaining = computed(() => pomodoroStore.formattedRemaining);
  const formattedElapsed = computed(() => pomodoroStore.formattedElapsed);
  const formattedBreakRemaining = computed(() => pomodoroStore.formattedBreakRemaining);
  const isLoading = computed(() => pomodoroStore.loading);
  const error = computed(() => pomodoroStore.error);

  /**
   * Start a new Pomodoro session
   */
  const startPomodoro = async (input: StartPomodoroInput): Promise<void> => {
    pomodoroStore.setLoading(true);
    pomodoroStore.clearError();

    try {
      await startPomodoroApi(input);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start Pomodoro';
      pomodoroStore.setError(errorMessage);
      throw error;
    } finally {
      pomodoroStore.setLoading(false);
    }
  };

  /**
   * Complete the current Pomodoro session
   */
  const completePomodoro = async (): Promise<void> => {
    if (!activeSession.value) {
      throw new Error('No active session to complete');
    }

    pomodoroStore.setLoading(true);
    pomodoroStore.clearError();

    try {
      await completePomodoroApi({
        sessionId: activeSession.value._id,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete Pomodoro';
      pomodoroStore.setError(errorMessage);
      throw error;
    } finally {
      pomodoroStore.setLoading(false);
    }
  };

  /**
   * Pause the current Pomodoro session
   */
  const pausePomodoro = async (): Promise<void> => {
    if (!activeSession.value) {
      throw new Error('No active session to pause');
    }

    pomodoroStore.setLoading(true);
    pomodoroStore.clearError();

    try {
      pomodoroStore.pauseTimer();
      await pausePomodoroApi({
        sessionId: activeSession.value._id,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to pause Pomodoro';
      pomodoroStore.setError(errorMessage);
      throw error;
    } finally {
      pomodoroStore.setLoading(false);
    }
  };

  /**
   * Resume a paused Pomodoro session
   */
  const resumePomodoro = (): void => {
    if (!activeSession.value) {
      throw new Error('No active session to resume');
    }

    pomodoroStore.resumeTimer();
  };

  /**
   * Fetch the active session from server
   */
  const fetchActiveSession = async (): Promise<void> => {
    pomodoroStore.setLoading(true);
    pomodoroStore.clearError();

    try {
      await getActiveSessionApi();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch active session';
      pomodoroStore.setError(errorMessage);
      throw error;
    } finally {
      pomodoroStore.setLoading(false);
    }
  };

  /**
   * Fetch Pomodoro session history
   */
  const fetchSessions = async (params?: { taskId?: string; startDate?: Date | string; endDate?: Date | string }): Promise<void> => {
    pomodoroStore.setLoading(true);
    pomodoroStore.clearError();

    try {
      await getPomodoroSessionsApi(params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch sessions';
      pomodoroStore.setError(errorMessage);
      throw error;
    } finally {
      pomodoroStore.setLoading(false);
    }
  };

  /**
   * Get suggested break duration
   */
  const fetchSuggestedBreak = async () => {
    pomodoroStore.setLoading(true);
    pomodoroStore.clearError();

    try {
      return await getSuggestedBreakApi();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch suggested break';
      pomodoroStore.setError(errorMessage);
      throw error;
    } finally {
      pomodoroStore.setLoading(false);
    }
  };

  /**
   * Handle timer completion
   */
  const handleTimerComplete = () => {
    // Timer has reached 0, auto-complete the session
    if (activeSession.value && timerState.value.remaining <= 0) {
      completePomodoro().catch((error) => {
        console.error('Auto-complete failed:', error);
      });
    }
  };

  // Watch timer state for completion
  watch(
    () => timerState.value.remaining,
    (remaining) => {
      if (remaining === 0 && activeSession.value) {
        handleTimerComplete();
      }
    }
  );

  // Cleanup on unmount
  onBeforeUnmount(() => {
    // Timer cleanup is handled by the store
  });

  /**
   * Start break timer
   */
  const startBreak = (type: 'short' | 'long', duration: number): void => {
    pomodoroStore.startBreakTimer(type, duration);
  };

  /**
   * Stop break timer
   */
  const stopBreak = (): void => {
    pomodoroStore.stopBreakTimer();
  };

  /**
   * Extend break by duration
   */
  const extendBreak = (additionalDuration: number): void => {
    if (breakTimerState.value.type) {
      const newDuration = breakTimerState.value.remaining + additionalDuration;
      pomodoroStore.startBreakTimer(breakTimerState.value.type, newDuration);
    }
  };

  return {
    // State
    activeSession,
    sessions,
    timerState,
    breakTimerState,
    isTimerRunning,
    hasActiveSession,
    hasActiveBreak,
    completedSessionsToday,
    formattedRemaining,
    formattedElapsed,
    formattedBreakRemaining,
    isLoading,
    error,

    // Actions
    startPomodoro,
    completePomodoro,
    pausePomodoro,
    resumePomodoro,
    fetchActiveSession,
    fetchSessions,
    fetchSuggestedBreak,
    handleTimerComplete,
    startBreak,
    stopBreak,
    extendBreak,
  };
}
