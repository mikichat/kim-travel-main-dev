// @TASK P2-R1-T1 - Bookings Router (CRUD + PNR Parse)
// @SPEC GET/POST/PATCH/DELETE /api/bookings, POST /api/bookings/parse-pnr

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  listBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
} from '../services/bookings.service';
import { parsePnr } from '../services/pnr-parser.service';
import { sendBookingNotice } from '../services/notification.service';

export const bookingsRouter = Router();
bookingsRouter.use(requireAuth);

// GET /api/bookings
bookingsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status, search, sort, order, page, limit, date_from, date_to } = req.query;
    const result = await listBookings({
      status: status as string | undefined,
      search: search as string | undefined,
      sort: sort as string | undefined,
      order: (order as 'asc' | 'desc') || 'desc',
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      date_from: date_from as string | undefined,
      date_to: date_to as string | undefined,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[bookings] 예약 목록 조회 실패:', err);
    res.status(500).json({ success: false, error: '예약 목록 조회 실패' });
  }
});

// GET /api/bookings/all-saved — 저장된 항공편 통합 조회 (air_bookings + flight_saves)
bookingsRouter.get('/all-saved', async (req: Request, res: Response) => {
  try {
    const { getIntranetDb } = await import('../db/intranet');
    const db = await getIntranetDb();
    const search = (req.query.search as string) || '';
    console.log('[all-saved] 통합 조회 시작, search:', search);

    // 1) air_bookings (예약장부 데이터)
    const searchWhere = search
      ? `WHERE pnr LIKE ? OR name_kr LIKE ? OR agency LIKE ?`
      : '';
    const searchVals = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];

    const bookings = await db.all(
      `SELECT id, pnr, airline, flight_number, route_from, route_to,
              name_kr, name_en, departure_date, return_date, pax_count, agency,
              original_pnr_text, created_at
       FROM air_bookings ${searchWhere}
       ORDER BY created_at DESC LIMIT 100`,
      searchVals
    );

    const results: any[] = bookings.map((b: any) => ({
      ...b,
      source: 'air-booking',
    }));

    // 2) flight_saves (변환기 직접 저장 데이터, AB- 제외 = 이미 bookings에 있으니까)
    const savedPnrs = new Set(bookings.map((b: any) => b.pnr).filter(Boolean));
    const fsWhere = search
      ? `WHERE (name LIKE ? OR pnr LIKE ?) AND id NOT LIKE 'AB-%'`
      : `WHERE id NOT LIKE 'AB-%'`;
    const fsVals = search ? [`%${search}%`, `%${search}%`] : [];

    const flightSaves = await db.all(
      `SELECT id, name, pnr, data, created_at FROM flight_saves ${fsWhere} ORDER BY updated_at DESC LIMIT 50`,
      fsVals
    );

    for (const fs of flightSaves) {
      // 같은 PNR이 air_bookings에 이미 있으면 스킵
      if (fs.pnr && savedPnrs.has(fs.pnr)) continue;

      let data: any = {};
      try { data = typeof fs.data === 'string' ? JSON.parse(fs.data) : fs.data; } catch {}

      const flights = data.flights || [];
      const firstFlight = flights[0] || {};
      const lastFlight = flights[flights.length - 1] || {};

      results.push({
        id: fs.id,
        pnr: fs.pnr || '',
        airline: firstFlight.airline || '',
        flight_number: firstFlight.flightNumber || '',
        route_from: firstFlight.departure?.code || '',
        route_to: firstFlight.arrival?.code || '',
        departure_date: firstFlight.date || '',
        return_date: flights.length > 1 ? lastFlight.date : '',
        name_kr: data.customerInfo?.name || fs.name || '',
        name_en: '',
        pax_count: parseInt(data.customerInfo?.totalPeople) || 1,
        agency: fs.name || '',
        original_pnr_text: data.originalPnrText || '',
        created_at: fs.created_at || '',
        source: 'converter',
      });
    }

    // 최신순 정렬
    results.sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));

    console.log(`[all-saved] air_bookings: ${bookings.length}건, flight_saves: ${flightSaves.length}건, 총: ${results.length}건`);
    res.json({ success: true, data: { bookings: results, total: results.length } });
  } catch (err) {
    console.error('[bookings] all-saved 조회 실패:', err);
    res.status(500).json({ success: false, error: '통합 조회 실패' });
  }
});

