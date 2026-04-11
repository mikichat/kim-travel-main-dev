const express = require('express');
const logger = require('../logger');

function createFlightSaveRoutes(db) {
    const router = express.Router();

    // 전체 목록 조회 (flight_saves + air_bookings 통합)
    router.get('/', async (req, res) => {
        try {
            // 1) flight_saves (포털에서 직접 입력한 항공편)
            const saved = await db.all('SELECT * FROM flight_saves ORDER BY updated_at DESC');
            const list = saved.map(r => ({
                ...r,
                data: JSON.parse(r.data),
                source: 'portal'
            }));

            // 2) air_bookings (예약장부에서 등록한 PNR) → flight_saves 형식으로 변환
            const savedPnrs = new Set(list.map(r => r.pnr).filter(Boolean));
            const bookings = await db.all(`
                SELECT ab.*, GROUP_CONCAT(seg.id) as seg_ids
                FROM air_bookings ab
                LEFT JOIN air_booking_segments seg ON ab.id = seg.booking_id
                GROUP BY ab.id
                ORDER BY ab.departure_date DESC
            `);

            for (const bk of bookings) {
                // 이미 flight_saves에 같은 PNR이 있으면 스킵
                if (bk.pnr && savedPnrs.has(bk.pnr)) continue;

                const segments = await db.all(
                    'SELECT * FROM air_booking_segments WHERE booking_id = ? ORDER BY seg_index',
                    [bk.id]
                );

                const flights = segments.length > 0
                    ? segments.map(seg => ({
                        flightNumber: seg.flight_number || '',
                        airline: seg.airline || bk.airline || '',
                        date: seg.departure_date ? seg.departure_date.replace(/-/g, '.') : '',
                        departure: { airport: seg.route_from || '', code: seg.route_from || '', time: seg.departure_time || '' },
                        arrival: { airport: seg.route_to || '', code: seg.route_to || '', time: seg.arrival_time || '' },
                        departureTime: seg.departure_time || '',
                        arrivalTime: seg.arrival_time || ''
                    }))
                    : (bk.flight_number || '').split(' / ').map((fn, i) => ({
                        flightNumber: fn.trim(),
                        airline: bk.airline || '',
                        date: (i === 0 ? bk.departure_date : bk.return_date || bk.departure_date || '').replace(/-/g, '.'),
                        departure: { airport: i === 0 ? (bk.route_from || '') : (bk.route_to || ''), code: i === 0 ? (bk.route_from || '') : (bk.route_to || ''), time: '' },
                        arrival: { airport: i === 0 ? (bk.route_to || '') : (bk.route_from || ''), code: i === 0 ? (bk.route_to || '') : (bk.route_from || ''), time: '' }
                    }));

                list.push({
                    id: 'AB-' + bk.id,
                    name: bk.agency || bk.name_kr || '',
                    pnr: bk.pnr,
                    source: 'air-booking',
                    created_at: bk.created_at,
                    updated_at: bk.updated_at,
                    data: {
                        id: 'AB-' + bk.id,
                        name: bk.agency || bk.name_kr || '',
                        pnr: bk.pnr,
                        saveDate: bk.created_at,
                        flights: flights,
                        customerInfo: {
                            name: bk.name_kr || bk.name_en || '',
                            phone: '',
                            totalPeople: (bk.pax_count || 1).toString()
                        }
                    }
                });
            }

            res.json(list);
        } catch (error) {
            logger.error('flight_saves 조회 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // 단건 조회 (flight_saves + air_bookings)
    router.get('/:id', async (req, res) => {
        try {
            const id = req.params.id;

            // 1) flight_saves에서 찾기
            const row = await db.get('SELECT * FROM flight_saves WHERE id = ?', [id]);
            if (row) {
                return res.json({ ...row, data: JSON.parse(row.data) });
            }

            // 2) AB- prefix면 air_bookings에서 찾기
            if (id.startsWith('AB-')) {
                const bookingId = id.replace('AB-', '');
                const bk = await db.get('SELECT * FROM air_bookings WHERE id = ?', [bookingId]);
                if (!bk) return res.status(404).json({ error: '없음' });

                const segments = await db.all(
                    'SELECT * FROM air_booking_segments WHERE booking_id = ? ORDER BY seg_index', [bookingId]
                );
                const passengers = await db.all(
                    'SELECT * FROM air_booking_passengers WHERE booking_id = ?', [bookingId]
                );

                const flights = segments.map(seg => ({
                    flightNumber: seg.flight_number || '',
                    airline: seg.airline || bk.airline || '',
                    date: seg.departure_date ? seg.departure_date.replace(/-/g, '.') : '',
                    arrivalDate: seg.arrival_date ? seg.arrival_date.replace(/-/g, '.') : (seg.departure_date ? seg.departure_date.replace(/-/g, '.') : ''),
                    departure: { airport: seg.route_from || '', code: seg.route_from || '', time: seg.departure_time || '' },
                    arrival: { airport: seg.route_to || '', code: seg.route_to || '', time: seg.arrival_time || '' },
                }));

                const data = {
                    id: id,
                    name: bk.agency || bk.name_kr || '',
                    pnr: bk.pnr,
                    saveDate: bk.created_at,
                    originalPnrText: bk.original_pnr_text || '',
                    flights: flights,
                    customerInfo: {
                        name: bk.name_kr || bk.name_en || '',
                        phone: '',
                        totalPeople: (bk.pax_count || 1).toString(),
                        passengers: passengers.map((p, i) => ({
                            index: i + 1,
                            name: p.name_en || p.name_kr || '',
                        })),
                    },
                };

                return res.json({ id: id, pnr: bk.pnr, name: data.name, data: data, source: 'air-booking' });
            }

            return res.status(404).json({ error: '없음' });
        } catch (error) {
            logger.error('flight_saves 단건 조회 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // 저장 (air_bookings 중심, 같은 PNR은 최신으로 덮어쓰기)
    router.post('/', async (req, res) => {
        try {
            const { name, pnr, data } = req.body;
            if (!data) return res.status(400).json({ error: 'data 필수' });

            const crypto = require('crypto');
            const flights = data.flights || [];
            const customers = data.customerInfo || {};
            const passengers = customers.passengers || [];
            const pnrList = (pnr || data.pnr || '').split(',').map(p => p.trim()).filter(Boolean);
            const mainPnr = pnrList[0] || 'NOPNR-' + Date.now();

            if (flights.length === 0) {
                return res.status(400).json({ error: '항공편 정보가 없습니다.' });
            }

            const firstFlight = flights[0];
            const lastFlight = flights[flights.length - 1];

            const toISO = (d) => {
                if (!d) return null;
                const m = d.match(/(\d{4})\.(\d{2})\.(\d{2})/);
                if (m) return `${m[1]}-${m[2]}-${m[3]}`;
                if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
                return null;
            };

            const depDate = toISO(firstFlight.date) || toISO(firstFlight.departure?.date);
            const retDate = flights.length > 1 ? (toISO(lastFlight.date) || toISO(lastFlight.departure?.date)) : null;

            // 같은 PNR 있으면 업데이트, 없으면 신규
            const existing = await db.get('SELECT id FROM air_bookings WHERE pnr = ?', [mainPnr]);
            const bookingId = existing ? existing.id : crypto.randomUUID();

            await db.run('BEGIN TRANSACTION');
            try {
                if (existing) {
                    // 기존 데이터 삭제 후 재삽입 (최신 데이터로 교체)
                    await db.run('DELETE FROM air_booking_segments WHERE booking_id = ?', [bookingId]);
                    await db.run('DELETE FROM air_booking_passengers WHERE booking_id = ?', [bookingId]);
                    await db.run(
                        `UPDATE air_bookings SET airline = ?, flight_number = ?, route_from = ?, route_to = ?,
                            name_kr = ?, departure_date = ?, return_date = ?, pax_count = ?, agency = ?,
                            original_pnr_text = ?, updated_at = datetime('now','localtime')
                         WHERE id = ?`,
                        [
                            firstFlight.airline || firstFlight.flightNumber?.split(' ')[0] || '',
                            firstFlight.flightNumber || '',
                            firstFlight.departure?.code || '',
                            firstFlight.arrival?.code || '',
                            customers.name || name || '',
                            depDate, retDate,
                            parseInt(customers.totalPeople) || passengers.length || 1,
                            name || '',
                            data.originalPnrText || '',
                            bookingId,
                        ]
                    );
                } else {
                    await db.run(
                        `INSERT INTO air_bookings (id, pnr, airline, flight_number, route_from, route_to,
                            name_kr, departure_date, return_date, status, pax_count, agency,
                            original_pnr_text, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, datetime('now','localtime'), datetime('now','localtime'))`,
                        [
                            bookingId, mainPnr,
                            firstFlight.airline || firstFlight.flightNumber?.split(' ')[0] || '',
                            firstFlight.flightNumber || '',
                            firstFlight.departure?.code || '',
                            firstFlight.arrival?.code || '',
                            customers.name || name || '',
                            depDate, retDate,
                            parseInt(customers.totalPeople) || passengers.length || 1,
                            name || '',
                            data.originalPnrText || '',
                        ]
                    );
                }

                // segments 삽입
                for (let i = 0; i < flights.length; i++) {
                    const f = flights[i];
                    const segDepDate = toISO(f.date) || toISO(f.departure?.date);
                    const segArrDate = toISO(f.arrivalDate) || toISO(f.arrival?.date) || segDepDate;
                    await db.run(
                        `INSERT INTO air_booking_segments (id, booking_id, seg_index, airline, flight_number,
                            route_from, route_to, departure_date, departure_time, arrival_time, arrival_date)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            crypto.randomUUID(), bookingId, i,
                            f.airline || f.flightNumber?.split(' ')[0] || '',
                            f.flightNumber || '',
                            f.departure?.code || '', f.arrival?.code || '',
                            segDepDate, f.departure?.time || '', f.arrival?.time || '', segArrDate,
                        ]
                    );
                }

                // passengers 삽입
                for (const pax of passengers) {
                    await db.run(
                        `INSERT INTO air_booking_passengers (id, booking_id, name_en, name_kr) VALUES (?, ?, ?, ?)`,
                        [crypto.randomUUID(), bookingId, pax.name || '', '']
                    );
                }

                await db.run('COMMIT');
            } catch (err) {
                await db.run('ROLLBACK');
                throw err;
            }

            // flight_saves: AB- 참조만 (FLIGHT- 안 만듦)
            // 같은 PNR의 기존 flight_saves 정리 후 AB- 하나만
            await db.run('DELETE FROM flight_saves WHERE pnr = ?', [mainPnr]);
            await db.run(
                `INSERT INTO flight_saves (id, name, pnr, data, created_at, updated_at)
                 VALUES (?, ?, ?, ?, datetime('now','localtime'), datetime('now','localtime'))`,
                ['AB-' + bookingId, name || null, mainPnr, JSON.stringify(data)]
            );

            logger.info(`저장 완료: ${mainPnr} (${existing ? '업데이트' : '신규'}) → booking ${bookingId}`);
            res.json({ id: 'AB-' + bookingId, success: true });
        } catch (error) {
            logger.error('저장 실패:', error.message);
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
                const saveId = item.id || 'FLIGHT-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
                await db.run(
                    `INSERT OR REPLACE INTO flight_saves (id, name, pnr, data, updated_at) VALUES (?, ?, ?, ?, datetime('now','localtime'))`,
                    [saveId, item.name || null, item.pnr || null, JSON.stringify(item)]
                );
                success++;
            }
            res.json({ success, total: items.length });
        } catch (error) {
            logger.error('flight_saves 일괄 저장 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // 수정
    router.put('/:id', async (req, res) => {
        try {
            const { name, pnr, data } = req.body;
            const result = await db.run(
                `UPDATE flight_saves SET name = ?, pnr = ?, data = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
                [name || null, pnr || null, JSON.stringify(data), req.params.id]
            );
            if (result.changes === 0) return res.status(404).json({ error: '없음' });
            res.json({ success: true });
        } catch (error) {
            logger.error('flight_saves 수정 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // 삭제 (flight_saves + air_bookings 모두 지원)
    router.delete('/:id', async (req, res) => {
        try {
            const id = req.params.id;

            if (id.startsWith('AB-')) {
                // AB- prefix → air_bookings에서 삭제 (cascade)
                const bookingId = id.replace('AB-', '');
                // 삭제 전에 PNR 확인 (같은 PNR의 FLIGHT- 항목도 함께 정리)
                const booking = await db.get('SELECT pnr FROM air_bookings WHERE id = ?', [bookingId]);
                await db.run('BEGIN TRANSACTION');
                try {
                    await db.run('DELETE FROM air_booking_history WHERE booking_id = ?', [bookingId]);
                    await db.run('DELETE FROM air_booking_passengers WHERE booking_id = ?', [bookingId]);
                    await db.run('DELETE FROM air_booking_segments WHERE booking_id = ?', [bookingId]);
                    await db.run('DELETE FROM air_settlements WHERE booking_id = ?', [bookingId]);
                    const result = await db.run('DELETE FROM air_bookings WHERE id = ?', [bookingId]);
                    // flight_saves: AB- 캐시 + 같은 PNR의 FLIGHT- 항목 모두 정리
                    await db.run('DELETE FROM flight_saves WHERE id = ?', [id]);
                    if (booking && booking.pnr) {
                        await db.run('DELETE FROM flight_saves WHERE pnr = ?', [booking.pnr]);
                    }
                    await db.run('COMMIT');
                    if (result.changes === 0) {
                        return res.status(404).json({ error: '예약을 찾을 수 없습니다.' });
                    }
                    res.json({ success: true });
                } catch (err) {
                    await db.run('ROLLBACK');
                    throw err;
                }
            } else {
                // FLIGHT- 항목 삭제 시 같은 PNR의 air_bookings + AB- 도 정리
                const fs = await db.get('SELECT pnr FROM flight_saves WHERE id = ?', [id]);
                await db.run('DELETE FROM flight_saves WHERE id = ?', [id]);
                if (fs && fs.pnr) {
                    const booking = await db.get('SELECT id FROM air_bookings WHERE pnr = ?', [fs.pnr]);
                    if (booking) {
                        await db.run('BEGIN TRANSACTION');
                        try {
                            await db.run('DELETE FROM air_booking_history WHERE booking_id = ?', [booking.id]);
                            await db.run('DELETE FROM air_booking_passengers WHERE booking_id = ?', [booking.id]);
                            await db.run('DELETE FROM air_booking_segments WHERE booking_id = ?', [booking.id]);
                            await db.run('DELETE FROM air_settlements WHERE booking_id = ?', [booking.id]);
                            await db.run('DELETE FROM air_bookings WHERE id = ?', [booking.id]);
                            await db.run('DELETE FROM flight_saves WHERE id = ?', ['AB-' + booking.id]);
                            await db.run('COMMIT');
                        } catch (err) {
                            await db.run('ROLLBACK');
                        }
                    }
                }
                res.json({ success: true });
            }
        } catch (error) {
            logger.error('flight_saves 삭제 실패:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

module.exports = createFlightSaveRoutes;
