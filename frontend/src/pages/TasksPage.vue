<template>
  <div class="tasks-page">
    <div class="header">
      <h1 class="title">My Tasks</h1>
      <AppButton @click="showCreateForm = true" variant="primary">
        + New Task
      </AppButton>
    </div>

    <div v-if="showCreateForm || editingTask" class="form-section">
      <TaskForm
        :task="editingTask"
        :is-loading="isLoading"
        :error="error"
        @submit="handleSubmit"
        @cancel="handleCancel"
      />
    </div>

    <div class="filters">
      <button
        v-for="status in ['all', 'pending', 'in-progress', 'completed']"
        :key="status"
        @click="setStatusFilter(status)"
        :class="['filter-btn', { active: currentFilter === status }]"
      >
        {{ status === 'all' ? 'All' : status.replace('-', ' ') }}
      </button>
    </div>

    <TaskList
      :tasks="filteredTasks"
      :is-loading="isLoading"
      :error="error"
      @edit="handleEdit"
      @delete="handleDelete"
      @select="handleSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useTasks } from '../composables/useTasks';
import TaskList from '../components/tasks/TaskList.vue';
import TaskForm from '../components/tasks/TaskForm.vue';
import AppButton from '../components/common/AppButton.vue';
import type { Task } from '../stores/taskStore';

const { tasks, fetchTasks, createTask, updateTask, deleteTask, isLoading, error } = useTasks();

const showCreateForm = ref(false);
const editingTask = ref<Task | undefined>();
const currentFilter = ref<string>('all');

const filteredTasks = computed(() => {
  if (currentFilter.value === 'all') return tasks.value;
  return tasks.value.filter(task => task.status === currentFilter.value);
});

const setStatusFilter = (status: string) => {
  currentFilter.value = status;
};

const handleSubmit = async (data: any) => {
  try {
    if (editingTask.value) {
      await updateTask(editingTask.value._id, data);
    } else {
      await createTask(data);
    }
    handleCancel();
    await fetchTasks();
  } catch (err) {
    console.error('Failed to save task:', err);
  }
};

const handleCancel = () => {
  showCreateForm.value = false;
  editingTask.value = undefined;
};

const handleEdit = (task: Task) => {
  editingTask.value = task;
  showCreateForm.value = false;
};

const handleDelete = async (taskId: string) => {
  if (confirm('Are you sure you want to delete this task?')) {
    try {
      await deleteTask(taskId);
      await fetchTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }
};

const handleSelect = (task: Task) => {
  // Navigate to Apply Mode with this task
  window.location.href = `/apply?taskId=${task._id}`;
};

onMounted(async () => {
  await fetchTasks();
});
</script>

<style scoped>
.tasks-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.title {
  font-size: 2rem;
  font-weight: bold;
  color: #111827;
}

.form-section {
  margin-bottom: 2rem;
}

.filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.filter-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  text-transform: capitalize;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: #f3f4f6;
}

.filter-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}
</style>
