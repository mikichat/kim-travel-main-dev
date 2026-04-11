jest.mock('../../services/notify', () => ({
    initEmail: jest.fn(),
    sendLoginNotification: jest.fn().mockResolvedValue(undefined),
}));

const supertest = require('supertest');
const { createTestDb, cleanupTestDb } = require('../setup/test-db');
const { createTestApp } = require('../setup/test-app');
const { loginAsAdmin, sampleCostCalculation } = require('../setup/test-helpers');

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
        const res = await supertest(app).get('/api/cost-calculations');
        expect(res.status).toBe(401);
    });
});

// ==================== POST /api/cost-calculations ====================

describe('POST /api/cost-calculations', () => {
    it('성공: 코드 없이 자동 생성 (201)', async () => {
        const res = await agent
            .post('/api/cost-calculations')
            .send(sampleCostCalculation());

        expect(res.status).toBe(201);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.name).toBe('태국 방콕 4박5일');
        expect(res.body.data.code).toMatch(/^COST-\d{4}-\d{2}-\d{3}$/);
    });

    it('성공: 코드 지정 생성', async () => {
        const res = await agent
            .post('/api/cost-calculations')
            .send(sampleCostCalculation({ code: 'COST-2026-06-001' }));

        expect(res.status).toBe(201);
        expect(res.body.data.code).toBe('COST-2026-06-001');
    });

    it('성공: 같은 코드로 재저장하면 업데이트 (200)', async () => {
        await agent.post('/api/cost-calculations').send(sampleCostCalculation({ code: 'COST-TEST-001' }));

        const res = await agent
            .post('/api/cost-calculations')
            .send(sampleCostCalculation({ code: 'COST-TEST-001', name: '수정된 행사명' }));

        expect(res.status).toBe(200);
        expect(res.body.data.name).toBe('수정된 행사명');
    });

    it('400: name 누락', async () => {
        const res = await agent
            .post('/api/cost-calculations')
            .send(sampleCostCalculation({ name: undefined }));

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('행사명');
    });

    it('400: name 200자 초과', async () => {
        const res = await agent
            .post('/api/cost-calculations')
            .send(sampleCostCalculation({ name: 'a'.repeat(201) }));

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('200자');
    });

    it('400: departure_date 형식 오류', async () => {
        const res = await agent
            .post('/api/cost-calculations')
            .send(sampleCostCalculation({ departure_date: '20260601' }));

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('출발일');
    });

    it('400: arrival_date 형식 오류', async () => {
        const res = await agent
            .post('/api/cost-calculations')
            .send(sampleCostCalculation({ arrival_date: '06/05/2026' }));

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('귀국일');
    });

    it('400: adults 음수', async () => {
        const res = await agent
            .post('/api/cost-calculations')
            .send(sampleCostCalculation({ adults: -1 }));

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('adults');
    });

    it('400: children 소수', async () => {
        const res = await agent
            .post('/api/cost-calculations')
            .send(sampleCostCalculation({ children: 1.5 }));

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('children');
    });
});

// ==================== GET /api/cost-calculations ====================

