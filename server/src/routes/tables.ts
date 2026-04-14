import express, { Request, Response } from 'express';

const router = express.Router();
const db = require('../config/database');

/**
 * GET /tables/:table
 * Get all records from a table
 */
router.get('/:table', async (req: Request, res: Response): Promise<void> => {
  try {
    const { table } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = (page - 1) * limit;
    const search = req.query.search as string || '';
    const sortField = req.query.sortField as string || 'created_at';
    const sortOrder = req.query.sortOrder as string || 'DESC';

    // Whitelist allowed tables for security
    const allowedTables = ['groups', 'products', 'customers', 'schedules', 'bookings', 'hotels', 'images', 'invoices', 'flight_schedules', 'cost_calculations'];
    
    if (!allowedTables.includes(table)) {
      res.status(403).json({ error: 'Table not allowed' });
      return;
    }

    let query = `SELECT * FROM ${table}`;
    const params: any[] = [];

    if (search) {
      query += ` WHERE name LIKE ? OR destination LIKE ?`;
      params.push(`%${search}%`, `%${search}%`);
    }

    // Get total count
    const countQuery = search 
      ? `SELECT COUNT(*) as count FROM ${table} WHERE name LIKE ? OR destination LIKE ?`
      : `SELECT COUNT(*) as count FROM ${table}`;
    const countResult = db.prepare(countQuery).get(...(search ? [`%${search}%`, `%${search}%`] : [])) as { count: number };
    const total = countResult.count;

    query += ` ORDER BY ${sortField} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: {
        rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get data'
    });
  }
});

/**
 * GET /tables/:table/:id
 * Get single record by ID
 */
router.get('/:table/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { table, id } = req.params;

    const allowedTables = ['groups', 'products', 'customers', 'schedules', 'bookings', 'hotels', 'images', 'invoices', 'flight_schedules', 'cost_calculations'];
    
    if (!allowedTables.includes(table)) {
      res.status(403).json({ error: 'Table not allowed' });
      return;
    }

    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);

    if (!row) {
      res.status(404).json({ error: 'Record not found' });
      return;
    }

    res.json({ success: true, data: row });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get record'
    });
  }
});

/**
 * POST /tables/:table
 * Create new record
 */
router.post('/:table', async (req: Request, res: Response): Promise<void> => {
  try {
    const { table } = req.params;
    const data = req.body;

    const allowedTables = ['groups', 'products', 'customers', 'schedules', 'bookings', 'hotels', 'images', 'invoices', 'flight_schedules', 'cost_calculations'];
    
    if (!allowedTables.includes(table)) {
      res.status(403).json({ error: 'Table not allowed' });
      return;
    }

    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    const now = new Date().toISOString();

    const keys = Object.keys(data);
    const values = Object.values(data);
    
    db.prepare(`INSERT INTO ${table} (id, ${keys.join(', ')}, created_at) VALUES (?, ${keys.map(() => '?').join(', ')}, ?)`)
      .run(id, ...values, now);

    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create record'
    });
  }
});

/**
 * PUT /tables/:table/:id
 * Update record
 */
router.put('/:table/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { table, id } = req.params;
    const data = req.body;

    const allowedTables = ['groups', 'products', 'customers', 'schedules', 'bookings', 'hotels', 'images', 'invoices', 'flight_schedules', 'cost_calculations'];
    
    if (!allowedTables.includes(table)) {
      res.status(403).json({ error: 'Table not allowed' });
      return;
    }

    const keys = Object.keys(data);
    const values = Object.values(data);
    const sets = keys.map(k => `${k} = ?`).join(', ');

    db.prepare(`UPDATE ${table} SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(...values, id);

    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    res.json({ success: true, data: row });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update record'
    });
  }
});

/**
 * DELETE /tables/:table/:id
 * Delete record
 */
router.delete('/:table/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { table, id } = req.params;

    const allowedTables = ['groups', 'products', 'customers', 'schedules', 'bookings', 'hotels', 'images', 'invoices', 'flight_schedules', 'cost_calculations'];
    
    if (!allowedTables.includes(table)) {
      res.status(403).json({ error: 'Table not allowed' });
      return;
    }

    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
    res.json({ success: true, message: 'Record deleted' });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete record'
    });
  }
});

module.exports = router;
