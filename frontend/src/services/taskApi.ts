import { apiClient, ApiResponse } from './api';
import { useTaskStore, Task } from '../stores/taskStore';

export interface CreateTaskInput {
  name: string;
  description?: string;
  estimatedPomodoros: number;
  dueDate?: Date | string;
  grouping?: string;
}

export interface UpdateTaskInput {
  name?: string;
  description?: string;
  estimatedPomodoros?: number;
  status?: 'pending' | 'in-progress' | 'completed';
  dueDate?: Date | string;
  grouping?: string;
}

export interface GetTasksParams {
  status?: 'pending' | 'in-progress' | 'completed';
  grouping?: string;
  dueBefore?: Date | string;
  dueAfter?: Date | string;
}

export interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  averageAccuracy: number;
  totalPomodoros: number;
}

/**
 * Fetch all tasks for the current user with optional filters
 */
export async function fetchTasks(params?: GetTasksParams): Promise<Task[]> {
  const response = await apiClient.get<ApiResponse<{ tasks: Task[]; count: number }>>(
    '/tasks',
    { params }
  );

  if (!response.data.success || !response.data.data) {
    throw new Error('Failed to fetch tasks');
  }

  const { tasks } = response.data.data;

  // Update task store
  const taskStore = useTaskStore();
  taskStore.setTasks(tasks);

  return tasks;
}

/**
 * Create a new task
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  const response = await apiClient.post<ApiResponse<{ task: Task }>>(
    '/tasks',
    input
  );

  if (!response.data.success || !response.data.data) {
    throw new Error('Failed to create task');
  }

  const { task } = response.data.data;

  // Update task store
  const taskStore = useTaskStore();
  taskStore.addTask(task);

  return task;
}

/**
 * Get a specific task by ID
 */
export async function getTaskById(taskId: string): Promise<Task> {
  const response = await apiClient.get<ApiResponse<{ task: Task }>>(
    `/tasks/${taskId}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error('Failed to fetch task');
  }

  const { task } = response.data.data;

  // Update task store
  const taskStore = useTaskStore();
  taskStore.updateTaskInStore(task._id, task);

  return task;
}

/**
 * Update an existing task
 */
export async function updateTask(taskId: string, input: UpdateTaskInput): Promise<Task> {
  const response = await apiClient.put<ApiResponse<{ task: Task }>>(
    `/tasks/${taskId}`,
    input
  );

  if (!response.data.success || !response.data.data) {
    throw new Error('Failed to update task');
  }

  const { task } = response.data.data;

  // Update task store
  const taskStore = useTaskStore();
  taskStore.updateTaskInStore(taskId, task);

  return task;
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<void> {
  const response = await apiClient.delete<ApiResponse<{ message: string }>>(
    `/tasks/${taskId}`
  );

  if (!response.data.success) {
    throw new Error('Failed to delete task');
  }

  // Update task store
  const taskStore = useTaskStore();
  taskStore.removeTask(taskId);
}

/**
 * Get task statistics
 */
export async function getTaskStats(): Promise<TaskStats> {
  const response = await apiClient.get<ApiResponse<{ stats: TaskStats }>>(
    '/tasks/stats'
  );

  if (!response.data.success || !response.data.data) {
    throw new Error('Failed to fetch task statistics');
  }

  return response.data.data.stats;
}

export default {
  fetchTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskStats,
};
