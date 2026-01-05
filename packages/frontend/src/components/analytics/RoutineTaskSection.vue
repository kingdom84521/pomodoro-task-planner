<template>
  <div class="routine-task-section">
    <div class="section-header">
      <h2>📋 例行任務執行率</h2>
    </div>

    <div v-loading="loading" class="section-content">
      <div class="stats-grid">
        <!-- Overall Rate Card -->
        <div class="card overall-card">
          <h3>整體執行率</h3>
          <div class="overall-rate">
            <div class="rate-value">{{ overallRateText }}</div>
            <ProgressBar
              :percentage="overallRate"
              :status="rateStatus"
              :show-label="false"
              :show-inner-text="false"
              height="12px"
            />
          </div>
          <div v-if="streak > 0" class="streak">
            連續達成: <strong>{{ streak }} 天</strong> 🔥
          </div>
        </div>

        <!-- Trend Chart Card -->
        <div class="card trend-card">
          <h3>執行率趨勢</h3>
          <div class="trend-chart">
            <LineChart
              v-if="hasTrendData"
              :data="trendChartData"
              :use-animation="false"
            />
            <el-empty v-else description="暫無趨勢資料" :image-size="80" />
          </div>
        </div>
      </div>

      <!-- Task List -->
      <div class="task-list-card">
        <h3>按任務分類</h3>
        <div v-if="hasByTaskData" class="task-list">
          <div v-for="task in byTask" :key="task.routineTaskId" class="task-item">
            <div class="task-header">
              <span class="task-title">{{ task.title }}</span>
              <span class="task-rate">{{ task.rate.toFixed(1) }}%</span>
            </div>
            <ProgressBar
              :percentage="task.rate"
              :status="getTaskStatus(task.rate)"
              :show-label="false"
              height="8px"
            />
            <div class="task-stats">
              完成: {{ task.completedCount }} / {{ task.totalCount }}
            </div>
          </div>
        </div>
        <el-empty v-else description="暫無任務資料" :image-size="80" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ProgressBar from '../charts/ProgressBar.vue'
import LineChart from '../charts/LineChart.vue'
import { useAnalyticsStore } from '../../stores/analytics'

const analyticsStore = useAnalyticsStore()

// Loading state
const loading = computed(() => analyticsStore.loading.routineTasks)

// Overall rate
const overallRate = computed(() => {
  return analyticsStore.routineTaskStats?.overallRate || 0
})

const overallRateText = computed(() => {
  return `${overallRate.value.toFixed(1)}%`
})

// Streak
const streak = computed(() => {
  return analyticsStore.routineTaskStats?.streak || 0
})

// By task data
const byTask = computed(() => {
  return analyticsStore.routineTaskStats?.byTask || []
})

const hasByTaskData = computed(() => byTask.value.length > 0)

// Trend data
const trend = computed(() => {
  return analyticsStore.routineTaskStats?.trend || []
})

const hasTrendData = computed(() => trend.value.length > 0)

// Trend chart data (convert to LineChart format)
const trendChartData = computed(() => {
  if (!hasTrendData.value) return []

  return trend.value.map((item) => ({
    date: item.period,
    percentages: [
      {
        resourceId: 1,
        name: '執行率',
        percentage: item.rate,
      },
    ],
  }))
})

// Get status color based on rate
function rateStatus(rate) {
  if (rate >= 80) return 'success'
  if (rate >= 60) return 'primary'
  if (rate >= 40) return 'warning'
  return 'danger'
}

const rateStatusValue = computed(() => rateStatus(overallRate.value))

// Get task status
function getTaskStatus(rate) {
  if (rate >= 80) return 'success'
  if (rate >= 60) return 'primary'
  if (rate >= 40) return 'warning'
  return 'danger'
}
</script>

<style scoped>
.routine-task-section {
  padding: 24px;
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.section-header {
  margin-bottom: 20px;
}

.section-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.card {
  padding: 20px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.card h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 16px 0;
}

.overall-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.overall-rate {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rate-value {
  font-size: 36px;
  font-weight: 700;
  color: var(--el-color-primary);
}

.streak {
  font-size: 14px;
  color: var(--el-text-color-regular);
  padding: 12px;
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-radius: 6px;
  text-align: center;
}

.streak strong {
  color: #f57c00;
  font-size: 16px;
}

.trend-card {
  min-height: 200px;
}

.trend-chart {
  min-height: 180px;
}

.task-list-card {
  padding: 20px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.task-list-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 16px 0;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-item {
  padding: 12px;
  background: var(--el-bg-color);
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.task-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.task-rate {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.task-stats {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 6px;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