// DELETE /api/bookings/delete-saved/:id — flight_saves 항목 삭제
bookingsRouter.delete('/delete-saved/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { getIntranetDb } = await import('../db/intranet');
    const db = await getIntranetDb();
    await db.run('DELETE FROM flight_saves WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[bookings] flight_saves 삭제 실패:', err);
    res.status(500).json({ success: false, error: '삭제 실패' });
  }
});

// GET /api/bookings/agencies — 대리점/단체명 자동완성 목록 (must be before /:id)
bookingsRouter.get('/agencies', async (_req: Request, res: Response) => {
  try {
    const { getIntranetDb } = await import('../db/intranet');
    const db = await getIntranetDb();
    const rows = await db.all<{ agency: string }[]>(
      `SELECT DISTINCT agency FROM air_bookings WHERE agency IS NOT NULL AND agency != '' ORDER BY agency`
    );
    res.json({ success: true, data: rows.map(r => r.agency) });
  } catch (err) {
    res.status(500).json({ success: false, error: '대리점 목록 조회 실패' });
  }
});

// GET /api/bookings/check-pnr/:pnr — flight_schedules에 같은 PNR 존재 여부 확인
bookingsRouter.get('/check-pnr/:pnr', async (req: Request, res: Response) => {
  try {
    const { getIntranetDb } = await import('../db/intranet');
    const db = await getIntranetDb();
    const pnr = req.params.pnr.toUpperCase();
    const schedule = await db.get(
      `SELECT id, group_name, airline, flight_number, departure_date,
              departure_airport, arrival_airport, pnr, source
       FROM flight_schedules WHERE pnr = ?`,
      [pnr]
    );
    res.json({
      success: true,
      existsInFlightSchedules: !!schedule,
      schedule: schedule || null,
    });
  } catch (err) {
    console.error('[bookings] PNR 스케줄 확인 실패:', err);
    res.status(500).json({ success: false, error: 'PNR 확인 실패' });
  }
});

// GET /api/bookings/:id
bookingsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const booking = await getBookingById(req.params.id);
    if (!booking) {
      res.status(404).json({ success: false, error: '예약을 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { booking } });
  } catch (err) {
    console.error('[bookings] 예약 조회 실패:', err);
    res.status(500).json({ success: false, error: '예약 조회 실패' });
  }
});

const passengerSchema = z.object({
  name_en: z.string().optional(),
  name_kr: z.string().optional(),
  title: z.string().optional(),
  gender: z.string().optional(),
  passport_number: z.string().optional(),
  seat_number: z.string().optional(),
});

const createBookingSchema = z.object({
  pnr: z.string().min(1, 'PNR은 필수입니다.'),
  customer_id: z.string().optional().nullable(),
  airline: z.string().optional(),
  flight_number: z.string().optional(),
  route_from: z.string().optional(),
  route_to: z.string().optional(),
  name_kr: z.string().optional(),
  name_en: z.string().optional(),
  passport_number: z.string().optional(),
  seat_number: z.string().optional(),
  fare: z.number().optional(),
  nmtl_date: z.string().optional(),
  tl_date: z.string().optional(),
  departure_date: z.string().optional(),
  return_date: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'ticketed', 'cancelled']).optional(),
  remarks: z.string().optional(),
  pax_count: z.number().optional(),
  agency: z.string().optional(),
  group_id: z.string().optional(),
  original_pnr_text: z.string().optional(),
  passengers: z.array(passengerSchema).optional(),
  segments: z.array(z.object({
    airline: z.string().optional(),
    flight_number: z.string().optional(),
    route_from: z.string().optional(),
    route_to: z.string().optional(),
    departure_date: z.string().optional(),
    arrival_date: z.string().optional(),
    departure_time: z.string().optional(),
    arrival_time: z.string().optional(),
  })).optional(),
});

// POST /api/bookings
bookingsRouter.post('/', async (req: Request, res: Response) => {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.',
    });
    return;
  }

  try {
    const booking = await createBooking({
      ...parsed.data,
      user_id: String(req.session.userId!),
      passengers: parsed.data.passengers,
      segments: parsed.data.segments,
      pax_count: parsed.data.pax_count,
    });
    res.status(201).json({ success: true, data: { booking } });
  } catch (err) {
    console.error('[bookings] 예약 생성 실패:', err);
    res.status(500).json({ success: false, error: '예약 생성 실패' });
  }
});

