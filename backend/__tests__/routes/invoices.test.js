jest.mock('../../services/notify', () => ({
    initEmail: jest.fn(),
    sendLoginNotification: jest.fn().mockResolvedValue(undefined),
}));

const supertest = require('supertest');
const { createTestDb, cleanupTestDb } = require('../setup/test-db');
const { createTestApp } = require('../setup/test-app');
const {
    loginAsAdmin,
    sampleInvoiceSimple,
    sampleInvoiceAdvanced,
    sampleFlightSchedule,
    sampleBankAccount,
} = require('../setup/test-helpers');

let db, app, agent;

beforeAll(async () => {
    db = await createTestDb();
    app = createTestApp(db);
});

beforeEach(async () => {
    const result = await loginAsAdmin(app, db);
    agent = result.agent;
});

afterEach(async () => {
    await cleanupTestDb(db);
});

afterAll(async () => {
    await db.close();
});

// ==================== 인증 체크 ====================

describe('인증 필요', () => {
    it('401: 미인증 요청은 거부', async () => {
        const res = await supertest(app).get('/api/invoices');
        expect(res.status).toBe(401);
    });
});

// ==================== POST /api/invoices (Simple Mode) ====================

describe('POST /api/invoices - Simple Mode', () => {
    it('성공: 자동 계산 확인', async () => {
        const res = await agent
            .post('/api/invoices')
            .send(sampleInvoiceSimple());

        expect(res.status).toBe(201);
        expect(res.body.id).toBeDefined();
        expect(res.body.invoice_number).toMatch(/^INV-\d{8}-\d{3}$/);
        expect(res.body.calculation_mode).toBe('simple');
        // 자동 계산: 500000*10 + 50000*5 = 5250000
        expect(res.body.airfare_total).toBe(5000000);
        expect(res.body.seat_preference_total).toBe(250000);
        expect(res.body.total_amount).toBe(5250000);
    });

    it('성공: 항공료만 (좌석 선호 없음)', async () => {
        const res = await agent
            .post('/api/invoices')
            .send(sampleInvoiceSimple({
                seat_preference_unit_price: 0,
                seat_preference_quantity: 0,
            }));

        expect(res.status).toBe(201);
        expect(res.body.total_amount).toBe(5000000);
        expect(res.body.seat_preference_total).toBe(0);
    });

    it('400: recipient 누락', async () => {
        const res = await agent
            .post('/api/invoices')
            .send(sampleInvoiceSimple({ recipient: '' }));

        expect(res.status).toBe(400);
        expect(res.body.details).toContain('recipient');
    });

    it('400: invoice_date 누락', async () => {
        const res = await agent
            .post('/api/invoices')
            .send(sampleInvoiceSimple({ invoice_date: '' }));

        expect(res.status).toBe(400);
        expect(res.body.details).toContain('invoice_date');
    });

    it('400: recipient 길이 초과 (200자)', async () => {
        const res = await agent
            .post('/api/invoices')
            .send(sampleInvoiceSimple({ recipient: 'x'.repeat(201) }));

        expect(res.status).toBe(400);
        expect(res.body.details).toContain('recipient');
    });

    it('400: 숫자 필드에 문자열', async () => {
        const res = await agent
            .post('/api/invoices')
            .send(sampleInvoiceSimple({ airfare_unit_price: 'not-a-number' }));

        expect(res.status).toBe(400);
        expect(res.body.details).toContain('airfare_unit_price');
    });

    it('400: 잘못된 calculation_mode', async () => {
        const res = await agent
            .post('/api/invoices')
            .send(sampleInvoiceSimple({ calculation_mode: 'invalid' }));

        expect(res.status).toBe(400);
        expect(res.body.details).toContain('calculation_mode');
    });
});

// ==================== POST /api/invoices (Advanced Mode) ====================

