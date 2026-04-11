// @TASK P3-R3-T1 - Vendors Router (CRUD)
// @SPEC GET/POST/PATCH/DELETE /api/vendors

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  listVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
} from '../services/vendors.service';

export const vendorsRouter = Router();
vendorsRouter.use(requireAuth);

// GET /api/vendors
vendorsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { type, search, page, limit } = req.query;
    const result = await listVendors({
      type: type as string | undefined,
      search: search as string | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[vendors] 거래처 목록 조회 실패:', err);
    res.status(500).json({ success: false, error: '거래처 목록 조회 실패' });
  }
});

// GET /api/vendors/:id
vendorsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const vendor = await getVendorById(req.params.id);
    if (!vendor) {
      res.status(404).json({ success: false, error: '거래처를 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { vendor } });
  } catch (err) {
    console.error('[vendors] 거래처 조회 실패:', err);
    res.status(500).json({ success: false, error: '거래처 조회 실패' });
  }
});

const createVendorSchema = z.object({
  name: z.string().min(1, '거래처 이름은 필수입니다.'),
  type: z.string().optional(),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('올바른 이메일 형식이 아닙니다.').optional().or(z.literal('')),
  remarks: z.string().optional(),
});

// POST /api/vendors
vendorsRouter.post('/', async (req: Request, res: Response) => {
  const parsed = createVendorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.',
    });
    return;
  }

  try {
    const vendor = await createVendor(parsed.data);
    res.status(201).json({ success: true, data: { vendor } });
  } catch (err) {
    console.error('[vendors] 거래처 생성 실패:', err);
    res.status(500).json({ success: false, error: '거래처 생성 실패' });
  }
});

const updateVendorSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().optional(),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('올바른 이메일 형식이 아닙니다.').optional().or(z.literal('')),
  remarks: z.string().optional(),
});

// PATCH /api/vendors/:id
vendorsRouter.patch('/:id', async (req: Request, res: Response) => {
  const parsed = updateVendorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.',
    });
    return;
  }

  try {
    const vendor = await updateVendor(req.params.id, parsed.data);
    if (!vendor) {
      res.status(404).json({ success: false, error: '거래처를 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { vendor } });
  } catch (err) {
    console.error('[vendors] 거래처 수정 실패:', err);
    res.status(500).json({ success: false, error: '거래처 수정 실패' });
  }
});

// DELETE /api/vendors/:id
vendorsRouter.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const deleted = await deleteVendor(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: '거래처를 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { message: '거래처가 삭제되었습니다.' } });
  } catch (err) {
    console.error('[vendors] 거래처 삭제 실패:', err);
    res.status(500).json({ success: false, error: '거래처 삭제 실패' });
  }
});
