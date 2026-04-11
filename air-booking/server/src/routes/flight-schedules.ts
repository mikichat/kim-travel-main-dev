// 항공 스케줄 라우트 — CRUD

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  listFlightSchedules,
  getFlightScheduleById,
  createFlightSchedule,
  updateFlightSchedule,
  deleteFlightSchedule,
  findMatchingBookings,
  getRelatedBookings,
  hasRelatedBookings,
} from '../services/flight-schedules.service';

export const flightSchedulesRouter = Router();
flightSchedulesRouter.use(requireAuth);

// GET /api/flight-schedules
flightSchedulesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { search, departure_from, departure_to, page, limit } = req.query;
    const result = await listFlightSchedules({
      search: search as string | undefined,
      departure_from: departure_from as string | undefined,
      departure_to: departure_to as string | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: '항공 스케줄 목록 조회 실패' });
  }
});

// GET /api/flight-schedules/export — CSV 내보내기 (must be before /:id)
flightSchedulesRouter.get('/export/csv', async (_req: Request, res: Response) => {
  try {
    const result = await listFlightSchedules({ limit: 1000 });
    const escapeCsv = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) return `"${str.replace(/"/g, '""')}"`;
      return str;
    };
    const header = 'airline,flight_number,departure_airport,arrival_airport,departure_date,departure_time,arrival_time,passengers\n';
    const rows = result.schedules.map(s =>
      [s.airline, s.flight_number, s.departure_airport, s.arrival_airport, s.departure_date, s.departure_time, s.arrival_time, s.passengers].map(escapeCsv).join(',')
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=flight-schedules.csv');
    res.send('\uFEFF' + header + rows);
  } catch {
    res.status(500).json({ success: false, error: 'CSV 내보내기 실패' });
  }
});

// GET /api/flight-schedules/:id
flightSchedulesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const schedule = await getFlightScheduleById(req.params.id);
    if (!schedule) {
      res.status(404).json({ success: false, error: '항공 스케줄을 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { schedule } });
  } catch (err) {
    res.status(500).json({ success: false, error: '항공 스케줄 조회 실패' });
  }
});

// POST /api/flight-schedules
flightSchedulesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { group_id, group_name, airline, flight_number, departure_date, departure_airport, departure_time, arrival_date, arrival_airport, arrival_time, passengers } = req.body;

    if (!airline || !departure_date || !departure_airport || !departure_time || !arrival_date || !arrival_airport || !arrival_time) {
      res.status(400).json({ success: false, error: '필수 항목을 입력해주세요. (항공사, 출발일/공항/시간, 도착일/공항/시간)' });
      return;
    }

    const schedule = await createFlightSchedule({
      group_id, group_name, airline, flight_number,
      departure_date, departure_airport, departure_time,
      arrival_date, arrival_airport, arrival_time,
      passengers: passengers ? Number(passengers) : 0,
    });
    res.status(201).json({ success: true, data: { schedule } });
  } catch (err) {
    res.status(500).json({ success: false, error: '항공 스케줄 생성 실패' });
  }
});

// PATCH /api/flight-schedules/:id
flightSchedulesRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const schedule = await updateFlightSchedule(req.params.id, req.body);
    if (!schedule) {
      res.status(404).json({ success: false, error: '항공 스케줄을 찾을 수 없습니다.' });
      return;
    }
    // PNR 매칭 경고
    const matchedBookings = await findMatchingBookings(req.params.id);
    res.json({ success: true, data: { schedule, matchedBookings } });
  } catch (err) {
    res.status(500).json({ success: false, error: '항공 스케줄 수정 실패' });
  }
});

// GET /api/flight-schedules/:id/bookings — 관련 예약 목록
flightSchedulesRouter.get('/:id/bookings', async (req: Request, res: Response) => {
  try {
    const bookings = await getRelatedBookings(req.params.id);
    res.json({ success: true, data: { bookings } });
  } catch (err) {
    res.status(500).json({ success: false, error: '관련 예약 조회 실패' });
  }
});

// POST /api/flight-schedules/import — CSV 일괄 가져오기
flightSchedulesRouter.post('/import', async (req: Request, res: Response) => {
  try {
    const { csv } = req.body;
    if (!csv || typeof csv !== 'string') {
      res.status(400).json({ success: false, error: 'CSV 데이터가 필요합니다.' });
      return;
    }
    const lines = csv.split('\n').filter((l: string) => l.trim());
    if (lines.length < 2) {
      res.status(400).json({ success: false, error: 'CSV 헤더와 최소 1행의 데이터가 필요합니다.' });
      return;
    }
    // 첫 줄은 헤더, 나머지는 데이터
    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c: string) => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 7) continue;
      const [airline, flight_number, departure_airport, arrival_airport, departure_date, departure_time, arrival_time, passengers] = cols;
      if (!airline || !departure_date || !departure_airport || !departure_time || !arrival_airport || !arrival_time) continue;
      await createFlightSchedule({
        group_name: '',
        airline,
        flight_number: flight_number || undefined,
        departure_date,
        departure_airport,
        departure_time,
        arrival_date: departure_date,
        arrival_airport,
        arrival_time,
        passengers: passengers ? Number(passengers) : 0,
      });
      imported++;
    }
    res.json({ success: true, data: { imported, total: lines.length - 1 } });
  } catch {
    res.status(500).json({ success: false, error: 'CSV 가져오기 실패' });
  }
});

// DELETE /api/flight-schedules/:id
flightSchedulesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const hasBookings = await hasRelatedBookings(req.params.id);
    if (hasBookings) {
      res.status(409).json({ success: false, error: '관련 예약이 있어 삭제할 수 없습니다.' });
      return;
    }
    const deleted = await deleteFlightSchedule(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: '항공 스케줄을 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { message: '삭제되었습니다.' } });
  } catch (err) {
    res.status(500).json({ success: false, error: '항공 스케줄 삭제 실패' });
  }
});
