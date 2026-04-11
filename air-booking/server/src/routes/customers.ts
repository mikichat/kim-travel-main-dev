// @TASK P5 - Customers Router (인트라넷 프록시)
// @SPEC GET/POST/PATCH /api/customers → 인트라넷 /tables/customers 프록시

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import {
  listCustomers,
  getCustomerWithBookings,
  createCustomer,
  updateCustomer,
} from '../services/customers.service';

export const customersRouter = Router();
customersRouter.use(requireAuth);

// GET /api/customers
customersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { search, page, limit } = req.query;
    const result = await listCustomers({
      search: search as string | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[customers] 고객 목록 조회 실패:', err);
    res.status(500).json({ success: false, error: '고객 목록 조회 실패' });
  }
});

// GET /api/customers/export/csv — 고객 데이터 CSV 내보내기
customersRouter.get('/export/csv', async (_req: Request, res: Response) => {
  try {
    const result = await listCustomers({ limit: 5000 });
    const escapeCsv = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) return `"${str.replace(/"/g, '""')}"`;
      return str;
    };
    const header = '이름(한글),이름(영문),전화번호,이메일,여권번호,여권만료일,생년월일,성별,단체명,여행지역,등록일\n';
    const rows = result.customers.map(c =>
      [c.name_kr, c.name_en, c.phone, c.email, c.passport_number, c.passport_expiry, c.birth_date, c.gender, c.group_name, c.travel_region, c.created_at?.slice(0, 10)].map(escapeCsv).join(',')
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');
    res.send('\uFEFF' + header + rows);
  } catch {
    res.status(500).json({ success: false, error: '고객 CSV 내보내기 실패' });
  }
});

// GET /api/customers/:id
customersRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await getCustomerWithBookings(req.params.id);
    if (!result) {
      res.status(404).json({ success: false, error: '고객을 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[customers] 고객 조회 실패:', err);
    res.status(500).json({ success: false, error: '고객 조회 실패' });
  }
});

const createCustomerSchema = z.object({
  name_kr: z.string().optional(),
  name_en: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('올바른 이메일 형식이 아닙니다.').optional().or(z.literal('')),
  passport_number: z.string().optional(),
  passport_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식: YYYY-MM-DD').optional(),
  remarks: z.string().optional(),
});

// POST /api/customers
customersRouter.post('/', async (req: Request, res: Response) => {
  const parsed = createCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.',
    });
    return;
  }

  try {
    const customer = await createCustomer(parsed.data);
    res.status(201).json({ success: true, data: { customer } });
  } catch (err) {
    console.error('[customers] 고객 생성 실패:', err);
    res.status(500).json({ success: false, error: '고객 생성 실패' });
  }
});

const updateCustomerSchema = z.object({
  name_kr: z.string().optional(),
  name_en: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('올바른 이메일 형식이 아닙니다.').optional().or(z.literal('')),
  passport_number: z.string().optional(),
  passport_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식: YYYY-MM-DD').optional(),
  remarks: z.string().optional(),
});

// PATCH /api/customers/:id
customersRouter.patch('/:id', async (req: Request, res: Response) => {
  const parsed = updateCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.',
    });
    return;
  }

  try {
    const customer = await updateCustomer(req.params.id, parsed.data);
    if (!customer) {
      res.status(404).json({ success: false, error: '고객을 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { customer } });
  } catch (err) {
    console.error('[customers] 고객 수정 실패:', err);
    res.status(500).json({ success: false, error: '고객 수정 실패' });
  }
});
