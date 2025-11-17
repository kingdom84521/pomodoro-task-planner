<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h3 class="text-lg font-semibold mb-4">Pomodoro Estimation Accuracy</h3>

    <div v-if="!metrics" class="text-gray-500 text-center py-8">
      No data available
    </div>

    <div v-else>
      <div class="mb-4">
        <Bar :data="chartData" :options="chartOptions" />
      </div>

      <div class="grid grid-cols-3 gap-4 mt-4">
        <div class="text-center">
          <p class="text-2xl font-bold text-blue-600">{{ metrics.estimatedTotal }}</p>
          <p class="text-sm text-gray-600">Estimated</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-green-600">{{ metrics.actualTotal }}</p>
          <p class="text-sm text-gray-600">Actual</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-purple-600">{{ metrics.averageDeviation.toFixed(1) }}</p>
          <p class="text-sm text-gray-600">Avg Deviation</p>
        </div>
      </div>

      <div class="mt-4 text-center">
        <p class="text-3xl font-bold text-indigo-600">{{ metrics.accuracyRate.toFixed(1) }}%</p>
        <p class="text-sm text-gray-600">Accuracy Rate</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import type { PomodoroAccuracyMetrics } from '../../services/analyticsApi';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface Props {
  metrics: PomodoroAccuracyMetrics | null;
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
    labels: ['Pomodoros'],
    datasets: [
      {
        label: 'Estimated',
        data: [props.metrics.estimatedTotal],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
      {
        label: 'Actual',
        data: [props.metrics.actualTotal],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
      },
    ],
  };
});

const chartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      position: 'top',
    },
    tooltip: {
      mode: 'index',
      intersect: false,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        stepSize: 1,
      },
    },
  },
};
</script>
