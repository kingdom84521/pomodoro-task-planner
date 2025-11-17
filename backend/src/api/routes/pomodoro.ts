import { Router, Request, Response, NextFunction } from 'express';
import {
  startSession,
  completeSession,
  pauseSession,
  getActiveSession,
  getUserSessions,
  getSuggestedBreak,
} from '../../services/pomodoro/pomodoroService';
import {
  startPomodoroValidation,
  completePomodoroValidation,
  pausePomodoroValidation,
} from '../validators/pomodoroValidators';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { AppError } from '../middleware/errorHandler';
import App from '../../server';
import {
  startPomodoroTimer,
  stopPomodoroTimer,
  emitPomodoroPaused,
} from '../../sockets/pomodoroSocket';
import {
  emitPomodoroCompleteNotification,
  emitBreakTimeNotification,
} from '../../sockets/notificationSocket';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/pomodoro/start
 * Start a new Pomodoro session
 */
router.post(
  '/start',
  startPomodoroValidation,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Not authenticated');
      }

      const { taskId, duration } = req.body;

      const session = await startSession({
        userId: req.user.userId,
        taskId,
        duration,
      });

      // Start Socket.io timer
      const io = App.getInstance().getIO();
      startPomodoroTimer(io, session);

      res.status(201).json({
        success: true,
        data: { session },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/pomodoro/complete
 * Complete a Pomodoro session
 */
router.post(
  '/complete',
  completePomodoroValidation,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Not authenticated');
      }

      const { sessionId } = req.body;

      const session = await completeSession({
        sessionId,
        userId: req.user.userId,
      });

      // Stop Socket.io timer
      const io = App.getInstance().getIO();
      stopPomodoroTimer(sessionId);

      // Emit completion notification
      const task = session.taskId as any;
      const taskName = task?.name || 'Unknown Task';
      emitPomodoroCompleteNotification(io, req.user.userId, taskName);

      // Get and emit suggested break
      const breakSuggestion = await getSuggestedBreak(req.user.userId);
      emitBreakTimeNotification(
        io,
        req.user.userId,
        breakSuggestion.breakType,
        breakSuggestion.duration
      );

      res.status(200).json({
        success: true,
        data: { session },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/pomodoro/pause
 * Pause/abort a Pomodoro session
 */
router.post(
  '/pause',
  pausePomodoroValidation,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Not authenticated');
      }

      const { sessionId } = req.body;

      const session = await pauseSession({
        sessionId,
        userId: req.user.userId,
      });

      // Stop Socket.io timer and emit paused event
      const io = App.getInstance().getIO();
      stopPomodoroTimer(sessionId);
      emitPomodoroPaused(io, req.user.userId, sessionId);

      res.status(200).json({
        success: true,
        data: { session },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/pomodoro/active
 * Get active Pomodoro session for user
 */
router.get(
  '/active',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Not authenticated');
      }

      const session = await getActiveSession(req.user.userId);

      res.status(200).json({
        success: true,
        data: { session },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/pomodoro/sessions
 * Get user's Pomodoro sessions
 */
router.get(
  '/sessions',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Not authenticated');
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const sessions = await getUserSessions(req.user.userId, limit);

      res.status(200).json({
        success: true,
        data: {
          sessions,
          count: sessions.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/pomodoro/suggested-break
 * Get suggested break duration based on completed Pomodoros
 */
router.get(
  '/suggested-break',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Not authenticated');
      }

      const suggestion = await getSuggestedBreak(req.user.userId);

      res.status(200).json({
        success: true,
        data: suggestion,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
