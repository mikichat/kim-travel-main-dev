const express = require('express');
const logger = require('../logger');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function createCostCalculationRoutes(db) {
    const router = express.Router();

    // 원가 계산서 목록 조회
    router.get('/', async (req, res) => {
        try {
            const items = await db.all(
                'SELECT id, code, name, destination, departure_date, arrival_date, nights, days, adults, children, infants, tc, created_at, updated_at FROM cost_calculations ORDER BY updated_at DESC'
            );
            res.json(items);
        } catch (error) {
            res.status(500).json({ error: `원가 계산서 목록 조회 실패: ${error.message}` });
        }
    });

    // 원가 계산서 상세 조회
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const item = await db.get('SELECT * FROM cost_calculations WHERE id = ?', [id]);
            if (item) {
                try { if (item.flight_data) item.flight_data = JSON.parse(item.flight_data); } catch (_e) { item.flight_data = null; }
                try { if (item.etc_costs) item.etc_costs = JSON.parse(item.etc_costs); } catch (_e) { item.etc_costs = null; }
                try { if (item.land_cost_1) item.land_cost_1 = JSON.parse(item.land_cost_1); } catch (_e) { item.land_cost_1 = null; }
                try { if (item.land_cost_2) item.land_cost_2 = JSON.parse(item.land_cost_2); } catch (_e) { item.land_cost_2 = null; }
                res.json(item);
            } else {
                res.status(404).json({ error: '원가 계산서를 찾을 수 없습니다.' });
            }
        } catch (error) {
            res.status(500).json({ error: `원가 계산서 조회 실패: ${error.message}` });
        }
    });

    // 원가 계산서 저장 (새로 생성 또는 업데이트)
    router.post('/', async (req, res) => {
        const data = req.body;

        // 필수 필드 검증
        if (!data.name) {
            return res.status(400).json({ error: '행사명은 필수입니다.' });
        }

        // 길이 제한
        if (data.name.length > 200) {
            return res.status(400).json({ error: '행사명은 200자를 초과할 수 없습니다.' });
        }

        // 날짜 형식 검증
        if (data.departure_date && !DATE_RE.test(data.departure_date)) {
            return res.status(400).json({ error: '출발일 형식이 올바르지 않습니다. (YYYY-MM-DD)' });
        }
        if (data.arrival_date && !DATE_RE.test(data.arrival_date)) {
            return res.status(400).json({ error: '귀국일 형식이 올바르지 않습니다. (YYYY-MM-DD)' });
        }

        // 인원 수 검증 (음수 및 비정수 방어)
        for (const field of ['adults', 'children', 'infants']) {
            if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
                const val = Number(data[field]);
                if (!Number.isInteger(val) || val < 0) {
                    return res.status(400).json({ error: `${field}은(는) 0 이상의 정수여야 합니다.` });
                }
            }
        }

        // JSON 필드 문자열 변환
        const flightData = data.flight_data ? JSON.stringify(data.flight_data) : null;
        const etcCosts = data.etc_costs ? JSON.stringify(data.etc_costs) : null;
        const landCost1 = data.land_cost_1 ? JSON.stringify(data.land_cost_1) : null;
        const landCost2 = data.land_cost_2 ? JSON.stringify(data.land_cost_2) : null;

        try {
            if (data.code) {
                const existing = await db.get('SELECT id FROM cost_calculations WHERE code = ?', [data.code]);

                if (existing) {
                    await db.run(`
                        UPDATE cost_calculations SET
                            name = ?, destination = ?, departure_date = ?, arrival_date = ?,
                            nights = ?, days = ?, adults = ?, children = ?, infants = ?, tc = ?,
                            domestic_vehicle_type = ?, domestic_vehicle_total = ?,
                            flight_data = ?, etc_costs = ?, land_cost_1 = ?, land_cost_2 = ?,
                            margin_amount_1 = ?, margin_amount_2 = ?, notes_1 = ?, notes_2 = ?,
                            updated_at = datetime('now','localtime')
                        WHERE code = ?
                    `, [
                        data.name, data.destination, data.departure_date, data.arrival_date,
                        data.nights, data.days, data.adults, data.children, data.infants, data.tc || 0,
                        data.domestic_vehicle_type, data.domestic_vehicle_total,
                        flightData, etcCosts, landCost1, landCost2,
                        data.margin_amount_1, data.margin_amount_2, data.notes_1, data.notes_2,
                        data.code
                    ]);

                    const updated = await db.get('SELECT * FROM cost_calculations WHERE code = ?', [data.code]);
                    res.json({ message: '원가 계산서가 업데이트되었습니다.', data: updated });
                } else {
                    await db.run(`
                        INSERT INTO cost_calculations (
                            code, name, destination, departure_date, arrival_date,
                            nights, days, adults, children, infants, tc,
                            domestic_vehicle_type, domestic_vehicle_total,
                            flight_data, etc_costs, land_cost_1, land_cost_2,
                            margin_amount_1, margin_amount_2, notes_1, notes_2
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        data.code, data.name, data.destination, data.departure_date, data.arrival_date,
                        data.nights, data.days, data.adults, data.children, data.infants, data.tc || 0,
                        data.domestic_vehicle_type, data.domestic_vehicle_total,
                        flightData, etcCosts, landCost1, landCost2,
                        data.margin_amount_1, data.margin_amount_2, data.notes_1, data.notes_2
                    ]);

                    const created = await db.get('SELECT * FROM cost_calculations WHERE code = ?', [data.code]);
                    res.status(201).json({ message: '원가 계산서가 저장되었습니다.', data: created });
                }
            } else {
                // 코드 자동 생성 (COST-YYYY-MM-XXX 형식)
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const prefix = `COST-${year}-${month}-`;

                const existingCodes = await db.all(
                    'SELECT code FROM cost_calculations WHERE code LIKE ? ORDER BY code DESC',
                    [`${prefix}%`]
                );

                let nextNumber = 1;
                if (existingCodes.length > 0) {
                    const numbers = existingCodes.map(item => {
                        const parts = item.code.split('-');
                        return parseInt(parts[3]) || 0;
                    });
                    nextNumber = Math.max(...numbers) + 1;
                }

                const code = `${prefix}${String(nextNumber).padStart(3, '0')}`;

                await db.run(`
                    INSERT INTO cost_calculations (
                        code, name, destination, departure_date, arrival_date,
                        nights, days, adults, children, infants, tc,
                        domestic_vehicle_type, domestic_vehicle_total,
                        flight_data, etc_costs, land_cost_1, land_cost_2,
                        margin_amount_1, margin_amount_2, notes_1, notes_2
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    code, data.name, data.destination, data.departure_date, data.arrival_date,
                    data.nights, data.days, data.adults, data.children, data.infants, data.tc || 0,
                    data.domestic_vehicle_type, data.domestic_vehicle_total,
                    flightData, etcCosts, landCost1, landCost2,
                    data.margin_amount_1, data.margin_amount_2, data.notes_1, data.notes_2
                ]);

                const created = await db.get('SELECT * FROM cost_calculations WHERE code = ?', [code]);
                res.status(201).json({ message: '원가 계산서가 저장되었습니다.', data: created });
            }
        } catch (error) {
            logger.error('원가 계산서 저장 오류:', error);
            res.status(500).json({ error: `원가 계산서 저장 실패: ${error.message}` });
        }
    });

    // 원가 계산서 삭제
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await db.run('DELETE FROM cost_calculations WHERE id = ?', [id]);
            if (result.changes === 0) {
                return res.status(404).json({ error: '원가 계산서를 찾을 수 없습니다.' });
            }
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: `원가 계산서 삭제 실패: ${error.message}` });
        }
    });

    return router;
}

module.exports = createCostCalculationRoutes;
