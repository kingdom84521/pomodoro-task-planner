<template>
  <div class="date-slider">
    <div class="slider-header">
      <h3>日期選擇器</h3>
    </div>

    <div class="dates-container">
      <button
        class="scroll-button"
        :disabled="scrollOffset === 0"
        @click="scrollLeft"
      >
        &lt;
      </button>

      <div ref="datesScrollRef" class="dates-scroll">
        <div class="dates-list">
          <div
            v-for="(date, index) in visibleDates"
            :key="date"
            class="date-item"
            :class="{
              selected: isDateSelected(date),
              highlighted: isDateHighlighted(date),
            }"
            @click="handleDateClick(date)"
          >
            <div class="date-day">{{ formatDay(date) }}</div>
            <div class="date-month">{{ formatMonth(date) }}</div>
          </div>
        </div>
      </div>

      <button
        class="scroll-button"
        :disabled="scrollOffset >= maxScrollOffset"
        @click="scrollRight"
      >
        &gt;
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAnalyticsStore } from '../../stores/analytics'

const props = defineProps({
  // Window size in days
  windowDays: {
    type: Number,
    default: 30,
  },
})

const analyticsStore = useAnalyticsStore()

const datesScrollRef = ref(null)
const scrollOffset = ref(0)
const datesPerView = 14 // Show 14 dates at a time

// Generate all dates in the range
const allDates = computed(() => {
  if (!analyticsStore.startDate || !analyticsStore.endDate) return []

  const dates = []
  const current = new Date(analyticsStore.startDate)
  const end = new Date(analyticsStore.endDate)

  while (current <= end) {
    dates.push(formatDate(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
})

// Visible dates based on scroll offset
const visibleDates = computed(() => {
  return allDates.value.slice(scrollOffset.value, scrollOffset.value + datesPerView)
})

// Max scroll offset
const maxScrollOffset = computed(() => {
  return Math.max(0, allDates.value.length - datesPerView)
})

// Check if date is selected (the end date of the window)
function isDateSelected(date) {
  return analyticsStore.selectedDate === date
}

// Check if date is highlighted (within the selected window)
function isDateHighlighted(date) {
  if (!analyticsStore.selectedDate) return false

  const selected = new Date(analyticsStore.selectedDate)
  const current = new Date(date)
  const windowStart = new Date(selected)
  windowStart.setDate(windowStart.getDate() - props.windowDays + 1)

  return current >= windowStart && current <= selected
}

// Format date to YYYY-MM-DD
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Format day (DD)
function formatDay(dateStr) {
  const date = new Date(dateStr)
  return String(date.getDate()).padStart(2, '0')
}

// Format month (MM/DD)
function formatMonth(dateStr) {
  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${month}月`
}

// Handle date click
function handleDateClick(date) {
  analyticsStore.setSelectedDate(date)
}

// Scroll functions
function scrollLeft() {
  scrollOffset.value = Math.max(0, scrollOffset.value - datesPerView)
}

function scrollRight() {
  scrollOffset.value = Math.min(maxScrollOffset.value, scrollOffset.value + datesPerView)
}

// Auto-scroll to selected date when it changes
watch(
  () => analyticsStore.selectedDate,
  (newDate) => {
    if (!newDate) return

    const index = allDates.value.indexOf(newDate)
    if (index >= 0) {
      // Center the selected date in view
      const targetOffset = Math.max(0, Math.min(maxScrollOffset.value, index - Math.floor(datesPerView / 2)))
      scrollOffset.value = targetOffset
    }
  }
)
</script>

<style scoped>
.date-slider {
  padding: 20px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.slider-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.dates-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scroll-button {
  width: 32px;
  height: 60px;
  border: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
  color: var(--el-text-color-regular);
  transition: all 0.3s;
}

.scroll-button:hover:not(:disabled) {
  background: var(--el-fill-color-light);
  color: var(--el-color-primary);
}

.scroll-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.dates-scroll {
  flex: 1;
  overflow: hidden;
}

.dates-list {
  display: flex;
  gap: 8px;
}

.date-item {
  min-width: 60px;
  height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  background: var(--el-bg-color);
  border: 2px solid var(--el-border-color-lighter);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.date-item:hover {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.date-item.highlighted {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-7);
}

.date-item.selected {
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
}

.date-item.selected .date-day,
.date-item.selected .date-month {
  color: white;
}

.date-day {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1;
}

.date-month {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}
</style>
