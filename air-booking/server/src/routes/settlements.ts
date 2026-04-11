// @TASK P3-R1-T1 - Settlements Router (CRUD)
// @SPEC GET/POST/PATCH /api/settlements

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import {
  listSettlements,
  getSettlementById,
  createSettlement,
  updateSettlement,
} from '../services/settlements.service';

export const settlementsRouter = Router();
settlementsRouter.use(requireAuth);

// GET /api/settlements
settlementsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status, booking_id, page, limit } = req.query;
    const result = await listSettlements({
      status: status as string | undefined,
      booking_id: booking_id as string | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[settlements] 정산 목록 조회 실패:', err);
    res.status(500).json({ success: false, error: '정산 목록 조회 실패' });
  }
});

// GET /api/settlements/:id
settlementsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const settlement = await getSettlementById(req.params.id);
    if (!settlement) {
      res.status(404).json({ success: false, error: '정산 정보를 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { settlement } });
  } catch (err) {
    console.error('[settlements] 정산 조회 실패:', err);
    res.status(500).json({ success: false, error: '정산 조회 실패' });
  }
});

const createSettlementSchema = z.object({
  booking_id: z.string({ required_error: '예약 ID는 필수입니다.' }),
  vendor_id: z.string().optional().nullable(),
  payment_type: z.string().optional(),
  amount: z.number().optional(),
  status: z.enum(['unpaid', 'paid', 'partial']).optional(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식: YYYY-MM-DD').optional(),
  remarks: z.string().optional(),
});

// POST /api/settlements
settlementsRouter.post('/', async (req: Request, res: Response) => {
  const parsed = createSettlementSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.',
    });
    return;
  }

  try {
    const settlement = await createSettlement(parsed.data);
    res.status(201).json({ success: true, data: { settlement } });
  } catch (err) {
    console.error('[settlements] 정산 생성 실패:', err);
    res.status(500).json({ success: false, error: '정산 생성 실패' });
  }
});

const updateSettlementSchema = z.object({
  vendor_id: z.string().optional().nullable(),
  payment_type: z.string().optional(),
  amount: z.number().optional(),
  status: z.enum(['unpaid', 'paid', 'partial']).optional(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식: YYYY-MM-DD').optional(),
  remarks: z.string().optional(),
});

// PATCH /api/settlements/:id
settlementsRouter.patch('/:id', async (req: Request, res: Response) => {
  const parsed = updateSettlementSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.',
    });
    return;
  }

  try {
    const settlement = await updateSettlement(req.params.id, parsed.data);
    if (!settlement) {
      res.status(404).json({ success: false, error: '정산 정보를 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { settlement } });
  } catch (err) {
    console.error('[settlements] 정산 수정 실패:', err);
    res.status(500).json({ success: false, error: '정산 수정 실패' });
  }
});
