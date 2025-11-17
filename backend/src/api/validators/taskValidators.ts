import { body, query, ValidationChain } from 'express-validator';

/**
 * Validation rules for creating a task
 */
export const createTaskValidation: ValidationChain[] = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Task name must be between 3 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),

  body('estimatedPomodoros')
    .isInt({ min: 1, max: 100 })
    .withMessage('Estimated Pomodoros must be between 1 and 100'),

  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date')
    .custom((value) => {
      const date = new Date(value);
      if (date <= new Date()) {
        throw new Error('Due date must be in the future');
      }
      return true;
    }),

  body('grouping')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Grouping must not exceed 50 characters'),
];

/**
 * Validation rules for updating a task
 */
export const updateTaskValidation: ValidationChain[] = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Task name must be between 3 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),

  body('estimatedPomodoros')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Estimated Pomodoros must be between 1 and 100'),

  body('status')
    .optional()
    .isIn(['pending', 'in-progress', 'completed'])
    .withMessage('Status must be pending, in-progress, or completed'),

  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date'),

  body('grouping')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Grouping must not exceed 50 characters'),
];

/**
 * Validation rules for getting tasks with filters
 */
export const getTasksValidation: ValidationChain[] = [
  query('status')
    .optional()
    .isIn(['pending', 'in-progress', 'completed'])
    .withMessage('Status must be pending, in-progress, or completed'),

  query('grouping')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Grouping must not exceed 50 characters'),

  query('dueBefore')
    .optional()
    .isISO8601()
    .withMessage('dueBefore must be a valid ISO 8601 date'),

  query('dueAfter')
    .optional()
    .isISO8601()
    .withMessage('dueAfter must be a valid ISO 8601 date'),
];

export default {
  createTaskValidation,
  updateTaskValidation,
  getTasksValidation,
};
