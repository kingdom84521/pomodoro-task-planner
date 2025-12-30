<template>
  <div class="timer-display-wrapper">
    <!-- Timer ring (only for countdown mode or when showRing is true) -->
    <div
      v-if="showRing"
      class="timer-ring-wrapper"
      :class="{ 'collapsed': collapsed }"
    >
      <svg class="timer-ring" viewBox="0 0 200 200">
        <!-- Background ring -->
        <circle
          class="timer-ring-bg"
          cx="100"
          cy="100"
          r="90"
          fill="none"
          stroke-width="8"
        />
        <!-- Progress ring -->
        <circle
          class="timer-ring-progress"
          :class="progressClasses"
          cx="100"
          cy="100"
          r="90"
          fill="none"
          stroke-width="8"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="progressOffset"
          stroke-linecap="round"
        />
        <!-- Trailing glow dot -->
        <g
          class="glow-group"
          :class="{ 'no-transition': noTransition, 'idle': status === 'idle' }"
          :style="{ transform: `rotate(${dotAngle}deg)` }"
        >
          <circle
            class="glow-dot"
            :class="glowDotClasses"
            cx="100"
            cy="10"
            r="5"
            fill="white"
          />
        </g>
      </svg>
    </div>

    <!-- Mode indicator (optional) -->
    <div v-if="modeLabel" class="mode-indicator" :class="modeClass">
      {{ modeLabel }}
    </div>

    <!-- Time display -->
    <div class="timer-display" :class="timerDisplayClasses">
      {{ formattedTime }}
    </div>

    <!-- Progress bar (for collapsed mode) -->
    <div v-if="showProgressBar" class="progress-bar-container" :class="{ 'visible': collapsed }">
      <div class="progress-bar">
        <div
          class="progress-bar-fill"
          :class="progressBarClasses"
          :style="{ width: progressPercent + '%' }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // Mode: 'countdown' or 'stopwatch'
  mode: {
    type: String,
    default: 'countdown',
    validator: (v) => ['countdown', 'stopwatch'].includes(v),
  },
  // Elapsed time in seconds
  elapsed: {
    type: Number,
    default: 0,
  },
  // Total time in seconds (for countdown mode)
  total: {
    type: Number,
    default: 1500,
  },
  // Timer status: 'idle', 'running', 'paused'
  status: {
    type: String,
    default: 'idle',
    validator: (v) => ['idle', 'running', 'paused'].includes(v),
  },
  // Timer type for styling: 'focus', 'short-break', 'long-break', 'meeting'
  timerType: {
    type: String,
    default: 'focus',
  },
  // Mode label to display
  modeLabel: {
    type: String,
    default: '',
  },
  // Whether to show the progress ring
  showRing: {
    type: Boolean,
    default: true,
  },
  // Whether the ring is collapsed
  collapsed: {
    type: Boolean,
    default: false,
  },
  // Whether to show progress bar when collapsed
  showProgressBar: {
    type: Boolean,
    default: true,
  },
  // Disable transitions (for state restoration)
  noTransition: {
    type: Boolean,
    default: false,
  },
})

// Ring circumference
const circumference = 2 * Math.PI * 90

