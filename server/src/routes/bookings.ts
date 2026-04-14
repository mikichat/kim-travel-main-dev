import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createBookingSchema, updateBookingSchema, validateBody } from '../validators/schemas';
import { operationalError } from '../middleware/errorHandler';

const router = express.Router();
const db = require('../config/database');

/**
 * GET /api/bookings
 * Get all bookings with optional filters
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 100);
    const status = req.query.status as string | undefined;
    const search = req.query.q as string | undefined;

    let bookings;
    if (search) {
      bookings = db.prepare(`
        SELECT * FROM bookings 
        WHERE (pnr LIKE ? OR name_kr LIKE ? OR name_en LIKE ?)
        ${status ? 'AND status = ?' : ''}
        ORDER BY created_at DESC LIMIT ?
      `).all(`%${search}%`, `%${search}%`, `%${search}%`, ...(status ? [status] : []), limit);
    } else if (status) {
      bookings = db.prepare(`
        SELECT * FROM bookings 
        WHERE status = ? 
        ORDER BY created_at DESC LIMIT ?
      `).all(status, limit);
    } else {
      bookings = db.prepare(`
        SELECT * FROM bookings 
        ORDER BY created_at DESC LIMIT ?
      `).all(limit);
    }

    res.json({
      success: true,
      data: { bookings },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get bookings',
    });
  }
});

/**
 * GET /api/bookings/:id
 * Get booking by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.id)) {
      throw operationalError('유효하지 않은 ID 형식입니다.', 400);
    }

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);

    if (!booking) {
      throw operationalError('예약을 찾을 수 없습니다.', 404);
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      res.status((error as any).statusCode).json({
        success: false,
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get booking',
    });
  }
});

/**
 * POST /api/bookings
 * Create a new booking
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validation = validateBody(createBookingSchema, req.body);
    if (!validation.success) {
      throw operationalError(`입력 검증 실패: ${validation.error}`, 400);
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const data = validation.data;

    db.prepare(`
      INSERT INTO bookings (id, user_id, customer_id, pnr, airline, flight_number, route_from, route_to, name_kr, name_en, passport_number, seat_number, fare, nmtl_date, tl_date, departure_date, return_date, status, remarks, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.userId || null,
      data.customerId || null,
      data.pnr || null,
      data.airline || null,
      data.flightNumber || null,
      data.routeFrom || null,
      data.routeTo || null,
      data.nameKr || null,
      data.nameEn || null,
      data.passportNumber || null,
      data.seatNumber || null,
      data.fare || null,
      data.nmtlDate || null,
      data.tlDate || null,
      data.departureDate || null,
      data.returnDate || null,
      data.status,
      data.remarks || null,
      now,
      now
    );

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      res.status((error as any).statusCode).json({
        success: false,
        message: error.message,
      });
      return;
    }
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create booking',
    });
  }
});

/**
 * PUT /api/bookings/:id
 * Update a booking
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.id)) {
      throw operationalError('유효하지 않은 ID 형식입니다.', 400);
    }

    // Validate request body
    const validation = validateBody(updateBookingSchema, req.body);
    if (!validation.success) {
      throw operationalError(`입력 검증 실패: ${validation.error}`, 400);
    }

    const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!existing) {
      throw operationalError('예약을 찾을 수 없습니다.', 404);
    }

    const now = new Date().toISOString();
    const data = validation.data;

    db.prepare(`
      UPDATE bookings SET
        user_id = COALESCE(?, user_id),
        customer_id = COALESCE(?, customer_id),
        pnr = COALESCE(?, pnr),
        airline = COALESCE(?, airline),
        flight_number = COALESCE(?, flight_number),
        route_from = COALESCE(?, route_from),
        route_to = COALESCE(?, route_to),
        name_kr = COALESCE(?, name_kr),
        name_en = COALESCE(?, name_en),
        passport_number = COALESCE(?, passport_number),
        seat_number = COALESCE(?, seat_number),
        fare = COALESCE(?, fare),
        nmtl_date = COALESCE(?, nmtl_date),
        tl_date = COALESCE(?, tl_date),
        departure_date = COALESCE(?, departure_date),
        return_date = COALESCE(?, return_date),
        status = COALESCE(?, status),
        remarks = COALESCE(?, remarks),
        updated_at = ?
      WHERE id = ?
    `).run(
      data.userId,
      data.customerId,
      data.pnr,
      data.airline,
      data.flightNumber,
      data.routeFrom,
      data.routeTo,
      data.nameKr,
      data.nameEn,
      data.passportNumber,
      data.seatNumber,
      data.fare,
      data.nmtlDate,
      data.tlDate,
      data.departureDate,
      data.returnDate,
      data.status,
      data.remarks,
      now,
      req.params.id
    );

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: booking });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      res.status((error as any).statusCode).json({
        success: false,
        message: error.message,
      });
      return;
    }
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update booking',
    });
  }
});

/**
 * DELETE /api/bookings/:id
 * Delete a booking
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.id)) {
      throw operationalError('유효하지 않은 ID 형식입니다.', 400);
    }

    const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!existing) {
      throw operationalError('예약을 찾을 수 없습니다.', 404);
    }

    db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Booking deleted' });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      res.status((error as any).statusCode).json({
        success: false,
        message: error.message,
      });
      return;
    }
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete booking',
    });
  }
});

module.exports = router;
