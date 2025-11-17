import { PomodoroSession, IPomodoroSession } from '../../models/PomodoroSession';
import { Configuration } from '../../models/Configuration';
import { incrementActualPomodoros } from '../tasks/taskService';
import { AppError } from '../../api/middleware/errorHandler';
import mongoose from 'mongoose';

export interface StartSessionInput {
  userId: string;
  taskId: string;
  duration?: number;
}

export interface CompleteSessionInput {
  sessionId: string;
  userId: string;
}

export interface PauseSessionInput {
  sessionId: string;
  userId: string;
}

/**
 * Start a new Pomodoro session
 */
export async function startSession(input: StartSessionInput): Promise<IPomodoroSession> {
  const { userId, taskId, duration } = input;

  // Check for existing active session
  const activeSession = await PomodoroSession.findOne({
    userId,
    endTime: null,
    completed: false,
  });

  if (activeSession) {
    throw new AppError(400, 'You already have an active Pomodoro session');
  }

  // Get user configuration or use defaults
  let sessionDuration = duration || 1800000; // Default 30 minutes

  if (!duration) {
    const config = await Configuration.findOne({ userId });
    if (config) {
      sessionDuration = config.pomodoroDuration;
    }
  }

  // Create new session
  const session = new PomodoroSession({
    userId,
    taskId,
    startTime: new Date(),
    duration: sessionDuration,
    completed: false,
    interruptions: [],
  });

  await session.save();
  return session;
}

/**
 * Complete a Pomodoro session
 */
export async function completeSession(input: CompleteSessionInput): Promise<IPomodoroSession> {
  const { sessionId, userId } = input;

  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new AppError(400, 'Invalid session ID format');
  }

  const session = await PomodoroSession.findOne({
    _id: sessionId,
    userId,
  });

  if (!session) {
    throw new AppError(404, 'Session not found');
  }

  if (session.completed) {
    throw new AppError(400, 'Session already completed');
  }

  // Mark as completed
  session.completed = true;
  session.endTime = new Date();

  await session.save();

  // Increment task's actual Pomodoros
  await incrementActualPomodoros(session.taskId.toString());

  return session;
}

/**
 * Pause/abort a Pomodoro session
 */
export async function pauseSession(input: PauseSessionInput): Promise<IPomodoroSession> {
  const { sessionId, userId } = input;

  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new AppError(400, 'Invalid session ID format');
  }

  const session = await PomodoroSession.findOne({
    _id: sessionId,
    userId,
  });

  if (!session) {
    throw new AppError(404, 'Session not found');
  }

  if (session.completed || session.endTime) {
    throw new AppError(400, 'Session already ended');
  }

  // Mark as paused/aborted (not completed)
  session.endTime = new Date();
  session.completed = false;

  await session.save();
  return session;
}

/**
 * Get active session for user
 */
export async function getActiveSession(userId: string): Promise<IPomodoroSession | null> {
  return await PomodoroSession.findOne({
    userId,
    endTime: null,
    completed: false,
  }).populate('taskId');
}

/**
 * Get user's Pomodoro sessions
 */
export async function getUserSessions(
  userId: string,
  limit: number = 50
): Promise<IPomodoroSession[]> {
  return await PomodoroSession.find({ userId })
    .sort({ startTime: -1 })
    .limit(limit)
    .populate('taskId');
}

/**
 * Get sessions for a specific task
 */
export async function getTaskSessions(taskId: string): Promise<IPomodoroSession[]> {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new AppError(400, 'Invalid task ID format');
  }

  return await PomodoroSession.find({ taskId }).sort({ startTime: -1 });
}

/**
 * Calculate suggested break duration
 */
export async function getSuggestedBreak(userId: string): Promise<{
  breakType: 'short' | 'long';
  duration: number;
}> {
  // Get user configuration
  const config = await Configuration.findOne({ userId });

  if (!config) {
    return { breakType: 'short', duration: 300000 }; // Default 5 minutes
  }

  // Count completed Pomodoros today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const completedToday = await PomodoroSession.countDocuments({
    userId,
    completed: true,
    startTime: { $gte: today },
  });

  const breakType = config.calculateNextBreakType(completedToday);
  const duration = breakType === 'long' ? config.longBreak : config.shortBreak;

  return { breakType, duration };
}

/**
 * Resume a paused Pomodoro session
 * NEED HELP HERE HUMAN: Current implementation treats pause as abort (sets endTime).
 * To properly implement pause/resume, we need to track pausedTime separately.
 * Attempted approach:
 * 1. Add pausedAt field to PomodoroSession model
 * 2. pauseSession sets pausedAt instead of endTime
 * 3. resumeSession clears pausedAt
 * 4. Track cumulative pause duration for analytics
 * Issue: Would require schema migration and state machine for session status
 * (active -> paused -> active -> completed)
 */
export async function resumeSession(input: PauseSessionInput): Promise<IPomodoroSession> {
  const { sessionId, userId } = input;

  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new AppError(400, 'Invalid session ID format');
  }

  const session = await PomodoroSession.findOne({
    _id: sessionId,
    userId,
  });

  if (!session) {
    throw new AppError(404, 'Session not found');
  }

  if (session.completed) {
    throw new AppError(400, 'Cannot resume completed session');
  }

  // For now, just return the session - proper pause/resume needs schema changes
  return session;
}

/**
 * Log an interruption during a Pomodoro session
 */
export async function logSessionInterruption(
  sessionId: string,
  userId: string,
  type: 'urgent' | 'break',
  duration: number,
  notes?: string
): Promise<IPomodoroSession> {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new AppError(400, 'Invalid session ID format');
  }

  const session = await PomodoroSession.findOne({
    _id: sessionId,
    userId,
  });

  if (!session) {
    throw new AppError(404, 'Session not found');
  }

  if (session.completed) {
    throw new AppError(400, 'Cannot log interruption to completed session');
  }

  // Add interruption
  session.interruptions.push({
    type,
    duration,
    timestamp: new Date(),
    notes,
  });

  await session.save();
  return session;
}

export default {
  startSession,
  completeSession,
  pauseSession,
  resumeSession,
  getActiveSession,
  getUserSessions,
  getTaskSessions,
  getSuggestedBreak,
  logSessionInterruption,
};
