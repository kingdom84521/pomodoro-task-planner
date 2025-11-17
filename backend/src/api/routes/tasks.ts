import { Router, Request, Response, NextFunction } from 'express';
import {
  createTask,
  getTaskById,
  getUserTasks,
  updateTask,
  deleteTask,
  getTaskStats,
} from '../../services/tasks/taskService';
import {
  createTaskValidation,
  updateTaskValidation,
  getTasksValidation,
} from '../validators/taskValidators';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/tasks
 * Get all tasks for authenticated user with optional filters
 */
router.get(
  '/',
  getTasksValidation,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Not authenticated');
      }

      const { status, grouping, dueBefore, dueAfter } = req.query;

      const tasks = await getUserTasks({
        userId: req.user.userId,
        status: status as any,
        grouping: grouping as string,
        dueBefore: dueBefore ? new Date(dueBefore as string) : undefined,
        dueAfter: dueAfter ? new Date(dueAfter as string) : undefined,
      });

      res.status(200).json({
        success: true,
        data: {
          tasks,
          count: tasks.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/tasks
 * Create a new task
 */
router.post(
  '/',
  createTaskValidation,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Not authenticated');
      }

      const { name, description, estimatedPomodoros, dueDate, grouping } = req.body;

      const task = await createTask({
        userId: req.user.userId,
        name,
        description,
        estimatedPomodoros,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        grouping,
      });

      res.status(201).json({
        success: true,
        data: { task },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/tasks/stats
 * Get task statistics for authenticated user
 */
router.get(
  '/stats',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Not authenticated');
      }

      const stats = await getTaskStats(req.user.userId);

      res.status(200).json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/tasks/:id
 * Get a specific task by ID
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Not authenticated');
      }

      const task = await getTaskById(req.params.id, req.user.userId);

      res.status(200).json({
        success: true,
        data: { task },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/tasks/:id
 * Update a task
 */
router.put(
  '/:id',
  updateTaskValidation,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Not authenticated');
      }

      const { name, description, estimatedPomodoros, status, dueDate, grouping } = req.body;

      const task = await updateTask(req.params.id, req.user.userId, {
        name,
        description,
        estimatedPomodoros,
        status,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        grouping,
      });

      res.status(200).json({
        success: true,
        data: { task },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/tasks/:id
 * Delete a task
 */
router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Not authenticated');
      }

      await deleteTask(req.params.id, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Task deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
