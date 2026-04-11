import { Router, Request, Response } from 'express';
import {
  getAllGroupRosters,
  getGroupRosterById,
  createGroupRoster,
  updateGroupRoster,
  deleteGroupRoster,
} from '../services/group-rosters.service';

export const groupRostersRouter = Router();
// 인증 제거 — 내부망 전용 (estimates 라우트와 동일 정책)

// GET /api/group-rosters
groupRostersRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const items = await getAllGroupRosters();
    res.json({ success: true, data: { items } });
  } catch {
    res.status(500).json({ success: false, error: '단체명단 조회 실패' });
  }
});

// GET /api/group-rosters/:id
groupRostersRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const item = await getGroupRosterById(req.params.id);
    if (!item) { res.status(404).json({ success: false, error: '단체명단을 찾을 수 없습니다.' }); return; }
    res.json({ success: true, data: { item } });
  } catch {
    res.status(500).json({ success: false, error: '단체명단 조회 실패' });
  }
});

// POST /api/group-rosters
groupRostersRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, data } = req.body;
    if (!data) { res.status(400).json({ success: false, error: 'data 필드가 필요합니다.' }); return; }
    const item = await createGroupRoster(
      name || '무제',
      typeof data === 'string' ? data : JSON.stringify(data)
    );
    res.status(201).json({ success: true, data: { item } });
  } catch {
    res.status(500).json({ success: false, error: '단체명단 생성 실패' });
  }
});

// PATCH /api/group-rosters/:id
groupRostersRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { name, data } = req.body;
    if (!data) { res.status(400).json({ success: false, error: 'data 필드가 필요합니다.' }); return; }
    const item = await updateGroupRoster(
      req.params.id,
      name || '무제',
      typeof data === 'string' ? data : JSON.stringify(data)
    );
    if (!item) { res.status(404).json({ success: false, error: '단체명단을 찾을 수 없습니다.' }); return; }
    res.json({ success: true, data: { item } });
  } catch {
    res.status(500).json({ success: false, error: '단체명단 수정 실패' });
  }
});

// DELETE /api/group-rosters/:id
groupRostersRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await deleteGroupRoster(req.params.id);
    if (!deleted) { res.status(404).json({ success: false, error: '단체명단을 찾을 수 없습니다.' }); return; }
    res.json({ success: true, data: { deleted: true } });
  } catch {
    res.status(500).json({ success: false, error: '단체명단 삭제 실패' });
  }
});
