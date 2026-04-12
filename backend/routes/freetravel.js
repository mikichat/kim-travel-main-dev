// backend/routes/freetravel.js
const express = require('express');
const crypto = require('crypto');
const logger = require('../logger');

function createFreeTravelRoutes(db) {
    const router = express.Router();

    // ==========================================
    // bookings 테이블 CRUD
    // ==========================================

    // 전체 목록 조회
    router.get('/bookings', async (req, res) => {
        try {
            const rows = await db.all(`
                SELECT id, name, recipient, sender, travel_period, destination, sections, created_at, updated_at
                FROM bookings
                ORDER BY updated_at DESC
            `);
            const list = rows.map(r => ({
                id: r.id,
                name: r.name,
                recipient: r.recipient,
                sender: r.sender,
                travel_period: r.travel_period ? JSON.parse(r.travel_period) : null,
                destination: r.destination,
                sections: r.sections ? JSON.parse(r.sections) : {},
                created_at: r.created_at,
                updated_at: r.updated_at
            }));
            res.json(list);
        } catch (error) {
            logger.error('[freetravel] bookings 목록 조회 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // 단건 조회
    router.get('/bookings/:id', async (req, res) => {
        try {
            const row = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
            if (!row) return res.status(404).json({ error: '예약을 찾을 수 없습니다' });
            res.json({
                id: row.id,
                name: row.name,
                recipient: row.recipient,
                sender: row.sender,
                travel_period: row.travel_period ? JSON.parse(row.travel_period) : null,
                destination: row.destination,
                data: row.data,
                sections: row.sections ? JSON.parse(row.sections) : {},
                created_at: row.created_at,
                updated_at: row.updated_at
            });
        } catch (error) {
            logger.error('[freetravel] bookings 단건 조회 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // 저장 (생성)
    router.post('/bookings', async (req, res) => {
        try {
            const { name, recipient, sender, travel_period, destination, data, sections } = req.body;
            if (!name || !data) return res.status(400).json({ error: 'name과 data는 필수입니다' });

            const id = crypto.randomUUID();
            await db.run(
                `INSERT INTO bookings (id, name, recipient, sender, travel_period, destination, data, sections)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    name,
                    recipient || '여행세상',
                    sender || '여행세상',
                    travel_period ? JSON.stringify(travel_period) : null,
                    destination || '',
                    data,
                    sections ? JSON.stringify(sections) : '{}'
                ]
            );
            res.json({ id, name, success: true });
        } catch (error) {
            logger.error('[freetravel] bookings 저장 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // 수정
    router.put('/bookings/:id', async (req, res) => {
        try {
            const { name, recipient, sender, travel_period, destination, data, sections } = req.body;
            await db.run(
                `UPDATE bookings
                 SET name = ?, recipient = ?, sender = ?, travel_period = ?, destination = ?, data = ?, sections = ?,
                     updated_at = datetime('now', 'localtime')
                 WHERE id = ?`,
                [
                    name,
                    recipient || '여행세상',
                    sender || '여행세상',
                    travel_period ? JSON.stringify(travel_period) : null,
                    destination || '',
                    data,
                    sections ? JSON.stringify(sections) : '{}',
                    req.params.id
                ]
            );
            res.json({ success: true });
        } catch (error) {
            logger.error('[freetravel] bookings 수정 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // 삭제
    router.delete('/bookings/:id', async (req, res) => {
        try {
            await db.run('DELETE FROM bookings WHERE id = ?', [req.params.id]);
            res.json({ success: true });
        } catch (error) {
            logger.error('[freetravel] bookings 삭제 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // ==========================================
    // company_defaults
    // ==========================================

    // 회사 정보 조회
    router.get('/company', async (req, res) => {
        try {
            const row = await db.get('SELECT * FROM company_defaults WHERE id = 1');
            if (!row) return res.status(404).json({ error: '회사 정보를 찾을 수 없습니다' });
            res.json(row);
        } catch (error) {
            logger.error('[freetravel] company 조회 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // 회사 정보 저장
    router.put('/company', async (req, res) => {
        try {
            const { name, ceo, address, phone, fax, manager_name, manager_phone, stamp_image } = req.body;
            await db.run(
                `UPDATE company_defaults
                 SET name = ?, ceo = ?, address = ?, phone = ?, fax = ?,
                     manager_name = ?, manager_phone = ?, stamp_image = ?
                 WHERE id = 1`,
                [name, ceo, address, phone, fax, manager_name, manager_phone, stamp_image]
            );
            res.json({ success: true });
        } catch (error) {
            logger.error('[freetravel] company 저장 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // ==========================================
    // 미리보기용 데이터 조회 (data 필드만 반환)
    // ==========================================
    router.get('/preview/:id', async (req, res) => {
        try {
            const row = await db.get('SELECT data, sections FROM bookings WHERE id = ?', [req.params.id]);
            if (!row) return res.status(404).json({ error: '예약을 찾을 수 없습니다' });
            res.json({
                data: row.data,
                sections: row.sections ? JSON.parse(row.sections) : {}
            });
        } catch (error) {
            logger.error('[freetravel] preview 조회 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

module.exports = createFreeTravelRoutes;