describe('POST /api/invoices - Advanced Mode', () => {
    it('성공: Advanced Mode 인보이스 생성', async () => {
        const res = await agent
            .post('/api/invoices')
            .send(sampleInvoiceAdvanced());

        expect(res.status).toBe(201);
        expect(res.body.calculation_mode).toBe('advanced');
        expect(res.body.base_price_per_person).toBe(1500000);
        expect(res.body.total_participants).toBe(20);
        // balance_due가 total_amount로 사용
        expect(res.body.total_amount).toBe(20800000);
        // additional_items는 JSON 문자열로 저장
        expect(typeof res.body.additional_items).toBe('string');
        // Simple mode 필드는 0
        expect(res.body.airfare_unit_price).toBe(0);
        expect(res.body.airfare_total).toBe(0);
    });

    it('400: description 길이 초과 (2000자)', async () => {
        const res = await agent
            .post('/api/invoices')
            .send(sampleInvoiceAdvanced({ description: 'x'.repeat(2001) }));

        expect(res.status).toBe(400);
        expect(res.body.details).toContain('description');
    });
});

// ==================== GET /api/invoices ====================

describe('GET /api/invoices', () => {
    it('성공: 빈 목록', async () => {
        const res = await agent.get('/api/invoices');
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
        expect(res.body.total).toBe(0);
    });

    it('성공: 페이지네이션', async () => {
        for (let i = 0; i < 3; i++) {
            await agent.post('/api/invoices').send(
                sampleInvoiceSimple({ recipient: `여행사${i}` })
            );
        }

        const res = await agent.get('/api/invoices?page=1&limit=2');
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(2);
        expect(res.body.total).toBe(3);
    });

    it('성공: recipient 검색 (LIKE)', async () => {
        await agent.post('/api/invoices').send(sampleInvoiceSimple({ recipient: '한국여행사' }));
        await agent.post('/api/invoices').send(sampleInvoiceSimple({ recipient: '일본투어' }));

        const res = await agent.get('/api/invoices?recipient=여행사');
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].recipient).toBe('한국여행사');
    });

    it('성공: 날짜 범위 필터', async () => {
        await agent.post('/api/invoices').send(sampleInvoiceSimple({ invoice_date: '2026-01-15' }));
        await agent.post('/api/invoices').send(sampleInvoiceSimple({ invoice_date: '2026-03-15' }));

        const res = await agent.get('/api/invoices?invoice_date_from=2026-02-01&invoice_date_to=2026-04-01');
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
    });
});

// ==================== GET /api/invoices/:id ====================

describe('GET /api/invoices/:id', () => {
    it('성공: 상세 조회', async () => {
        const created = await agent
            .post('/api/invoices')
            .send(sampleInvoiceSimple());

        const res = await agent.get(`/api/invoices/${created.body.id}`);
        expect(res.status).toBe(200);
        expect(res.body.recipient).toBe('테스트여행사');
    });

    it('성공: Advanced Mode 상세 조회 시 additional_items 파싱', async () => {
        const created = await agent
            .post('/api/invoices')
            .send(sampleInvoiceAdvanced());

        const res = await agent.get(`/api/invoices/${created.body.id}`);
        expect(res.status).toBe(200);
        // GET /:id에서는 additional_items가 파싱된 배열로 반환
        expect(Array.isArray(res.body.additional_items)).toBe(true);
        expect(res.body.additional_items[0].name).toBe('관광버스');
    });

    it('성공: FK 조인 (항공스케줄 + 은행계좌)', async () => {
        // 항공 스케줄 생성
        const fs = await agent
            .post('/api/flight-schedules')
            .send(sampleFlightSchedule());

        // 은행 계좌 생성
        const ba = await agent
            .post('/api/bank-accounts')
            .send(sampleBankAccount());

        // 인보이스 생성 (FK 연결)
        const created = await agent
            .post('/api/invoices')
            .send(sampleInvoiceSimple({
                flight_schedule_id: fs.body.id,
                bank_account_id: ba.body.id,
            }));

        const res = await agent.get(`/api/invoices/${created.body.id}`);
        expect(res.status).toBe(200);
        expect(res.body.flight_schedule).toBeDefined();
        expect(res.body.flight_schedule.airline).toBe('대한항공');
        expect(res.body.bank_account).toBeDefined();
        expect(res.body.bank_account.bank_name).toBe('국민은행');
    });

    it('404: 존재하지 않는 인보이스', async () => {
        const res = await agent.get('/api/invoices/nonexistent');
        expect(res.status).toBe(404);
    });

    it('성공: additional_items JSON 파싱 실패 시 빈 배열로 대체', async () => {
        const created = await agent.post('/api/invoices').send(sampleInvoiceAdvanced());
        await db.run('UPDATE invoices SET additional_items = ? WHERE id = ?', ['{invalid json}', created.body.id]);

        const res = await agent.get(`/api/invoices/${created.body.id}`);
        expect(res.status).toBe(200);
        expect(res.body.additional_items).toEqual([]);
    });
});

