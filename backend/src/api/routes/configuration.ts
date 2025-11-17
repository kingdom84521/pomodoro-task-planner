import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/authenticate';
import * as configurationService from '../../services/configuration/configurationService';
import { body, validationResult } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/configuration
 * @desc    Get user configuration
 * @access  Private
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const config = await configurationService.getUserConfiguration(userId);

    res.json({
      success: true,
      data: {
        configuration: {
          _id: config._id,
          userId: config.userId,
          pomodoroDuration: config.pomodoroDuration,
          shortBreak: config.shortBreak,
          longBreak: config.longBreak,
          longBreakInterval: config.longBreakInterval,
          dailyUsageStart: config.dailyUsageStart,
          dailyUsageEnd: config.dailyUsageEnd,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to fetch configuration',
      },
    });
  }
});

/**
 * @route   PUT /api/v1/configuration
 * @desc    Update user configuration
 * @access  Private
 */
router.put(
  '/',
  [
    body('pomodoroDuration')
      .optional()
      .isInt({ min: 300000, max: 7200000 })
      .withMessage('Pomodoro duration must be between 5 minutes and 2 hours'),
    body('shortBreak')
      .optional()
      .isInt({ min: 60000, max: 1800000 })
      .withMessage('Short break must be between 1 and 30 minutes'),
    body('longBreak')
      .optional()
      .isInt({ min: 300000, max: 3600000 })
      .withMessage('Long break must be between 5 and 60 minutes'),
    body('longBreakInterval')
      .optional()
      .isInt({ min: 2, max: 10 })
      .withMessage('Long break interval must be between 2 and 10'),
    body('dailyUsageStart')
      .optional()
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .withMessage('Daily usage start must be in HH:MM format'),
    body('dailyUsageEnd')
      .optional()
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .withMessage('Daily usage end must be in HH:MM format'),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array(),
        },
      });
    }

    try {
      const userId = req.user!.userId;
      const { dailyUsageStart, dailyUsageEnd } = req.body;

      // Validate time window
      if (
        !configurationService.validateTimeWindow(dailyUsageStart, dailyUsageEnd)
      ) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Daily usage end must be after start',
          },
        });
      }

      const config = await configurationService.updateUserConfiguration(
        userId,
        req.body
      );

      res.json({
        success: true,
        data: {
          configuration: {
            _id: config._id,
            userId: config.userId,
            pomodoroDuration: config.pomodoroDuration,
            shortBreak: config.shortBreak,
            longBreak: config.longBreak,
            longBreakInterval: config.longBreakInterval,
            dailyUsageStart: config.dailyUsageStart,
            dailyUsageEnd: config.dailyUsageEnd,
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to update configuration',
        },
      });
    }
  }
);

/**
 * @route   POST /api/v1/configuration/reset
 * @desc    Reset configuration to defaults
 * @access  Private
 */
router.post('/reset', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const config = await configurationService.resetConfiguration(userId);

    res.json({
      success: true,
      data: {
        configuration: {
          _id: config._id,
          userId: config.userId,
          pomodoroDuration: config.pomodoroDuration,
          shortBreak: config.shortBreak,
          longBreak: config.longBreak,
          longBreakInterval: config.longBreakInterval,
          dailyUsageStart: config.dailyUsageStart,
          dailyUsageEnd: config.dailyUsageEnd,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to reset configuration',
      },
    });
  }
});

export default router;
