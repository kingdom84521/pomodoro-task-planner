<template>
  <div class="task-form">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <h3 class="text-xl font-bold text-gray-900 mb-4">
        {{ isEditMode ? 'Edit Task' : 'Create New Task' }}
      </h3>

      <AppInput
        v-model="formData.name"
        label="Task Name"
        placeholder="Enter task name"
        :error="errors.name"
        :disabled="isLoading"
        required
      />

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
        <textarea
          v-model="formData.description"
          placeholder="Enter task description"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="3"
          :disabled="isLoading"
        ></textarea>
      </div>

      <AppInput
        v-model.number="formData.estimatedPomodoros"
        type="number"
        label="Estimated Pomodoros"
        placeholder="How many Pomodoros do you estimate?"
        :error="errors.estimatedPomodoros"
        :disabled="isLoading"
        min="1"
        required
      />

      <AppInput
        v-model="formData.dueDate"
        type="date"
        label="Due Date (Optional)"
        :error="errors.dueDate"
        :disabled="isLoading"
      />

      <AppInput
        v-model="formData.grouping"
        label="Category/Group (Optional)"
        placeholder="e.g., Work, Personal, Study"
        :disabled="isLoading"
      />

      <div v-if="isEditMode">
        <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select
          v-model="formData.status"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          :disabled="isLoading"
        >
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div v-if="error" class="text-red-600 text-sm">
        {{ error }}
      </div>

      <div class="flex gap-2">
        <AppButton
          type="submit"
          :loading="isLoading"
          :disabled="isLoading"
        >
          {{ isEditMode ? 'Update Task' : 'Create Task' }}
        </AppButton>
        <AppButton
          type="button"
          variant="ghost"
          @click="$emit('cancel')"
          :disabled="isLoading"
        >
          Cancel
        </AppButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from 'vue';
import AppInput from '../common/AppInput.vue';
import AppButton from '../common/AppButton.vue';
import type { Task } from '../../stores/taskStore';

const props = defineProps<{
  task?: Task;
  isLoading?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  submit: [data: any];
  cancel: [];
}>();

const isEditMode = computed(() => !!props.task);

const formData = reactive({
  name: '',
  description: '',
  estimatedPomodoros: 1,
  dueDate: '',
  grouping: '',
  status: 'pending' as 'pending' | 'in-progress' | 'completed',
});

const errors = reactive({
  name: '',
  estimatedPomodoros: '',
  dueDate: '',
});

// Load task data if editing
watch(() => props.task, (task) => {
  if (task) {
    formData.name = task.name;
    formData.description = task.description || '';
    formData.estimatedPomodoros = task.estimatedPomodoros;
    formData.dueDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';
    formData.grouping = task.grouping || '';
    formData.status = task.status;
  }
}, { immediate: true });

const validateForm = (): boolean => {
  let isValid = true;
  errors.name = '';
  errors.estimatedPomodoros = '';
  errors.dueDate = '';

  if (!formData.name || formData.name.length < 3) {
    errors.name = 'Task name must be at least 3 characters';
    isValid = false;
  }

  if (!formData.estimatedPomodoros || formData.estimatedPomodoros < 1) {
    errors.estimatedPomodoros = 'Estimated Pomodoros must be at least 1';
    isValid = false;
  }

  if (formData.dueDate) {
    const dueDate = new Date(formData.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dueDate < today) {
      errors.dueDate = 'Due date cannot be in the past';
      isValid = false;
    }
  }

  return isValid;
};

const handleSubmit = () => {
  if (!validateForm()) {
    return;
  }

  const data: any = {
    name: formData.name,
    description: formData.description || undefined,
    estimatedPomodoros: formData.estimatedPomodoros,
    dueDate: formData.dueDate || undefined,
    grouping: formData.grouping || undefined,
  };

  if (isEditMode.value) {
    data.status = formData.status;
  }

  emit('submit', data);
};
</script>

<style scoped>
.task-form {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