// ==================== PUT /api/invoices/:id ====================

describe('PUT /api/invoices/:id', () => {
    it('성공: Simple Mode 업데이트 + 자동 재계산', async () => {
        const created = await agent
            .post('/api/invoices')
            .send(sampleInvoiceSimple());

        const res = await agent
            .put(`/api/invoices/${created.body.id}`)
            .send({ airfare_unit_price: 600000 });

        expect(res.status).toBe(200);
        // 재계산: 600000*10 + 50000*5 = 6250000
        expect(res.body.airfare_total).toBe(6000000);
        expect(res.body.total_amount).toBe(6250000);
    });

    it('성공: Advanced Mode balance_due 업데이트 → total_amount 반영', async () => {
        const created = await agent
            .post('/api/invoices')
            .send(sampleInvoiceAdvanced());

        const res = await agent
            .put(`/api/invoices/${created.body.id}`)
            .send({ balance_due: 15000000 });

        expect(res.status).toBe(200);
        expect(res.body.total_amount).toBe(15000000);
    });

    it('성공: additional_items 배열 → JSON 변환', async () => {
        const created = await agent
            .post('/api/invoices')
            .send(sampleInvoiceAdvanced());

        const newItems = [{ name: '보험료', amount: 100000 }];
        const res = await agent
            .put(`/api/invoices/${created.body.id}`)
            .send({ additional_items: newItems });

        expect(res.status).toBe(200);
        // PUT 응답에서 advanced mode이면 파싱됨
        expect(Array.isArray(res.body.additional_items)).toBe(true);
        expect(res.body.additional_items[0].name).toBe('보험료');
    });

    it('400: 숫자 필드에 문자열', async () => {
        const created = await agent
            .post('/api/invoices')
            .send(sampleInvoiceSimple());

        const res = await agent
            .put(`/api/invoices/${created.body.id}`)
            .send({ airfare_quantity: 'abc' });

        expect(res.status).toBe(400);
    });

    it('404: 존재하지 않는 인보이스', async () => {
        const res = await agent
            .put('/api/invoices/nonexistent')
            .send({ recipient: '변경' });

        expect(res.status).toBe(404);
    });

    it('400: 공백 id (URL 인코딩 스페이스)', async () => {
        const res = await agent
            .put('/api/invoices/%20')
            .send({ recipient: '변경' });

        expect(res.status).toBe(400);
    });

    it('성공: PUT 응답에서 additional_items JSON 파싱 실패 시 빈 배열로 대체', async () => {
        const created = await agent.post('/api/invoices').send(sampleInvoiceAdvanced());

        // PUT으로 recipient 변경 + 직접 DB에 malformed JSON 주입 후 응답 검증은 어려우므로
        // 먼저 PUT으로 업데이트하고 그 사이에 DB에 malformed JSON을 심는 방식
        // → 여기서는 직접 DB manipulation 후 GET으로 검증된 케이스(L401-402)를 커버했으므로
        //    PUT 응답 경로(L878-879)는 별도 시나리오: 업데이트 후 재조회 시 DB 조작
        const id = created.body.id;
        await db.run('UPDATE invoices SET additional_items = ? WHERE id = ?', ['{bad}', id]);

        const res = await agent.put(`/api/invoices/${id}`).send({ recipient: '변경됨' });
        // 업데이트 성공 후 응답에서 additional_items 파싱 실패 → 빈 배열
        expect(res.status).toBe(200);
        expect(res.body.additional_items).toEqual([]);
    });
});

// ==================== DELETE /api/invoices/:id ====================

describe('DELETE /api/invoices/:id', () => {
    it('성공: 204 반환', async () => {
        const created = await agent
            .post('/api/invoices')
            .send(sampleInvoiceSimple());

        const res = await agent.delete(`/api/invoices/${created.body.id}`);
        expect(res.status).toBe(204);

        // 삭제 확인
        const check = await db.get('SELECT * FROM invoices WHERE id = ?', [created.body.id]);
        expect(check).toBeUndefined();
    });

    it('404: 존재하지 않는 인보이스', async () => {
        const res = await agent.delete('/api/invoices/nonexistent');
        expect(res.status).toBe(404);
    });
});

