// 항공 스케줄 관련 API 라우터
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const logger = require('../logger');

let _db = null;

function getDb() {
    if (!_db) throw new Error('DB가 초기화되지 않았습니다.');
    return _db;
}

// @TASK T1.1 - 항공 스케줄 입력 유효성 검증
// @SPEC docs/planning/02-trd.md#항공-스케줄-검증

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;
const FLIGHT_NUMBER_REGEX = /^[A-Za-z0-9]{2,3}\d+$/;

/**
 * 항공 스케줄 입력값을 검증합니다.
 * @param {object} data - 검증할 데이터
 * @param {object} options - 검증 옵션
 * @param {boolean} options.requireMandatory - 필수 필드 존재 여부 검증 (POST용)
 * @returns {{ valid: boolean, error?: string, details?: string }} 검증 결과
 */
function validateFlightScheduleInput(data, { requireMandatory = false } = {}) {
    // 1. 필수 필드 검증 (POST 전용)
    if (requireMandatory) {
        if (!data.group_name || String(data.group_name).trim() === '') {
            return { valid: false, error: 'validation_failed', details: 'group_name은 필수 필드입니다.' };
        }
        if (!data.departure_date || String(data.departure_date).trim() === '') {
            return { valid: false, error: 'validation_failed', details: 'departure_date는 필수 필드입니다.' };
        }
    }

    // 2. 날짜 형식 검증 (YYYY-MM-DD)
    if (data.departure_date !== undefined && data.departure_date !== null && data.departure_date !== '') {
        if (!DATE_REGEX.test(data.departure_date) || isNaN(Date.parse(data.departure_date))) {
            return { valid: false, error: 'validation_failed', details: 'departure_date 형식이 올바르지 않습니다. (YYYY-MM-DD)' };
        }
    }
    if (data.arrival_date !== undefined && data.arrival_date !== null && data.arrival_date !== '') {
        if (!DATE_REGEX.test(data.arrival_date) || isNaN(Date.parse(data.arrival_date))) {
            return { valid: false, error: 'validation_failed', details: 'arrival_date 형식이 올바르지 않습니다. (YYYY-MM-DD)' };
        }
    }

    // 3. 날짜 논리 검증 (arrival_date >= departure_date)
    if (data.departure_date && data.arrival_date &&
        DATE_REGEX.test(data.departure_date) && DATE_REGEX.test(data.arrival_date)) {
        if (data.arrival_date < data.departure_date) {
            return { valid: false, error: 'validation_failed', details: 'arrival_date는 departure_date 이후여야 합니다.' };
        }
    }

    // 4. 시간 형식 검증 (HH:MM)
    if (data.departure_time !== undefined && data.departure_time !== null && data.departure_time !== '') {
        if (!TIME_REGEX.test(data.departure_time)) {
            return { valid: false, error: 'validation_failed', details: 'departure_time 형식이 올바르지 않습니다. (HH:MM)' };
        }
    }
    if (data.arrival_time !== undefined && data.arrival_time !== null && data.arrival_time !== '') {
        if (!TIME_REGEX.test(data.arrival_time)) {
            return { valid: false, error: 'validation_failed', details: 'arrival_time 형식이 올바르지 않습니다. (HH:MM)' };
        }
    }

    // 5. 편명 형식 검증 (2-3자리 항공사코드 + 숫자)
    if (data.flight_number !== undefined && data.flight_number !== null && data.flight_number !== '') {
        if (!FLIGHT_NUMBER_REGEX.test(data.flight_number)) {
            return { valid: false, error: 'validation_failed', details: 'flight_number 형식이 올바르지 않습니다. (예: KE123, OZ456)' };
        }
    }

    return { valid: true };
}

