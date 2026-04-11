// @TASK P4-R2-T1 - Alert Settings Router (GET/PATCH)
// @SPEC GET /api/alert-settings, PATCH /api/alert-settings

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { getAlertSettings, upsertAlertSetting } from '../services/alert-settings.service';

export const alertSettingsRouter = Router();
alertSettingsRouter.use(requireAuth);

// GET /api/alert-settings
alertSettingsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const settings = await getAlertSettings(req.session.userId!);
    res.json({ success: true, data: { settings } });
  } catch (err) {
    res.status(500).json({ success: false, error: '알림 설정 조회 실패' });
  }
});

const updateSchema = z.object({
  hours_before: z.number().min(1).max(72),
  alert_type: z.string().min(1, '알림 유형은 필수입니다.'),
  enabled: z.boolean(),
});

// PATCH /api/alert-settings
alertSettingsRouter.patch('/', async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.',
    });
    return;
  }

  try {
    const setting = await upsertAlertSetting(req.session.userId!, parsed.data);
    res.json({ success: true, data: { setting } });
  } catch (err) {
    res.status(500).json({ success: false, error: '알림 설정 변경 실패' });
  }
});
