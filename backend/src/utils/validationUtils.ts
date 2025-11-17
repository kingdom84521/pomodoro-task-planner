import mongoose from 'mongoose';

/**
 * Check if string is a valid MongoDB ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Validate email format (RFC 5322 simplified)
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Validate password strength
 * Requirements: min 8 chars, at least one letter and one number
 */
export function isValidPassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[a-zA-Z]/.test(password)) {
    errors.push('Password must contain at least one letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate timezone string (IANA timezone)
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validate time string format (HH:MM)
 */
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
}

/**
 * Sanitize string input (trim, remove excessive whitespace)
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

/**
 * Validate task status
 */
export function isValidTaskStatus(status: string): boolean {
  const validStatuses = ['pending', 'in-progress', 'completed'];
  return validStatuses.includes(status);
}

/**
 * Validate interruption type
 */
export function isValidInterruptionType(type: string): boolean {
  const validTypes = ['urgent', 'break'];
  return validTypes.includes(type);
}

/**
 * Validate positive integer
 */
export function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/**
 * Validate duration (milliseconds) within reasonable bounds
 */
export function isValidDuration(duration: number): boolean {
  const MIN_DURATION = 60000; // 1 minute
  const MAX_DURATION = 7200000; // 2 hours
  return duration >= MIN_DURATION && duration <= MAX_DURATION;
}

/**
 * Validate estimated Pomodoros count
 */
export function isValidPomodoroCount(count: number): boolean {
  return Number.isInteger(count) && count >= 1 && count <= 100;
}

/**
 * Validate date is in the future
 */
export function isFutureDate(date: Date): boolean {
  return date > new Date();
}

/**
 * Validate date range
 */
export function isValidDateRange(startDate: Date, endDate: Date): boolean {
  return startDate < endDate;
}

/**
 * Create validation error object
 */
export function createValidationError(field: string, message: string) {
  return {
    field,
    message,
  };
}

export default {
  isValidObjectId,
  isValidEmail,
  isValidPassword,
  isValidTimezone,
  isValidTimeFormat,
  sanitizeString,
  isValidTaskStatus,
  isValidInterruptionType,
  isPositiveInteger,
  isValidDuration,
  isValidPomodoroCount,
  isFutureDate,
  isValidDateRange,
  createValidationError,
};