/**
 * @swagger
 * components:
 *   schemas:
 *     FlightSchedule:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: 항공 스케줄 고유 ID
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         group_id:
 *           type: string
 *           nullable: true
 *           description: 단체 ID
 *         group_name:
 *           type: string
 *           description: 단체명
 *           example: "제주도 가족여행"
 *         airline:
 *           type: string
 *           description: 항공사명
 *           example: "대한항공"
 *         flight_number:
 *           type: string
 *           nullable: true
 *           description: "편명 (2-3자리 항공사코드 + 숫자, 예: KE123)"
 *           pattern: "^[A-Za-z0-9]{2,3}\\d+$"
 *           example: "KE123"
 *         departure_date:
 *           type: string
 *           format: date
 *           description: 출발일 (YYYY-MM-DD)
 *           example: "2026-03-15"
 *         departure_airport:
 *           type: string
 *           description: 출발 공항
 *           example: "ICN"
 *         departure_time:
 *           type: string
 *           description: 출발 시간 (HH:MM)
 *           pattern: "^\\d{2}:\\d{2}$"
 *           example: "09:30"
 *         arrival_date:
 *           type: string
 *           format: date
 *           description: 도착일 (YYYY-MM-DD, departure_date 이후여야 함)
 *           example: "2026-03-15"
 *         arrival_airport:
 *           type: string
 *           description: 도착 공항
 *           example: "CJU"
 *         arrival_time:
 *           type: string
 *           description: 도착 시간 (HH:MM)
 *           pattern: "^\\d{2}:\\d{2}$"
 *           example: "10:40"
 *         passengers:
 *           type: integer
 *           description: 탑승 인원
 *           example: 25
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 생성 일시
 *       required:
 *         - id
 *         - group_name
 *         - airline
 *         - departure_date
 *         - departure_airport
 *         - departure_time
 *         - arrival_date
 *         - arrival_airport
 *         - arrival_time
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: 에러 코드 또는 메시지
 *         details:
 *           type: string
 *           description: 상세 에러 설명
 */

