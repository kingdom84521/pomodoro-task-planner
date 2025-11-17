import { computed } from 'vue';
import { useTaskStore } from '../stores/taskStore';
import {
  fetchTasks as fetchTasksApi,
  createTask as createTaskApi,
  updateTask as updateTaskApi,
  deleteTask as deleteTaskApi,
  getTaskStats as getTaskStatsApi,
} from '../services/taskApi';
import type { CreateTaskInput, UpdateTaskInput, GetTasksParams } from '../services/taskApi';

/**
 * Composable for task management operations
 * Provides reactive task state and CRUD methods
 */
export function useTasks() {
  const taskStore = useTaskStore();

  // Computed properties
  const tasks = computed(() => taskStore.tasks);
  const pendingTasks = computed(() => taskStore.pendingTasks);
  const inProgressTasks = computed(() => taskStore.inProgressTasks);
  const completedTasks = computed(() => taskStore.completedTasks);
  const tasksByGrouping = computed(() => taskStore.tasksByGrouping);
  const upcomingTasks = computed(() => taskStore.upcomingTasks);
  const overdueTasks = computed(() => taskStore.overdueTasks);
  const isLoading = computed(() => taskStore.loading);
  const error = computed(() => taskStore.error);

  /**
   * Fetch all tasks with optional filters
   */
  const fetchTasks = async (params?: GetTasksParams): Promise<void> => {
    taskStore.setLoading(true);
    taskStore.clearError();

    try {
      await fetchTasksApi(params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tasks';
      taskStore.setError(errorMessage);
      throw error;
    } finally {
      taskStore.setLoading(false);
    }
  };

  /**
   * Create a new task
   */
  const createTask = async (input: CreateTaskInput): Promise<void> => {
    taskStore.setLoading(true);
    taskStore.clearError();

    try {
      await createTaskApi(input);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create task';
      taskStore.setError(errorMessage);
      throw error;
    } finally {
      taskStore.setLoading(false);
    }
  };

  /**
   * Update an existing task
   */
  const updateTask = async (taskId: string, input: UpdateTaskInput): Promise<void> => {
    taskStore.setLoading(true);
    taskStore.clearError();

    try {
      await updateTaskApi(taskId, input);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update task';
      taskStore.setError(errorMessage);
      throw error;
    } finally {
      taskStore.setLoading(false);
    }
  };

  /**
   * Delete a task
   */
  const deleteTask = async (taskId: string): Promise<void> => {
    taskStore.setLoading(true);
    taskStore.clearError();

    try {
      await deleteTaskApi(taskId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete task';
      taskStore.setError(errorMessage);
      throw error;
    } finally {
      taskStore.setLoading(false);
    }
  };

  /**
   * Get task by ID from store
   */
  const getTaskById = (taskId: string) => {
    return taskStore.getTaskById(taskId);
  };

  /**
   * Set filter for tasks
   */
  const setFilter = (filter: any): void => {
    taskStore.setFilter(filter);
  };

  /**
   * Clear current filter
   */
  const clearFilter = (): void => {
    taskStore.clearFilter();
  };

  /**
   * Fetch task statistics
   */
  const fetchTaskStats = async () => {
    taskStore.setLoading(true);
    taskStore.clearError();

    try {
      return await getTaskStatsApi();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch task stats';
      taskStore.setError(errorMessage);
      throw error;
    } finally {
      taskStore.setLoading(false);
    }
  };

  return {
    // State
    tasks,
    pendingTasks,
    inProgressTasks,
    completedTasks,
    tasksByGrouping,
    upcomingTasks,
    overdueTasks,
    isLoading,
    error,

    // Actions
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    getTaskById,
    setFilter,
    clearFilter,
    fetchTaskStats,
  };
}