// Formatted time display (MM:SS)
const formattedTime = computed(() => {
  const time = props.mode === 'countdown'
    ? props.total - props.elapsed
    : props.elapsed

  const totalSeconds = Math.max(0, Math.floor(time))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

// Progress percent (0-100)
const progressPercent = computed(() => {
  if (props.status === 'idle') return props.mode === 'countdown' ? 0 : 0
  if (props.mode === 'countdown') {
    // Countdown: starts full, goes to 0
    return ((props.total - props.elapsed) / props.total) * 100
  } else {
    // Stopwatch: no progress ring (or could show elapsed as percentage of some max)
    return 0
  }
})

// Progress ring offset
const progressOffset = computed(() => {
  if (props.status === 'idle') return circumference
  if (props.mode === 'countdown') {
    const progress = (props.total - props.elapsed) / props.total
    return circumference * (1 - progress)
  }
  return circumference
})

// Dot angle
const dotAngle = computed(() => {
  const fillProgress = 1 - (progressOffset.value / circumference)
  return fillProgress * 360
})

// Whether it's a break mode
const isBreakMode = computed(() => {
  return ['short-break', 'long-break'].includes(props.timerType)
})

// Mode indicator class
const modeClass = computed(() => {
  if (['short-break', 'long-break'].includes(props.timerType)) return 'break'
  if (props.timerType === 'meeting') return 'meeting'
  return 'focus'
})

// Progress ring classes
const progressClasses = computed(() => ({
  'running': props.status === 'running',
  'paused': props.status === 'paused',
  'break-mode': isBreakMode.value,
  'meeting-mode': props.timerType === 'meeting',
  'no-transition': props.noTransition,
}))

// Glow dot classes
const glowDotClasses = computed(() => ({
  'paused': props.status === 'paused',
  'break-mode': isBreakMode.value,
  'meeting-mode': props.timerType === 'meeting',
}))

// Timer display classes
const timerDisplayClasses = computed(() => ({
  'timer-running': props.status === 'running',
  'timer-paused': props.status === 'paused',
  'break-mode': isBreakMode.value,
  'meeting-mode': props.timerType === 'meeting',
}))

// Progress bar classes
const progressBarClasses = computed(() => ({
  'running': props.status === 'running',
  'paused': props.status === 'paused',
  'break-mode': isBreakMode.value,
  'meeting-mode': props.timerType === 'meeting',
}))
</script>

<style scoped>
.timer-display-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 280px;
}

.timer-ring-wrapper {
  position: absolute;
  width: 280px;
  height: 280px;
  transition: transform 0.15s ease, opacity 0.08s ease-in;

  &.collapsed {
    transform: scale(0);
    opacity: 0;
    pointer-events: none;
  }
}

.timer-ring {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.timer-ring-bg {
  stroke: #ebeef5;
}

.timer-ring-progress {
  stroke: #909399;
  transform: rotate(-90deg);
  transform-origin: 100px 100px;
  transition: stroke-dashoffset 0.5s ease-out;

  &.running {
    stroke: #409eff;
  }

  &.running.break-mode {
    stroke: #8b5cf6;
  }

  &.running.meeting-mode {
    stroke: #10b981;
  }

  &.paused {
    stroke: #e6a23c;
  }

  &.no-transition {
    transition: none;
  }
}

/* Glow group: rotate around center */
:deep(.glow-group) {
  transform-origin: 100px 100px;
  transition: transform 0.5s ease-out;

  &.idle {
    opacity: 0;
  }

  &.no-transition {
    transition: none;
  }
}

/* Glow dot styles */
:deep(.glow-dot) {
  filter: drop-shadow(0 0 6px white) drop-shadow(0 0 10px rgba(64, 158, 255, 0.8));

  &.break-mode {
    filter: drop-shadow(0 0 6px white) drop-shadow(0 0 10px rgba(139, 92, 246, 0.8));
  }

  &.meeting-mode {
    filter: drop-shadow(0 0 6px white) drop-shadow(0 0 10px rgba(16, 185, 129, 0.8));
  }

  &.paused {
    filter: drop-shadow(0 0 6px white) drop-shadow(0 0 10px rgba(230, 162, 60, 0.8));
  }
}

.mode-indicator {
  font-size: 14px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 12px;
  margin-bottom: 8px;
  user-select: none;

  &.focus {
    background: #ecf5ff;
    color: #409eff;
  }

  &.break {
    background: #f3e8ff;
    color: #8b5cf6;
  }

  &.meeting {
    background: #d1fae5;
    color: #059669;
  }
}

.timer-display {
  font-size: 40px;
  font-weight: 700;
  font-family: 'Courier New', Courier, monospace;
  text-align: center;
  color: #303133;
  letter-spacing: 2px;
  user-select: none;

  &.timer-running {
    color: #409eff;
  }

  &.timer-paused {
    color: #e6a23c;
  }

  &.break-mode.timer-running {
    color: #8b5cf6;
  }

  &.meeting-mode.timer-running {
    color: #10b981;
  }
}

.progress-bar-container {
  width: 200px;
  height: 0;
  overflow: clip;
  transition: height 0.15s ease, margin 0.15s ease;

  &.visible {
    height: 20px;
    margin-top: 6px;
    overflow: visible;
  }
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #ebeef5;
  border-radius: 4px;
  margin-top: 6px;
}

.progress-bar-fill {
  height: 100%;
  background: #909399;
  border-radius: 4px;
  transition: width 0.5s ease;
  position: relative;

  &.running {
    background: #409eff;

    &::after {
      content: '';
      position: absolute;
      right: -4px;
      top: 50%;
      transform: translateY(-50%);
      width: 10px;
      height: 10px;
      background: white;
      border-radius: 50%;
      box-shadow:
        0 0 6px 2px rgba(64, 158, 255, 0.8),
        0 0 12px 4px rgba(64, 158, 255, 0.5);
      animation: breathe-bar-glow 2s ease-in-out infinite;
    }
  }

  &.running.break-mode {
    background: #8b5cf6;

    &::after {
      box-shadow:
        0 0 6px 2px rgba(139, 92, 246, 0.8),
        0 0 12px 4px rgba(139, 92, 246, 0.5);
    }
  }

  &.running.meeting-mode {
    background: #10b981;

    &::after {
      box-shadow:
        0 0 6px 2px rgba(16, 185, 129, 0.8),
        0 0 12px 4px rgba(16, 185, 129, 0.5);
    }
  }

  &.paused {
    background: #e6a23c;
  }
}

@keyframes breathe-bar-glow {
  0%, 100% {
    opacity: 0.6;
    transform: translateY(-50%) scale(0.8);
  }
  50% {
    opacity: 1;
    transform: translateY(-50%) scale(1.2);
  }
}
</style>
