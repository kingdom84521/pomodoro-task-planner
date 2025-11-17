<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
      <p class="mt-2 text-gray-600">Track your productivity and task completion metrics</p>
    </div>

    <!-- Time Range Selector -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <div class="flex flex-wrap items-end gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
          <select
            v-model="selectedRange"
            @change="handleRangeChange"
            class="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        <div v-if="selectedRange === 'custom'">
          <label class="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
          <input
            type="date"
            v-model="customStartDate"
            class="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div v-if="selectedRange === 'custom'">
          <label class="block text-sm font-medium text-gray-700 mb-2">End Date</label>
          <input
            type="date"
            v-model="customEndDate"
            class="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          @click="loadAnalytics"
          :disabled="loading"
          class="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ loading ? 'Loading...' : 'Update' }}
        </button>
      </div>

      <div v-if="timeRange" class="mt-4 text-sm text-gray-600">
        Showing data from {{ formatDate(timeRange.startDate) }} to {{ formatDate(timeRange.endDate) }}
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !hasData" class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
      <p class="mt-4 text-gray-600">Loading analytics...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <p class="text-red-800">{{ error }}</p>
      <button
        @click="loadAnalytics"
        class="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
      >
        Try Again
      </button>
    </div>

    <!-- Summary Cards -->
    <div v-else-if="summary" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
      <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-blue-100">Total Tasks</p>
            <p class="text-3xl font-bold mt-2">{{ summary.totalTasks }}</p>
          </div>
          <div class="text-blue-200">
            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-green-100">Completed Tasks</p>
            <p class="text-3xl font-bold mt-2">{{ summary.completedTasks }}</p>
          </div>
          <div class="text-green-200">
            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-purple-100">Total Pomodoros</p>
            <p class="text-3xl font-bold mt-2">{{ summary.totalPomodoros }}</p>
          </div>
          <div class="text-purple-200">
            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow p-6 text-white">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-orange-100">Focus Time</p>
            <p class="text-3xl font-bold mt-2">{{ summary.totalFocusTimeHours.toFixed(1) }}h</p>
          </div>
          <div class="text-orange-200">
            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow p-6 text-white">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-indigo-100">Completion Rate</p>
            <p class="text-3xl font-bold mt-2">{{ summary.completionRate.toFixed(1) }}%</p>
          </div>
          <div class="text-indigo-200">
            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg shadow p-6 text-white">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-pink-100">Accuracy Rate</p>
            <p class="text-3xl font-bold mt-2">{{ summary.accuracyRate.toFixed(1) }}%</p>
          </div>
          <div class="text-pink-200">
            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts -->
    <div v-if="analytics" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <CompletionRateChart :metrics="analytics.completionRate" />
      <PomodoroAccuracyChart :metrics="analytics.pomodoroAccuracy" />
      <div class="lg:col-span-2">
        <TimeDistributionChart :metrics="analytics.timeDistribution" />
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!loading && !error"
      class="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center"
    >
      <svg
        class="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">No analytics data yet</h3>
      <p class="mt-1 text-sm text-gray-500">
        Complete some tasks and Pomodoro sessions to see your analytics.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAnalytics } from '../composables/useAnalytics';
import CompletionRateChart from '../components/analytics/CompletionRateChart.vue';
import PomodoroAccuracyChart from '../components/analytics/PomodoroAccuracyChart.vue';
import TimeDistributionChart from '../components/analytics/TimeDistributionChart.vue';

const { analytics, summary, timeRange, loading, error, hasData, fetchAnalytics, fetchSummary } = useAnalytics();

const selectedRange = ref<string>('30');
const customStartDate = ref<string>('');
const customEndDate = ref<string>('');

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const calculateDateRange = (): { startDate: string; endDate: string } => {
  const endDate = new Date();
  let startDate = new Date();

  if (selectedRange.value === 'custom') {
    if (customStartDate.value && customEndDate.value) {
      return {
        startDate: new Date(customStartDate.value).toISOString(),
        endDate: new Date(customEndDate.value).toISOString(),
      };
    }
  } else {
    const days = parseInt(selectedRange.value);
    startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
};

const loadAnalytics = async () => {
  const { startDate, endDate } = calculateDateRange();

  try {
    await Promise.all([
      fetchAnalytics(startDate, endDate),
      fetchSummary(startDate, endDate),
    ]);
  } catch (err) {
    console.error('Failed to load analytics:', err);
  }
};

const handleRangeChange = () => {
  if (selectedRange.value !== 'custom') {
    loadAnalytics();
  }
};

onMounted(() => {
  loadAnalytics();
});
</script>
