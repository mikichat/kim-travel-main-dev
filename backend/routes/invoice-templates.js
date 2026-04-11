const express = require('express');
const logger = require('../logger');

function createInvoiceTemplateRoutes(db) {
    const router = express.Router();

    router.get('/', async (req, res) => {
        try {
            const rows = await db.all('SELECT * FROM invoice_templates ORDER BY created_at DESC');
            const list = rows.map(r => ({ ...r, data: JSON.parse(r.data) }));
            res.json(list);
        } catch (error) {
            logger.error('invoice_templates 조회 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/', async (req, res) => {
        try {
            const { name, data } = req.body;
            if (!name || !data) return res.status(400).json({ error: 'name, data 필수' });
            const result = await db.run(
                'INSERT INTO invoice_templates (name, data) VALUES (?, ?)',
                [name, JSON.stringify(data)]
            );
            res.json({ id: result.lastID, success: true });
        } catch (error) {
            logger.error('invoice_templates 저장 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/bulk', async (req, res) => {
        try {
            const { items } = req.body;
            if (!Array.isArray(items)) return res.status(400).json({ error: 'items 배열 필수' });
            let success = 0;
            for (const item of items) {
                if (item.name && item.data) {
                    await db.run('INSERT INTO invoice_templates (name, data) VALUES (?, ?)',
                        [item.name, JSON.stringify(item.data)]);
                    success++;
                }
            }
            res.json({ success });
        } catch (error) {
            logger.error('invoice_templates 일괄 저장 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    router.delete('/:id', async (req, res) => {
        try {
            await db.run('DELETE FROM invoice_templates WHERE id = ?', [req.params.id]);
            res.json({ success: true });
        } catch (error) {
            logger.error('invoice_templates 삭제 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

module.exports = createInvoiceTemplateRoutes;
