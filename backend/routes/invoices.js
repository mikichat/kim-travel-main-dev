// 인보이스 관련 API 라우터
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const logger = require('../logger');

// 이미지 Base64 로드 (서버 시작 시 1회)
function loadImageBase64(filePath) {
    try {
        const buf = fs.readFileSync(filePath);
        const ext = path.extname(filePath).slice(1).toLowerCase();
        const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
        return `data:${mime};base64,${buf.toString('base64')}`;
    } catch { return ''; }
}

const imgDir = path.join(__dirname, '..', 'public', 'in', '이미지');
const altImgDir = path.join(__dirname, '..', '..', 'in', '이미지');
const actualImgDir = fs.existsSync(imgDir) ? imgDir : fs.existsSync(altImgDir) ? altImgDir : '';
const brandImg = actualImgDir ? loadImageBase64(path.join(actualImgDir, '브랜드.jpg')) : '';
const sealImg = actualImgDir ? loadImageBase64(path.join(actualImgDir, '사용인감2.jpg')) : '';
const symbolImg = actualImgDir ? loadImageBase64(path.join(actualImgDir, '심볼1.jpg')) : '';

/**
 * @swagger
 * components:
 *   schemas:
 *     Invoice:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: 인보이스 고유 ID
 *         invoice_number:
 *           type: string
 *           description: 자동 생성된 인보이스 번호 (INV-YYYYMMDD-NNN)
 *           example: INV-20260222-042
 *         recipient:
 *           type: string
 *           maxLength: 200
 *           description: 수신자 이름
 *         invoice_date:
 *           type: string
 *           format: date
 *           description: 인보이스 발행일
 *         description:
 *           type: string
 *           maxLength: 2000
 *           nullable: true
 *           description: 인보이스 설명
 *         flight_schedule_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: 연결된 항공 스케줄 ID
 *         bank_account_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: 연결된 은행 계좌 ID
 *         calculation_mode:
 *           type: string
 *           enum: [simple, advanced]
 *           default: simple
 *           description: 계산 모드
 *         airfare_unit_price:
 *           type: number
 *           description: "[Simple 모드] 항공료 단가"
 *         airfare_quantity:
 *           type: integer
 *           description: "[Simple 모드] 항공료 수량"
 *         airfare_total:
 *           type: number
 *           description: "[Simple 모드] 항공료 소계 (자동 계산)"
 *         seat_preference_unit_price:
 *           type: number
 *           description: "[Simple 모드] 좌석 선호 단가"
 *         seat_preference_quantity:
 *           type: integer
 *           description: "[Simple 모드] 좌석 선호 수량"
 *         seat_preference_total:
 *           type: number
 *           description: "[Simple 모드] 좌석 선호 소계 (자동 계산)"
 *         base_price_per_person:
 *           type: number
 *           nullable: true
 *           description: "[Advanced 모드] 1인당 기본 가격"
 *         total_participants:
 *           type: integer
 *           nullable: true
 *           description: "[Advanced 모드] 총 참가자 수"
 *         total_travel_cost:
 *           type: number
 *           nullable: true
 *           description: "[Advanced 모드] 총 여행 비용"
 *         deposit_amount:
 *           type: number
 *           nullable: true
 *           description: "[Advanced 모드] 계약금 금액"
 *         deposit_description:
 *           type: string
 *           maxLength: 2000
 *           nullable: true
 *           description: "[Advanced 모드] 계약금 설명"
 *         additional_items:
 *           type: array
 *           nullable: true
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 추가 항목 이름
 *               amount:
 *                 type: number
 *                 description: 추가 항목 금액
 *           description: "[Advanced 모드] 추가 비용 항목 목록"
 *         balance_due:
 *           type: number
 *           nullable: true
 *           description: "[Advanced 모드] 잔금"
 *         total_amount:
 *           type: number
 *           description: 총 금액 (Simple 모드는 자동 계산, Advanced 모드는 balance_due 값)
 *         logo_path:
 *           type: string
 *           nullable: true
 *           description: 로고 이미지 경로
 *         seal_path:
 *           type: string
 *           nullable: true
 *           description: 직인 이미지 경로
 *         pdf_file_path:
 *           type: string
 *           nullable: true
 *           description: 생성된 PDF 파일 경로
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 생성 일시
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: 수정 일시
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: 오류 메시지
 *           example: 인보이스를 찾을 수 없습니다.
 */

let _db = null;

function getDb() {
    if (!_db) throw new Error('DB가 초기화되지 않았습니다.');
    return _db;
}

// @TASK T1.2 - 인보이스 API 입력 검증
// 검증용 숫자 필드 목록
const NUMERIC_FIELDS = [
    'base_price_per_person', 'total_participants', 'total_travel_cost',
    'deposit_amount', 'balance_due',
    'airfare_unit_price', 'airfare_quantity',
    'seat_preference_unit_price', 'seat_preference_quantity'
];

// 문자열 길이 제한
const STRING_LIMITS = {
    recipient: 200,
    description: 2000,
    deposit_description: 2000
};

/**
 * 입력 데이터 검증 함수
 * @param {Object} data - 검증할 데이터
 * @param {Object} options - 검증 옵션
 * @param {boolean} options.requireRecipient - recipient 필수 여부
 * @param {boolean} options.requireInvoiceDate - invoice_date 필수 여부
 * @returns {{ valid: boolean, details: string|null }}
 */
