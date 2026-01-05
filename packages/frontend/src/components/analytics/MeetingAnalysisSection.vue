<template>
  <div class="meeting-analysis-section">
    <div class="section-header">
      <h2>📅 會議時間分析</h2>
    </div>

    <div v-loading="loading" class="section-content">
      <!-- Ratio Bar -->
      <div class="ratio-container">
        <h3>會議占比: {{ meetingRatioText }}</h3>
        <RatioBar
          :segments="ratioSegments"
          :show-legend="true"
          height="50px"
        />
        <div v-if="warning !== 'none'" class="warning-badge" :class="warningClass">
          <el-icon><WarningFilled /></el-icon>
          {{ warningMessage }}
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">總會議時間</div>
            <div class="stat-value">{{ formattedTotalDuration }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <el-icon><Timer /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">平均每場</div>
            <div class="stat-value">{{ formattedAverageDuration }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <el-icon><Calendar /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">每日會議</div>
            <div class="stat-value">{{ dailyAverageText }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">超時率</div>
            <div class="stat-value">{{ overtimeRateText }}</div>
          </div>
        </div>
      </div>

      <!-- Trend Comparison -->
      <div class="trend-card">
        <h3>趨勢比較</h3>
        <div class="trend-content">
          <div class="trend-item">
            <span class="trend-label">本期</span>
            <span class="trend-value">{{ formattedCurrentPeriod }}</span>
          </div>
          <div class="trend-arrow" :class="trendDirection">
            <el-icon v-if="changePercent > 0"><Top /></el-icon>
            <el-icon v-else-if="changePercent < 0"><Bottom /></el-icon>
            <el-icon v-else><Minus /></el-icon>
            <span class="change-percent">{{ Math.abs(changePercent).toFixed(1) }}%</span>
          </div>
          <div class="trend-item">
            <span class="trend-label">上期</span>
            <span class="trend-value">{{ formattedPreviousPeriod }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Clock, Timer, Calendar, Warning, WarningFilled, Top, Bottom, Minus } from '@element-plus/icons-vue'
import RatioBar from '../charts/RatioBar.vue'
import { useAnalyticsStore } from '../../stores/analytics'

const analyticsStore = useAnalyticsStore()

// Loading state
const loading = computed(() => analyticsStore.loading.meetings)

// Meeting stats
const stats = computed(() => analyticsStore.meetingStats || {})

// Meeting ratio
const meetingRatio = computed(() => stats.value.meetingRatio || 0)
const meetingRatioText = computed(() => `${meetingRatio.value.toFixed(1)}%`)

// Ratio segments for RatioBar
const ratioSegments = computed(() => {
  const meetingPct = meetingRatio.value
  const workPct = 100 - meetingPct

  return [
    {
      label: '工作',
      value: workPct,
      status: 'primary',
    },
    {
      label: '會議',
      value: meetingPct,
      status: warning.value === 'red' ? 'danger' : warning.value === 'yellow' ? 'warning' : 'info',
    },
  ]
})

// Warning level
const warning = computed(() => stats.value.trend?.warning || 'none')

const warningClass = computed(() => {
  return warning.value === 'red' ? 'danger' : warning.value === 'yellow' ? 'warning' : ''
})

const warningMessage = computed(() => {
  if (warning.value === 'red') {
    return '會議時間過多，嚴重影響工作時間！'
  }
  if (warning.value === 'yellow') {
    return '會議時間偏高，建議控制會議數量'
  }
  return ''
})

// Format duration
function formatDuration(seconds) {
  if (!seconds) return '0h'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

// Total duration
const formattedTotalDuration = computed(() => {
  return formatDuration(stats.value.totalDuration || 0)
})

// Average duration
const formattedAverageDuration = computed(() => {
  return formatDuration(stats.value.averageDuration || 0)
})

// Daily average
const dailyAverageText = computed(() => {
  const avg = stats.value.dailyAverage || 0
  return `${avg.toFixed(1)} 場`
})

// Overtime rate (not yet implemented - needs expected_duration field)
const overtimeRateText = computed(() => '即將推出')

// Trend data
const currentPeriod = computed(() => stats.value.trend?.currentPeriod || 0)
const previousPeriod = computed(() => stats.value.trend?.previousPeriod || 0)
const changePercent = computed(() => stats.value.trend?.changePercent || 0)

const formattedCurrentPeriod = computed(() => formatDuration(currentPeriod.value))
const formattedPreviousPeriod = computed(() => formatDuration(previousPeriod.value))

const trendDirection = computed(() => {
  if (changePercent.value > 0) return 'increase'
  if (changePercent.value < 0) return 'decrease'
  return 'stable'
})
</script>

<style scoped>
.meeting-analysis-section {
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

.ratio-container {
  padding: 20px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.ratio-container h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 16px 0;
}

.warning-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  margin-top: 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
}

.warning-badge.warning {
  background: var(--el-color-warning-light-9);
  color: var(--el-color-warning);
}

.warning-badge.danger {
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
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
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.trend-card {
  padding: 20px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.trend-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 16px 0;
}

.trend-content {
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.trend-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.trend-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.trend-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.trend-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 32px;
}

.trend-arrow.increase {
  color: var(--el-color-danger);
}

.trend-arrow.decrease {
  color: var(--el-color-success);
}

.trend-arrow.stable {
  color: var(--el-text-color-secondary);
}

.change-percent {
  font-size: 14px;
  font-weight: 600;
}

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
