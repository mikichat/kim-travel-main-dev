// 단체상품 라우트

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { listGroups, getGroupById, createGroup, updateGroup, deleteGroup } from '../services/groups.service';

export const groupsRouter = Router();
groupsRouter.use(requireAuth);

// GET /api/groups
groupsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { search, status, page, limit } = req.query;
    const result = await listGroups({
      search: search as string | undefined,
      status: (status as 'active' | 'archived' | '') || '',
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: '단체상품 목록 조회 실패' });
  }
});

// GET /api/groups/:id
groupsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const group = await getGroupById(req.params.id);
    if (!group) {
      res.status(404).json({ success: false, error: '단체상품을 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { group } });
  } catch (err) {
    res.status(500).json({ success: false, error: '단체상품 조회 실패' });
  }
});

// POST /api/groups
groupsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, destination, departure_date, return_date, members } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: '단체명은 필수입니다.' });
      return;
    }
    const group = await createGroup({ name, destination, departure_date, return_date, members });
    res.status(201).json({ success: true, data: { group } });
  } catch (err) {
    res.status(500).json({ success: false, error: '단체상품 생성 실패' });
  }
});

// PATCH /api/groups/:id
groupsRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const group = await updateGroup(req.params.id, req.body);
    if (!group) {
      res.status(404).json({ success: false, error: '단체상품을 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { group } });
  } catch (err) {
    res.status(500).json({ success: false, error: '단체상품 수정 실패' });
  }
});

// DELETE /api/groups/:id
groupsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await deleteGroup(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: '단체상품을 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { message: '삭제되었습니다.' } });
  } catch (err) {
    res.status(500).json({ success: false, error: '단체상품 삭제 실패' });
  }
});
