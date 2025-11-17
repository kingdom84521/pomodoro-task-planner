/**
 * Format date for display
 */
export function formatDate(date: Date, timezone: string = 'UTC'): string {
  return date.toLocaleString('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
export function parseTimeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time format: ${timeString}. Expected HH:MM`);
  }
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
export function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Check if current time is within daily usage window
 */
export function isWithinDailyUsageWindow(
  timezone: string,
  dailyUsageStart?: string,
  dailyUsageEnd?: string
): boolean {
  if (!dailyUsageStart || !dailyUsageEnd) {
    return true; // No window restriction
  }

  const now = new Date();
  const localTime = now.toLocaleString('en-US', { timeZone: timezone, hour12: false });
  const timeMatch = localTime.match(/(\d+):(\d+):/);
  if (!timeMatch) return true;

  const currentMinutes = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);

  const startMinutes = parseTimeToMinutes(dailyUsageStart);
  const endMinutes = parseTimeToMinutes(dailyUsageEnd);

  // Handle overnight windows (e.g., 22:00 to 06:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Get start and end of day in user's timezone
 */
export function getDayBounds(date: Date, timezone: string = 'UTC'): { start: Date; end: Date } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const start = d;
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Get start and end of week in user's timezone
 */
export function getWeekBounds(date: Date, timezone: string = 'UTC'): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Get start and end of month in user's timezone
 */
export function getMonthBounds(date: Date, timezone: string = 'UTC'): { start: Date; end: Date } {
  const d = new Date(date);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Calculate duration between two dates in milliseconds
 */
export function calculateDuration(start: Date, end: Date): number {
  return end.getTime() - start.getTime();
}

/**
 * Add milliseconds to a date
 */
export function addMilliseconds(date: Date, milliseconds: number): Date {
  return new Date(date.getTime() + milliseconds);
}

/**
 * Format duration (milliseconds) to human-readable string
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export default {
  formatDate,
  parseTimeToMinutes,
  minutesToTimeString,
  isWithinDailyUsageWindow,
  getDayBounds,
  getWeekBounds,
  getMonthBounds,
  calculateDuration,
  addMilliseconds,
  formatDuration,
};
