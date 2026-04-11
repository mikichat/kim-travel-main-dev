const express = require('express');
const router = express.Router();
const logger = require('../logger');

module.exports = (db) => {
    // GET /api/air-bookings — 예약장부 목록 조회
    router.get('/', async (req, res) => {
        try {
            const {
                search = '',
                status = '',
                departure_from = '',
                departure_to = '',
                page = 1,
                limit = 50
            } = req.query;

            const offset = (parseInt(page) - 1) * parseInt(limit);
            const conditions = [];
            const params = [];

            if (search) {
                conditions.push('(b.pnr LIKE ? OR b.name_kr LIKE ? OR b.name_en LIKE ?)');
                params.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }

            if (status) {
                conditions.push('b.status = ?');
                params.push(status);
            }

            if (departure_from) {
                conditions.push('b.departure_date >= ?');
                params.push(departure_from);
            }

            if (departure_to) {
                conditions.push('b.departure_date <= ?');
                params.push(departure_to);
            }

            const whereClause = conditions.length > 0
                ? 'WHERE ' + conditions.join(' AND ')
                : '';

            // 전체 개수
            const countRow = await db.get(
                `SELECT COUNT(*) as total FROM air_bookings b ${whereClause}`,
                params
            );
            const total = countRow ? countRow.total : 0;

            // 예약 목록
            const bookings = await db.all(
                `SELECT b.id, b.pnr, b.name_kr, b.name_en, b.airline, b.flight_number,
                        b.route_from, b.route_to, b.departure_date, b.return_date,
                        b.nmtl_date, b.tl_date, b.status, b.pax_count, b.agency,
                        b.fare, b.remarks, b.created_at, b.updated_at
                 FROM air_bookings b
                 ${whereClause}
                 ORDER BY b.created_at DESC
                 LIMIT ? OFFSET ?`,
                [...params, parseInt(limit), offset]
            );

            // 각 예약에 대한 segments 배치 로드
            if (bookings.length > 0) {
                const bookingIds = bookings.map(b => b.id);
                const placeholders = bookingIds.map(() => '?').join(',');

                const segments = await db.all(
                    `SELECT * FROM air_booking_segments
                     WHERE booking_id IN (${placeholders})
                     ORDER BY seg_index`,
                    bookingIds
                );

                const passengers = await db.all(
                    `SELECT id, booking_id, name_en, name_kr, title, gender
                     FROM air_booking_passengers
                     WHERE booking_id IN (${placeholders})`,
                    bookingIds
                );

                // 예약에 segments/passengers 매핑
                for (const booking of bookings) {
                    booking.segments = segments.filter(s => s.booking_id === booking.id);
                    booking.passengers = passengers.filter(p => p.booking_id === booking.id);
                    // 여권번호는 포털에서 제공하지 않음 (보안)
                }
            }

            res.json({
                bookings,
                total,
                page: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit))
            });
        } catch (error) {
            logger.error('air-bookings 목록 조회 오류', { error: error.message });
            res.status(500).json({ error: '예약장부 조회 중 오류가 발생했습니다.' });
        }
    });

    // GET /api/air-bookings/check-pnr/:pnr — PNR 중복 체크
    router.get('/check-pnr/:pnr', async (req, res) => {
        try {
            const { pnr } = req.params;
            const booking = await db.get(
                `SELECT id, pnr, name_kr, airline, flight_number, route_from, route_to,
                        departure_date, return_date, status, pax_count
                 FROM air_bookings WHERE pnr = ?`,
                [pnr.toUpperCase()]
            );

            res.json({
                exists: !!booking,
                booking: booking || null
            });
        } catch (error) {
            logger.error('PNR 중복 체크 오류', { error: error.message });
            res.status(500).json({ error: 'PNR 확인 중 오류가 발생했습니다.' });
        }
    });

    // GET /api/air-bookings/:id — 예약 상세 조회
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const booking = await db.get(
                `SELECT b.id, b.pnr, b.name_kr, b.name_en, b.airline, b.flight_number,
                        b.route_from, b.route_to, b.departure_date, b.return_date,
                        b.nmtl_date, b.tl_date, b.status, b.pax_count, b.agency,
                        b.fare, b.remarks, b.created_at, b.updated_at
                 FROM air_bookings b WHERE b.id = ?`,
                [id]
            );

            if (!booking) {
                return res.status(404).json({ error: '예약을 찾을 수 없습니다.' });
            }

            booking.segments = await db.all(
                `SELECT * FROM air_booking_segments
                 WHERE booking_id = ? ORDER BY seg_index`,
                [id]
            );

            booking.passengers = await db.all(
                `SELECT id, booking_id, name_en, name_kr, title, gender
                 FROM air_booking_passengers WHERE booking_id = ?`,
                [id]
            );

            res.json(booking);
        } catch (error) {
            logger.error('air-booking 상세 조회 오류', { error: error.message });
            res.status(500).json({ error: '예약 상세 조회 중 오류가 발생했습니다.' });
        }
    });

    return router;
};
