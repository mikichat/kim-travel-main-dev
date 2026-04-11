const express = require('express');
const logger = require('../logger');

function createBusReservationRoutes(db) {
    const router = express.Router();

    // 전체 목록 조회
    router.get('/', async (req, res) => {
        try {
            const rows = await db.all('SELECT * FROM bus_reservations ORDER BY updated_at DESC');
            const list = rows.map(r => ({
                ...r,
                data: JSON.parse(r.data)
            }));
            res.json(list);
        } catch (error) {
            logger.error('bus_reservations 조회 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // 저장 (id 없으면 BUS-timestamp 생성, 기존 있으면 UPDATE)
    router.post('/', async (req, res) => {
        try {
            const { id, data } = req.body;
            if (!data) return res.status(400).json({ error: 'data 필수' });
            const saveId = id || 'BUS-' + Date.now();
            const existing = await db.get('SELECT id FROM bus_reservations WHERE id = ?', [saveId]);
            if (existing) {
                await db.run(
                    `UPDATE bus_reservations SET data = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
                    [JSON.stringify(data), saveId]
                );
            } else {
                await db.run(
                    `INSERT INTO bus_reservations (id, data, created_at, updated_at) VALUES (?, ?, datetime('now','localtime'), datetime('now','localtime'))`,
                    [saveId, JSON.stringify(data)]
                );
            }
            res.json({ id: saveId, success: true });
        } catch (error) {
            logger.error('bus_reservations 저장 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // 일괄 저장 (마이그레이션용)
    router.post('/bulk', async (req, res) => {
        try {
            const { items } = req.body;
            if (!Array.isArray(items)) return res.status(400).json({ error: 'items 배열 필수' });
            let success = 0;
            for (const item of items) {
                const saveId = item.id || 'BUS-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
                await db.run(
                    `INSERT OR REPLACE INTO bus_reservations (id, data, updated_at) VALUES (?, ?, datetime('now','localtime'))`,
                    [saveId, JSON.stringify(item.data !== undefined ? item.data : item)]
                );
                success++;
            }
            res.json({ success, total: items.length });
        } catch (error) {
            logger.error('bus_reservations 일괄 저장 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // 삭제
    router.delete('/:id', async (req, res) => {
        try {
            await db.run('DELETE FROM bus_reservations WHERE id = ?', [req.params.id]);
            res.json({ success: true });
        } catch (error) {
            logger.error('bus_reservations 삭제 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

module.exports = createBusReservationRoutes;
