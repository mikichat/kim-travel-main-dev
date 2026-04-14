import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const db = require('../config/database');

/**
 * GET /api/vendors
 * Get all vendors
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const vendors = db.prepare(`
      SELECT * FROM vendors 
      ORDER BY created_at DESC
    `).all();

    res.json({
      success: true,
      data: { vendors },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get vendors',
    });
  }
});

/**
 * GET /api/vendors/:id
 * Get vendor by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);

    if (!vendor) {
      res.status(404).json({ success: false, message: 'Vendor not found' });
      return;
    }

    res.json({ success: true, data: vendor });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get vendor',
    });
  }
});

/**
 * POST /api/vendors
 * Create a new vendor
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = uuidv4();
    const now = new Date().toISOString();
    const data = req.body;

    db.prepare(`
      INSERT INTO vendors (id, name, category, phone, email, address, bank_account, bank_name, remarks, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name || null,
      data.category || null,
      data.phone || null,
      data.email || null,
      data.address || null,
      data.bankAccount || data.bank_account || null,
      data.bankName || data.bank_name || null,
      data.remarks || null,
      now
    );

    const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: vendor });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create vendor',
    });
  }
});

/**
 * PUT /api/vendors/:id
 * Update a vendor
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Vendor not found' });
      return;
    }

    const data = req.body;
    db.prepare(`
      UPDATE vendors SET
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        bank_account = COALESCE(?, bank_account),
        bank_name = COALESCE(?, bank_name),
        remarks = COALESCE(?, remarks)
      WHERE id = ?
    `).run(
      data.name,
      data.category,
      data.phone,
      data.email,
      data.address,
      data.bankAccount || data.bank_account,
      data.bankName || data.bank_name,
      data.remarks,
      req.params.id
    );

    const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: vendor });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update vendor',
    });
  }
});

/**
 * DELETE /api/vendors/:id
 * Delete a vendor
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Vendor not found' });
      return;
    }

    db.prepare('DELETE FROM vendors WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Vendor deleted' });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete vendor',
    });
  }
});

module.exports = router;
