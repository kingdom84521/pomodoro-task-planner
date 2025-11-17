import { PomodoroSession } from '../../models/PomodoroSession';
import logger from '../../utils/logger';

/**
 * Log an interruption to a Pomodoro session
 * @param sessionId - ID of the Pomodoro session
 * @param type - Type of interruption ('urgent' or 'break')
 * @param duration - Duration of interruption in milliseconds
 * @param notes - Optional notes about the interruption
 * @returns Updated Pomodoro session
 */
export const logInterruption = async (
  sessionId: string,
  type: 'urgent' | 'break',
  duration: number,
  notes?: string
) => {
  const session = await PomodoroSession.findById(sessionId);

  if (!session) {
    throw new Error('Pomodoro session not found');
  }

  if (session.completed) {
    throw new Error('Cannot log interruption to completed session');
  }

  // Add interruption to session
  session.interruptions.push({
    type,
    duration,
    timestamp: new Date(),
    notes,
  });

  await session.save();

  logger.info(`Interruption logged for session ${sessionId}`, {
    sessionId,
    type,
    duration,
  });

  return session;
};

/**
 * Calculate interruption statistics for a user over a time range
 * @param userId - ID of the user
 * @param startDate - Start of time range
 * @param endDate - End of time range
 * @returns Interruption statistics
 */
export const calculateInterruptionStats = async (
  userId: string,
  startDate: Date,
  endDate: Date
) => {
  const sessions = await PomodoroSession.find({
    userId,
    startTime: { $gte: startDate, $lte: endDate },
  });

  let totalInterruptions = 0;
  let urgentInterruptions = 0;
  let breakInterruptions = 0;
  let totalInterruptionDuration = 0;

  sessions.forEach((session) => {
    session.interruptions.forEach((interruption) => {
      totalInterruptions++;
      totalInterruptionDuration += interruption.duration;

      if (interruption.type === 'urgent') {
        urgentInterruptions++;
      } else if (interruption.type === 'break') {
        breakInterruptions++;
      }
    });
  });

  const averageInterruptionsPerSession =
    sessions.length > 0 ? totalInterruptions / sessions.length : 0;

  const averageInterruptionDuration =
    totalInterruptions > 0 ? totalInterruptionDuration / totalInterruptions : 0;

  return {
    totalInterruptions,
    urgentInterruptions,
    breakInterruptions,
    averageInterruptionsPerSession,
    averageInterruptionDuration,
    totalInterruptionDuration,
    sessionsAnalyzed: sessions.length,
  };
};

/**
 * Get interruption frequency by time of day
 * @param userId - ID of the user
 * @param startDate - Start of time range
 * @param endDate - End of time range
 * @returns Interruption frequency distribution by hour
 */
export const getInterruptionFrequencyByHour = async (
  userId: string,
  startDate: Date,
  endDate: Date
) => {
  const sessions = await PomodoroSession.find({
    userId,
    startTime: { $gte: startDate, $lte: endDate },
  });

  // Initialize hourly buckets (0-23)
  const hourlyFrequency = Array.from({ length: 24 }, () => ({
    hour: 0,
    count: 0,
    duration: 0,
  }));

  hourlyFrequency.forEach((_, index) => {
    hourlyFrequency[index].hour = index;
  });

  sessions.forEach((session) => {
    session.interruptions.forEach((interruption) => {
      const hour = interruption.timestamp.getHours();
      hourlyFrequency[hour].count++;
      hourlyFrequency[hour].duration += interruption.duration;
    });
  });

  return hourlyFrequency;
};

/**
 * Identify most common interruption patterns
 * @param userId - ID of the user
 * @param startDate - Start of time range
 * @param endDate - End of time range
 * @param limit - Maximum number of patterns to return
 * @returns Common interruption patterns
 */
export const identifyInterruptionPatterns = async (
  userId: string,
  startDate: Date,
  endDate: Date,
  limit: number = 5
) => {
  const sessions = await PomodoroSession.find({
    userId,
    startTime: { $gte: startDate, $lte: endDate },
  });

  // Count interruptions by notes (if provided)
  const patternMap = new Map<string, number>();

  sessions.forEach((session) => {
    session.interruptions.forEach((interruption) => {
      if (interruption.notes) {
        const count = patternMap.get(interruption.notes) || 0;
        patternMap.set(interruption.notes, count + 1);
      }
    });
  });

  // Sort by frequency and get top patterns
  const patterns = Array.from(patternMap.entries())
    .map(([pattern, count]) => ({ pattern, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return patterns;
};
