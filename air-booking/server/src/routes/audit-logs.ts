import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { listAuditLogs } from '../services/audit-log.service';

export const auditLogsRouter = Router();
auditLogsRouter.use(requireAuth);
auditLogsRouter.use(requireAdmin);

// GET /api/audit-logs — 관리자만 조회 가능
auditLogsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { action, user_id, limit } = req.query;
    const result = await listAuditLogs({
      action: action as string | undefined,
      userId: user_id as string | undefined,
      limit: limit ? Number(limit) : 100,
    });
    res.json({ success: true, data: result });
  } catch {
    res.status(500).json({ success: false, error: '감사 로그 조회 실패' });
  }
});
