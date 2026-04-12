import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, getUserById } from '../services/authService';
import { UserInfo, TokenPayload } from '../../shared/types/auth';

// Extend Express Request type to include user
declare module 'express-serve-static-core' {
  interface Request {
    user?: UserInfo;
    tokenPayload?: TokenPayload;
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Wrap async middleware to handle errors
  (async () => {
    try {
      // Get token from header
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({
          success: false,
          message: 'No authorization header provided',
        });
        return;
      }

      // Check Bearer token format
      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        res.status(401).json({
          success: false,
          message: 'Invalid authorization header format',
        });
        return;
      }

      const token = parts[1];

      // Verify token
      let payload: TokenPayload;
      try {
        payload = verifyAccessToken(token);
      } catch {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired token',
        });
        return;
      }

      // Get user from database
      const user = await getUserById(payload.userId);
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Attach user and payload to request
      req.user = user;
      req.tokenPayload = payload;

      next();
    } catch {
      res.status(500).json({
        success: false,
        message: 'Internal server error during authentication',
      });
    }
  })();
}

/**
 * Optional authentication middleware
 * Does not fail if no token is provided, but attaches user if valid token exists
 */
export function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Wrap async middleware to handle errors
  (async () => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        next();
        return;
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        next();
        return;
      }

      const token = parts[1];

      try {
        const payload = verifyAccessToken(token);
        const user = await getUserById(payload.userId);
        if (user) {
          req.user = user;
          req.tokenPayload = payload;
        }
      } catch {
        // Ignore token verification errors in optional auth
      }

      next();
    } catch {
      next();
    }
  })();
}
