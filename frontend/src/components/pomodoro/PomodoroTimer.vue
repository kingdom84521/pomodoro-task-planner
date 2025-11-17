<template>
  <div class="pomodoro-timer">
    <div class="timer-display">
      <div class="time-text">{{ formattedTime }}</div>
      <div class="progress-bar-container">
        <div
          class="progress-bar"
          :style="{ width: `${progress}%` }"
        ></div>
      </div>
      <div class="timer-info">
        <span v-if="taskName" class="task-name">{{ taskName }}</span>
        <span class="timer-status">
          {{ isRunning ? 'Running' : isPaused ? 'Paused' : 'Ready' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  remaining: number; // milliseconds
  elapsed: number; // milliseconds
  progress: number; // percentage 0-100
  isRunning: boolean;
  isPaused: boolean;
  taskName?: string;
}>();

const formattedTime = computed(() => {
  const totalSeconds = Math.floor(props.remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
});
</script>

<style scoped>
.pomodoro-timer {
  text-align: center;
  padding: 2rem;
}

.timer-display {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 3rem 2rem;
  color: white;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
}

.time-text {
  font-size: 4rem;
  font-weight: bold;
  font-family: 'Courier New', monospace;
  margin-bottom: 1rem;
}

.progress-bar-container {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.progress-bar {
  height: 100%;
  background: rgba(255, 255, 255, 0.9);
  transition: width 0.3s ease;
  border-radius: 4px;
}

.timer-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  opacity: 0.9;
}

.task-name {
  font-weight: 500;
  max-width: 70%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.timer-status {
  font-size: 0.85rem;
  padding: 0.25rem 0.75rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
}
</style>
