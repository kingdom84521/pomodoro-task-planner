import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/authenticate';
import * as analyticsService from '../../services/analytics/analyticsService';
import { query, validationResult } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/analytics
 * @desc    Get comprehensive analytics for a time range
 * @access  Private
 * @query   startDate (ISO string), endDate (ISO string)
 */
router.get(
  '/',
  [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
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

      // Default to last 30 days
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : new Date();

      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const analytics = await analyticsService.getAnalyticsForTimeRange(
        userId,
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: {
          analytics,
          timeRange: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to fetch analytics',
        },
      });
    }
  }
);

/**
 * @route   GET /api/v1/analytics/summary
 * @desc    Get aggregated metrics summary
 * @access  Private
 * @query   startDate (ISO string), endDate (ISO string)
 */
router.get(
  '/summary',
  [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
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

      // Default to last 30 days
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : new Date();

      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const result = await analyticsService.aggregateMetrics(
        userId,
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: {
          ...result,
          timeRange: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to fetch analytics summary',
        },
      });
    }
  }
);

export default router;
