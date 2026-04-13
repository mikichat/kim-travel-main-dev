import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const db = require('../config/database');

/**
 * GET /api/bsp-dates
 * Get all BSP dates
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const bspDates = db.prepare(`
      SELECT * FROM bsp_dates 
      ORDER BY payment_date ASC
    `).all();

    res.json({
      success: true,
      data: { bspDates },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get BSP dates',
    });
  }
});

/**
 * GET /api/bsp-dates/:id
 * Get BSP date by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const bspDate = db.prepare('SELECT * FROM bsp_dates WHERE id = ?').get(req.params.id);

    if (!bspDate) {
      res.status(404).json({ success: false, message: 'BSP date not found' });
      return;
    }

    res.json({ success: true, data: bspDate });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get BSP date',
    });
  }
});

/**
 * POST /api/bsp-dates
 * Create a new BSP date
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = uuidv4();
    const now = new Date().toISOString();
    const data = req.body;

    db.prepare(`
      INSERT INTO bsp_dates (id, payment_date, description, type, is_notified, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.paymentDate || data.payment_date || now,
      data.description || null,
      data.type || 'payment',
      data.isNotified !== undefined ? (data.isNotified ? 1 : 0) : 0,
      now
    );

    const bspDate = db.prepare('SELECT * FROM bsp_dates WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: bspDate });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create BSP date',
    });
  }
});

/**
 * PUT /api/bsp-dates/:id
 * Update a BSP date
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = db.prepare('SELECT * FROM bsp_dates WHERE id = ?').get(req.params.id);
    if (!existing) {
      res.status(404).json({ success: false, message: 'BSP date not found' });
      return;
    }

    const data = req.body;

    db.prepare(`
      UPDATE bsp_dates SET
        payment_date = COALESCE(?, payment_date),
        description = COALESCE(?, description),
        type = COALESCE(?, type),
        is_notified = COALESCE(?, is_notified)
      WHERE id = ?
    `).run(
      data.paymentDate || data.payment_date,
      data.description,
      data.type,
      data.isNotified !== undefined ? (data.isNotified ? 1 : 0) : null,
      req.params.id
    );

    const bspDate = db.prepare('SELECT * FROM bsp_dates WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: bspDate });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update BSP date',
    });
  }
});

/**
 * DELETE /api/bsp-dates/:id
 * Delete a BSP date
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = db.prepare('SELECT * FROM bsp_dates WHERE id = ?').get(req.params.id);
    if (!existing) {
      res.status(404).json({ success: false, message: 'BSP date not found' });
      return;
    }

    db.prepare('DELETE FROM bsp_dates WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'BSP date deleted' });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete BSP date',
    });
  }
});

module.exports = router;
