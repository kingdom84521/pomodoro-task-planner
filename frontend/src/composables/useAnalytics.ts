import { storeToRefs } from 'pinia';
import { useAnalyticsStore } from '../stores/analyticsStore';
import * as analyticsApi from '../services/analyticsApi';

export function useAnalytics() {
  const analyticsStore = useAnalyticsStore();
  const { analytics, summary, timeRange, loading, error, hasData } = storeToRefs(analyticsStore);

  /**
   * Fetch analytics data for a time range
   */
  async function fetchAnalytics(startDate?: string, endDate?: string) {
    analyticsStore.setLoading(true);

    try {
      const result = await analyticsApi.fetchAnalytics(startDate, endDate);
      analyticsStore.setAnalytics(result.analytics, result.timeRange);
    } catch (err: any) {
      analyticsStore.setError(err.message || 'Failed to fetch analytics');
      throw err;
    } finally {
      analyticsStore.setLoading(false);
    }
  }

  /**
   * Fetch analytics summary
   */
  async function fetchSummary(startDate?: string, endDate?: string) {
    analyticsStore.setLoading(true);

    try {
      const result = await analyticsApi.fetchAnalyticsSummary(startDate, endDate);
      analyticsStore.setSummary(result.summary, result.timeRange);
    } catch (err: any) {
      analyticsStore.setError(err.message || 'Failed to fetch summary');
      throw err;
    } finally {
      analyticsStore.setLoading(false);
    }
  }

  /**
   * Reset analytics data
   */
  function reset() {
    analyticsStore.reset();
  }

  return {
    // State
    analytics,
    summary,
    timeRange,
    loading,
    error,
    hasData,

    // Methods
    fetchAnalytics,
    fetchSummary,
    reset,
  };
}