/**
 * @swagger
 * /api/flight-schedules:
 *   get:
 *     summary: 항공 스케줄 목록 조회
 *     description: 필터 조건에 따라 항공 스케줄 목록을 페이지네이션으로 조회합니다.
 *     tags: [항공 스케줄]
 *     parameters:
 *       - in: query
 *         name: group_id
 *         schema:
 *           type: string
 *         description: 단체 ID로 필터링
 *       - in: query
 *         name: departure_date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: 출발일 시작 범위 (YYYY-MM-DD)
 *       - in: query
 *         name: departure_date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: 출발일 종료 범위 (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: 항공 스케줄 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FlightSchedule'
 *                 total:
 *                   type: integer
 *                   description: 전체 항목 수
 *                 page:
 *                   type: integer
 *                   description: 현재 페이지 번호
 *                 limit:
 *                   type: integer
 *                   description: 페이지당 항목 수
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /api/flight-schedules - 항공 스케줄 목록 조회
router.get('/', async (req, res) => {
    try {
        const db = getDb();
        const { group_id, departure_date_from, departure_date_to, page = 1, limit = 20 } = req.query;

        let whereClause = ' WHERE 1=1';
        const filterParams = [];

        if (group_id) {
            whereClause += ' AND group_id = ?';
            filterParams.push(group_id);
        }
        if (departure_date_from) {
            whereClause += ' AND departure_date >= ?';
            filterParams.push(departure_date_from);
        }
        if (departure_date_to) {
            whereClause += ' AND departure_date <= ?';
            filterParams.push(departure_date_to);
        }

        const total = await db.get('SELECT COUNT(*) as count FROM flight_schedules' + whereClause, filterParams);

        const query = 'SELECT * FROM flight_schedules' + whereClause + ' ORDER BY departure_date DESC, created_at DESC LIMIT ? OFFSET ?';
        const params = [...filterParams, parseInt(limit), (parseInt(page) - 1) * parseInt(limit)];
        const schedules = await db.all(query, params);

        res.json({
            data: schedules,
            total: total.count,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        logger.error('항공 스케줄 목록 조회 오류:', error);
        res.status(500).json({ error: '항공 스케줄 목록 조회 실패' });
    }
});

/**
 * @swagger
 * /api/flight-schedules/expired/count:
 *   get:
 *     summary: 만료된 스케줄 개수 조회
 *     description: 도착일(arrival_date)이 오늘 이전인 항공 스케줄의 개수를 반환합니다.
 *     tags: [항공 스케줄]
 *     responses:
 *       200:
 *         description: 만료된 스케줄 개수 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   description: 만료된 스케줄 개수
 *                   example: 3
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /api/flight-schedules/check-pnr/:pnr - PNR로 스케줄 존재 여부 확인
// 주의: /:id 라우트보다 먼저 정의해야 함!
router.get('/check-pnr/:pnr', async (req, res) => {
    try {
        const db = getDb();
        const { pnr } = req.params;
        const schedule = await db.get(
            `SELECT id, group_name, airline, flight_number, departure_date,
                    departure_airport, arrival_airport, pnr, source
             FROM flight_schedules WHERE pnr = ?`,
            [pnr.toUpperCase()]
        );

        res.json({
            exists: !!schedule,
            schedule: schedule || null
        });
    } catch (error) {
        logger.error('PNR 스케줄 확인 오류:', error);
        res.status(500).json({ error: 'PNR 확인 실패' });
    }
});

// GET /api/flight-schedules/expired/count - 만료된 스케줄 개수 조회
// 주의: /:id 라우트보다 먼저 정의해야 함!
router.get('/expired/count', async (req, res) => {
    try {
        const db = getDb();
        const today = new Date().toISOString().split('T')[0];

        const result = await db.get(
            'SELECT COUNT(*) as count FROM flight_schedules WHERE arrival_date < ?',
            [today]
        );

        res.json({ count: result.count });
    } catch (error) {
        logger.error('만료된 스케줄 개수 조회 오류:', error);
        res.status(500).json({ error: '만료된 스케줄 개수 조회 실패' });
    }
});

/**
 * @swagger
 * /api/flight-schedules/{id}:
 *   get:
 *     summary: 항공 스케줄 상세 조회
 *     description: 특정 항공 스케줄의 상세 정보를 조회합니다.
 *     tags: [항공 스케줄]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 항공 스케줄 ID
 *     responses:
 *       200:
 *         description: 항공 스케줄 상세 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FlightSchedule'
 *       404:
 *         description: 항공 스케줄을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /api/flight-schedules/:id - 항공 스케줄 상세 조회
router.get('/:id', async (req, res) => {
    try {
        const db = getDb();
        const schedule = await db.get('SELECT * FROM flight_schedules WHERE id = ?', [req.params.id]);

        if (!schedule) {
            return res.status(404).json({ error: '항공 스케줄을 찾을 수 없습니다.' });
        }

        res.json(schedule);
    } catch (error) {
        logger.error('항공 스케줄 상세 조회 오류:', error);
        res.status(500).json({ error: '항공 스케줄 상세 조회 실패' });
    }
});

/**
 * @swagger
 * /api/flight-schedules:
 *   post:
 *     summary: 항공 스케줄 생성
 *     description: |
 *       새로운 항공 스케줄을 생성합니다.
 *       필수 필드: group_name, departure_date, airline, departure_airport, departure_time, arrival_date, arrival_airport, arrival_time
 *       검증 규칙:
 *       - 날짜 형식: YYYY-MM-DD
 *       - 시간 형식: HH:MM
 *       - 편명 형식: 2-3자리 항공사코드 + 숫자 (예: KE123, OZ456)
 *       - arrival_date >= departure_date
 *     tags: [항공 스케줄]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - group_name
 *               - airline
 *               - departure_date
 *               - departure_airport
 *               - departure_time
 *               - arrival_date
 *               - arrival_airport
 *               - arrival_time
 *             properties:
 *               group_id:
 *                 type: string
 *                 nullable: true
 *                 description: 단체 ID
 *               group_name:
 *                 type: string
 *                 description: 단체명 (필수)
 *                 example: "제주도 가족여행"
 *               airline:
 *                 type: string
 *                 description: 항공사명 (필수)
 *                 example: "대한항공"
 *               flight_number:
 *                 type: string
 *                 nullable: true
 *                 description: "편명 (2-3자리 항공사코드 + 숫자)"
 *                 pattern: "^[A-Za-z0-9]{2,3}\\d+$"
 *                 example: "KE123"
 *               departure_date:
 *                 type: string
 *                 format: date
 *                 description: 출발일 (필수, YYYY-MM-DD)
 *                 example: "2026-03-15"
 *               departure_airport:
 *                 type: string
 *                 description: 출발 공항 (필수)
 *                 example: "ICN"
 *               departure_time:
 *                 type: string
 *                 description: 출발 시간 (필수, HH:MM)
 *                 pattern: "^\\d{2}:\\d{2}$"
 *                 example: "09:30"
 *               arrival_date:
 *                 type: string
 *                 format: date
 *                 description: 도착일 (필수, YYYY-MM-DD, departure_date 이후)
 *                 example: "2026-03-15"
 *               arrival_airport:
 *                 type: string
 *                 description: 도착 공항 (필수)
 *                 example: "CJU"
 *               arrival_time:
 *                 type: string
 *                 description: 도착 시간 (필수, HH:MM)
 *                 pattern: "^\\d{2}:\\d{2}$"
 *                 example: "10:40"
 *               passengers:
 *                 type: integer
 *                 description: 탑승 인원
 *                 default: 0
 *                 example: 25
 *     responses:
 *       201:
 *         description: 항공 스케줄 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FlightSchedule'
 *       400:
 *         description: 입력 검증 실패 (필수 필드 누락, 날짜/시간/편명 형식 오류)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /api/flight-schedules - 항공 스케줄 생성
router.post('/', async (req, res) => {
    try {
        const db = getDb();
        const {
            group_id,
            group_name,
            airline,
            flight_number,
            departure_date,
            departure_airport,
            departure_time,
            arrival_date,
            arrival_airport,
            arrival_time,
            passengers
        } = req.body;

        // @TASK T1.1 - 입력 유효성 검증
        const validation = validateFlightScheduleInput(req.body, { requireMandatory: true });
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error, details: validation.details });
        }

        if (!airline || !departure_date || !departure_airport || !departure_time ||
            !arrival_date || !arrival_airport || !arrival_time) {
            return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
        }

        const pnr = req.body.pnr || null;
        const source = req.body.source || 'portal';

        const schedule = {
            id: uuidv4(),
            group_id: group_id || null,
            group_name: group_name || null,
            airline,
            flight_number: flight_number || null,
            departure_date,
            departure_airport,
            departure_time,
            arrival_date,
            arrival_airport,
            arrival_time,
            passengers: passengers || 0,
            pnr,
            source
        };

        await db.run(`
            INSERT INTO flight_schedules (
                id, group_id, group_name, airline, flight_number,
                departure_date, departure_airport, departure_time,
                arrival_date, arrival_airport, arrival_time, passengers,
                pnr, source
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            schedule.id, schedule.group_id, schedule.group_name, schedule.airline, schedule.flight_number,
            schedule.departure_date, schedule.departure_airport, schedule.departure_time,
            schedule.arrival_date, schedule.arrival_airport, schedule.arrival_time, schedule.passengers,
            schedule.pnr, schedule.source
        ]);

        res.status(201).json(schedule);
    } catch (error) {
        logger.error('항공 스케줄 생성 오류:', error);
        res.status(500).json({ error: '항공 스케줄 생성 실패' });
    }
});

/**
 * @swagger
 * /api/flight-schedules/{id}:
 *   put:
 *     summary: 항공 스케줄 수정
 *     description: |
 *       기존 항공 스케줄을 부분 수정합니다. 전달된 필드만 업데이트됩니다.
 *       검증 규칙 (값이 제공된 경우에만 적용):
 *       - 날짜 형식: YYYY-MM-DD
 *       - 시간 형식: HH:MM
 *       - 편명 형식: 2-3자리 항공사코드 + 숫자 (예: KE123, OZ456)
 *       - arrival_date >= departure_date (기존 DB 값과 병합하여 비교)
 *       - id, created_at 필드는 수정 불가
 *     tags: [항공 스케줄]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 항공 스케줄 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               group_id:
 *                 type: string
 *                 description: 단체 ID
 *               group_name:
 *                 type: string
 *                 description: 단체명
 *               airline:
 *                 type: string
 *                 description: 항공사명
 *               flight_number:
 *                 type: string
 *                 description: "편명 (2-3자리 항공사코드 + 숫자)"
 *                 pattern: "^[A-Za-z0-9]{2,3}\\d+$"
 *               departure_date:
 *                 type: string
 *                 format: date
 *                 description: 출발일 (YYYY-MM-DD)
 *               departure_airport:
 *                 type: string
 *                 description: 출발 공항
 *               departure_time:
 *                 type: string
 *                 description: 출발 시간 (HH:MM)
 *                 pattern: "^\\d{2}:\\d{2}$"
 *               arrival_date:
 *                 type: string
 *                 format: date
 *                 description: 도착일 (YYYY-MM-DD)
 *               arrival_airport:
 *                 type: string
 *                 description: 도착 공항
 *               arrival_time:
 *                 type: string
 *                 description: 도착 시간 (HH:MM)
 *                 pattern: "^\\d{2}:\\d{2}$"
 *               passengers:
 *                 type: integer
 *                 description: 탑승 인원
 *     responses:
 *       200:
 *         description: 항공 스케줄 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FlightSchedule'
 *       400:
 *         description: 입력 검증 실패 또는 유효한 업데이트 필드 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: 항공 스케줄을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// PUT /api/flight-schedules/:id - 항공 스케줄 수정
router.put('/:id', async (req, res) => {
    try {
        const db = getDb();
        const schedule = await db.get('SELECT * FROM flight_schedules WHERE id = ?', [req.params.id]);

        if (!schedule) {
            return res.status(404).json({ error: '항공 스케줄을 찾을 수 없습니다.' });
        }

        const updates = { ...req.body };
        delete updates.id;
        delete updates.created_at;

        // @TASK T1.1 - 입력 유효성 검증 (PUT: 필수 필드 검증 없이 형식만 검증)
        // PUT에서 날짜 논리 검증 시 기존 DB 값과 병합하여 비교
        const mergedForValidation = { ...schedule, ...updates };
        const validation = validateFlightScheduleInput(mergedForValidation);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error, details: validation.details });
        }

        // 허용된 컬럼만 업데이트 (SQL Injection 방지)
        const ALLOWED_COLUMNS = [
            'group_id', 'group_name', 'airline', 'flight_number',
            'departure_date', 'departure_airport', 'departure_time',
            'arrival_date', 'arrival_airport', 'arrival_time', 'passengers',
            'pnr', 'source'
        ];
        const safeKeys = Object.keys(updates).filter(key => ALLOWED_COLUMNS.includes(key));
        if (safeKeys.length === 0) {
            return res.status(400).json({ error: '업데이트할 유효한 필드가 없습니다.' });
        }

        const setClause = safeKeys.map(key => `${key} = ?`).join(', ');
        const values = safeKeys.map(key => updates[key]);
        values.push(req.params.id);

        await db.run(`UPDATE flight_schedules SET ${setClause} WHERE id = ?`, values);

        const updatedSchedule = await db.get('SELECT * FROM flight_schedules WHERE id = ?', [req.params.id]);
        res.json(updatedSchedule);
    } catch (error) {
        logger.error('항공 스케줄 수정 오류:', error);
        res.status(500).json({ error: '항공 스케줄 수정 실패' });
    }
});

/**
 * @swagger
 * /api/flight-schedules/cleanup/expired:
 *   delete:
 *     summary: 만료된 항공 스케줄 일괄 삭제
 *     description: |
 *       도착일(arrival_date)이 오늘 이전인 모든 항공 스케줄과 관련 데이터를 삭제합니다.
 *       삭제 대상:
 *       - 만료된 항공 스케줄 (flight_schedules)
 *       - 관련 인보이스 (invoices)
 *       - 관련 일정 (schedules)
 *       - 관련 원가계산 (cost_calculations)
 *     tags: [항공 스케줄]
 *     responses:
 *       200:
 *         description: 만료된 스케줄 삭제 성공 (삭제할 항목이 없는 경우도 포함)
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: 삭제할 만료된 스케줄이 없는 경우
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "삭제할 만료된 스케줄이 없습니다."
 *                     deleted:
 *                       type: integer
 *                       example: 0
 *                 - type: object
 *                   description: 만료된 스케줄 삭제 완료
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "만료된 데이터가 삭제되었습니다."
 *                     deleted:
 *                       type: object
 *                       properties:
 *                         flightSchedules:
 *                           type: integer
 *                           description: 삭제된 항공 스케줄 수
 *                         invoices:
 *                           type: integer
 *                           description: 삭제된 인보이스 수
 *                         schedules:
 *                           type: integer
 *                           description: 삭제된 일정 수
 *                         costCalculations:
 *                           type: integer
 *                           description: 삭제된 원가계산 수
 *                     expiredGroupIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 삭제된 스케줄의 단체 ID 목록
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// DELETE /api/flight-schedules/cleanup/expired - 도착일이 지난 항공 스케줄 자동 삭제
// 주의: /:id 라우트보다 먼저 정의해야 함!
router.delete('/cleanup/expired', async (req, res) => {
    try {
        const db = getDb();
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식

        // 1. 삭제될 스케줄 조회 (로그용)
        const expiredSchedules = await db.all(
            'SELECT id, group_id, group_name, arrival_date FROM flight_schedules WHERE arrival_date < ?',
            [today]
        );

        if (expiredSchedules.length === 0) {
            return res.json({
                message: '삭제할 만료된 스케줄이 없습니다.',
                deleted: 0
            });
        }

        // 2. 만료된 항공 스케줄의 group_id 목록
        const expiredGroupIds = [...new Set(expiredSchedules.map(s => s.group_id).filter(Boolean))];

        // 3. 관련 테이블에서도 삭제 (DB 동기화)
        let deletedInvoices = 0;
        let deletedSchedules = 0;
        let deletedCostCalcs = 0;

        for (const groupId of expiredGroupIds) {
            // 인보이스 삭제 (flight_schedule_id로 연결된 인보이스)
            try {
                const invoiceResult = await db.run(
                    'DELETE FROM invoices WHERE flight_schedule_id IN (SELECT id FROM flight_schedules WHERE group_id = ?)',
                    [groupId]
                );
                deletedInvoices += invoiceResult.changes || 0;
            } catch (_e) { /* 테이블이 없으면 무시 */ }

            // 일정 삭제 (schedules 테이블)
            try {
                const scheduleResult = await db.run(
                    'DELETE FROM schedules WHERE group_name IN (SELECT group_name FROM flight_schedules WHERE group_id = ?)',
                    [groupId]
                );
                deletedSchedules += scheduleResult.changes || 0;
            } catch (_e) { /* 테이블이 없으면 무시 */ }

            // 원가계산 삭제 (cost_calculations 테이블)
            try {
                const costResult = await db.run(
                    'DELETE FROM cost_calculations WHERE code IN (SELECT group_name FROM flight_schedules WHERE group_id = ?)',
                    [groupId]
                );
                deletedCostCalcs += costResult.changes || 0;
            } catch (_e) { /* 테이블이 없으면 무시 */ }
        }

        // 4. 만료된 항공 스케줄 삭제
        const flightResult = await db.run(
            'DELETE FROM flight_schedules WHERE arrival_date < ?',
            [today]
        );

        logger.info(`[Cleanup] 만료된 항공 스케줄 ${flightResult.changes}개 삭제, ` +
                    `관련 인보이스 ${deletedInvoices}개, 일정 ${deletedSchedules}개, 원가계산 ${deletedCostCalcs}개 삭제`);

        res.json({
            message: `만료된 데이터가 삭제되었습니다.`,
            deleted: {
                flightSchedules: flightResult.changes,
                invoices: deletedInvoices,
                schedules: deletedSchedules,
                costCalculations: deletedCostCalcs
            },
            expiredGroupIds
        });
    } catch (error) {
        logger.error('만료된 스케줄 정리 오류:', error);
        res.status(500).json({ error: '만료된 스케줄 정리 실패' });
    }
});

/**
 * @swagger
 * /api/flight-schedules/{id}:
 *   delete:
 *     summary: 항공 스케줄 삭제
 *     description: 특정 항공 스케줄을 삭제합니다. 성공 시 204 No Content를 반환합니다.
 *     tags: [항공 스케줄]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 항공 스케줄 ID
 *     responses:
 *       204:
 *         description: 항공 스케줄 삭제 성공 (응답 본문 없음)
 *       404:
 *         description: 항공 스케줄을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// DELETE /api/flight-schedules/:id - 항공 스케줄 삭제
router.delete('/:id', async (req, res) => {
    try {
        const db = getDb();
        const result = await db.run('DELETE FROM flight_schedules WHERE id = ?', [req.params.id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: '항공 스케줄을 찾을 수 없습니다.' });
        }

        res.status(204).send();
    } catch (error) {
        logger.error('항공 스케줄 삭제 오류:', error);
        res.status(500).json({ error: '항공 스케줄 삭제 실패' });
    }
});

module.exports = function(db) {
    _db = db;
    return router;
};