describe('GET /api/cost-calculations', () => {
    it('성공: 목록 조회', async () => {
        await agent.post('/api/cost-calculations').send(sampleCostCalculation());
        await agent.post('/api/cost-calculations').send(sampleCostCalculation({ name: '두 번째 행사' }));

        const res = await agent.get('/api/cost-calculations');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(2);
    });

    it('성공: 목록에 passport_file_data 등 JSON 컬럼 미포함', async () => {
        await agent.post('/api/cost-calculations').send(sampleCostCalculation());

        const res = await agent.get('/api/cost-calculations');

        expect(res.status).toBe(200);
        // 목록 응답에는 상세 컬럼 제외 (id, code, name, ... 만 포함)
        expect(res.body[0].flight_data).toBeUndefined();
    });

    it('성공: 빈 목록', async () => {
        const res = await agent.get('/api/cost-calculations');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
});

// ==================== GET /api/cost-calculations/:id ====================

describe('GET /api/cost-calculations/:id', () => {
    it('성공: 상세 조회 (JSON 필드 파싱됨)', async () => {
        const created = await agent
            .post('/api/cost-calculations')
            .send(sampleCostCalculation({ code: 'COST-TEST-002' }));
        const id = created.body.data.id;

        const res = await agent.get(`/api/cost-calculations/${id}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(id);
        expect(res.body.name).toBe('태국 방콕 4박5일');
        // JSON 필드: null이거나 파싱된 객체 (stringified가 아님)
        expect(typeof res.body.flight_data).not.toBe('string');
    });

    it('404: 존재하지 않는 id', async () => {
        const res = await agent.get('/api/cost-calculations/nonexistent-id');

        expect(res.status).toBe(404);
        expect(res.body.error).toContain('찾을 수 없습니다');
    });
});

// ==================== DELETE /api/cost-calculations/:id ====================

describe('DELETE /api/cost-calculations/:id', () => {
    it('성공: 삭제 (204)', async () => {
        const created = await agent
            .post('/api/cost-calculations')
            .send(sampleCostCalculation());
        const id = created.body.data.id;

        const res = await agent.delete(`/api/cost-calculations/${id}`);

        expect(res.status).toBe(204);

        const check = await agent.get(`/api/cost-calculations/${id}`);
        expect(check.status).toBe(404);
    });

    it('404: 존재하지 않는 id', async () => {
        const res = await agent.delete('/api/cost-calculations/nonexistent-id');

        expect(res.status).toBe(404);
    });
});

// ==================== 500 에러 처리 ====================

describe('500 에러 처리', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('GET / - 500: DB 오류', async () => {
        jest.spyOn(db, 'all').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.get('/api/cost-calculations');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/조회 실패/);
    });

    it('GET /:id - 500: DB 오류', async () => {
        jest.spyOn(db, 'get').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.get('/api/cost-calculations/test-id');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/조회 실패/);
    });

    it('POST / - 500: DB 오류 (코드 자동생성 경로)', async () => {
        jest.spyOn(db, 'all').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent
            .post('/api/cost-calculations')
            .send({ name: '테스트 행사' });
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/저장 실패/);
    });

    it('DELETE /:id - 500: DB 오류', async () => {
        jest.spyOn(db, 'run').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.delete('/api/cost-calculations/test-id');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/삭제 실패/);
    });
});

// ==================== JSON 필드 직렬화/역직렬화 (lines 27-30, 73-76) ====================

describe('JSON 필드 직렬화/역직렬화', () => {
    it('성공: JSON 필드 포함 저장 후 조회 — 객체로 파싱됨', async () => {
        const res = await agent.post('/api/cost-calculations').send(
            sampleCostCalculation({
                flight_data: { airline: 'KE', price: 500000 },
                etc_costs: [{ item: '가이드비', amount: 100000 }],
                land_cost_1: { hotel: '방콕호텔', cost: 200000 },
                land_cost_2: { transport: '버스', cost: 50000 },
            })
        );
        expect(res.status).toBe(201);
        const id = res.body.data.id;

        const detail = await agent.get(`/api/cost-calculations/${id}`);
        expect(detail.status).toBe(200);
        expect(typeof detail.body.flight_data).toBe('object');
        expect(typeof detail.body.etc_costs).toBe('object');
        expect(typeof detail.body.land_cost_1).toBe('object');
        expect(typeof detail.body.land_cost_2).toBe('object');
    });
});

// ==================== tc 기본값 — 코드 지정 경로 (L94, L114 falsy 분기) ====================

describe('tc 기본값 — 코드 지정 경로', () => {
    it('성공: INSERT-with-code tc=0 → tc 0으로 저장 (L114 falsy 분기)', async () => {
        // data.code 있음 + code가 DB에 없음 → INSERT 경로(L114) 실행
        // tc=0은 falsy → data.tc || 0 = 0 (falsy 분기 커버)
        const res = await agent.post('/api/cost-calculations').send({
            code: 'COST-TC-ZERO-01',
            name: 'tc=0 insert 테스트',
            tc: 0,
        });
        expect(res.status).toBe(201);
        expect(res.body.data.tc).toBe(0);
    });

    it('성공: UPDATE tc=0 → tc 0으로 업데이트 (L94 falsy 분기)', async () => {
        // 먼저 코드로 생성 후 tc=0으로 재저장 → UPDATE 경로(L94) 실행
        await agent.post('/api/cost-calculations').send({
            code: 'COST-TC-ZERO-02',
            name: '초기 행사',
            tc: 2,
        });
        const res = await agent.post('/api/cost-calculations').send({
            code: 'COST-TC-ZERO-02',
            name: '업데이트된 행사',
            tc: 0,
        });
        expect(res.status).toBe(200);
        expect(res.body.data.tc).toBe(0);
    });
});

// ==================== JSON 파싱 오류 처리 (catch 분기 L27-30) ====================

describe('JSON 파싱 오류 처리 (catch 분기)', () => {
    it('GET /:id — 잘못된 JSON 데이터 → null로 fallback (catch 분기 커버)', async () => {
        // 잘못된 JSON 문자열을 직접 DB에 삽입하여 JSON.parse 오류 유발
        // id는 INTEGER AUTOINCREMENT이므로 생략하고 lastID로 조회
        const result = await db.run(
            `INSERT INTO cost_calculations (code, name, flight_data, etc_costs, land_cost_1, land_cost_2)
             VALUES (?, ?, ?, ?, ?, ?)`,
            ['COST-BAD-001', '파싱오류 테스트', 'invalid{json', 'bad]json', '{broken', 'also[bad']
        );
        const id = result.lastID;

        const res = await agent.get(`/api/cost-calculations/${id}`);
        expect(res.status).toBe(200);
        expect(res.body.flight_data).toBeNull();
        expect(res.body.etc_costs).toBeNull();
        expect(res.body.land_cost_1).toBeNull();
        expect(res.body.land_cost_2).toBeNull();
    });
});

// ==================== L139 parseInt NaN → || 0 falsy 분기 ====================

describe('자동 코드 생성 — 비정수 suffix (L139 || 0 falsy 분기)', () => {
    it('성공: 비정수 suffix 코드 존재 시 parseInt=NaN → || 0 fallback 후 001 생성', async () => {
        // 현재 월 접두사에 맞지만 비정수 suffix를 가진 코드를 DB에 직접 삽입
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        await db.run(
            `INSERT INTO cost_calculations (code, name) VALUES (?, ?)`,
            [`COST-${year}-${month}-xyz`, 'NaN suffix 테스트']
        );

        // 자동 코드 생성 → existingCodes에 'xyz' 포함 → parseInt('xyz')=NaN → NaN||0=0 (falsy 분기)
        const res = await agent.post('/api/cost-calculations').send({ name: 'L139 falsy 분기 테스트' });
        expect(res.status).toBe(201);
        expect(res.body.data.code).toMatch(/^COST-\d{4}-\d{2}-\d{3}$/);
    });
});

// ==================== 자동 코드 번호 증가 (lines 136-141) ====================

describe('자동 코드 번호 증가', () => {
    it('성공: 동월에 두 번째 자동 코드 생성 시 번호 증가', async () => {
        await agent.post('/api/cost-calculations').send(sampleCostCalculation());
        const res = await agent.post('/api/cost-calculations').send(sampleCostCalculation({ name: '두 번째 행사' }));
        expect(res.status).toBe(201);
        expect(res.body.data.code).toMatch(/^COST-\d{4}-\d{2}-002$/);
    });
});

// ==================== tc 기본값 분기 (lines 95, 156 — tc || 0) ====================

describe('tc 기본값', () => {
    it('성공: tc=0 전달 시 0으로 저장됨', async () => {
        const res = await agent.post('/api/cost-calculations').send(
            sampleCostCalculation({ tc: 0 })
        );
        expect(res.status).toBe(201);
        expect(res.body.data.tc).toBe(0);
    });
});