// ==================== 500 에러 처리 ====================

describe('500 에러 처리', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('PUT /:id - 500: DB 오류', async () => {
        jest.spyOn(db, 'get').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.put('/api/invoices/test-id').send({ recipient: '변경' });
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/수정 실패/);
    });

    it('DELETE /:id - 500: DB 오류', async () => {
        jest.spyOn(db, 'run').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.delete('/api/invoices/test-id');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/삭제 실패/);
    });
});

// ==================== validateInvoiceInput null/'' 분기 ====================

describe('validateInvoiceInput null/empty 분기 (L182, L192, L201)', () => {
    it('400: deposit_description 2001자 초과 (STRING_LIMITS 커버)', async () => {
        const res = await agent.post('/api/invoices').send(
            sampleInvoiceSimple({ deposit_description: 'x'.repeat(2001) })
        );
        expect(res.status).toBe(400);
        expect(res.body.details).toContain('deposit_description');
    });

    it('200: deposit_description=null → null 분기 통과 (L182 null branch)', async () => {
        const created = await agent.post('/api/invoices').send(sampleInvoiceSimple());
        const res = await agent.put(`/api/invoices/${created.body.id}`).send({ deposit_description: null });
        expect(res.status).toBe(200);
    });

    it('200: base_price_per_person=null → null 분기 통과 (L192 null branch)', async () => {
        const created = await agent.post('/api/invoices').send(sampleInvoiceSimple());
        const res = await agent.put(`/api/invoices/${created.body.id}`).send({ base_price_per_person: null });
        expect(res.status).toBe(200);
    });

    it('200: airfare_unit_price="" → 빈 문자열 분기 통과 (L192 empty branch)', async () => {
        const created = await agent.post('/api/invoices').send(sampleInvoiceSimple());
        const res = await agent.put(`/api/invoices/${created.body.id}`).send({ airfare_unit_price: '' });
        expect(res.status).toBe(200);
    });

    it('200: calculation_mode=null → null 분기 통과, 검증 스킵 (L201 null branch)', async () => {
        const created = await agent.post('/api/invoices').send(sampleInvoiceSimple());
        const res = await agent.put(`/api/invoices/${created.body.id}`).send({ calculation_mode: null });
        expect(res.status).toBe(200);
    });
});

// ==================== validateInvoiceInput 공백 분기 (L173, L176 || B-true) ====================

describe('validateInvoiceInput 공백-only 분기 (L173, L176)', () => {
    it('400: recipient 공백만 → !data.recipient=false → trim===\'\' true 분기 (L173 ||B)', async () => {
        const res = await agent
            .post('/api/invoices')
            .send(sampleInvoiceSimple({ recipient: '   ' }));
        expect(res.status).toBe(400);
        expect(res.body.details).toContain('recipient');
    });

    it('400: invoice_date 공백만 → !data.invoice_date=false → trim===\'\' true 분기 (L176 ||B)', async () => {
        const res = await agent
            .post('/api/invoices')
            .send(sampleInvoiceSimple({ invoice_date: '   ' }));
        expect(res.status).toBe(400);
        expect(res.body.details).toContain('invoice_date');
    });
});

// ==================== PUT Advanced - additional_items=null → L874 false 분기 ====================

describe('PUT Advanced - additional_items=null → L874 && false 분기', () => {
    it('성공: additional_items 없는 advanced 인보이스 PUT → updatedInvoice.additional_items=null → L874 false', async () => {
        // additional_items 미포함 advanced 인보이스 생성 (DB에 null 저장)
        const created = await agent
            .post('/api/invoices')
            .send(sampleInvoiceAdvanced({ additional_items: undefined }));
        expect(created.status).toBe(201);

        // PUT으로 description만 변경 → updatedInvoice.additional_items=null → L874 false 분기
        const res = await agent
            .put(`/api/invoices/${created.body.id}`)
            .send({ description: 'L874 false 분기 커버' });
        expect(res.status).toBe(200);
        // additional_items=null → 파싱 없이 null 그대로 반환
        expect(res.body.additional_items).toBeNull();
    });
});

