import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';

export interface Notification {
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
  title?: string;
  timestamp: string;
  data?: Record<string, any>;
}

/**
 * Emit a notification to a specific user
 */
export function emitNotificationToUser(
  io: SocketIOServer,
  userId: string,
  notification: Notification
): void {
  const notificationWithTimestamp: Notification = {
    ...notification,
    timestamp: notification.timestamp || new Date().toISOString(),
  };

  io.to(`user:${userId}`).emit('notification', notificationWithTimestamp);

  logger.info('Notification emitted to user', {
    userId,
    type: notification.type,
    message: notification.message,
  });
}

/**
 * Emit a Pomodoro completion notification
 */
export function emitPomodoroCompleteNotification(
  io: SocketIOServer,
  userId: string,
  taskName: string
): void {
  const notification: Notification = {
    type: 'success',
    title: 'Pomodoro Complete!',
    message: `You've completed a Pomodoro for: ${taskName}. Time for a break!`,
    timestamp: new Date().toISOString(),
  };

  emitNotificationToUser(io, userId, notification);
}

/**
 * Emit a break time notification
 */
export function emitBreakTimeNotification(
  io: SocketIOServer,
  userId: string,
  breakType: 'short' | 'long',
  duration: number
): void {
  const minutes = Math.floor(duration / 60000);
  const breakTypeName = breakType === 'short' ? 'Short Break' : 'Long Break';

  const notification: Notification = {
    type: 'info',
    title: `${breakTypeName} Time`,
    message: `Take a ${minutes}-minute ${breakType} break to recharge.`,
    timestamp: new Date().toISOString(),
    data: {
      breakType,
      duration,
    },
  };

  emitNotificationToUser(io, userId, notification);
}

/**
 * Emit a task completion notification
 */
export function emitTaskCompleteNotification(
  io: SocketIOServer,
  userId: string,
  taskName: string,
  actualPomodoros: number
): void {
  const notification: Notification = {
    type: 'success',
    title: 'Task Complete!',
    message: `Congratulations! You've completed "${taskName}" in ${actualPomodoros} Pomodoros.`,
    timestamp: new Date().toISOString(),
    data: {
      taskName,
      actualPomodoros,
    },
  };

  emitNotificationToUser(io, userId, notification);
}

/**
 * Emit a daily goal notification
 */
export function emitDailyGoalNotification(
  io: SocketIOServer,
  userId: string,
  completedToday: number,
  goal: number
): void {
  const notification: Notification = {
    type: 'info',
    title: 'Daily Goal Progress',
    message: `You've completed ${completedToday} out of ${goal} Pomodoros today. Keep it up!`,
    timestamp: new Date().toISOString(),
    data: {
      completedToday,
      goal,
      progress: Math.min(100, (completedToday / goal) * 100),
    },
  };

  emitNotificationToUser(io, userId, notification);
}

/**
 * Emit a reminder notification for overdue tasks
 */
export function emitOverdueTasksNotification(
  io: SocketIOServer,
  userId: string,
  overdueCount: number
): void {
  const notification: Notification = {
    type: 'warning',
    title: 'Overdue Tasks',
    message: `You have ${overdueCount} overdue ${overdueCount === 1 ? 'task' : 'tasks'}. Consider updating your priorities.`,
    timestamp: new Date().toISOString(),
    data: {
      overdueCount,
    },
  };

  emitNotificationToUser(io, userId, notification);
}

/**
 * Emit a generic error notification
 */
export function emitErrorNotification(
  io: SocketIOServer,
  userId: string,
  errorMessage: string,
  title: string = 'Error'
): void {
  const notification: Notification = {
    type: 'error',
    title,
    message: errorMessage,
    timestamp: new Date().toISOString(),
  };

  emitNotificationToUser(io, userId, notification);
}

export default {
  emitNotificationToUser,
  emitPomodoroCompleteNotification,
  emitBreakTimeNotification,
  emitTaskCompleteNotification,
  emitDailyGoalNotification,
  emitOverdueTasksNotification,
  emitErrorNotification,
};
