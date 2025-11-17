import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface Task {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  estimatedPomodoros: number;
  actualPomodoros: number;
  status: 'pending' | 'in-progress' | 'completed';
  dueDate?: string;
  grouping?: string;
  pomodoroAccuracy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  name: string;
  description?: string;
  estimatedPomodoros: number;
  dueDate?: string;
  grouping?: string;
}

export interface UpdateTaskInput {
  name?: string;
  description?: string;
  estimatedPomodoros?: number;
  status?: 'pending' | 'in-progress' | 'completed';
  dueDate?: string;
  grouping?: string;
}

export interface TaskFilter {
  status?: 'pending' | 'in-progress' | 'completed';
  grouping?: string;
  dueBefore?: string;
  dueAfter?: string;
}

export const useTaskStore = defineStore('task', () => {
  // State
  const tasks = ref<Task[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const currentFilter = ref<TaskFilter>({});

  // Getters
  const pendingTasks = computed(() => tasks.value.filter(t => t.status === 'pending'));
  const inProgressTasks = computed(() => tasks.value.filter(t => t.status === 'in-progress'));
  const completedTasks = computed(() => tasks.value.filter(t => t.status === 'completed'));

  const tasksByGrouping = computed(() => {
    const grouped: Record<string, Task[]> = {};
    tasks.value.forEach(task => {
      const group = task.grouping || 'Ungrouped';
      if (!grouped[group]) {
        grouped[group] = [];
      }
      grouped[group].push(task);
    });
    return grouped;
  });

  const upcomingTasks = computed(() => {
    const now = new Date();
    return tasks.value
      .filter(t => t.dueDate && new Date(t.dueDate) > now && t.status !== 'completed')
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  });

  const overdueTasks = computed(() => {
    const now = new Date();
    return tasks.value
      .filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed');
  });

  // Actions
  const setTasks = (newTasks: Task[]): void => {
    tasks.value = newTasks;
  };

  const addTask = (task: Task): void => {
    tasks.value.unshift(task);
  };

  const updateTaskInStore = (taskId: string, updates: Partial<Task>): void => {
    const index = tasks.value.findIndex(t => t._id === taskId);
    if (index !== -1) {
      tasks.value[index] = { ...tasks.value[index], ...updates };
    }
  };

  const removeTask = (taskId: string): void => {
    tasks.value = tasks.value.filter(t => t._id !== taskId);
  };

  const getTaskById = (taskId: string): Task | undefined => {
    return tasks.value.find(t => t._id === taskId);
  };

  const setFilter = (filter: TaskFilter): void => {
    currentFilter.value = filter;
  };

  const clearFilter = (): void => {
    currentFilter.value = {};
  };

  const setLoading = (isLoading: boolean): void => {
    loading.value = isLoading;
  };

  const setError = (errorMessage: string | null): void => {
    error.value = errorMessage;
  };

  const clearError = (): void => {
    error.value = null;
  };

  // Reset store
  const $reset = (): void => {
    tasks.value = [];
    loading.value = false;
    error.value = null;
    currentFilter.value = {};
  };

  return {
    // State
    tasks,
    loading,
    error,
    currentFilter,

    // Getters
    pendingTasks,
    inProgressTasks,
    completedTasks,
    tasksByGrouping,
    upcomingTasks,
    overdueTasks,

    // Actions
    setTasks,
    addTask,
    updateTaskInStore,
    removeTask,
    getTaskById,
    setFilter,
    clearFilter,
    setLoading,
    setError,
    clearError,
    $reset,
  };
});
