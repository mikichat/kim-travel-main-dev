// 회사 설정 API 라우터

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getSettings, updateSetting } from '../services/settings.service';

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

// GET /api/settings
settingsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const settings = await getSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('[settings] Get failed:', err);
    res.status(500).json({ success: false, error: '설정 조회 실패' });
  }
});

// PATCH /api/settings
settingsRouter.patch('/', async (req: Request, res: Response) => {
  try {
    const entries = Object.entries(req.body);
    for (const [key, value] of entries) {
      await updateSetting(key, String(value));
    }
    const settings = await getSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('[settings] Update failed:', err);
    res.status(500).json({ success: false, error: '설정 수정 실패' });
  }
});
