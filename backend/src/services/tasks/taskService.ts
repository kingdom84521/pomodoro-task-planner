import { Task, ITask } from '../../models/Task';
import { AppError } from '../../api/middleware/errorHandler';
import mongoose from 'mongoose';

export interface CreateTaskInput {
  userId: string;
  name: string;
  description?: string;
  estimatedPomodoros: number;
  dueDate?: Date;
  grouping?: string;
}

export interface UpdateTaskInput {
  name?: string;
  description?: string;
  estimatedPomodoros?: number;
  status?: 'pending' | 'in-progress' | 'completed';
  dueDate?: Date;
  grouping?: string;
}

export interface GetTasksFilter {
  userId: string;
  status?: 'pending' | 'in-progress' | 'completed';
  grouping?: string;
  dueBefore?: Date;
  dueAfter?: Date;
}

/**
 * Create a new task
 */
export async function createTask(input: CreateTaskInput): Promise<ITask> {
  const task = new Task({
    userId: input.userId,
    name: input.name,
    description: input.description,
    estimatedPomodoros: input.estimatedPomodoros,
    dueDate: input.dueDate,
    grouping: input.grouping,
    status: 'pending',
    actualPomodoros: 0,
  });

  await task.save();
  return task;
}

/**
 * Get task by ID
 */
export async function getTaskById(taskId: string, userId: string): Promise<ITask> {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw new AppError(400, 'Invalid task ID format');
  }

  const task = await Task.findOne({ _id: taskId, userId });

  if (!task) {
    throw new AppError(404, 'Task not found');
  }

  return task;
}

/**
 * Get all tasks for a user with optional filtering
 */
export async function getUserTasks(filter: GetTasksFilter): Promise<ITask[]> {
  const query: any = {
    userId: filter.userId,
  };

  if (filter.status) {
    query.status = filter.status;
  }

  if (filter.grouping) {
    query.grouping = filter.grouping;
  }

  if (filter.dueBefore || filter.dueAfter) {
    query.dueDate = {};
    if (filter.dueBefore) {
      query.dueDate.$lte = filter.dueBefore;
    }
    if (filter.dueAfter) {
      query.dueDate.$gte = filter.dueAfter;
    }
  }

  return await Task.find(query).sort({ createdAt: -1 });
}

/**
 * Update a task
 */
export async function updateTask(
  taskId: string,
  userId: string,
  updates: UpdateTaskInput
): Promise<ITask> {
  const task = await getTaskById(taskId, userId);

  // Apply updates
  if (updates.name !== undefined) task.name = updates.name;
  if (updates.description !== undefined) task.description = updates.description;
  if (updates.estimatedPomodoros !== undefined)
    task.estimatedPomodoros = updates.estimatedPomodoros;
  if (updates.status !== undefined) task.status = updates.status;
  if (updates.dueDate !== undefined) task.dueDate = updates.dueDate;
  if (updates.grouping !== undefined) task.grouping = updates.grouping;

  await task.save();
  return task;
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string, userId: string): Promise<void> {
  const task = await getTaskById(taskId, userId);
  await task.deleteOne();
}

/**
 * Increment actual Pomodoros count
 */
export async function incrementActualPomodoros(taskId: string): Promise<ITask> {
  const task = await Task.findById(taskId);

  if (!task) {
    throw new AppError(404, 'Task not found');
  }

  task.actualPomodoros += 1;

  // Auto-complete task if actual >= estimated
  if (task.actualPomodoros >= task.estimatedPomodoros && task.status !== 'completed') {
    task.status = 'completed';
  }

  await task.save();
  return task;
}

/**
 * Get task completion statistics
 */
export async function getTaskStats(userId: string) {
  const tasks = await Task.find({ userId });

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
  const pending = tasks.filter((t) => t.status === 'pending').length;

  return {
    total,
    completed,
    inProgress,
    pending,
    completionRate: total > 0 ? (completed / total) * 100 : 0,
  };
}

export default {
  createTask,
  getTaskById,
  getUserTasks,
  updateTask,
  deleteTask,
  incrementActualPomodoros,
  getTaskStats,
};
