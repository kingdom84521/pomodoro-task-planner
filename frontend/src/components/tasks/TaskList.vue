<template>
  <div class="task-list">
    <div v-if="isLoading" class="text-center py-8">
      <p class="text-gray-600">Loading tasks...</p>
    </div>

    <div v-else-if="error" class="text-red-600 text-center py-8">
      {{ error }}
    </div>

    <div v-else-if="tasks.length === 0" class="text-center py-8 text-gray-500">
      <p>No tasks yet. Create your first task to get started!</p>
    </div>

    <div v-else class="space-y-3">
      <TaskItem
        v-for="task in tasks"
        :key="task._id"
        :task="task"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import TaskItem from './TaskItem.vue';
import type { Task } from '../../stores/taskStore';

defineProps<{
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
}>();

defineEmits<{
  edit: [task: Task];
  delete: [taskId: string];
  select: [task: Task];
}>();
</script>

<style scoped>
.task-list {
  width: 100%;
}
</style>