function validateInvoiceInput(data, options = {}) {
    const { requireRecipient = false, requireInvoiceDate = false } = options;

    // 필수 필드 검증
    if (requireRecipient && (!data.recipient || String(data.recipient).trim() === '')) {
        return { valid: false, details: 'recipient은 필수 필드입니다.' };
    }
    if (requireInvoiceDate && (!data.invoice_date || String(data.invoice_date).trim() === '')) {
        return { valid: false, details: 'invoice_date는 필수 필드입니다.' };
    }

    // 문자열 길이 검증
    for (const [field, maxLen] of Object.entries(STRING_LIMITS)) {
        if (data[field] !== undefined && data[field] !== null) {
            const value = String(data[field]);
            if (value.length > maxLen) {
                return { valid: false, details: `${field}은(는) ${maxLen}자를 초과할 수 없습니다. (현재: ${value.length}자)` };
            }
        }
    }

    // 숫자 필드 검증
    for (const field of NUMERIC_FIELDS) {
        if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
            const num = Number(data[field]);
            if (isNaN(num)) {
                return { valid: false, details: `${field}은(는) 유효한 숫자여야 합니다. (입력값: ${data[field]})` };
            }
        }
    }

    // calculation_mode 검증 (허용값: 'simple' | 'advanced')
    if (data.calculation_mode !== undefined && data.calculation_mode !== null) {
        if (!['simple', 'advanced'].includes(data.calculation_mode)) {
            return { valid: false, details: 'calculation_mode는 "simple" 또는 "advanced"만 허용됩니다.' };
        }
    }

    return { valid: true, details: null };
}

// 자동 계산 함수
function calculateInvoiceTotals(invoice) {
    const airfareTotal = (invoice.airfare_unit_price || 0) * (invoice.airfare_quantity || 0);
    const seatTotal = (invoice.seat_preference_unit_price || 0) * (invoice.seat_preference_quantity || 0);
    const totalAmount = airfareTotal + seatTotal;
    
    return {
        airfare_total: airfareTotal,
        seat_preference_total: seatTotal,
        total_amount: totalAmount
    };
}

