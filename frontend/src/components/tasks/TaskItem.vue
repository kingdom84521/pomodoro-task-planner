<template>
  <div class="task-item p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
    <div class="flex items-start justify-between">
      <div class="flex-1 cursor-pointer" @click="$emit('select', task)">
        <div class="flex items-center gap-2 mb-1">
          <h3 class="text-lg font-semibold text-gray-900">{{ task.name }}</h3>
          <span
            :class="statusClass"
            class="px-2 py-1 text-xs font-medium rounded-full"
          >
            {{ task.status }}
          </span>
        </div>

        <p v-if="task.description" class="text-sm text-gray-600 mb-2">
          {{ task.description }}
        </p>

        <div class="flex items-center gap-4 text-sm text-gray-500">
          <span title="Estimated Pomodoros">
            📝 {{ task.estimatedPomodoros }} estimated
          </span>
          <span title="Actual Pomodoros">
            ✅ {{ task.actualPomodoros }} completed
          </span>
          <span v-if="task.grouping" class="text-blue-600">
            🏷️ {{ task.grouping }}
          </span>
          <span v-if="task.dueDate" :class="dueDateClass">
            📅 {{ formatDate(task.dueDate) }}
          </span>
        </div>

        <div v-if="pomodoroAccuracy !== null" class="mt-2">
          <div class="text-xs text-gray-600">
            Accuracy: <span :class="accuracyClass">{{ pomodoroAccuracy > 0 ? '+' : ''}}{{ pomodoroAccuracy.toFixed(0) }}%</span>
          </div>
        </div>
      </div>

      <div class="flex gap-2 ml-4">
        <button
          @click="$emit('edit', task)"
          class="p-2 text-blue-600 hover:bg-blue-50 rounded"
          title="Edit task"
        >
          ✏️
        </button>
        <button
          @click="$emit('delete', task._id)"
          class="p-2 text-red-600 hover:bg-red-50 rounded"
          title="Delete task"
        >
          🗑️
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Task } from '../../stores/taskStore';

const props = defineProps<{
  task: Task;
}>();

defineEmits<{
  edit: [task: Task];
  delete: [taskId: string];
  select: [task: Task];
}>();

const statusClass = computed(() => {
  switch (props.task.status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'in-progress':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
});

const dueDateClass = computed(() => {
  if (!props.task.dueDate) return '';
  const dueDate = new Date(props.task.dueDate);
  const now = new Date();
  return dueDate < now ? 'text-red-600 font-semibold' : '';
});

const pomodoroAccuracy = computed(() => {
  if (props.task.status !== 'completed' || props.task.estimatedPomodoros === 0) {
    return null;
  }
  return ((props.task.actualPomodoros - props.task.estimatedPomodoros) / props.task.estimatedPomodoros) * 100;
});

const accuracyClass = computed(() => {
  if (pomodoroAccuracy.value === null) return '';
  if (pomodoroAccuracy.value > 20) return 'text-red-600';
  if (pomodoroAccuracy.value < -10) return 'text-green-600';
  return 'text-yellow-600';
});

const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString();
};
</script>

<style scoped>
.task-item {
  transition: all 0.2s ease;
}
</style>
