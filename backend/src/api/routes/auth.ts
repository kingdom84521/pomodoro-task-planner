import { Router, Request, Response, NextFunction } from 'express';
import { register, login, getUserById } from '../../services/auth/authService';
import { registerValidation, loginValidation } from '../validators/userValidators';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /api/v1/auth/register
 * Register a new user
 */
router.post(
  '/register',
  registerValidation,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name, timezone } = req.body;

      const result = await register({
        email,
        password,
        name,
        timezone,
      });

      // Set httpOnly cookie with access token
      res.cookie('token', result.tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          token: result.tokens.accessToken, // Also send in response for localStorage
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/auth/login
 * Login user
 */
router.post(
  '/login',
  loginValidation,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      const result = await login({ email, password });

      // Set httpOnly cookie with access token
      res.cookie('token', result.tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          token: result.tokens.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/auth/logout
 * Logout user
 */
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token');

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * GET /api/v1/auth/me
 * Get current user info
 */
router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Not authenticated');
      }

      const user = await getUserById(req.user.userId);

      if (!user) {
        throw new AppError(404, 'User not found');
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            _id: user._id,
            email: user.email,
            name: user.name,
            timezone: user.timezone,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
