<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h3 class="text-lg font-semibold mb-4">Task Completion Rate</h3>

    <div v-if="!metrics" class="text-gray-500 text-center py-8">
      No data available
    </div>

    <div v-else>
      <div class="mb-4">
        <Pie :data="chartData" :options="chartOptions" />
      </div>

      <div class="grid grid-cols-2 gap-4 mt-4">
        <div class="text-center">
          <p class="text-2xl font-bold text-green-600">{{ metrics.completedTasks }}</p>
          <p class="text-sm text-gray-600">Completed</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-blue-600">{{ metrics.totalTasks }}</p>
          <p class="text-sm text-gray-600">Total Tasks</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-yellow-600">{{ metrics.inProgressTasks }}</p>
          <p class="text-sm text-gray-600">In Progress</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-gray-600">{{ metrics.pendingTasks }}</p>
          <p class="text-sm text-gray-600">Pending</p>
        </div>
      </div>

      <div class="mt-4 text-center">
        <p class="text-3xl font-bold text-indigo-600">{{ metrics.completionRate.toFixed(1) }}%</p>
        <p class="text-sm text-gray-600">Overall Completion Rate</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Pie } from 'vue-chartjs';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import type { CompletionRateMetrics } from '../../services/analyticsApi';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  metrics: CompletionRateMetrics | null;
}

const props = defineProps<Props>();

const chartData = computed(() => {
  if (!props.metrics) {
    return {
      labels: [],
      datasets: [],
    };
  }

  return {
    labels: ['Completed', 'In Progress', 'Pending'],
    datasets: [
      {
        data: [
          props.metrics.completedTasks,
          props.metrics.inProgressTasks,
          props.metrics.pendingTasks,
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',  // green
          'rgba(251, 191, 36, 0.8)',  // yellow
          'rgba(156, 163, 175, 0.8)', // gray
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(251, 191, 36, 1)',
          'rgba(156, 163, 175, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
});

const chartOptions: ChartOptions<'pie'> = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      position: 'bottom',
    },
    tooltip: {
      callbacks: {
        label: function (context) {
          const label = context.label || '';
          const value = context.parsed || 0;
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          return `${label}: ${value} (${percentage}%)`;
        },
      },
    },
  },
};
</script>
