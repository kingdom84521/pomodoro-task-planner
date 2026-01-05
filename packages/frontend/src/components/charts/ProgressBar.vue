<template>
  <div class="progress-bar-container">
    <div v-if="showLabel" class="progress-label">
      <span class="label-text">{{ label }}</span>
      <span class="percentage-text">{{ formattedPercentage }}</span>
    </div>
    <div class="progress-bar-wrapper">
      <div
        class="progress-bar-fill"
        :class="statusClass"
        :style="{ width: `${clampedPercentage}%` }"
      >
        <span v-if="showInnerText" class="inner-text">{{ formattedPercentage }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // Percentage value (0-100)
  percentage: {
    type: Number,
    default: 0,
  },
  // Label to show above the bar
  label: {
    type: String,
    default: '',
  },
  // Show label
  showLabel: {
    type: Boolean,
    default: true,
  },
  // Show percentage text inside the bar
  showInnerText: {
    type: Boolean,
    default: false,
  },
  // Color status: 'success', 'warning', 'danger', 'primary'
  status: {
    type: String,
    default: 'primary',
  },
  // Height of the progress bar
  height: {
    type: String,
    default: '20px',
  },
})

// Clamp percentage between 0 and 100
const clampedPercentage = computed(() => {
  return Math.max(0, Math.min(100, props.percentage))
})

// Formatted percentage with 1 decimal place
const formattedPercentage = computed(() => {
  return `${clampedPercentage.value.toFixed(1)}%`
})

// Status class for color
const statusClass = computed(() => {
  return `status-${props.status}`
})
</script>

<style scoped>
.progress-bar-container {
  width: 100%;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}

.label-text {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.percentage-text {
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.progress-bar-wrapper {
  width: 100%;
  height: v-bind(height);
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.progress-bar-fill {
  height: 100%;
  transition: width 0.6s ease;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 8px;
  border-radius: 4px;
}

.inner-text {
  font-size: 12px;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* Status colors */
.status-primary {
  background: linear-gradient(90deg, #409eff 0%, #66b1ff 100%);
}

.status-success {
  background: linear-gradient(90deg, #67c23a 0%, #85ce61 100%);
}

.status-warning {
  background: linear-gradient(90deg, #e6a23c 0%, #ebb563 100%);
}

.status-danger {
  background: linear-gradient(90deg, #f56c6c 0%, #f78989 100%);
}
</style>
