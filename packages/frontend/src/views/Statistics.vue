<template>
  <div ref="pageRef" class="statistics-page">
    <div class="page-header">
      <h1>📊 數據分析</h1>
      <el-button @click="handleRefresh" :loading="isLoading">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <!-- Time Period Selection -->
    <div class="period-selector">
      <div class="period-label">時間範圍:</div>
      <div v-if="loadingPeriods" class="period-loading">
        <el-skeleton :rows="1" animated />
      </div>
      <el-radio-group
        v-else-if="hasAvailablePeriods"
        v-model="selectedPeriodKey"
        @change="handlePeriodChange"
        class="period-buttons"
      >
        <el-radio-button
          v-for="period in availablePeriods"
          :key="period.isCurrent ? 'current' : `${period.year}-${period.startQ}`"
          :value="period.isCurrent ? 'current' : `${period.year}-${period.startQ}`"
        >
          {{ period.label }}
        </el-radio-button>
      </el-radio-group>
      <el-empty
        v-else
        description="尚無工作紀錄"
        :image-size="60"
        class="period-empty"
      />
    </div>

    <!-- Overview Section (always loaded) -->
    <div class="section-wrapper">
      <OverviewSection />
    </div>

    <!-- Sliding Window Section (lazy loaded) -->
    <div ref="slidingWindowRef" class="section-wrapper">
      <SlidingWindowSection v-if="shouldLoadSlidingWindow" />
      <div v-else class="skeleton-section">
        <el-skeleton :rows="5" animated />
      </div>
    </div>

    <!-- Routine Task Section (lazy loaded) -->
    <div ref="routineTaskRef" class="section-wrapper">
      <RoutineTaskSection v-if="shouldLoadRoutineTasks" />
      <div v-else class="skeleton-section">
        <el-skeleton :rows="4" animated />
      </div>
    </div>

    <!-- Meeting Analysis Section (lazy loaded) -->
    <div ref="meetingRef" class="section-wrapper">
      <MeetingAnalysisSection v-if="shouldLoadMeetings" />
      <div v-else class="skeleton-section">
        <el-skeleton :rows="4" animated />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useIntersectionObserver } from '@vueuse/core'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import OverviewSection from '../components/analytics/OverviewSection.vue'
import SlidingWindowSection from '../components/analytics/SlidingWindowSection.vue'
import RoutineTaskSection from '../components/analytics/RoutineTaskSection.vue'
import MeetingAnalysisSection from '../components/analytics/MeetingAnalysisSection.vue'
import { useAnalyticsStore } from '../stores/analytics'

const analyticsStore = useAnalyticsStore()

// Page ref for debugging
const pageRef = ref(null)

// Lazy loading refs
const slidingWindowRef = ref(null)
const routineTaskRef = ref(null)
const meetingRef = ref(null)

// Lazy loading states
const shouldLoadSlidingWindow = ref(false)
const shouldLoadRoutineTasks = ref(false)
const shouldLoadMeetings = ref(false)

// Loading state
const isLoading = computed(() => analyticsStore.isLoading)

// Period selection
const loadingPeriods = computed(() => analyticsStore.loading.availablePeriods)
const availablePeriods = computed(() => analyticsStore.availablePeriods)
const hasAvailablePeriods = computed(() => analyticsStore.hasAvailablePeriods)

// Selected period key for radio group (format: "year-startQ" or "current")
const selectedPeriodKey = computed(() => {
  const period = analyticsStore.selectedPeriod
  if (!period) {
    console.log('[Statistics] selectedPeriodKey: null (no period)')
    return null
  }
  const key = period.isCurrent ? 'current' : `${period.year}-${period.startQ}`
  console.log('[Statistics] selectedPeriodKey:', key)
  return key
})

// Handle period change
async function handlePeriodChange(key) {
  const period = availablePeriods.value.find((p) =>
    p.isCurrent ? key === 'current' : `${p.year}-${p.startQ}` === key
  )
  if (period) {
    await analyticsStore.setSelectedPeriod(period)
  }
}