// ==================== POST Simple - airfare 0 falsy 분기 (L610-613) ====================

describe('POST Simple Mode - airfare=0 falsy 분기 (L610-613)', () => {
    it('성공: 모든 단가=0 → || 0 falsy 분기, 총액 0 (L610-613 전체 falsy)', async () => {
        const res = await agent.post('/api/invoices').send(
            sampleInvoiceSimple({
                airfare_unit_price: 0,
                airfare_quantity: 0,
                seat_preference_unit_price: 0,
                seat_preference_quantity: 0,
            })
        );
        expect(res.status).toBe(201);
        expect(res.body.airfare_total).toBe(0);
        expect(res.body.seat_preference_total).toBe(0);
        expect(res.body.total_amount).toBe(0);
    });
});

// ==================== POST Advanced - || null / ternary null 분기 (L591-598) ====================

describe('POST Advanced - falsy 분기 (L591-598)', () => {
    it('성공: additional_items 미제공 → null 저장, GET /:id에서 null 반환 (L596 false 분기)', async () => {
        const res = await agent.post('/api/invoices').send(
            sampleInvoiceAdvanced({ additional_items: undefined })
        );
        expect(res.status).toBe(201);

        const detail = await agent.get(`/api/invoices/${res.body.id}`);
        expect(detail.status).toBe(200);
        // advanced 모드이지만 additional_items=null → L397 false → null 그대로 반환
        expect(detail.body.additional_items).toBeNull();
    });

    it('성공: balance_due=0 → 0||null=null, 0||0=0 (L597-598 falsy 분기)', async () => {
        const res = await agent.post('/api/invoices').send(
            sampleInvoiceAdvanced({ balance_due: 0 })
        );
        expect(res.status).toBe(201);
        expect(res.body.balance_due).toBeNull();  // 0 || null = null
        expect(res.body.total_amount).toBe(0);    // 0 || 0 = 0
    });

    it('성공: base_price_per_person=0 → null 저장 (L591 falsy 분기)', async () => {
        const res = await agent.post('/api/invoices').send(
            sampleInvoiceAdvanced({ base_price_per_person: 0 })
        );
        expect(res.status).toBe(201);
        expect(res.body.base_price_per_person).toBeNull(); // 0 || null = null
    });
});

// ==================== PUT Advanced - Array.isArray false, balance_due absent 분기 ====================

describe('PUT Advanced - 추가 분기 (L825, L830)', () => {
    it('성공: additional_items가 배열 아닌 문자열 → Array.isArray false → JSON 변환 안 함 (L825)', async () => {
        const created = await agent.post('/api/invoices').send(sampleInvoiceAdvanced());
        const res = await agent.put(`/api/invoices/${created.body.id}`).send({
            additional_items: 'not-an-array',
        });
        expect(res.status).toBe(200);
        // 문자열 그대로 DB 저장 → 파싱 실패 → 빈 배열 반환 (L877-879)
        expect(res.body.additional_items).toEqual([]);
    });

    it('성공: balance_due 없이 PUT → total_amount 변경 안 됨 (L830 false 분기)', async () => {
        const created = await agent.post('/api/invoices').send(sampleInvoiceAdvanced());
        const originalTotal = created.body.total_amount;

        const res = await agent.put(`/api/invoices/${created.body.id}`).send({
            description: '설명 변경',
        });
        expect(res.status).toBe(200);
        expect(res.body.total_amount).toBe(originalTotal); // balance_due 없음 → total_amount 유지
    });
});

// ==================== PUT Simple - 재계산 미트리거 분기 (L835 false) ====================

describe('PUT Simple - 재계산 미트리거 분기 (L835)', () => {
    it('성공: airfare 필드 없이 PUT → 재계산 안 됨, 총액 유지 (L835 false 분기)', async () => {
        const created = await agent.post('/api/invoices').send(sampleInvoiceSimple());
        const originalTotal = created.body.total_amount;

        const res = await agent.put(`/api/invoices/${created.body.id}`).send({
            recipient: '변경된 여행사',
        });
        expect(res.status).toBe(200);
        expect(res.body.total_amount).toBe(originalTotal);
        expect(res.body.recipient).toBe('변경된 여행사');
    });
});

// ==================== 500 에러 처리 (GET, POST 추가) ====================

