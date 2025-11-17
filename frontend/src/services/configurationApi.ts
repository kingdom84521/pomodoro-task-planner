import { api, ApiResponse } from './api';

export interface Configuration {
  _id: string;
  userId: string;
  pomodoroDuration: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
  dailyUsageStart?: string;
  dailyUsageEnd?: string;
}

export interface ConfigurationUpdateInput {
  pomodoroDuration?: number;
  shortBreak?: number;
  longBreak?: number;
  longBreakInterval?: number;
  dailyUsageStart?: string;
  dailyUsageEnd?: string;
}

/**
 * Get user configuration
 */
export async function fetchConfiguration(): Promise<Configuration> {
  const response = await api.get<{ configuration: Configuration }>('/configuration');
  return response.data.data!.configuration;
}

/**
 * Update user configuration
 */
export async function updateConfiguration(
  updates: ConfigurationUpdateInput
): Promise<Configuration> {
  const response = await api.put<{ configuration: Configuration }>(
    '/configuration',
    updates
  );
  return response.data.data!.configuration;
}

/**
 * Reset configuration to defaults
 */
export async function resetConfiguration(): Promise<Configuration> {
  const response = await api.post<{ configuration: Configuration }>(
    '/configuration/reset'
  );
  return response.data.data!.configuration;
}
