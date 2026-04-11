// 세부 견적서/정산서 API 라우터

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import {
  listEstimates,
  getEstimateById,
  createEstimate,
  updateEstimate,
  deleteEstimate,
} from '../services/estimates.service';

export const estimatesRouter = Router();
// 인증 제거 — 내부망 전용, 어떤 브라우저에서든 접근 가능

// GET /api/estimates
estimatesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { search, doc_type, page, limit } = req.query;
    const result = await listEstimates({
      search: search as string | undefined,
      doc_type: doc_type as string | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[estimates] List failed:', err);
    res.status(500).json({ success: false, error: '목록 조회 실패' });
  }
});

// GET /api/estimates/:id
estimatesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const estimate = await getEstimateById(req.params.id);
    if (!estimate) {
      res.status(404).json({ success: false, error: '문서를 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { estimate } });
  } catch (err) {
    console.error('[estimates] Get failed:', err);
    res.status(500).json({ success: false, error: '조회 실패' });
  }
});

const createSchema = z.object({
  doc_type: z.enum(['estimate', 'settlement', 'domestic', 'domestic_settlement', 'delivery', 'claim']).optional(),
  recipient: z.string().optional(),
  subject: z.string().optional(),
  group_name: z.string().optional(),
}).passthrough();

// POST /api/estimates
estimatesRouter.post('/', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.issues[0]?.message || '입력값 오류' });
    return;
  }
  try {
    const estimate = await createEstimate(parsed.data);
    res.status(201).json({ success: true, data: { estimate } });
  } catch (err) {
    console.error('[estimates] Create failed:', err);
    res.status(500).json({ success: false, error: '생성 실패' });
  }
});

// PATCH /api/estimates/:id
estimatesRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const updated = await updateEstimate(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ success: false, error: '문서를 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { estimate: updated } });
  } catch (err) {
    console.error('[estimates] Update failed:', err);
    res.status(500).json({ success: false, error: '수정 실패' });
  }
});

// DELETE /api/estimates/:id
estimatesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await deleteEstimate(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: '문서를 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { message: '삭제되었습니다.' } });
  } catch (err) {
    console.error('[estimates] Delete failed:', err);
    res.status(500).json({ success: false, error: '삭제 실패' });
  }
});