// 인보이스 번호 생성
function generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}${day}-${random}`;
}

/**
 * @swagger
 * /api/invoices:
 *   get:
 *     summary: 인보이스 목록 조회
 *     description: 필터 조건에 따라 인보이스 목록을 페이지네이션하여 조회합니다.
 *     tags: [인보이스]
 *     parameters:
 *       - in: query
 *         name: invoice_date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: 조회 시작일 (YYYY-MM-DD)
 *       - in: query
 *         name: invoice_date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: 조회 종료일 (YYYY-MM-DD)
 *       - in: query
 *         name: recipient
 *         schema:
 *           type: string
 *         description: 수신자 이름 (부분 일치 검색)
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
 *         description: 인보이스 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Invoice'
 *                 total:
 *                   type: integer
 *                   description: 전체 인보이스 수
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
// GET /api/invoices - 인보이스 목록 조회
router.get('/', async (req, res) => {
    try {
        const db = getDb();
        const { invoice_date_from, invoice_date_to, recipient, page = 1, limit = 20 } = req.query;
        
        let whereClause = ' WHERE 1=1';
        const filterParams = [];

        if (invoice_date_from) {
            whereClause += ' AND invoice_date >= ?';
            filterParams.push(invoice_date_from);
        }
        if (invoice_date_to) {
            whereClause += ' AND invoice_date <= ?';
            filterParams.push(invoice_date_to);
        }
        if (recipient) {
            whereClause += ' AND recipient LIKE ?';
            filterParams.push(`%${recipient}%`);
        }

        const total = await db.get('SELECT COUNT(*) as count FROM invoices' + whereClause, filterParams);

        const query = 'SELECT * FROM invoices' + whereClause + ' ORDER BY invoice_date DESC, created_at DESC LIMIT ? OFFSET ?';
        const params = [...filterParams, parseInt(limit), (parseInt(page) - 1) * parseInt(limit)];
        const invoices = await db.all(query, params);
        
        res.json({
            data: invoices,
            total: total.count,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        logger.error('인보이스 목록 조회 오류:', error);
        res.status(500).json({ error: '인보이스 목록 조회 실패' });
    }
});

/**
 * @swagger
 * /api/invoices/{id}:
 *   get:
 *     summary: 인보이스 상세 조회
 *     description: 인보이스 ID로 상세 정보를 조회합니다. 연결된 항공 스케줄과 은행 계좌 정보도 함께 반환합니다.
 *     tags: [인보이스]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 인보이스 고유 ID
 *     responses:
 *       200:
 *         description: 인보이스 상세 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Invoice'
 *                 - type: object
 *                   properties:
 *                     flight_schedule:
 *                       type: object
 *                       nullable: true
 *                       description: 연결된 항공 스케줄 정보
 *                     bank_account:
 *                       type: object
 *                       nullable: true
 *                       description: 연결된 은행 계좌 정보
 *       404:
 *         description: 인보이스를 찾을 수 없음
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
// GET /api/invoices/:id - 인보이스 상세 조회
router.get('/:id', async (req, res) => {
    try {
        const db = getDb();
        const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);

        if (!invoice) {
            return res.status(404).json({ error: '인보이스를 찾을 수 없습니다.' });
        }

        // Advanced Mode: additional_items JSON 파싱
        if (invoice.calculation_mode === 'advanced' && invoice.additional_items) {
            try {
                invoice.additional_items = JSON.parse(invoice.additional_items);
            } catch (parseError) {
                logger.error('additional_items JSON 파싱 오류:', parseError);
                invoice.additional_items = [];
            }
        }

        // 항공 스케줄 정보 조회
        if (invoice.flight_schedule_id) {
            const flightSchedule = await db.get('SELECT * FROM flight_schedules WHERE id = ?', [invoice.flight_schedule_id]);
            invoice.flight_schedule = flightSchedule;
        }

        // 은행 계좌 정보 조회
        if (invoice.bank_account_id) {
            const bankAccount = await db.get('SELECT * FROM bank_accounts WHERE id = ?', [invoice.bank_account_id]);
            invoice.bank_account = bankAccount;
        }

        res.json(invoice);
    } catch (error) {
        logger.error('인보이스 상세 조회 오류:', error);
        res.status(500).json({ error: '인보이스 상세 조회 실패' });
    }
});

// GET /api/invoices/:id/pdf - 인보이스 PDF 렌더링
// ?download=true → PDF 파일 다운로드, 없으면 HTML 미리보기
router.get('/:id/pdf', async (req, res) => {
    try {
        const db = getDb();
        const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);

        if (!invoice) {
            return res.status(404).json({ error: '인보이스를 찾을 수 없습니다.' });
        }

        // additional_items JSON 파싱
        if (invoice.additional_items) {
            try {
                invoice.additional_items = JSON.parse(invoice.additional_items);
            } catch { invoice.additional_items = null; }
        }

        // 항공 스케줄
        let flightSchedule = null;
        if (invoice.flight_schedule_id) {
            flightSchedule = await db.get('SELECT * FROM flight_schedules WHERE id = ?', [invoice.flight_schedule_id]);
        }

        // 은행 계좌
        let bankAccount = null;
        if (invoice.bank_account_id) {
            bankAccount = await db.get('SELECT * FROM bank_accounts WHERE id = ?', [invoice.bank_account_id]);
        }

        const html = renderInvoicePdfHtml(invoice, flightSchedule, bankAccount);

        // ?download=true → 서버사이드 PDF 생성
        if (req.query.download === 'true') {
            try {
                const { htmlToPdf } = require('../services/pdf.service');
                const pdfBuffer = await htmlToPdf(html);
                const safeName = (invoice.recipient || 'invoice').replace(/[/\\?%*:|"<>]/g, '_');
                const filename = `Invoice_${safeName}_${invoice.invoice_date || 'draft'}.pdf`;

                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
                res.send(pdfBuffer);
            } catch (pdfErr) {
                logger.error('Puppeteer PDF 생성 실패:', pdfErr);
                // 폴백: HTML 반환
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.send(html);
            }
        } else {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(html);
        }
    } catch (error) {
        logger.error('인보이스 PDF 렌더링 오류:', error);
        res.status(500).json({ error: '인보이스 PDF 생성 실패' });
    }
});

/**
 * @swagger
 * /api/invoices:
 *   post:
 *     summary: 인보이스 생성
 *     description: |
 *       새 인보이스를 생성합니다. calculation_mode에 따라 Simple 또는 Advanced 모드로 생성됩니다.
 *       - **Simple 모드**: 항공료와 좌석 선호 요금을 단가 x 수량으로 자동 계산합니다.
 *       - **Advanced 모드**: 1인당 기본 가격, 참가자 수, 계약금, 추가 항목, 잔금 등을 직접 입력합니다.
 *     tags: [인보이스]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipient
 *               - invoice_date
 *             properties:
 *               recipient:
 *                 type: string
 *                 maxLength: 200
 *                 description: 수신자 이름 (필수)
 *               invoice_date:
 *                 type: string
 *                 format: date
 *                 description: 인보이스 발행일 (필수, YYYY-MM-DD)
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *                 description: 인보이스 설명
 *               flight_schedule_id:
 *                 type: string
 *                 format: uuid
 *                 description: 연결할 항공 스케줄 ID
 *               bank_account_id:
 *                 type: string
 *                 format: uuid
 *                 description: 연결할 은행 계좌 ID
 *               calculation_mode:
 *                 type: string
 *                 enum: [simple, advanced]
 *                 default: simple
 *                 description: 계산 모드 (simple 또는 advanced)
 *               airfare_unit_price:
 *                 type: number
 *                 description: "[Simple 모드] 항공료 단가"
 *               airfare_quantity:
 *                 type: integer
 *                 description: "[Simple 모드] 항공료 수량"
 *               seat_preference_unit_price:
 *                 type: number
 *                 description: "[Simple 모드] 좌석 선호 단가"
 *               seat_preference_quantity:
 *                 type: integer
 *                 description: "[Simple 모드] 좌석 선호 수량"
 *               base_price_per_person:
 *                 type: number
 *                 description: "[Advanced 모드] 1인당 기본 가격"
 *               total_participants:
 *                 type: integer
 *                 description: "[Advanced 모드] 총 참가자 수"
 *               total_travel_cost:
 *                 type: number
 *                 description: "[Advanced 모드] 총 여행 비용"
 *               deposit_amount:
 *                 type: number
 *                 description: "[Advanced 모드] 계약금 금액"
 *               deposit_description:
 *                 type: string
 *                 maxLength: 2000
 *                 description: "[Advanced 모드] 계약금 설명"
 *               additional_items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: 추가 항목 이름
 *                     amount:
 *                       type: number
 *                       description: 추가 항목 금액
 *                 description: "[Advanced 모드] 추가 비용 항목 목록"
 *               balance_due:
 *                 type: number
 *                 description: "[Advanced 모드] 잔금 (총액으로 사용)"
 *     responses:
 *       201:
 *         description: 인보이스 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *       400:
 *         description: 입력 검증 실패
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: validation_failed
 *                 details:
 *                   type: string
 *                   description: 검증 실패 상세 메시지
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /api/invoices - 인보이스 생성
router.post('/', async (req, res) => {
    try {
        const db = getDb();
        const {
            recipient,
            invoice_date,
            description,
            flight_schedule_id,
            bank_account_id,
            calculation_mode,
            // Advanced Mode fields
            base_price_per_person,
            total_participants,
            total_travel_cost,
            deposit_amount,
            deposit_description,
            additional_items,
            balance_due,
            // Simple Mode fields
            airfare_unit_price,
            airfare_quantity,
            seat_preference_unit_price,
            seat_preference_quantity
        } = req.body;

        // @TASK T1.2 - 입력 검증 (필수 필드 + 타입 + 길이)
        const validation = validateInvoiceInput(req.body, {
            requireRecipient: true,
            requireInvoiceDate: true
        });
        if (!validation.valid) {
            return res.status(400).json({ error: 'validation_failed', details: validation.details });
        }

        // FK 참조 유효성 검증 (존재하지 않는 ID는 null 처리)
        let validFlightScheduleId = null;
        if (flight_schedule_id) {
            const fs = await db.get('SELECT id FROM flight_schedules WHERE id = ?', [flight_schedule_id]);
            validFlightScheduleId = fs ? flight_schedule_id : null;
        }
        let validBankAccountId = null;
        if (bank_account_id) {
            const ba = await db.get('SELECT id FROM bank_accounts WHERE id = ?', [bank_account_id]);
            validBankAccountId = ba ? bank_account_id : null;
        }

        const invoice = {
            id: uuidv4(),
            invoice_number: generateInvoiceNumber(),
            recipient,
            invoice_date,
            description: description || null,
            flight_schedule_id: validFlightScheduleId,
            bank_account_id: validBankAccountId,
            calculation_mode: calculation_mode || 'simple',
            logo_path: null,
            seal_path: null,
            pdf_file_path: null
        };

        if (calculation_mode === 'advanced') {
            // Advanced Mode 데이터 저장
            invoice.base_price_per_person = base_price_per_person || null;
            invoice.total_participants = total_participants || null;
            invoice.total_travel_cost = total_travel_cost || null;
            invoice.deposit_amount = deposit_amount || null;
            invoice.deposit_description = deposit_description || null;
            invoice.additional_items = additional_items ? JSON.stringify(additional_items) : null;
            invoice.balance_due = balance_due || null;
            invoice.total_amount = balance_due || 0; // 잔금을 총액으로 사용

            // Simple Mode 필드는 0으로 설정
            invoice.airfare_unit_price = 0;
            invoice.airfare_quantity = 0;
            invoice.airfare_total = 0;
            invoice.seat_preference_unit_price = 0;
            invoice.seat_preference_quantity = 0;
            invoice.seat_preference_total = 0;
        } else {
            // Simple Mode 계산
            const totals = calculateInvoiceTotals({
                airfare_unit_price: airfare_unit_price || 0,
                airfare_quantity: airfare_quantity || 0,
                seat_preference_unit_price: seat_preference_unit_price || 0,
                seat_preference_quantity: seat_preference_quantity || 0
            });

            invoice.airfare_unit_price = airfare_unit_price || 0;
            invoice.airfare_quantity = airfare_quantity || 0;
            invoice.airfare_total = totals.airfare_total;
            invoice.seat_preference_unit_price = seat_preference_unit_price || 0;
            invoice.seat_preference_quantity = seat_preference_quantity || 0;
            invoice.seat_preference_total = totals.seat_preference_total;
            invoice.total_amount = totals.total_amount;

            // Advanced Mode 필드는 null로 설정
            invoice.base_price_per_person = null;
            invoice.total_participants = null;
            invoice.total_travel_cost = null;
            invoice.deposit_amount = null;
            invoice.deposit_description = null;
            invoice.additional_items = null;
            invoice.balance_due = null;
        }

        await db.run(`
            INSERT INTO invoices (
                id, invoice_number, recipient, invoice_date, description,
                flight_schedule_id, bank_account_id, calculation_mode,
                base_price_per_person, total_participants, total_travel_cost,
                deposit_amount, deposit_description, additional_items, balance_due,
                airfare_unit_price, airfare_quantity, airfare_total,
                seat_preference_unit_price, seat_preference_quantity, seat_preference_total,
                total_amount, logo_path, seal_path, pdf_file_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            invoice.id, invoice.invoice_number, invoice.recipient, invoice.invoice_date, invoice.description,
            invoice.flight_schedule_id, invoice.bank_account_id, invoice.calculation_mode,
            invoice.base_price_per_person, invoice.total_participants, invoice.total_travel_cost,
            invoice.deposit_amount, invoice.deposit_description, invoice.additional_items, invoice.balance_due,
            invoice.airfare_unit_price, invoice.airfare_quantity, invoice.airfare_total,
            invoice.seat_preference_unit_price, invoice.seat_preference_quantity, invoice.seat_preference_total,
            invoice.total_amount, invoice.logo_path, invoice.seal_path, invoice.pdf_file_path
        ]);

        res.status(201).json(invoice);
    } catch (error) {
        logger.error('인보이스 생성 오류:', error);
        res.status(500).json({ error: '인보이스 생성 실패' });
    }
});

