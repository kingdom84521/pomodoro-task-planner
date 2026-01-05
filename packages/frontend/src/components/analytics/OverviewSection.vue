<template>
  <div ref="sectionRef" class="overview-section">
    <div class="section-header">
      <h2>📊 整體概覽</h2>
      <span v-if="dateRange" class="date-range">
        {{ dateRange }}
      </span>
    </div>

    <div v-loading="loading" class="overview-content">
      <div class="chart-area">
        <PieChart
          v-if="hasData"
          :data="chartData"
          title="資源使用占比"
        />
        <el-empty v-else description="暫無資料" />
      </div>

      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-icon work">
            <el-icon><Document /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">總工作時長</div>
            <div class="stat-value">{{ formattedWorkDuration }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon meeting">
            <el-icon><ChatDotRound /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">會議時長</div>
            <div class="stat-value">{{ formattedMeetingDuration }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon total">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">總時間跨度</div>
            <div class="stat-value">{{ formattedTotalTimeSpan }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, watch, ref } from 'vue'
import { Document, ChatDotRound, Clock } from '@element-plus/icons-vue'
import PieChart from '../charts/PieChart.vue'
import { useAnalyticsStore } from '../../stores/analytics'

const analyticsStore = useAnalyticsStore()
const sectionRef = ref(null)

// Loading state
const loading = computed(() => analyticsStore.loading.overview)

// Check if has data
const hasData = computed(() => {
  return analyticsStore.overview && analyticsStore.overview.resourceDistribution.length > 0
})

onMounted(() => {
  console.log('[OverviewSection] onMounted, hasData:', hasData.value)
  console.log('[OverviewSection] Section width:', sectionRef.value?.offsetWidth)
})

watch(hasData, (newVal) => {
  console.log('[OverviewSection] hasData changed to:', newVal)
  console.log('[OverviewSection] Section width after hasData change:', sectionRef.value?.offsetWidth)
})

// Chart data for PieChart
const chartData = computed(() => {
  if (!analyticsStore.overview) return []
  return analyticsStore.overview.resourceDistribution
})

// Format duration from seconds to hours
function formatDuration(seconds) {
  if (!seconds) return '0h'
  const hours = (seconds / 3600).toFixed(1)
  return `${hours}h`
}

// Formatted durations
const formattedWorkDuration = computed(() => {
  return formatDuration(analyticsStore.overview?.totalWorkDuration || 0)
})

const formattedMeetingDuration = computed(() => {
  return formatDuration(analyticsStore.overview?.totalMeetingDuration || 0)
})

const formattedTotalTimeSpan = computed(() => {
  return formatDuration(analyticsStore.overview?.totalTimeSpan || 0)
})

// Date range display
const dateRange = computed(() => {
  if (!analyticsStore.startDate || !analyticsStore.endDate) return ''
  return `${analyticsStore.startDate} ~ ${analyticsStore.endDate}`
})
</script>

<style scoped>
.overview-section {
  padding: 24px;
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  width: 100%;
  box-sizing: border-box;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.date-range {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.overview-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  align-items: start;
}

.chart-area {
  min-height: 350px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stats-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  transition: all 0.3s;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-icon.work {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: white;
}

.stat-icon.meeting {
  background: linear-gradient(135deg, #e6a23c 0%, #ebb563 100%);
  color: white;
}

.stat-icon.total {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
  color: white;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

@media (max-width: 768px) {
  .overview-content {
    grid-template-columns: 1fr;
  }
}
</style>
