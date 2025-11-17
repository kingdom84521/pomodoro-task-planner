/**
 * Timer Service - Pure functions for timer calculations
 */

export interface TimerState {
  duration: number; // Total duration in milliseconds
  elapsed: number; // Elapsed time in milliseconds
  remaining: number; // Remaining time in milliseconds
  isRunning: boolean;
  isPaused: boolean;
}

/**
 * Calculate remaining time
 */
export function calculateRemaining(duration: number, elapsed: number): number {
  const remaining = duration - elapsed;
  return remaining > 0 ? remaining : 0;
}

/**
 * Calculate elapsed time from start
 */
export function calculateElapsed(startTime: Date, currentTime: Date = new Date()): number {
  return currentTime.getTime() - startTime.getTime();
}

/**
 * Check if timer has ended
 */
export function hasTimerEnded(duration: number, elapsed: number): boolean {
  return elapsed >= duration;
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(duration: number, elapsed: number): number {
  if (duration === 0) return 0;
  const progress = (elapsed / duration) * 100;
  return Math.min(progress, 100);
}

/**
 * Format milliseconds to MM:SS format
 */
export function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Get timer state
 */
export function getTimerState(
  startTime: Date,
  duration: number,
  currentTime: Date = new Date()
): TimerState {
  const elapsed = calculateElapsed(startTime, currentTime);
  const remaining = calculateRemaining(duration, elapsed);
  const isRunning = !hasTimerEnded(duration, elapsed);

  return {
    duration,
    elapsed,
    remaining,
    isRunning,
    isPaused: false,
  };
}

/**
 * Calculate end time
 */
export function calculateEndTime(startTime: Date, duration: number): Date {
  return new Date(startTime.getTime() + duration);
}

/**
 * Validate duration
 */
export function isValidDuration(duration: number): boolean {
  const MIN_DURATION = 60000; // 1 minute
  const MAX_DURATION = 7200000; // 2 hours
  return duration >= MIN_DURATION && duration <= MAX_DURATION;
}

export default {
  calculateRemaining,
  calculateElapsed,
  hasTimerEnded,
  calculateProgress,
  formatTime,
  getTimerState,
  calculateEndTime,
  isValidDuration,
};
