const express = require('express');
const logger = require('../logger');

function createTravelSaveRoutes(db) {
    const router = express.Router();

    // 전체 목록 조회
    router.get('/', async (req, res) => {
        try {
            const rows = await db.all('SELECT id, name, data, created_at, updated_at FROM travel_saves ORDER BY updated_at DESC');
            const list = rows.map(r => ({
                id: r.id,
                name: r.name,
                data: JSON.parse(r.data),
                created_at: r.created_at,
                updated_at: r.updated_at
            }));
            res.json(list);
        } catch (error) {
            logger.error('travel_saves 조회 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // 단건 조회 (이미지 포함)
    router.get('/:id', async (req, res) => {
        try {
            const row = await db.get('SELECT * FROM travel_saves WHERE id = ?', [req.params.id]);
            if (!row) return res.status(404).json({ error: '없음' });
            res.json({
                id: row.id,
                name: row.name,
                data: JSON.parse(row.data),
                images: row.images ? JSON.parse(row.images) : {},
                created_at: row.created_at,
                updated_at: row.updated_at
            });
        } catch (error) {
            logger.error('travel_saves 단건 조회 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // 저장
    router.post('/', async (req, res) => {
        try {
            const { name, data, images } = req.body;
            if (!name || !data) return res.status(400).json({ error: 'name, data 필수' });
            const result = await db.run(
                `INSERT INTO travel_saves (name, data, images) VALUES (?, ?, ?)`,
                [name, JSON.stringify(data), images ? JSON.stringify(images) : null]
            );
            res.json({ id: result.lastID, name });
        } catch (error) {
            logger.error('travel_saves 저장 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // 수정
    router.put('/:id', async (req, res) => {
        try {
            const { name, data, images } = req.body;
            await db.run(
                `UPDATE travel_saves SET name = ?, data = ?, images = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
                [name, JSON.stringify(data), images ? JSON.stringify(images) : null, req.params.id]
            );
            res.json({ success: true });
        } catch (error) {
            logger.error('travel_saves 수정 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // 삭제
    router.delete('/:id', async (req, res) => {
        try {
            await db.run('DELETE FROM travel_saves WHERE id = ?', [req.params.id]);
            res.json({ success: true });
        } catch (error) {
            logger.error('travel_saves 삭제 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

module.exports = createTravelSaveRoutes;
