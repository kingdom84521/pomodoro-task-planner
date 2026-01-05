<template>
  <div class="ratio-bar-container">
    <div class="ratio-bar-wrapper">
      <div
        v-for="(segment, index) in segments"
        :key="index"
        class="ratio-segment"
        :class="segment.status"
        :style="{ width: `${segment.percentage}%` }"
      >
        <span v-if="segment.percentage >= 10" class="segment-label">
          {{ segment.label }}
        </span>
      </div>
    </div>
    <div v-if="showLegend" class="ratio-legend">
      <div v-for="(segment, index) in segments" :key="index" class="legend-item">
        <span class="legend-color" :class="segment.status"></span>
        <span class="legend-text">{{ segment.label }}: {{ segment.percentage.toFixed(1) }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // Segments: [{ label, value, status }]
  segments: {
    type: Array,
    default: () => [],
  },
  // Show legend below the bar
  showLegend: {
    type: Boolean,
    default: true,
  },
  // Height of the bar
  height: {
    type: String,
    default: '40px',
  },
})

// Calculate percentages for each segment
const segments = computed(() => {
  if (!props.segments || props.segments.length === 0) return []

  const total = props.segments.reduce((sum, seg) => sum + (seg.value || 0), 0)

  return props.segments.map((seg) => ({
    label: seg.label || '',
    value: seg.value || 0,
    percentage: total > 0 ? (seg.value / total) * 100 : 0,
    status: seg.status || 'primary',
  }))
})
</script>

<style scoped>
.ratio-bar-container {
  width: 100%;
}

.ratio-bar-wrapper {
  width: 100%;
  height: v-bind(height);
  display: flex;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.ratio-segment {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  position: relative;
}

.ratio-segment:hover {
  filter: brightness(1.1);
}

.segment-label {
  font-size: 13px;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
}

/* Status colors */
.ratio-segment.primary {
  background: linear-gradient(90deg, #409eff 0%, #66b1ff 100%);
}

.ratio-segment.success {
  background: linear-gradient(90deg, #67c23a 0%, #85ce61 100%);
}

.ratio-segment.warning {
  background: linear-gradient(90deg, #e6a23c 0%, #ebb563 100%);
}

.ratio-segment.danger {
  background: linear-gradient(90deg, #f56c6c 0%, #f78989 100%);
}

.ratio-segment.info {
  background: linear-gradient(90deg, #909399 0%, #a6a9ad 100%);
}

.ratio-legend {
  display: flex;
  gap: 20px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 3px;
}

.legend-color.primary {
  background: #409eff;
}

.legend-color.success {
  background: #67c23a;
}

.legend-color.warning {
  background: #e6a23c;
}

.legend-color.danger {
  background: #f56c6c;
}

.legend-color.info {
  background: #909399;
}

.legend-text {
  font-size: 13px;
  color: var(--el-text-color-regular);
}
</style>
