import { Router, Request, Response } from 'express';
import { loginUser, refreshTokens } from '../services/authService';
import { authMiddleware } from '../middleware/authMiddleware';
import { LoginRequest, RefreshTokenRequest } from '../../shared/types/auth';

const router = Router();

// NOTE: Registration is disabled for single-user system.
// Admin user is created via seed script or on server startup.

/**
 * POST /api/auth/login
 * Login a user
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as LoginRequest;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
      return;
    }

    // Login user
    const result = await loginUser({ email, password });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';

    res.status(401).json({
      success: false,
      message,
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', authMiddleware, (req: Request, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'User information retrieved successfully',
      data: req.user,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user information',
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', (req: Request, res: Response): void => {
  try {
    const { refreshToken } = req.body as RefreshTokenRequest;

    // Validate refresh token
    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
      return;
    }

    // Refresh tokens
    const result = refreshTokens(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Token refresh failed';

    res.status(401).json({
      success: false,
      message,
    });
  }
});

export default router;