// Setup Intersection Observer for lazy loading
function setupLazyLoading() {
  // Sliding Window Section
  useIntersectionObserver(
    slidingWindowRef,
    ([{ isIntersecting }]) => {
      if (isIntersecting && !shouldLoadSlidingWindow.value) {
        shouldLoadSlidingWindow.value = true
        analyticsStore.fetchSlidingWindowData()
      }
    },
    { threshold: 0.1 }
  )

  // Routine Task Section
  useIntersectionObserver(
    routineTaskRef,
    ([{ isIntersecting }]) => {
      if (isIntersecting && !shouldLoadRoutineTasks.value) {
        shouldLoadRoutineTasks.value = true
        analyticsStore.fetchRoutineTaskStats()
      }
    },
    { threshold: 0.1 }
  )

  // Meeting Section
  useIntersectionObserver(
    meetingRef,
    ([{ isIntersecting }]) => {
      if (isIntersecting && !shouldLoadMeetings.value) {
        shouldLoadMeetings.value = true
        analyticsStore.fetchMeetingStats()
      }
    },
    { threshold: 0.1 }
  )
}

// Handle refresh
async function handleRefresh() {
  try {
    await analyticsStore.refreshAll()
    ElMessage.success('資料已更新')
  } catch (error) {
    console.error('Failed to refresh data:', error)
    ElMessage.error('更新失敗，請稍後再試')
  }
}

// Watch for page width changes
const resizeObserver = ref(null)

// Initialize
onMounted(async () => {
  console.log('[Statistics] onMounted - start')
  console.log('[Statistics] Initial page width:', pageRef.value?.offsetWidth)

  // Set up ResizeObserver to track width changes
  if (pageRef.value) {
    resizeObserver.value = new ResizeObserver((entries) => {
      const entry = entries[0]
      console.log('[Statistics] Page resize:', {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    resizeObserver.value.observe(pageRef.value)
  }
  // Fetch available periods and load data for the selected period
  try {
    console.log('[Statistics] Fetching available periods...')
    await analyticsStore.fetchAvailablePeriods()
    console.log('[Statistics] Periods fetched, hasAvailablePeriods:', analyticsStore.hasAvailablePeriods)

    // If no periods available, initialize with default date range
    if (!analyticsStore.hasAvailablePeriods) {
      analyticsStore.initializeDateRange()
      await analyticsStore.fetchOverview()
    }

    // If data was already loaded by fetchAvailablePeriods -> setSelectedPeriod,
    // mark sections as ready to render
    console.log('[Statistics] Checking loaded data:', {
      windowDataLength: analyticsStore.windowData?.length,
      hasRoutineTaskStats: !!analyticsStore.routineTaskStats,
      hasMeetingStats: !!analyticsStore.meetingStats,
    })
    if (analyticsStore.windowData && analyticsStore.windowData.length > 0) {
      shouldLoadSlidingWindow.value = true
      console.log('[Statistics] shouldLoadSlidingWindow set to true')
    }
    if (analyticsStore.routineTaskStats) {
      shouldLoadRoutineTasks.value = true
    }
    if (analyticsStore.meetingStats) {
      shouldLoadMeetings.value = true
    }

    // Wait for components to render before setting up Intersection Observer
    console.log('[Statistics] Waiting for nextTick...')
    await nextTick()
    console.log('[Statistics] After nextTick')

    // Force layout recalculation
    const pageEl = document.querySelector('.statistics-page')
    if (pageEl) {
      console.log('[Statistics] Page width before reflow:', pageEl.offsetWidth)
      // Force reflow
      void pageEl.offsetHeight
      console.log('[Statistics] Page width after reflow:', pageEl.offsetWidth)
    }
  } catch (error) {
    console.error('Failed to load analytics:', error)
    ElMessage.error('載入資料失敗')
  }

  // Setup lazy loading for other sections (for future navigation or refresh)
  setupLazyLoading()
  console.log('[Statistics] onMounted - complete')
})

onUnmounted(() => {
  if (resizeObserver.value) {
    resizeObserver.value.disconnect()
    resizeObserver.value = null
  }
})
</script>

<style scoped>
.statistics-page {
  padding: 20px;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.period-selector {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px 20px;
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  min-height: 60px;
}

.period-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}

.period-buttons {
  flex-wrap: wrap;
}

.period-loading {
  flex: 1;
  min-width: 200px;
}

.period-empty {
  padding: 8px 0;
}

.period-empty :deep(.el-empty__description) {
  margin-top: 8px;
}

.section-wrapper {
  margin-bottom: 24px;
  width: 100%;
}

.skeleton-section {
  padding: 24px;
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

@media (max-width: 768px) {
  .statistics-page {
    padding: 16px;
  }

  .page-header h1 {
    font-size: 24px;
  }

  .period-selector {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 16px;
  }

  .period-buttons {
    width: 100%;
  }
}
</style>
