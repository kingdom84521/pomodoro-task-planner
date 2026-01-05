<template>
  <div class="sliding-window-section">
    <div class="section-header">
      <h2>📈 資源分析 (Sliding Window)</h2>
    </div>

    <!-- Data preparing notice -->
    <el-alert
      v-if="analyticsStore.isDataPartial"
      type="info"
      :closable="false"
      class="data-notice"
    >
      部分資料正在準備中，圖表將在幾秒後自動更新...
    </el-alert>

    <!-- Controls -->
    <div class="controls">
      <div class="control-group">
        <label>窗口大小:</label>
        <el-radio-group v-model="selectedWindow" @change="handleWindowChange">
          <el-radio-button :label="7">7天</el-radio-button>
          <el-radio-button :label="30">30天</el-radio-button>
          <el-radio-button :label="quarterDays">1季</el-radio-button>
          <el-radio-button :label="quarterDays * 2">2季</el-radio-button>
        </el-radio-group>
      </div>

      <div class="control-group">
        <label>資源:</label>
        <el-select
          v-model="selectedResource"
          placeholder="選擇資源"
          clearable
          @change="handleResourceChange"
          style="width: 200px"
        >
          <el-option label="全部" :value="null" />
          <el-option
            v-for="resource in resourceGroups"
            :key="resource.id"
            :label="resource.name"
            :value="resource.id"
          />
        </el-select>
      </div>
    </div>

    <!-- Chart -->
    <div v-loading="loading" class="chart-container">
      <LineChart
        v-if="hasData"
        :data="chartData"
        :target-line="targetLine"
        :highlighted-index="highlightedIndex"
        :use-animation="true"
        @point-click="handlePointClick"
      />
      <el-empty v-else description="暫無資料" />
    </div>

    <!-- Date Slider -->
    <DateSlider v-if="hasData" :window-days="selectedWindow" class="date-slider-section" />

    <!-- Work Records List (when a point is clicked) -->
    <div v-if="workRecords.length > 0" class="work-records">
      <h3>工作紀錄 ({{ selectedDateRange }})</h3>
      <div class="records-list">
        <div v-for="record in workRecords" :key="record.id" class="record-item">
          <div class="record-name">{{ record.task_name }}</div>
          <div class="record-info">
            <span class="resource-tag">{{ record.resource_name }}</span>
            <span class="duration">{{ formatDuration(record.duration) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import LineChart from '../charts/LineChart.vue'
import DateSlider from './DateSlider.vue'
import { useAnalyticsStore } from '../../stores/analytics'
import { getResourceGroups } from '../../api/resourceGroups'

const analyticsStore = useAnalyticsStore()

// Resource groups
const resourceGroups = ref([])

// Local state for controls
const selectedWindow = ref(30)
const selectedResource = ref(null)

// Quarter days from user settings
const quarterDays = computed(() => analyticsStore.quarterDays)

// Loading state
const loading = computed(() => analyticsStore.loading.slidingWindow)

// Check if has data
const hasData = computed(() => {
  return analyticsStore.windowData && analyticsStore.windowData.length > 0
})

// Chart data
const chartData = computed(() => analyticsStore.windowData)

// Target line
const targetLine = computed(() => analyticsStore.targetLine)

// Highlighted index
const highlightedIndex = computed(() => analyticsStore.highlightedPointIndex)

// Work records
const workRecords = computed(() => analyticsStore.workRecordsInWindow)

// Selected date range (clamped to period start date)
const selectedDateRange = computed(() => {
  if (!analyticsStore.selectedDate) return ''
  const endDate = analyticsStore.selectedDate
  let startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - selectedWindow.value + 1)
  const startDateStr = formatDate(startDate)

  // Clamp to period start date
  const periodStartDate = analyticsStore.startDate
  const effectiveStartDate =
    periodStartDate && startDateStr < periodStartDate
      ? periodStartDate
      : startDateStr

  return `${effectiveStartDate} ~ ${endDate}`
})

// Format date
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Format duration from seconds to readable format
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

// Handle window size change
function handleWindowChange(windowDays) {
  analyticsStore.setSelectedWindow(windowDays)
}

// Handle resource change
function handleResourceChange(resourceId) {
  analyticsStore.setSelectedResource(resourceId)
}

// Handle point click
function handlePointClick(index) {
  analyticsStore.setHighlightedPoint(index)
}

// Load resource groups
async function loadResourceGroups() {
  try {
    const response = await getResourceGroups()
    resourceGroups.value = response.data?.resource_groups || []
  } catch (error) {
    console.error('Failed to load resource groups:', error)
  }
}

onMounted(() => {
  console.log('[SlidingWindowSection] onMounted, hasData:', hasData.value)
  loadResourceGroups()
  // Sync local state with store
  selectedWindow.value = analyticsStore.selectedWindow
  selectedResource.value = analyticsStore.selectedResource
})
</script>

<style scoped>
.sliding-window-section {
  padding: 24px;
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  width: 100%;
  box-sizing: border-box;
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

.data-notice {
  margin-bottom: 16px;
}

.controls {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.chart-container {
  min-height: 450px;
  margin-bottom: 20px;
}

.date-slider-section {
  margin-bottom: 20px;
}

.work-records {
  padding: 20px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.work-records h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 16px 0;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.record-item {
  padding: 12px;
  background: var(--el-bg-color);
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter);
  transition: all 0.3s;
}

.record-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.record-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 6px;
}

.record-info {
  display: flex;
  gap: 12px;
  align-items: center;
}

.resource-tag {
  font-size: 12px;
  padding: 2px 8px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border-radius: 4px;
}

.duration {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
