const express = require('express');
const logger = require('../logger');

function createInvoiceRecipientRoutes(db) {
    const router = express.Router();

    router.get('/', async (req, res) => {
        try {
            const rows = await db.all('SELECT * FROM invoice_recipients ORDER BY name');
            res.json(rows);
        } catch (error) {
            logger.error('invoice_recipients 조회 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/', async (req, res) => {
        try {
            const { name } = req.body;
            if (!name) return res.status(400).json({ error: 'name 필수' });
            await db.run('INSERT OR IGNORE INTO invoice_recipients (name) VALUES (?)', [name]);
            res.json({ success: true });
        } catch (error) {
            logger.error('invoice_recipients 저장 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/bulk', async (req, res) => {
        try {
            const { names } = req.body;
            if (!Array.isArray(names)) return res.status(400).json({ error: 'names 배열 필수' });
            let success = 0;
            for (const name of names) {
                if (name) {
                    await db.run('INSERT OR IGNORE INTO invoice_recipients (name) VALUES (?)', [name]);
                    success++;
                }
            }
            res.json({ success });
        } catch (error) {
            logger.error('invoice_recipients 일괄 저장 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    router.delete('/:id', async (req, res) => {
        try {
            await db.run('DELETE FROM invoice_recipients WHERE id = ?', [req.params.id]);
            res.json({ success: true });
        } catch (error) {
            logger.error('invoice_recipients 삭제 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

module.exports = createInvoiceRecipientRoutes;
