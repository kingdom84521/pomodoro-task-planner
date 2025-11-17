import { Configuration, IConfiguration } from '../../models/Configuration';
import mongoose from 'mongoose';

export interface ConfigurationInput {
  pomodoroDuration?: number;
  shortBreak?: number;
  longBreak?: number;
  longBreakInterval?: number;
  dailyUsageStart?: string;
  dailyUsageEnd?: string;
}

/**
 * Get user configuration (create default if not exists)
 */
export async function getUserConfiguration(
  userId: string
): Promise<IConfiguration> {
  let config = await Configuration.findOne({ userId });

  if (!config) {
    config = await Configuration.create({
      userId,
      pomodoroDuration: 1500000, // 25 minutes
      shortBreak: 300000, // 5 minutes
      longBreak: 900000, // 15 minutes
      longBreakInterval: 4,
    });
  }

  return config;
}

/**
 * Update user configuration
 */
export async function updateUserConfiguration(
  userId: string,
  updates: ConfigurationInput
): Promise<IConfiguration> {
  const config = await Configuration.findOneAndUpdate(
    { userId },
    { $set: updates },
    { new: true, upsert: true, runValidators: true }
  );

  if (!config) {
    throw new Error('Failed to update configuration');
  }

  return config;
}

/**
 * Reset configuration to defaults
 */
export async function resetConfiguration(
  userId: string
): Promise<IConfiguration> {
  const config = await Configuration.findOneAndUpdate(
    { userId },
    {
      $set: {
        pomodoroDuration: 1500000, // 25 minutes
        shortBreak: 300000, // 5 minutes
        longBreak: 900000, // 15 minutes
        longBreakInterval: 4,
        dailyUsageStart: undefined,
        dailyUsageEnd: undefined,
      },
    },
    { new: true, upsert: true }
  );

  if (!config) {
    throw new Error('Failed to reset configuration');
  }

  return config;
}

/**
 * Validate time window
 */
export function validateTimeWindow(start?: string, end?: string): boolean {
  if (!start || !end) return true;

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(start) || !timeRegex.test(end)) {
    return false;
  }

  return end > start;
}
