// @TASK P2-R2-T1 - BSP Dates Router (CRUD + TOPAS Sync)
// @SPEC GET /api/bsp-dates (월별 필터), POST /api/bsp-dates, DELETE /api/bsp-dates/:id, POST /api/bsp-dates/sync

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { getIntranetDb } from '../db/intranet';
import { syncBspFromTopas, importBspEvents } from '../services/bsp-scraper.service';

export const bspDatesRouter = Router();
bspDatesRouter.use(requireAuth);

// GET /api/bsp-dates
bspDatesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const db = await getIntranetDb();
    const { month } = req.query;

    let rows;
    if (month && typeof month === 'string') {
      // Filter by month: ?month=2026-03
      rows = await db.all(
        'SELECT * FROM air_bsp_dates WHERE payment_date LIKE ? ORDER BY payment_date ASC',
        [`${month}%`]
      );
    } else {
      rows = await db.all('SELECT * FROM air_bsp_dates ORDER BY payment_date ASC');
    }

    res.json({ success: true, data: { bspDates: rows } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'BSP 입금일 조회 실패' });
  }
});

const createBspDateSchema = z.object({
  payment_date: z.string().min(1, '입금일은 필수입니다.').regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식: YYYY-MM-DD'),
  description: z.string().optional(),
});

// POST /api/bsp-dates
bspDatesRouter.post('/', async (req: Request, res: Response) => {
  const parsed = createBspDateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.',
    });
    return;
  }

  try {
    const db = await getIntranetDb();
    const result = await db.run(
      'INSERT INTO air_bsp_dates (payment_date, description) VALUES (?, ?)',
      [parsed.data.payment_date, parsed.data.description ?? null]
    );

    const created = await db.get('SELECT * FROM air_bsp_dates WHERE id = ?', [result.lastID]);
    res.status(201).json({ success: true, data: { bspDate: created } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'BSP 입금일 등록 실패' });
  }
});

// POST /api/bsp-dates/sync — TOPAS BSP 달력 동기화
bspDatesRouter.post('/sync', async (req: Request, res: Response) => {
  const schema = z.object({
    topas_id: z.string().min(1, 'TOPAS 아이디를 입력해주세요.'),
    topas_pwd: z.string().min(1, 'TOPAS 비밀번호를 입력해주세요.'),
    year: z.number().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.',
    });
    return;
  }

  try {
    const result = await syncBspFromTopas(parsed.data.topas_id, parsed.data.topas_pwd, parsed.data.year);
    if (result.success) {
      res.json({
        success: true,
        data: {
          message: `BSP 달력 동기화 완료: ${result.inserted}건 추가, ${result.skipped}건 건너뜀 (${result.months}개월)`,
          ...result,
        },
      });
    } else {
      res.status(502).json({ success: false, error: result.error || 'TOPAS 동기화 실패' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: 'BSP 동기화 실패' });
  }
});

// POST /api/bsp-dates/import — 브라우저에서 가져온 BSP 데이터 직접 저장 (폴백)
bspDatesRouter.post('/import', async (req: Request, res: Response) => {
  const schema = z.object({
    events: z.array(z.object({
      date: z.string(),
      title: z.string(),
      color: z.string(),
    })),
    year: z.number().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: '데이터 형식이 올바르지 않습니다.' });
    return;
  }

  try {
    const result = await importBspEvents(parsed.data.events, parsed.data.year);
    res.json({
      success: true,
      data: {
        message: `BSP 데이터 가져오기 완료: ${result.inserted}건 추가`,
        ...result,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'BSP 데이터 가져오기 실패' });
  }
});

// DELETE /api/bsp-dates/:id
bspDatesRouter.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const db = await getIntranetDb();
    const result = await db.run('DELETE FROM air_bsp_dates WHERE id = ?', [Number(req.params.id)]);

    if (!result.changes) {
      res.status(404).json({ success: false, error: 'BSP 입금일을 찾을 수 없습니다.' });
      return;
    }

    res.json({ success: true, data: { message: 'BSP 입금일이 삭제되었습니다.' } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'BSP 입금일 삭제 실패' });
  }
});
