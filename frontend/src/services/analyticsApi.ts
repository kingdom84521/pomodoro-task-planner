import { apiClient } from './api';

export interface CompletionRateMetrics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completionRate: number;
}

export interface PomodoroAccuracyMetrics {
  totalCompletedTasks: number;
  estimatedTotal: number;
  actualTotal: number;
  accuracyRate: number;
  averageDeviation: number;
}

export interface TimeDistributionMetrics {
  totalPomodoros: number;
  totalFocusTime: number;
  averageSessionDuration: number;
  mostProductiveHour?: number;
  sessionsPerDay: { [date: string]: number };
}

export interface AnalyticsData {
  completionRate: CompletionRateMetrics;
  pomodoroAccuracy: PomodoroAccuracyMetrics;
  timeDistribution: TimeDistributionMetrics;
}

export interface AnalyticsSummary {
  totalTasks: number;
  completedTasks: number;
  totalPomodoros: number;
  totalFocusTimeHours: number;
  completionRate: number;
  accuracyRate: number;
}

/**
 * Fetch comprehensive analytics for a time range
 */
export async function fetchAnalytics(
  startDate?: string,
  endDate?: string
): Promise<{
  analytics: AnalyticsData;
  timeRange: { startDate: string; endDate: string };
}> {
  const params: Record<string, string> = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const response = await apiClient.get('/analytics', { params });
  return response.data.data;
}

/**
 * Fetch analytics summary
 */
export async function fetchAnalyticsSummary(
  startDate?: string,
  endDate?: string
): Promise<{
  summary: AnalyticsSummary;
  timeRange: { startDate: string; endDate: string };
}> {
  const params: Record<string, string> = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const response = await apiClient.get('/analytics/summary', { params });
  return response.data.data;
}
