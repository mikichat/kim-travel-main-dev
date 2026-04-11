// @TASK P1-R1-T1 - Auth Middleware (requireAuth + requireAdmin)
// @SPEC 세션 체크 미들웨어 + 역할 기반 인가

import { Request, Response, NextFunction } from 'express';
import { getUserById } from '../services/auth.service';

// Extend express-session to include userId
declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ success: false, error: '인증이 필요합니다.' });
    return;
  }
  next();
}

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, error: '인증이 필요합니다.' });
  }
  try {
    const user = await getUserById(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: '관리자 권한이 필요합니다.' });
    }
    next();
  } catch {
    res.status(500).json({ success: false, error: '권한 확인 실패' });
  }
};