const updateBookingSchema = z.object({
  customer_id: z.string().optional().nullable(),
  pnr: z.string().min(1).optional(),
  airline: z.string().optional().nullable(),
  flight_number: z.string().optional().nullable(),
  route_from: z.string().optional().nullable(),
  route_to: z.string().optional().nullable(),
  name_kr: z.string().optional().nullable(),
  name_en: z.string().optional().nullable(),
  passport_number: z.string().optional().nullable(),
  seat_number: z.string().optional().nullable(),
  fare: z.number().optional().nullable(),
  nmtl_date: z.string().optional().nullable(),
  tl_date: z.string().optional().nullable(),
  departure_date: z.string().optional().nullable(),
  return_date: z.string().optional().nullable(),
  status: z.enum(['pending', 'confirmed', 'ticketed', 'cancelled']).optional(),
  remarks: z.string().optional().nullable(),
  agency: z.string().optional().nullable(),
});

// PATCH /api/bookings/:id
bookingsRouter.patch('/:id', async (req: Request, res: Response) => {
  const parsed = updateBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.',
    });
    return;
  }

  try {
    // null → undefined 변환 (클라이언트가 빈 값을 null로 보냄)
    const cleanData = Object.fromEntries(
      Object.entries(parsed.data).map(([k, v]) => [k, v === null ? undefined : v])
    ) as Record<string, unknown>;
    const booking = await updateBooking(
      req.params.id,
      cleanData,
      String(req.session.userId!)
    );
    if (!booking) {
      res.status(404).json({ success: false, error: '예약을 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { booking } });
  } catch (err) {
    console.error('[bookings] 예약 수정 실패:', err);
    res.status(500).json({ success: false, error: '예약 수정 실패' });
  }
});

// POST /api/bookings/:id/send-notice
bookingsRouter.post('/:id/send-notice', async (req: Request, res: Response) => {
  try {
    const booking = await getBookingById(req.params.id);
    if (!booking) {
      res.status(404).json({ success: false, error: '예약을 찾을 수 없습니다.' });
      return;
    }

    const emailSchema = z.object({ email: z.string().email('올바른 이메일을 입력해주세요.') });
    const parsed = emailSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      return;
    }

    const result = await sendBookingNotice({
      to: parsed.data.email,
      name_kr: booking.name_kr || '고객',
      name_en: booking.name_en || '',
      pnr: booking.pnr,
      airline: booking.airline || '',
      flight_number: booking.flight_number || '',
      route_from: booking.route_from || '',
      route_to: booking.route_to || '',
      departure_date: booking.departure_date || '',
      seat_number: booking.seat_number || '',
      passport_number: booking.passport_number || '',
    });

    if (!result.success) {
      res.status(500).json({ success: false, error: result.error || '안내문 발송 실패' });
      return;
    }

    res.json({ success: true, data: { message: '안내문이 발송되었습니다.' } });
  } catch (err) {
    console.error('[bookings] 안내문 발송 실패:', err);
    res.status(500).json({ success: false, error: '안내문 발송 실패' });
  }
});

// DELETE /api/bookings/:id
bookingsRouter.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const deleted = await deleteBooking(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: '예약을 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { message: '예약이 삭제되었습니다.' } });
  } catch (err) {
    console.error('[bookings] 예약 삭제 실패:', err);
    res.status(500).json({ success: false, error: '예약 삭제 실패' });
  }
});


// POST /api/bookings/parse-pnr
bookingsRouter.post('/parse-pnr', async (req: Request, res: Response) => {
  const schema = z.object({ text: z.string().min(1, 'PNR 텍스트를 입력해주세요.') });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || 'PNR 텍스트가 필요합니다.',
    });
    return;
  }

  try {
    const results = parsePnr(parsed.data.text);
    if (results.length === 0) {
      res.status(422).json({
        success: false,
        error: 'PNR 텍스트를 파싱할 수 없습니다. 수동 입력을 이용해주세요.',
      });
      return;
    }
    res.json({ success: true, data: { parsed: results } });
  } catch (err) {
    console.error('[bookings] PNR 파싱 실패:', err);
    res.status(500).json({ success: false, error: 'PNR 파싱 실패' });
  }
});
