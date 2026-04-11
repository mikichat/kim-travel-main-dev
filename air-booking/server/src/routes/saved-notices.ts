import { Router, Request, Response } from 'express';
import {
  getAllSavedNotices,
  getSavedNoticeById,
  createSavedNotice,
  updateSavedNotice,
  deleteSavedNotice,
} from '../services/saved-notices.service';

export const savedNoticesRouter = Router();
// 인증 제거 — 내부망 전용 (estimates 라우트와 동일 정책)

// GET /api/saved-notices
savedNoticesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const items = await getAllSavedNotices();
    res.json({ success: true, data: { items } });
  } catch {
    res.status(500).json({ success: false, error: '안내문 조회 실패' });
  }
});

// GET /api/saved-notices/:id
savedNoticesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const item = await getSavedNoticeById(req.params.id);
    if (!item) { res.status(404).json({ success: false, error: '안내문을 찾을 수 없습니다.' }); return; }
    res.json({ success: true, data: { item } });
  } catch {
    res.status(500).json({ success: false, error: '안내문 조회 실패' });
  }
});

// POST /api/saved-notices
savedNoticesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    if (!data) { res.status(400).json({ success: false, error: 'data 필드가 필요합니다.' }); return; }
    const item = await createSavedNotice(typeof data === 'string' ? data : JSON.stringify(data));
    res.status(201).json({ success: true, data: { item } });
  } catch {
    res.status(500).json({ success: false, error: '안내문 생성 실패' });
  }
});

// PATCH /api/saved-notices/:id
savedNoticesRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    if (!data) { res.status(400).json({ success: false, error: 'data 필드가 필요합니다.' }); return; }
    const item = await updateSavedNotice(req.params.id, typeof data === 'string' ? data : JSON.stringify(data));
    if (!item) { res.status(404).json({ success: false, error: '안내문을 찾을 수 없습니다.' }); return; }
    res.json({ success: true, data: { item } });
  } catch {
    res.status(500).json({ success: false, error: '안내문 수정 실패' });
  }
});

// DELETE /api/saved-notices/:id
savedNoticesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await deleteSavedNotice(req.params.id);
    if (!deleted) { res.status(404).json({ success: false, error: '안내문을 찾을 수 없습니다.' }); return; }
    res.json({ success: true, data: { deleted: true } });
  } catch {
    res.status(500).json({ success: false, error: '안내문 삭제 실패' });
  }
});
