import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const db = require('../config/database');

/**
 * GET /api/settlements
 * Get all settlements
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const settlements = db.prepare(`
      SELECT * FROM settlements 
      ORDER BY created_at DESC
    `).all();

    res.json({
      success: true,
      data: { settlements },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get settlements',
    });
  }
});

/**
 * GET /api/settlements/:id
 * Get settlement by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const settlement = db.prepare('SELECT * FROM settlements WHERE id = ?').get(req.params.id);

    if (!settlement) {
      res.status(404).json({ success: false, message: 'Settlement not found' });
      return;
    }

    res.json({ success: true, data: settlement });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get settlement',
    });
  }
});

/**
 * POST /api/settlements
 * Create a new settlement
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = uuidv4();
    const now = new Date().toISOString();
    const data = req.body;

    db.prepare(`
      INSERT INTO settlements (id, name, amount, status, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name || null,
      data.amount || 0,
      data.status || 'pending',
      data.description || null,
      now
    );

    const settlement = db.prepare('SELECT * FROM settlements WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: settlement });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create settlement',
    });
  }
});

/**
 * PUT /api/settlements/:id
 * Update a settlement
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = db.prepare('SELECT * FROM settlements WHERE id = ?').get(req.params.id);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Settlement not found' });
      return;
    }

    const data = req.body;
    db.prepare(`
      UPDATE settlements SET
        name = COALESCE(?, name),
        amount = COALESCE(?, amount),
        status = COALESCE(?, status),
        description = COALESCE(?, description)
      WHERE id = ?
    `).run(
      data.name,
      data.amount,
      data.status,
      data.description,
      req.params.id
    );

    const settlement = db.prepare('SELECT * FROM settlements WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: settlement });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update settlement',
    });
  }
});

/**
 * DELETE /api/settlements/:id
 * Delete a settlement
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = db.prepare('SELECT * FROM settlements WHERE id = ?').get(req.params.id);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Settlement not found' });
      return;
    }

    db.prepare('DELETE FROM settlements WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Settlement deleted' });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete settlement',
    });
  }
});

module.exports = router;
