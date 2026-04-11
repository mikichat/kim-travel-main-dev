import { Router, Request, Response } from 'express';
import {
  getAllBusReservations,
  getBusReservationById,
  createBusReservation,
  updateBusReservation,
  deleteBusReservation,
} from '../services/bus-reservations.service';

export const busReservationsRouter = Router();
// 인증 제거 — 내부망 전용 (estimates 라우트와 동일 정책)

// GET /api/bus-reservations
busReservationsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const items = await getAllBusReservations();
    res.json({ success: true, data: { items } });
  } catch {
    res.status(500).json({ success: false, error: '버스예약 조회 실패' });
  }
});

// GET /api/bus-reservations/:id
busReservationsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const item = await getBusReservationById(req.params.id);
    if (!item) { res.status(404).json({ success: false, error: '버스예약을 찾을 수 없습니다.' }); return; }
    res.json({ success: true, data: { item } });
  } catch {
    res.status(500).json({ success: false, error: '버스예약 조회 실패' });
  }
});

// POST /api/bus-reservations
busReservationsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    if (!data) { res.status(400).json({ success: false, error: 'data 필드가 필요합니다.' }); return; }
    const item = await createBusReservation(typeof data === 'string' ? data : JSON.stringify(data));
    res.status(201).json({ success: true, data: { item } });
  } catch {
    res.status(500).json({ success: false, error: '버스예약 생성 실패' });
  }
});

// PATCH /api/bus-reservations/:id
busReservationsRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    if (!data) { res.status(400).json({ success: false, error: 'data 필드가 필요합니다.' }); return; }
    const item = await updateBusReservation(req.params.id, typeof data === 'string' ? data : JSON.stringify(data));
    if (!item) { res.status(404).json({ success: false, error: '버스예약을 찾을 수 없습니다.' }); return; }
    res.json({ success: true, data: { item } });
  } catch {
    res.status(500).json({ success: false, error: '버스예약 수정 실패' });
  }
});

// DELETE /api/bus-reservations/:id
busReservationsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await deleteBusReservation(req.params.id);
    if (!deleted) { res.status(404).json({ success: false, error: '버스예약을 찾을 수 없습니다.' }); return; }
    res.json({ success: true, data: { deleted: true } });
  } catch {
    res.status(500).json({ success: false, error: '버스예약 삭제 실패' });
  }
});
