// @TASK Tickets Router - CRUD endpoints for air_tickets
// @SPEC All routes nested: /api/bookings/:bookingId/tickets

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import {
  listTicketsByBooking,
  createTicket,
  createTicketsBulk,
  updateTicket,
  deleteTicket,
} from '../services/tickets.service';
import { getBookingById } from '../services/bookings.service';

// All routes: /api/bookings/:bookingId/tickets
export const ticketsByBookingRouter = Router({ mergeParams: true });
ticketsByBookingRouter.use(requireAuth);

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const createTicketSchema = z.object({
  passenger_name: z.string().optional(),
  ticket_number: z.string().min(1, '티켓번호는 필수입니다.'),
  issue_date: z.string().regex(DATE_REGEX, '날짜 형식: YYYY-MM-DD').optional(),
  status: z.enum(['issued', 'refunded', 'reissued', 'void']).optional(),
});

const updateTicketSchema = z.object({
  passenger_name: z.string().optional(),
  ticket_number: z.string().min(1).optional(),
  issue_date: z.string().regex(DATE_REGEX, '날짜 형식: YYYY-MM-DD').optional().nullable(),
  status: z.enum(['issued', 'refunded', 'reissued', 'void']).optional(),
});

const bulkCreateSchema = z.object({
  tickets: z.array(createTicketSchema).min(1, '최소 1개 티켓이 필요합니다.').max(50),
});

// GET /api/bookings/:bookingId/tickets
ticketsByBookingRouter.get('/', async (req: Request, res: Response) => {
  try {
    const booking = await getBookingById(req.params.bookingId);
    if (!booking) {
      res.status(404).json({ success: false, error: '예약을 찾을 수 없습니다.' });
      return;
    }
    const tickets = await listTicketsByBooking(req.params.bookingId);
    res.json({ success: true, data: { tickets } });
  } catch (err) {
    res.status(500).json({ success: false, error: '티켓 목록 조회 실패' });
  }
});

// POST /api/bookings/:bookingId/tickets
ticketsByBookingRouter.post('/', async (req: Request, res: Response) => {
  const parsed = createTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.',
    });
    return;
  }

  try {
    const booking = await getBookingById(req.params.bookingId);
    if (!booking) {
      res.status(404).json({ success: false, error: '예약을 찾을 수 없습니다.' });
      return;
    }

    const ticket = await createTicket({
      ...parsed.data,
      booking_id: req.params.bookingId,
    });
    res.status(201).json({ success: true, data: { ticket } });
  } catch (err) {
    res.status(500).json({ success: false, error: '티켓 생성 실패' });
  }
});

// POST /api/bookings/:bookingId/tickets/bulk
ticketsByBookingRouter.post('/bulk', async (req: Request, res: Response) => {
  const parsed = bulkCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.',
    });
    return;
  }

  try {
    const booking = await getBookingById(req.params.bookingId);
    if (!booking) {
      res.status(404).json({ success: false, error: '예약을 찾을 수 없습니다.' });
      return;
    }

    const items = parsed.data.tickets.map(t => ({
      ...t,
      booking_id: req.params.bookingId,
    }));
    const tickets = await createTicketsBulk(items);
    res.status(201).json({ success: true, data: { tickets, count: tickets.length } });
  } catch (err) {
    res.status(500).json({ success: false, error: '티켓 일괄 생성 실패' });
  }
});

// PATCH /api/bookings/:bookingId/tickets/:ticketId
ticketsByBookingRouter.patch('/:ticketId', async (req: Request, res: Response) => {
  const parsed = updateTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.',
    });
    return;
  }

  try {
    const ticket = await updateTicket(req.params.ticketId, parsed.data);
    if (!ticket) {
      res.status(404).json({ success: false, error: '티켓을 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { ticket } });
  } catch (err) {
    res.status(500).json({ success: false, error: '티켓 수정 실패' });
  }
});

// DELETE /api/bookings/:bookingId/tickets/:ticketId
ticketsByBookingRouter.delete('/:ticketId', async (req: Request, res: Response) => {
  try {
    const deleted = await deleteTicket(req.params.ticketId);
    if (!deleted) {
      res.status(404).json({ success: false, error: '티켓을 찾을 수 없습니다.' });
      return;
    }
    res.json({ success: true, data: { message: '티켓이 삭제되었습니다.' } });
  } catch (err) {
    res.status(500).json({ success: false, error: '티켓 삭제 실패' });
  }
});
