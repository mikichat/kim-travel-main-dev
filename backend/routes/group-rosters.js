const express = require('express');
const { v4: uuidv4 } = require('uuid');
const logger = require('../logger');

/** 단체명단 → 단체상품(groups) 자동 동기화 */
async function syncRosterToGroup(db, rosterId, rosterName, rosterData) {
    const data = typeof rosterData === 'string' ? JSON.parse(rosterData) : rosterData;

    // 멤버 추출 (다양한 필드명 호환)
    const rawMembers = data.members || data.passengers || data.pax || [];
    const members = Array.isArray(rawMembers) ? rawMembers.map((m, i) => ({
        no: i + 1,
        nameKr: m.nameKr || m.name_kr || m.korName || m.name || '',
        nameEn: m.nameEn || m.name_en || m.engName || '',
        gender: m.gender || m.sex || '',
        passportNo: m.passportNo || m.passport_no || m.passport || '',
        birthDate: m.birthDate || m.birth_date || m.birth || '',
        passportExpire: m.passportExpire || m.passport_expire || '',
        phone: m.phone || m.tel || '',
    })) : [];

    const destination = data.destination || data.route || null;
    const departureDate = data.departure_date || data.departureDate || null;
    const returnDate = data.return_date || data.returnDate || null;

    // roster_id로 기존 그룹 찾기 (roster_id 컬럼이 없으면 name으로 매칭)
    let existing = null;
    try {
        existing = await db.get('SELECT id FROM groups WHERE roster_id = ?', [rosterId]);
    } catch {
        // roster_id 컬럼 없으면 추가
        try {
            await db.run('ALTER TABLE groups ADD COLUMN roster_id TEXT');
        } catch { /* already exists */ }
        existing = null;
    }

    if (!existing) {
        // name으로 매칭 시도
        existing = await db.get('SELECT id FROM groups WHERE name = ?', [rosterName]);
    }

    if (existing) {
        await db.run(
            `UPDATE groups SET name = ?, destination = ?, departure_date = ?, return_date = ?, members = ?, roster_id = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
            [rosterName, destination, departureDate, returnDate, JSON.stringify(members), rosterId, existing.id]
        );
        logger.info(`단체상품(groups) 업데이트: ${rosterName} (${members.length}명)`);
    } else {
        const groupId = uuidv4();
        await db.run(
            `INSERT INTO groups (id, name, destination, departure_date, return_date, members, roster_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'), datetime('now','localtime'))`,
            [groupId, rosterName, destination, departureDate, returnDate, JSON.stringify(members), rosterId]
        );
        logger.info(`단체상품(groups) 자동 생성: ${rosterName} (${members.length}명)`);
    }

    // products 테이블에도 동기화 (단체상품 페이지에서 표시용)
    try {
        const existingProduct = await db.get('SELECT id FROM products WHERE name = ?', [rosterName]);
        const duration = (departureDate && returnDate)
            ? Math.ceil((new Date(returnDate) - new Date(departureDate)) / (1000 * 60 * 60 * 24)) + 1
            : 0;

        if (existingProduct) {
            await db.run(
                `UPDATE products SET destination = ?, duration = ?, description = ?, status = '활성', created_at = COALESCE(created_at, datetime('now','localtime')) WHERE id = ?`,
                [destination, duration, `${rosterName} (${members.length}명)`, existingProduct.id]
            );
            logger.info(`단체상품(products) 업데이트: ${rosterName}`);
        } else {
            const productId = uuidv4();
            await db.run(
                `INSERT INTO products (id, name, destination, duration, price, status, description, created_at) VALUES (?, ?, ?, ?, 0, '활성', ?, datetime('now','localtime'))`,
                [productId, rosterName, destination, duration, `${rosterName} (${members.length}명)`]
            );
            logger.info(`단체상품(products) 자동 생성: ${rosterName}`);
        }
    } catch (prodErr) {
        logger.error('products 동기화 실패:', prodErr.message);
    }
}

function createGroupRosterRoutes(db) {
    const router = express.Router();

    // 전체 목록 조회
    router.get('/', async (req, res) => {
        try {
            const rows = await db.all('SELECT * FROM group_rosters ORDER BY updated_at DESC');
            const list = rows.map(r => ({
                ...r,
                data: JSON.parse(r.data)
            }));
            res.json(list);
        } catch (error) {
            logger.error('group_rosters 조회 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // 단건 조회
    router.get('/:id', async (req, res) => {
        try {
            const row = await db.get('SELECT * FROM group_rosters WHERE id = ?', [req.params.id]);
            if (!row) return res.status(404).json({ error: '없음' });
            res.json({ ...row, data: JSON.parse(row.data) });
        } catch (error) {
            logger.error('group_rosters 단건 조회 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // 저장
    router.post('/', async (req, res) => {
        try {
            const { id, name, data } = req.body;
            if (!name) return res.status(400).json({ error: 'name 필수' });
            if (!data) return res.status(400).json({ error: 'data 필수' });
            const saveId = id || 'ROSTER-' + Date.now();
            const existing = await db.get('SELECT id FROM group_rosters WHERE id = ?', [saveId]);
            if (existing) {
                await db.run(
                    `UPDATE group_rosters SET name = ?, data = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
                    [name, JSON.stringify(data), saveId]
                );
            } else {
                await db.run(
                    `INSERT INTO group_rosters (id, name, data, created_at, updated_at) VALUES (?, ?, ?, datetime('now','localtime'), datetime('now','localtime'))`,
                    [saveId, name, JSON.stringify(data)]
                );
            }
            // 단체상품(groups) 자동 생성/동기화
            try {
                await syncRosterToGroup(db, saveId, name, data);
            } catch (syncErr) {
                logger.error('단체상품 자동 생성 실패:', syncErr.message);
            }

            res.json({ id: saveId, success: true });
        } catch (error) {
            logger.error('group_rosters 저장 실패:', error.message);
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
                const saveId = item.id || 'ROSTER-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
                await db.run(
                    `INSERT OR REPLACE INTO group_rosters (id, name, data, updated_at) VALUES (?, ?, ?, datetime('now','localtime'))`,
                    [saveId, item.name || '(이름 없음)', JSON.stringify(item.data !== undefined ? item.data : item)]
                );
                success++;
            }
            res.json({ success, total: items.length });
        } catch (error) {
            logger.error('group_rosters 일괄 저장 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // 수정
    router.put('/:id', async (req, res) => {
        try {
            const { name, data } = req.body;
            const result = await db.run(
                `UPDATE group_rosters SET name = ?, data = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
                [name, JSON.stringify(data), req.params.id]
            );
            if (result.changes === 0) return res.status(404).json({ error: '없음' });

            // 단체상품 동기화
            try {
                await syncRosterToGroup(db, req.params.id, name, data);
            } catch (syncErr) {
                logger.error('단체상품 동기화 실패:', syncErr.message);
            }

            res.json({ success: true });
        } catch (error) {
            logger.error('group_rosters 수정 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // 삭제
    router.delete('/:id', async (req, res) => {
        try {
            await db.run('DELETE FROM group_rosters WHERE id = ?', [req.params.id]);
            res.json({ success: true });
        } catch (error) {
            logger.error('group_rosters 삭제 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

module.exports = createGroupRosterRoutes;
