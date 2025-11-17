<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h3 class="text-lg font-semibold mb-4">Time Distribution</h3>

    <div v-if="!metrics" class="text-gray-500 text-center py-8">
      No data available
    </div>

    <div v-else>
      <div class="mb-4">
        <Line :data="chartData" :options="chartOptions" />
      </div>

      <div class="grid grid-cols-2 gap-4 mt-4">
        <div class="text-center">
          <p class="text-2xl font-bold text-blue-600">{{ metrics.totalPomodoros }}</p>
          <p class="text-sm text-gray-600">Total Pomodoros</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-green-600">{{ totalHours }}</p>
          <p class="text-sm text-gray-600">Total Hours</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-purple-600">{{ averageMinutes }}</p>
          <p class="text-sm text-gray-600">Avg Minutes/Session</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-orange-600">
            {{ metrics.mostProductiveHour !== undefined ? formatHour(metrics.mostProductiveHour) : 'N/A' }}
          </p>
          <p class="text-sm text-gray-600">Most Productive Hour</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from 'chart.js';
import type { TimeDistributionMetrics } from '../../services/analyticsApi';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend, Filler);

interface Props {
  metrics: TimeDistributionMetrics | null;
}

const props = defineProps<Props>();

const totalHours = computed(() => {
  if (!props.metrics) return '0';
  const hours = props.metrics.totalFocusTime / 3600000;
  return hours.toFixed(1) + 'h';
});

const averageMinutes = computed(() => {
  if (!props.metrics) return '0';
  const minutes = props.metrics.averageSessionDuration / 60000;
  return Math.round(minutes) + ' min';
});

const formatHour = (hour: number): string => {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
};

const chartData = computed(() => {
  if (!props.metrics || !props.metrics.sessionsPerDay) {
    return {
      labels: [],
      datasets: [],
    };
  }

  const sortedDates = Object.keys(props.metrics.sessionsPerDay).sort();
  const sessions = sortedDates.map(date => props.metrics!.sessionsPerDay[date]);

  return {
    labels: sortedDates.map(date => {
      const d = new Date(date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }),
    datasets: [
      {
        label: 'Pomodoros per Day',
        data: sessions,
        borderColor: 'rgba(99, 102, 241, 1)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(99, 102, 241, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };
});

const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      display: false,
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
