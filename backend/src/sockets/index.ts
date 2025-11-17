/**
 * Socket.io exports
 * Central export point for all Socket.io functionality
 */

export {
  initializePomodoroSocket,
  startPomodoroTimer,
  stopPomodoroTimer,
  emitPomodoroPaused,
  emitPomodoroResumed,
  getActiveTimers,
  cleanupAllTimers,
} from './pomodoroSocket';

export {
  emitNotificationToUser,
  emitPomodoroCompleteNotification,
  emitBreakTimeNotification,
  emitTaskCompleteNotification,
  emitDailyGoalNotification,
  emitOverdueTasksNotification,
  emitErrorNotification,
} from './notificationSocket';

export type { Notification } from './notificationSocket';
export type { AuthenticatedSocket, JwtPayload } from './pomodoroSocket';
