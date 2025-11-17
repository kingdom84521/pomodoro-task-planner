import { Task } from '../../models/Task';
import { PomodoroSession } from '../../models/PomodoroSession';
import mongoose from 'mongoose';

export interface CompletionRateMetrics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completionRate: number; // Percentage
}

export interface PomodoroAccuracyMetrics {
  totalCompletedTasks: number;
  estimatedTotal: number;
  actualTotal: number;
  accuracyRate: number; // Percentage
  averageDeviation: number; // Average difference between estimated and actual
}

export interface TimeDistributionMetrics {
  totalPomodoros: number;
  totalFocusTime: number; // milliseconds
  averageSessionDuration: number; // milliseconds
  mostProductiveHour?: number; // 0-23
  sessionsPerDay: { [date: string]: number };
}

/**
 * Calculate task completion rate
 */
export async function calculateCompletionRate(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<CompletionRateMetrics> {
  const tasks = await Task.find({
    userId,
    createdAt: { $gte: startDate, $lte: endDate },
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;

  const completionRate = totalTasks > 0
    ? (completedTasks / totalTasks) * 100
    : 0;

  return {
    totalTasks,
    completedTasks,
    pendingTasks,
    inProgressTasks,
    completionRate: Math.round(completionRate * 100) / 100,
  };
}

/**
 * Calculate Pomodoro estimation accuracy
 */
export async function calculatePomodoroAccuracy(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<PomodoroAccuracyMetrics> {
  const completedTasks = await Task.find({
    userId,
    status: 'completed',
    completedAt: { $gte: startDate, $lte: endDate },
  });

  const totalCompletedTasks = completedTasks.length;

  let estimatedTotal = 0;
  let actualTotal = 0;
  let totalDeviation = 0;

  completedTasks.forEach(task => {
    estimatedTotal += task.estimatedPomodoros || 0;
    actualTotal += task.actualPomodoros || 0;

    if (task.estimatedPomodoros && task.estimatedPomodoros > 0) {
      const deviation = Math.abs(
        (task.actualPomodoros || 0) - task.estimatedPomodoros
      );
      totalDeviation += deviation;
    }
  });

  const tasksWithEstimates = completedTasks.filter(
    t => t.estimatedPomodoros && t.estimatedPomodoros > 0
  ).length;

  const averageDeviation = tasksWithEstimates > 0
    ? totalDeviation / tasksWithEstimates
    : 0;

  const accuracyRate = estimatedTotal > 0
    ? 100 - ((Math.abs(actualTotal - estimatedTotal) / estimatedTotal) * 100)
    : 0;

  return {
    totalCompletedTasks,
    estimatedTotal,
    actualTotal,
    accuracyRate: Math.max(0, Math.round(accuracyRate * 100) / 100),
    averageDeviation: Math.round(averageDeviation * 100) / 100,
  };
}

/**
 * Calculate time distribution metrics
 */
export async function calculateTimeDistribution(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<TimeDistributionMetrics> {
  const sessions = await PomodoroSession.find({
    userId,
    startTime: { $gte: startDate, $lte: endDate },
    completed: true,
  });

  const totalPomodoros = sessions.length;
  const totalFocusTime = sessions.reduce((sum, session) => {
    return sum + (session.duration || 0);
  }, 0);

  const averageSessionDuration = totalPomodoros > 0
    ? totalFocusTime / totalPomodoros
    : 0;

  // Calculate sessions per day
  const sessionsPerDay: { [date: string]: number } = {};
  sessions.forEach(session => {
    const dateKey = session.startTime.toISOString().split('T')[0];
    sessionsPerDay[dateKey] = (sessionsPerDay[dateKey] || 0) + 1;
  });

  // Find most productive hour
  const hourCounts: { [hour: number]: number } = {};
  sessions.forEach(session => {
    const hour = session.startTime.getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  let mostProductiveHour: number | undefined;
  let maxCount = 0;
  Object.entries(hourCounts).forEach(([hour, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostProductiveHour = parseInt(hour);
    }
  });

  return {
    totalPomodoros,
    totalFocusTime,
    averageSessionDuration: Math.round(averageSessionDuration),
    mostProductiveHour,
    sessionsPerDay,
  };
}
