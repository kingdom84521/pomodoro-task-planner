import * as metricsCalculator from './metricsCalculator';

export interface AnalyticsData {
  completionRate: metricsCalculator.CompletionRateMetrics;
  pomodoroAccuracy: metricsCalculator.PomodoroAccuracyMetrics;
  timeDistribution: metricsCalculator.TimeDistributionMetrics;
}

/**
 * Get comprehensive analytics for a time range
 */
export async function getAnalyticsForTimeRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<AnalyticsData> {
  // Run all calculations in parallel
  const [completionRate, pomodoroAccuracy, timeDistribution] = await Promise.all([
    metricsCalculator.calculateCompletionRate(userId, startDate, endDate),
    metricsCalculator.calculatePomodoroAccuracy(userId, startDate, endDate),
    metricsCalculator.calculateTimeDistribution(userId, startDate, endDate),
  ]);

  return {
    completionRate,
    pomodoroAccuracy,
    timeDistribution,
  };
}

/**
 * Get aggregated metrics (summary)
 */
export async function aggregateMetrics(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  summary: {
    totalTasks: number;
    completedTasks: number;
    totalPomodoros: number;
    totalFocusTimeHours: number;
    completionRate: number;
    accuracyRate: number;
  };
}> {
  const analytics = await getAnalyticsForTimeRange(userId, startDate, endDate);

  const totalFocusTimeHours = analytics.timeDistribution.totalFocusTime / 3600000;

  return {
    summary: {
      totalTasks: analytics.completionRate.totalTasks,
      completedTasks: analytics.completionRate.completedTasks,
      totalPomodoros: analytics.timeDistribution.totalPomodoros,
      totalFocusTimeHours: Math.round(totalFocusTimeHours * 10) / 10,
      completionRate: analytics.completionRate.completionRate,
      accuracyRate: analytics.pomodoroAccuracy.accuracyRate,
    },
  };
}
