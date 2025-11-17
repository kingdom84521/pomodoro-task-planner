<template>
  <div class="break-timer bg-white rounded-lg shadow-lg p-8 text-center">
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-900 mb-2">
        {{ breakType === 'short' ? '☕ Short Break' : '🌴 Long Break' }}
      </h2>
      <p class="text-gray-600">Take a moment to relax and recharge</p>
    </div>

    <div class="timer-display mb-8">
      <div class="relative w-64 h-64 mx-auto">
        <!-- Progress Circle -->
        <svg class="transform -rotate-90 w-64 h-64">
          <circle
            cx="128"
            cy="128"
            r="120"
            stroke="#e5e7eb"
            stroke-width="8"
            fill="none"
          />
          <circle
            cx="128"
            cy="128"
            r="120"
            :stroke="breakType === 'short' ? '#10b981' : '#8b5cf6'"
            stroke-width="8"
            fill="none"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="dashOffset"
            class="transition-all duration-1000"
          />
        </svg>

        <!-- Time Display -->
        <div class="absolute inset-0 flex items-center justify-center">
          <div>
            <div class="text-6xl font-bold text-gray-900">{{ formattedTime }}</div>
            <div class="text-sm text-gray-500 mt-2">remaining</div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex gap-4 justify-center">
      <button
        @click="$emit('stop')"
        class="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
      >
        Skip Break
      </button>
      <button
        @click="$emit('extend')"
        class="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Add 5 Minutes
      </button>
    </div>

    <div v-if="!isRunning" class="mt-6 text-green-600 font-semibold">
      ✓ Break completed! Ready to continue?
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  breakType: 'short' | 'long';
  remaining: number; // milliseconds
  duration: number; // milliseconds
  isRunning: boolean;
}

const props = defineProps<Props>();

defineEmits<{
  stop: [];
  extend: [];
}>();

const formattedTime = computed(() => {
  const totalSeconds = Math.floor(props.remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
});

const circumference = 2 * Math.PI * 120; // r=120

const dashOffset = computed(() => {
  if (props.duration === 0) return 0;
  const progress = 1 - (props.remaining / props.duration);
  return circumference * progress;
});
</script>

<style scoped>
.break-timer {
  max-width: 500px;
  margin: 0 auto;
}
</style>
