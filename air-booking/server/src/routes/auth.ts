// @TASK P1-R1-T1 - Auth Router (login, logout, me)
// @SPEC POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { login, getUserById } from '../services/auth.service';
import { requireAuth } from '../middleware/auth';
import { writeAuditLog } from '../services/audit-log.service';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP per window
  message: { success: false, error: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/login
authRouter.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: '이메일과 비밀번호를 입력해주세요.',
    });
    return;
  }

  const { email, password } = parsed.data;
  const result = await login(email, password);

  const clientIp = req.ip || req.socket.remoteAddress || '';

  if ('error' in result) {
    writeAuditLog({ action: 'login_failed', resource: email, details: result.error, ip: clientIp });
    res.status(result.status).json({ success: false, error: result.error });
    return;
  }

  // 세션 고정 공격 방어: 로그인 성공 시 세션 ID 재생성
  req.session.regenerate((err) => {
    if (err) {
      res.status(500).json({ success: false, error: '세션 초기화 실패' });
      return;
    }
    req.session.userId = result.user.id;
    writeAuditLog({ userId: result.user.id, action: 'login_success', resource: email, ip: clientIp });
    res.json({ success: true, data: { user: result.user } });
  });
});

// POST /api/auth/logout
authRouter.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('[auth] Session destroy failed:', err);
      return res.status(500).json({ success: false, error: '로그아웃 실패' });
    }
    res.json({ success: true, data: { message: '로그아웃 성공' } });
  });
});

// POST /api/auth/bridge-token - 메인 백엔드 자동 로그인용 일회성 토큰 생성
authRouter.post('/bridge-token', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.session.userId!);
    if (!user) {
      res.status(401).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
      return;
    }

    const { getIntranetDb } = await import('../db/intranet');
    const db = await getIntranetDb();

    // bridge_tokens 테이블 생성 (없으면)
    await db.run(`CREATE TABLE IF NOT EXISTS bridge_tokens (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`);

    // 만료된 토큰 정리 (60초 이상 된 것)
    await db.run(`DELETE FROM bridge_tokens WHERE created_at < datetime('now','localtime','-60 seconds')`);

    // 토큰 생성
    const token = crypto.randomUUID();
    await db.run('INSERT INTO bridge_tokens (token, email) VALUES (?, ?)', [token, user.email]);

    res.json({ success: true, data: { token } });
  } catch (err) {
    res.status(500).json({ success: false, error: '브릿지 토큰 생성 실패' });
  }
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  const user = await getUserById(req.session.userId!);
  if (!user) {
    res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
    return;
  }
  res.json({ success: true, data: { user } });
});
