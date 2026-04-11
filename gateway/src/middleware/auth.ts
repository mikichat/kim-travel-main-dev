import { Request, Response, NextFunction } from 'express';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    role: string;
    permissions: Record<string, string[]>;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
    return;
  }
  next();
}

export function requirePermission(module: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session?.userId) {
      res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
      return;
    }

    const role = req.session.role;

    // admin은 모든 접근 가능
    if (role === 'admin') {
      next();
      return;
    }

    const permissions = req.session.permissions || {};
    const modulePerms = permissions[module] || [];

    // 읽기 권한 체크
    if (req.method === 'GET' && modulePerms.includes('read')) {
      next();
      return;
    }

    // 쓰기 권한 체크
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && modulePerms.includes('write')) {
      next();
      return;
    }

    // 읽기라도 없으면 차단
    if (modulePerms.length === 0) {
      res.status(403).json({ success: false, error: '접근 권한이 없습니다.' });
      return;
    }

    // GET이면 읽기만으로도 통과
    if (req.method === 'GET') {
      next();
      return;
    }

    res.status(403).json({ success: false, error: '수정 권한이 없습니다.' });
  };
}