describe('500 에러 처리 (GET, POST 추가)', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('GET / - 500: DB 오류', async () => {
        jest.spyOn(db, 'get').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.get('/api/invoices');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/조회 실패/);
    });

    it('GET /:id - 500: DB 오류', async () => {
        jest.spyOn(db, 'get').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.get('/api/invoices/test-id');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/조회 실패/);
    });

    it('POST / - 500: DB 오류', async () => {
        jest.spyOn(db, 'run').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.post('/api/invoices').send(sampleInvoiceSimple());
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/생성 실패/);
    });
});

// ==================== POST - description/calculation_mode 미제공 || 기본값 분기 (L580, L583) ====================

describe('POST - description/calculation_mode 미제공 → || 기본값 분기 (L580, L583)', () => {
    it('성공: description 미제공 → undefined||null=null (L580 right), calculation_mode 미제공 → undefined||\'simple\' (L583 right)', async () => {
        const res = await agent.post('/api/invoices').send({
            recipient: '기본값테스트',
            invoice_date: '2026-03-01',
            // description 미제공 → L580: undefined || null = null (right 분기)
            // calculation_mode 미제공 → L583: undefined || 'simple' (right 분기)
            airfare_unit_price: 100000,
            airfare_quantity: 2,
        });
        expect(res.status).toBe(201);
        expect(res.body.description).toBeNull();
        expect(res.body.calculation_mode).toBe('simple');
    });
});

// ==================== POST Advanced - 선택 필드 미제공 || null 분기 (L592-595) ====================

describe('POST Advanced - 선택 필드 미제공 → || null 분기 (L592-595)', () => {
    it('성공: total_participants/total_travel_cost/deposit_amount/deposit_description 미제공 → null 저장', async () => {
        const res = await agent.post('/api/invoices').send({
            recipient: '고급여행사2',
            invoice_date: '2026-03-01',
            calculation_mode: 'advanced',
            // total_participants 미제공 → L592: undefined || null = null (right 분기)
            // total_travel_cost 미제공 → L593: undefined || null = null (right 분기)
            // deposit_amount 미제공 → L594: undefined || null = null (right 분기)
            // deposit_description 미제공 → L595: undefined || null = null (right 분기)
            balance_due: 5000000,
        });
        expect(res.status).toBe(201);
        expect(res.body.total_participants).toBeNull();
        expect(res.body.total_travel_cost).toBeNull();
        expect(res.body.deposit_amount).toBeNull();
        expect(res.body.deposit_description).toBeNull();
    });
});

// ==================== PUT Simple - airfare_unit_price 미포함 → ?? 기존값 분기 (L838 right) ====================

describe('PUT Simple - airfare_unit_price 미제공 → ?? 기존값 분기 (L838 right)', () => {
    it('성공: airfare_quantity만 PUT → airfare_unit_price ?? 기존값 사용 (L838 right 분기)', async () => {
        const created = await agent.post('/api/invoices').send(sampleInvoiceSimple());
        // airfare_unit_price=500000, airfare_quantity=10이 기존값
        const res = await agent.put(`/api/invoices/${created.body.id}`).send({
            airfare_quantity: 15,
            // airfare_unit_price 미제공 → L838: undefined ?? 500000 = 500000 (right 분기)
        });
        expect(res.status).toBe(200);
        expect(res.body.airfare_unit_price).toBe(500000); // 기존값 유지
        expect(res.body.airfare_quantity).toBe(15);
        expect(res.body.airfare_total).toBe(500000 * 15);
    });
});

// ==================== getDb() _db=null → throw 분기 (L141 true 분기) ====================

describe('getDb() _db=null → throw 분기 (L141 true 분기)', () => {
    it('500: DB 초기화 없이 요청 → getDb() throw → 500 (L141 true 분기)', async () => {
        await jest.isolateModules(async () => {
            const express = require('express');
            const st = require('supertest');
            const createRoutes = require('../../routes/invoices');
            // factory에 null 전달 → _db = null
            const router = createRoutes(null);
            const miniApp = express();
            miniApp.use(express.json());
            miniApp.use('/', router);

            const res = await st(miniApp).get('/');
            expect(res.status).toBe(500);
            expect(res.body.error).toMatch(/조회 실패/);
        });
    });
});
