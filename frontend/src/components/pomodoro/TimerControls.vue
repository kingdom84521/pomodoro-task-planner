<template>
  <div class="timer-controls">
    <div class="controls-grid">
      <AppButton
        v-if="!hasActiveSession"
        @click="$emit('start')"
        :disabled="disabled || isLoading"
        :loading="isLoading"
        variant="primary"
        size="large"
      >
        🍅 Start Pomodoro
      </AppButton>

      <template v-else>
        <AppButton
          v-if="!isPaused"
          @click="$emit('pause')"
          :disabled="disabled || isLoading"
          variant="secondary"
          size="large"
        >
          ⏸️ Pause
        </AppButton>

        <AppButton
          v-else
          @click="$emit('resume')"
          :disabled="disabled || isLoading"
          variant="primary"
          size="large"
        >
          ▶️ Resume
        </AppButton>

        <AppButton
          @click="$emit('complete')"
          :disabled="disabled || isLoading"
          :loading="isLoading"
          variant="success"
          size="large"
        >
          ✓ Complete
        </AppButton>

        <AppButton
          @click="$emit('cancel')"
          :disabled="disabled || isLoading"
          variant="danger"
          size="large"
        >
          ✕ Cancel
        </AppButton>
      </template>
    </div>

    <div v-if="completedToday > 0" class="completed-info">
      🎉 {{ completedToday }} Pomodoro{{ completedToday > 1 ? 's' : '' }} completed today!
    </div>
  </div>
</template>

<script setup lang="ts">
import AppButton from '../common/AppButton.vue';

defineProps<{
  hasActiveSession: boolean;
  isPaused: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  completedToday?: number;
}>();

defineEmits<{
  start: [];
  pause: [];
  resume: [];
  complete: [];
  cancel: [];
}>();
</script>

<style scoped>
.timer-controls {
  margin-top: 2rem;
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.completed-info {
  text-align: center;
  padding: 1rem;
  background: #f0f9ff;
  border-radius: 8px;
  color: #0369a1;
  font-weight: 500;
  margin-top: 1rem;
}
</style>
