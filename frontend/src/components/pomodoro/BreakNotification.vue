<template>
  <AppModal :model-value="show" @update:model-value="$emit('close')" title="Pomodoro Complete! 🎉">
    <div class="break-notification">
      <div class="success-message">
        <div class="icon">✓</div>
        <h3 class="title">Great work!</h3>
        <p class="description">You've completed a Pomodoro session.</p>
      </div>

      <div v-if="suggestedBreak" class="break-suggestion">
        <h4 class="break-title">Time for a {{ suggestedBreak.type }} break</h4>
        <div class="break-duration">{{ formatDuration(suggestedBreak.duration) }}</div>
        <p class="break-message">{{ suggestedBreak.message }}</p>
      </div>

      <div class="actions">
        <AppButton
          @click="$emit('start-break')"
          variant="primary"
          full-width
        >
          Start Break Timer
        </AppButton>
        <AppButton
          @click="$emit('continue-working')"
          variant="ghost"
          full-width
        >
          Continue Working
        </AppButton>
      </div>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import AppModal from '../common/AppModal.vue';
import AppButton from '../common/AppButton.vue';

defineProps<{
  show: boolean;
  suggestedBreak?: {
    type: 'short' | 'long';
    duration: number; // milliseconds
    message: string;
  };
}>();

defineEmits<{
  close: [];
  'start-break': [];
  'continue-working': [];
}>();

const formatDuration = (milliseconds: number): string => {
  const minutes = Math.floor(milliseconds / 60000);
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
};
</script>

<style scoped>
.break-notification {
  text-align: center;
  padding: 1rem;
}

.success-message {
  margin-bottom: 2rem;
}

.icon {
  font-size: 4rem;
  color: #10b981;
  margin-bottom: 1rem;
}

.title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #111827;
  margin-bottom: 0.5rem;
}

.description {
  color: #6b7280;
}

.break-suggestion {
  background: #f3f4f6;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.break-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.5rem;
}

.break-duration {
  font-size: 2rem;
  font-weight: bold;
  color: #3b82f6;
  margin-bottom: 0.5rem;
}

.break-message {
  color: #6b7280;
  font-size: 0.9rem;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
