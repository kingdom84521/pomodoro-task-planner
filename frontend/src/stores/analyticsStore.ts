import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import type {
  AnalyticsData,
  AnalyticsSummary,
} from '../services/analyticsApi';

export const useAnalyticsStore = defineStore('analytics', () => {
  // State
  const analytics = ref<AnalyticsData | null>(null);
  const summary = ref<AnalyticsSummary | null>(null);
  const timeRange = ref<{ startDate: string; endDate: string } | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Computed
  const hasData = computed(() => analytics.value !== null);

  // Actions
  function setAnalytics(data: AnalyticsData, range: { startDate: string; endDate: string }) {
    analytics.value = data;
    timeRange.value = range;
    error.value = null;
  }

  function setSummary(data: AnalyticsSummary, range: { startDate: string; endDate: string }) {
    summary.value = data;
    timeRange.value = range;
    error.value = null;
  }

  function setLoading(value: boolean) {
    loading.value = value;
  }

  function setError(message: string) {
    error.value = message;
    loading.value = false;
  }

  function reset() {
    analytics.value = null;
    summary.value = null;
    timeRange.value = null;
    loading.value = false;
    error.value = null;
  }

  return {
    // State
    analytics,
    summary,
    timeRange,
    loading,
    error,

    // Computed
    hasData,

    // Actions
    setAnalytics,
    setSummary,
    setLoading,
    setError,
    reset,
  };
});