/**
 * @swagger
 * /api/invoices/{id}:
 *   put:
 *     summary: 인보이스 수정
 *     description: |
 *       기존 인보이스를 부분 수정합니다. 전달된 필드만 업데이트됩니다.
 *       Simple 모드에서 단가/수량 필드가 변경되면 합계가 자동 재계산됩니다.
 *       Advanced 모드에서 balance_due가 변경되면 total_amount도 함께 갱신됩니다.
 *     tags: [인보이스]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 인보이스 고유 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               recipient:
 *                 type: string
 *                 maxLength: 200
 *                 description: 수신자 이름
 *               invoice_date:
 *                 type: string
 *                 format: date
 *                 description: 인보이스 발행일 (YYYY-MM-DD)
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *                 description: 인보이스 설명
 *               flight_schedule_id:
 *                 type: string
 *                 format: uuid
 *                 description: 연결할 항공 스케줄 ID
 *               bank_account_id:
 *                 type: string
 *                 format: uuid
 *                 description: 연결할 은행 계좌 ID
 *               calculation_mode:
 *                 type: string
 *                 enum: [simple, advanced]
 *                 description: 계산 모드 변경
 *               airfare_unit_price:
 *                 type: number
 *                 description: "[Simple 모드] 항공료 단가"
 *               airfare_quantity:
 *                 type: integer
 *                 description: "[Simple 모드] 항공료 수량"
 *               seat_preference_unit_price:
 *                 type: number
 *                 description: "[Simple 모드] 좌석 선호 단가"
 *               seat_preference_quantity:
 *                 type: integer
 *                 description: "[Simple 모드] 좌석 선호 수량"
 *               base_price_per_person:
 *                 type: number
 *                 description: "[Advanced 모드] 1인당 기본 가격"
 *               total_participants:
 *                 type: integer
 *                 description: "[Advanced 모드] 총 참가자 수"
 *               total_travel_cost:
 *                 type: number
 *                 description: "[Advanced 모드] 총 여행 비용"
 *               deposit_amount:
 *                 type: number
 *                 description: "[Advanced 모드] 계약금 금액"
 *               deposit_description:
 *                 type: string
 *                 maxLength: 2000
 *                 description: "[Advanced 모드] 계약금 설명"
 *               additional_items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: 추가 항목 이름
 *                     amount:
 *                       type: number
 *                       description: 추가 항목 금액
 *                 description: "[Advanced 모드] 추가 비용 항목 목록"
 *               balance_due:
 *                 type: number
 *                 description: "[Advanced 모드] 잔금"
 *               logo_path:
 *                 type: string
 *                 description: 로고 이미지 경로
 *               seal_path:
 *                 type: string
 *                 description: 직인 이미지 경로
 *               pdf_file_path:
 *                 type: string
 *                 description: 생성된 PDF 파일 경로
 *     responses:
 *       200:
 *         description: 인보이스 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *       400:
 *         description: 입력 검증 실패 또는 업데이트할 유효한 필드 없음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: validation_failed
 *                 details:
 *                   type: string
 *                   description: 검증 실패 상세 메시지
 *       404:
 *         description: 인보이스를 찾을 수 없음
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
// PUT /api/invoices/:id - 인보이스 수정
router.put('/:id', async (req, res) => {
    try {
        // @TASK T1.2 - id 파라미터 검증
        if (!req.params.id || String(req.params.id).trim() === '') {
            return res.status(400).json({ error: 'validation_failed', details: 'id 파라미터는 필수입니다.' });
        }

        // @TASK T1.2 - 입력 검증 (타입 + 길이, 필수 필드는 수정 시 불필요)
        const validation = validateInvoiceInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ error: 'validation_failed', details: validation.details });
        }

        const db = getDb();
        const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);

        if (!invoice) {
            return res.status(404).json({ error: '인보이스를 찾을 수 없습니다.' });
        }

        // 업데이트할 필드
        const updates = { ...req.body };

        // FK 참조 유효성 검증 (존재하지 않는 ID는 null 처리)
        if (updates.flight_schedule_id) {
            const fs = await db.get('SELECT id FROM flight_schedules WHERE id = ?', [updates.flight_schedule_id]);
            if (!fs) updates.flight_schedule_id = null;
        }
        if (updates.bank_account_id) {
            const ba = await db.get('SELECT id FROM bank_accounts WHERE id = ?', [updates.bank_account_id]);
            if (!ba) updates.bank_account_id = null;
        }

        // calculation_mode가 변경되었는지 확인
        const newCalcMode = updates.calculation_mode || invoice.calculation_mode;

        // Advanced Mode 데이터 처리
        if (newCalcMode === 'advanced') {
            // additional_items가 배열이면 JSON 문자열로 변환
            if (updates.additional_items && Array.isArray(updates.additional_items)) {
                updates.additional_items = JSON.stringify(updates.additional_items);
            }

            // Advanced Mode에서 balance_due를 total_amount로 사용
            if (updates.balance_due !== undefined) {
                updates.total_amount = updates.balance_due;
            }
        } else {
            // Simple Mode 자동 계산
            if (updates.airfare_unit_price !== undefined || updates.airfare_quantity !== undefined ||
                updates.seat_preference_unit_price !== undefined || updates.seat_preference_quantity !== undefined) {
                const totals = calculateInvoiceTotals({
                    airfare_unit_price: updates.airfare_unit_price ?? invoice.airfare_unit_price,
                    airfare_quantity: updates.airfare_quantity ?? invoice.airfare_quantity,
                    seat_preference_unit_price: updates.seat_preference_unit_price ?? invoice.seat_preference_unit_price,
                    seat_preference_quantity: updates.seat_preference_quantity ?? invoice.seat_preference_quantity
                });
                updates.airfare_total = totals.airfare_total;
                updates.seat_preference_total = totals.seat_preference_total;
                updates.total_amount = totals.total_amount;
            }
        }

        updates.updated_at = new Date().toISOString();

        // 허용된 컬럼만 업데이트 (SQL Injection 방지)
        const ALLOWED_COLUMNS = [
            'recipient', 'invoice_date', 'description', 'flight_schedule_id', 'bank_account_id',
            'calculation_mode', 'base_price_per_person', 'total_participants', 'total_travel_cost',
            'deposit_amount', 'deposit_description', 'additional_items', 'balance_due',
            'airfare_unit_price', 'airfare_quantity', 'airfare_total',
            'seat_preference_unit_price', 'seat_preference_quantity', 'seat_preference_total',
            'total_amount', 'logo_path', 'seal_path', 'pdf_file_path', 'updated_at'
        ];
        const safeKeys = Object.keys(updates).filter(key => ALLOWED_COLUMNS.includes(key));
        if (safeKeys.length === 0) {
            return res.status(400).json({ error: '업데이트할 유효한 필드가 없습니다.' });
        }

        const setClause = safeKeys.map(key => `${key} = ?`).join(', ');
        const values = safeKeys.map(key => updates[key]);
        values.push(req.params.id);

        await db.run(`UPDATE invoices SET ${setClause} WHERE id = ?`, values);

        const updatedInvoice = await db.get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);

        // Advanced Mode일 경우 additional_items JSON 파싱
        if (updatedInvoice.calculation_mode === 'advanced' && updatedInvoice.additional_items) {
            try {
                updatedInvoice.additional_items = JSON.parse(updatedInvoice.additional_items);
            } catch (parseError) {
                logger.error('additional_items JSON 파싱 오류:', parseError);
                updatedInvoice.additional_items = [];
            }
        }

        res.json(updatedInvoice);
    } catch (error) {
        logger.error('인보이스 수정 오류:', error);
        res.status(500).json({ error: '인보이스 수정 실패' });
    }
});

/**
 * @swagger
 * /api/invoices/{id}:
 *   delete:
 *     summary: 인보이스 삭제
 *     description: 인보이스 ID로 해당 인보이스를 삭제합니다. 삭제 성공 시 응답 본문 없이 204를 반환합니다.
 *     tags: [인보이스]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 삭제할 인보이스 고유 ID
 *     responses:
 *       204:
 *         description: 인보이스 삭제 성공 (응답 본문 없음)
 *       404:
 *         description: 인보이스를 찾을 수 없음
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
// DELETE /api/invoices/:id - 인보이스 삭제
router.delete('/:id', async (req, res) => {
    try {
        const db = getDb();
        const result = await db.run('DELETE FROM invoices WHERE id = ?', [req.params.id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: '인보이스를 찾을 수 없습니다.' });
        }
        
        res.status(204).send();
    } catch (error) {
        logger.error('인보이스 삭제 오류:', error);
        res.status(500).json({ error: '인보이스 삭제 실패' });
    }
});

// ── 인보이스 PDF HTML 렌더러 ─────────────────────────────────

function escHtml(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function fmtKRW(n) {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(n || 0);
}

function fmtDate(d) {
    if (!d) return '-';
    const p = d.split('-');
    if (p.length === 3) return `${p[0]}년 ${p[1]}월 ${p[2]}일`;
    return d;
}

function renderInvoicePdfHtml(invoice, flightSchedule, bankAccount) {
    const items = invoice.additional_items || {};
    const isNewFormat = items && typeof items === 'object' && !Array.isArray(items) && items.groups;
    const groups = isNewFormat ? (items.groups || []) : [];
    const extras = isNewFormat ? (items.extras || []) : [];
    const costLabel = items.cost_label || '여행경비';
    const depositLabel = items.deposit_label || '계약금';

    // 항공 스케줄 HTML
    let flightHtml = '';
    if (flightSchedule) {
        let segments = [];
        try {
            if (flightSchedule.segments) {
                segments = typeof flightSchedule.segments === 'string'
                    ? JSON.parse(flightSchedule.segments) : flightSchedule.segments;
            }
        } catch {}
        if (segments.length > 0) {
            flightHtml = `
                <div style="margin:20px 0;border:1px solid #e5e7eb;border-radius:4px;padding:14px">
                    <h3 style="font-size:13px;margin-bottom:10px;color:#111">항공 스케줄</h3>
                    <table style="width:100%;border-collapse:collapse;font-size:12px">
                        <thead><tr style="background:#f9fafb">
                            <th style="padding:6px;text-align:left;border-bottom:1px solid #e5e7eb">편명</th>
                            <th style="padding:6px;text-align:left;border-bottom:1px solid #e5e7eb">날짜</th>
                            <th style="padding:6px;text-align:left;border-bottom:1px solid #e5e7eb">출발</th>
                            <th style="padding:6px;text-align:left;border-bottom:1px solid #e5e7eb">도착</th>
                        </tr></thead>
                        <tbody>${segments.map(s => `<tr>
                            <td style="padding:6px;border-bottom:1px solid #f0f0f0">${escHtml(s.flight_number || s.flightNumber || '')}</td>
                            <td style="padding:6px;border-bottom:1px solid #f0f0f0">${escHtml(s.departure_date || s.departureDate || '')}</td>
                            <td style="padding:6px;border-bottom:1px solid #f0f0f0">${escHtml(s.departure_airport || s.departure || '')} ${escHtml(s.departure_time || s.departureTime || '')}</td>
                            <td style="padding:6px;border-bottom:1px solid #f0f0f0">${escHtml(s.arrival_airport || s.arrival || '')} ${escHtml(s.arrival_time || s.arrivalTime || '')}</td>
                        </tr>`).join('')}</tbody>
                    </table>
                </div>`;
        }
    }

    // 내역 테이블 HTML
    let itemsHtml = '';

    if (isNewFormat && groups.length > 0) {
        // ── 그룹별 상세 ──
        let airfareTotal = 0, depositTotal = 0;

        const groupRows = groups.map(g => {
            const sub = (g.unitPrice || 0) * (g.count || 0);
            const depSub = (g.deposit || 0) * (g.count || 0);
            airfareTotal += sub;
            depositTotal += depSub;
            return `<tr>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">${escHtml(g.name || costLabel)}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">${fmtKRW(g.unitPrice)}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${g.count || 0}명</td>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:600">${fmtKRW(sub)}</td>
            </tr>`;
        }).join('');

        const airSubRow = `<tr style="background:#f9fafb;font-weight:700">
            <td colspan="3" style="padding:10px 12px;text-align:right;border-bottom:1px solid #e5e7eb">${escHtml(costLabel)} 소계</td>
            <td style="padding:10px 12px;text-align:center;border-bottom:1px solid #e5e7eb">${fmtKRW(airfareTotal)}</td>
        </tr>`;

        let extrasHtml = '';
        let extrasTotal = 0;
        if (extras.length > 0) {
            extrasHtml = extras.map(ex => {
                const sub = (ex.unitPrice || 0) * (ex.count || 0);
                const signed = ex.type === 'subtract' ? -sub : sub;
                extrasTotal += signed;
                return `<tr>
                    <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">${ex.type === 'subtract' ? '(차감) ' : ''}${escHtml(ex.name)}</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">${fmtKRW(ex.unitPrice)}</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${ex.count || 0}명</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:600;color:${ex.type === 'subtract' ? '#ef4444' : '#111'}">${ex.type === 'subtract' ? '-' : ''}${fmtKRW(sub)}</td>
                </tr>`;
            }).join('');
        }

        const totalCharge = airfareTotal + extrasTotal;
        const chargeRow = `<tr style="background:#eff6ff;font-weight:700">
            <td colspan="3" style="padding:10px 12px;text-align:right;font-size:15px">총 청구액</td>
            <td style="padding:10px 12px;text-align:center;font-size:16px;color:#2563eb">${fmtKRW(totalCharge)}</td>
        </tr>`;

        // 계약금 내역
        let depositRows = '';
        if (depositTotal > 0) {
            depositRows = groups.filter(g => g.deposit > 0).map(g => {
                const depSub = (g.deposit || 0) * (g.count || 0);
                return `<tr>
                    <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#059669">${escHtml(depositLabel)} — ${escHtml(g.name || '')}</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#059669">${fmtKRW(g.deposit)}</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#059669">${g.count || 0}명</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:600;color:#059669">-${fmtKRW(depSub)}</td>
                </tr>`;
            }).join('');

            depositRows += `<tr style="background:#f0fdf4;font-weight:700">
                <td colspan="3" style="padding:10px 12px;text-align:right;color:#059669">${escHtml(depositLabel)} 합계</td>
                <td style="padding:10px 12px;text-align:center;color:#059669">-${fmtKRW(depositTotal)}</td>
            </tr>`;
        }

        // 비고
        let noteRow = '';
        if (invoice.deposit_description) {
            noteRow = `<tr><td colspan="4" style="padding:8px 12px;font-size:13px;color:#6b7280">※ ${escHtml(invoice.deposit_description)}</td></tr>`;
        }

        const balance = totalCharge - depositTotal;
        const balanceRow = `<tr style="background:#f0f9ff;font-weight:700">
            <td colspan="3" style="padding:12px;text-align:right;font-size:16px">잔금</td>
            <td style="padding:12px;text-align:center;font-size:20px;color:${balance < 0 ? '#ef4444' : '#2563eb'}">${fmtKRW(balance)}</td>
        </tr>`;

        itemsHtml = `
            <table style="width:100%;border-collapse:collapse;margin:24px 0">
                <thead><tr style="background:#f9fafb">
                    <th style="padding:10px 12px;text-align:left;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb">구분</th>
                    <th style="padding:10px 12px;text-align:left;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb">1인 ${escHtml(costLabel)}</th>
                    <th style="padding:10px 12px;text-align:center;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb">인원</th>
                    <th style="padding:10px 12px;text-align:center;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb">소계</th>
                </tr></thead>
                <tbody>
                    ${groupRows}
                    ${airSubRow}
                    ${extrasHtml}
                    ${chargeRow}
                    ${depositRows}
                    ${noteRow}
                    ${balanceRow}
                </tbody>
            </table>`;

    } else {
        // ── 간편/구 형식 ──
        let total = 0;
        let rows = '';

        if (invoice.airfare_unit_price > 0) {
            const sub = invoice.airfare_unit_price * (invoice.airfare_quantity || 0);
            total += sub;
            rows += `<tr>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">${escHtml(costLabel)}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">${fmtKRW(invoice.airfare_unit_price)}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${invoice.airfare_quantity || 0}명</td>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:600">${fmtKRW(sub)}</td>
            </tr>`;
        }

        if (invoice.seat_preference_unit_price > 0) {
            const sub = invoice.seat_preference_unit_price * (invoice.seat_preference_quantity || 0);
            total += sub;
            rows += `<tr>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">좌석 선호</td>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">${fmtKRW(invoice.seat_preference_unit_price)}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${invoice.seat_preference_quantity || 0}명</td>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:600">${fmtKRW(sub)}</td>
            </tr>`;
        }

        itemsHtml = `
            <table style="width:100%;border-collapse:collapse;margin:24px 0">
                <thead><tr style="background:#f9fafb">
                    <th style="padding:10px 12px;text-align:left;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb">항목</th>
                    <th style="padding:10px 12px;text-align:left;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb">단가</th>
                    <th style="padding:10px 12px;text-align:center;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb">인원</th>
                    <th style="padding:10px 12px;text-align:center;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb">합계</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div style="text-align:right;margin-top:16px;padding-top:16px;border-top:2px solid #111">
                <span style="font-size:18px;font-weight:600;margin-right:16px">TOTAL:</span>
                <span style="font-size:24px;font-weight:700;color:#2563eb">${fmtKRW(total)}</span>
            </div>`;
    }

    // 은행 정보
    let bankHtml = '';
    if (bankAccount) {
        bankHtml = `
            <div style="margin:24px 0;padding:16px;background:#f9fafb;border-radius:4px">
                <h3 style="font-size:14px;margin-bottom:12px;color:#111">입금 정보</h3>
                <div style="font-size:14px;line-height:1.8">
                    <div><span style="color:#6b7280;width:70px;display:inline-block">은행:</span> <strong>${escHtml(bankAccount.bank_name)}</strong></div>
                    <div><span style="color:#6b7280;width:70px;display:inline-block">계좌:</span> <strong>${escHtml(bankAccount.account_number)}</strong></div>
                    <div><span style="color:#6b7280;width:70px;display:inline-block">예금주:</span> <strong>${escHtml(bankAccount.account_holder)}</strong></div>
                </div>
            </div>`;
    }

    return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>INVOICE ${escHtml(invoice.invoice_number)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        @page { size: A4; margin: 8mm 12mm; }
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; padding: 0; }
            .no-print { display: none !important; }
            .invoice-preview { box-shadow: none; padding: 20px; }
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Noto Sans KR', sans-serif; font-size: 14px; color: #1a1c1d; background: #f5f5f5; line-height: 1.5; }
        .invoice-preview { max-width: 800px; margin: 20px auto; background: #fff; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .invoice-header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .logo-placeholder { width: 288px; height: 86px; display: inline-block; margin-bottom: 10px; }
        .logo-placeholder img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .invoice-title { font-size: 36px; font-weight: bold; margin-top: 10px; }
        .invoice-info { margin-bottom: 30px; }
        .info-row { display: flex; margin-bottom: 5px; font-size: 14px; }
        .info-label { width: 80px; font-weight: 600; color: #374151; }
        .info-value { flex: 1; color: #111827; }
        .flight-schedule { margin: 21px 0; border: 1px solid #e5e7eb; border-radius: 4px; padding: 14px; }
        .flight-schedule h3 { font-size: 11px; margin-bottom: 11px; color: #111827; }
        .flight-table { width: 100%; border-collapse: collapse; margin-top: 7px; font-size: 11px; }
        .flight-table th, .flight-table td { padding: 7px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .flight-table th { background-color: #f9fafb; font-weight: 600; color: #374151; font-size: 10px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
        .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
        .items-table th { background-color: #f9fafb; font-weight: 600; color: #374151; }
        .items-table td:last-child { text-align: center; font-weight: 600; }
        .total-section { margin-top: 20px; padding-top: 20px; border-top: 2px solid #111827; text-align: right; }
        .total-label { font-size: 18px; font-weight: 600; margin-right: 20px; color: #111827; }
        .total-amount { font-size: 24px; font-weight: bold; color: #2563EB; }
        .bank-info { margin: 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 4px; }
        .bank-info h3 { font-size: 16px; margin-bottom: 15px; color: #111827; }
        .footer { margin-top: 60px; padding-top: 30px; border-top: 2px solid #333; color: #1e293b; }
        .footer-top { display: flex; justify-content: center; align-items: center; margin-bottom: 40px; gap: 20px; }
        .rep-info-group { text-align: center; }
        .rep-company-name { font-size: 26px; font-weight: 800; color: #1e293b; margin-bottom: 4px; }
        .rep-title-name { font-size: 22px; font-weight: 500; color: #475569; }
        .seal-img { width: 70px; height: 70px; object-fit: contain; }
        .footer-bottom-bar { display: flex; align-items: center; justify-content: space-between; background-color: #f8fafc; padding: 20px 30px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .footer-symbol-group { display: flex; align-items: center; gap: 15px; }
        .footer-symbol-img { width: 48px; height: auto; }
        .symbol-brand-text .ko { font-size: 16px; font-weight: 800; color: #0c618d; }
        .symbol-brand-text .en { font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
        .footer-contact-info { text-align: right; font-size: 13px; color: #64748b; line-height: 1.6; }
        .footer-contact-info strong { color: #334155; }
    </style>
</head>
<body>
    <div class="no-print" style="position:fixed;top:15px;right:15px;display:flex;gap:10px">
        <button onclick="window.print()" style="padding:10px 24px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.15)">🖨️ 인쇄</button>
    </div>

    <div class="invoice-preview">
        <div class="invoice-header">
            ${brandImg ? `<div class="logo-placeholder"><img src="${brandImg}" alt="로고"></div>` : ''}
            <div class="invoice-title">INVOICE</div>
        </div>

        <div class="invoice-info">
            <div class="info-row"><span class="info-label">수신:</span><span class="info-value">${escHtml(invoice.recipient)}</span></div>
            <div class="info-row"><span class="info-label">송신:</span><span class="info-value">여행세상</span></div>
            <div class="info-row"><span class="info-label">일자:</span><span class="info-value">${fmtDate(invoice.invoice_date)}</span></div>
            ${invoice.description ? `<div class="info-row"><span class="info-label">내역:</span><span class="info-value">${escHtml(invoice.description)}</span></div>` : ''}
        </div>

        ${flightHtml}
        ${itemsHtml}
        ${bankHtml}

        <div class="footer">
            <div class="footer-top">
                <div class="rep-info-group">
                    <div class="rep-company-name">(유) 여행세상</div>
                    <div class="rep-title-name">대표이사 김국진</div>
                </div>
                ${sealImg ? `<img src="${sealImg}" alt="도장" class="seal-img">` : ''}
            </div>
            <div class="footer-bottom-bar">
                <div class="footer-symbol-group">
                    ${symbolImg ? `<img src="${symbolImg}" alt="심볼" class="footer-symbol-img">` : ''}
                    <div class="symbol-brand-text">
                        <div class="ko">여행세상</div>
                        <div class="en">TRAVEL WORLD</div>
                    </div>
                </div>
                <div class="footer-contact-info">
                    <div>(560-170) <strong>전주시 완산구 서신동 856-1번지</strong></div>
                    <div>Tel: <strong>063)271-9090</strong> | Fax: <strong>063)271-9030</strong></div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
}

module.exports = function(db) {
    _db = db;
    return router;
};
