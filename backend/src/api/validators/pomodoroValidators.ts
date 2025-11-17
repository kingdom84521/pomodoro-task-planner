import { body, ValidationChain } from 'express-validator';

/**
 * Validation rules for starting a Pomodoro session
 */
export const startPomodoroValidation: ValidationChain[] = [
  body('taskId')
    .isMongoId()
    .withMessage('Task ID must be a valid MongoDB ObjectId'),

  body('duration')
    .optional()
    .isInt({ min: 60000, max: 7200000 })
    .withMessage('Duration must be between 60000 (1 minute) and 7200000 (2 hours) milliseconds'),
];

/**
 * Validation rules for completing a Pomodoro session
 */
export const completePomodoroValidation: ValidationChain[] = [
  body('sessionId')
    .isMongoId()
    .withMessage('Session ID must be a valid MongoDB ObjectId'),
];

/**
 * Validation rules for pausing/aborting a Pomodoro session
 */
export const pausePomodoroValidation: ValidationChain[] = [
  body('sessionId')
    .isMongoId()
    .withMessage('Session ID must be a valid MongoDB ObjectId'),
];

/**
 * Validation rules for logging an interruption
 */
export const interruptionValidation: ValidationChain[] = [
  body('sessionId')
    .isMongoId()
    .withMessage('Session ID must be a valid MongoDB ObjectId'),

  body('type')
    .isIn(['urgent', 'break'])
    .withMessage('Interruption type must be either urgent or break'),

  body('duration')
    .isInt({ min: 0 })
    .withMessage('Duration must be a positive integer in milliseconds'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters'),
];

export default {
  startPomodoroValidation,
  completePomodoroValidation,
  pausePomodoroValidation,
  interruptionValidation,
};
