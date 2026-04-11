jest.mock('../../services/notify', () => ({
    initEmail: jest.fn(),
    sendLoginNotification: jest.fn().mockResolvedValue(undefined),
}));

const supertest = require('supertest');
const { createTestDb, cleanupTestDb } = require('../setup/test-db');
const { createTestApp } = require('../setup/test-app');
const { loginAsAdmin, sampleMember } = require('../setup/test-helpers');

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
        const res = await supertest(app).post('/api/sync/customers/batch').send({ members: [] });
        expect(res.status).toBe(401);
    });
});

// ==================== POST /api/sync/customers/batch ====================

describe('POST /api/sync/customers/batch', () => {
    it('400: members 없음', async () => {
        const res = await agent.post('/api/sync/customers/batch').send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/멤버 목록/);
    });

    it('400: members 빈 배열', async () => {
        const res = await agent.post('/api/sync/customers/batch').send({ members: [] });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/멤버 목록/);
    });

    it('400: members 501명 초과', async () => {
        const members = Array(501).fill(sampleMember());
        const res = await agent.post('/api/sync/customers/batch').send({ members });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/500명/);
    });

    it('400: departure_date 형식 오류', async () => {
        const res = await agent.post('/api/sync/customers/batch').send({
            members: [sampleMember()],
            departure_date: '22-01-2026',
        });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/출발일 형식/);
    });

    it('400: return_date 형식 오류', async () => {
        const res = await agent.post('/api/sync/customers/batch').send({
            members: [sampleMember()],
            return_date: '2026/06/01',
        });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/귀국일 형식/);
    });

    it('400: group_name 200자 초과', async () => {
        const res = await agent.post('/api/sync/customers/batch').send({
            members: [sampleMember()],
            group_name: 'A'.repeat(201),
        });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/200자/);
    });

    it('200: 신규 고객 생성 성공', async () => {
        const res = await agent.post('/api/sync/customers/batch').send({
            members: [sampleMember()],
            group_name: '테스트단체',
            departure_date: '2026-06-01',
        });
        expect(res.status).toBe(200);
        expect(res.body.created).toBe(1);
        expect(res.body.updated).toBe(0);
        expect(res.body.skipped).toBe(0);
        expect(res.body.sync_log_id).toBeDefined();
    });

    it('200: 기존 고객 업데이트 (여권번호 매칭)', async () => {
        // 첫 번째 동기화로 고객 생성
        await agent.post('/api/sync/customers/batch').send({
            members: [sampleMember()],
        });

        // 동일 여권번호로 재동기화 → 업데이트
        const res = await agent.post('/api/sync/customers/batch').send({
            members: [sampleMember({ phone: '010-9999-8888' })],
        });
        expect(res.status).toBe(200);
        expect(res.body.updated).toBe(1);
        expect(res.body.created).toBe(0);
    });

    it('200: 필수 필드 누락 멤버 → skipped', async () => {
        const res = await agent.post('/api/sync/customers/batch').send({
            members: [{ nameKor: '홍길동' }], // passportNo 등 필수 필드 없음
        });
        expect(res.status).toBe(200);
        expect(res.body.skipped).toBe(1);
        expect(res.body.errors).toHaveLength(1);
    });

    it('200: 유효/무효 멤버 혼합', async () => {
        const res = await agent.post('/api/sync/customers/batch').send({
            members: [
                sampleMember({ passportNo: 'A11111111' }),
                { nameKor: '무효멤버' }, // 필수 필드 없음
            ],
        });
        expect(res.status).toBe(200);
        expect(res.body.created).toBe(1);
        expect(res.body.skipped).toBe(1);
    });

    it('200: total은 members.length와 일치', async () => {
        const res = await agent.post('/api/sync/customers/batch').send({
            members: [sampleMember({ passportNo: 'B22222222' }), sampleMember({ passportNo: 'C33333333' })],
        });
        expect(res.status).toBe(200);
        expect(res.body.total).toBe(2);
    });
});

// ==================== POST /api/sync/validate ====================

describe('POST /api/sync/validate', () => {
    it('400: members 없음', async () => {
        const res = await agent.post('/api/sync/validate').send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/멤버 목록/);
    });

    it('200: 유효 멤버 → valid[]', async () => {
        const res = await agent.post('/api/sync/validate').send({
            members: [sampleMember()],
        });
        expect(res.status).toBe(200);
        expect(res.body.valid).toHaveLength(1);
        expect(res.body.invalid).toHaveLength(0);
        expect(res.body.duplicates).toHaveLength(0);
        expect(res.body.valid[0].action).toBe('create');
    });

    it('200: 필수 필드 누락 → invalid[]', async () => {
        const res = await agent.post('/api/sync/validate').send({
            members: [{ nameKor: '홍길동' }],
        });
        expect(res.status).toBe(200);
        expect(res.body.invalid).toHaveLength(1);
        expect(res.body.invalid[0].errors.length).toBeGreaterThan(0);
    });

    it('200: 기존 고객 존재 → duplicates[]', async () => {
        // 먼저 고객 생성
        await agent.post('/api/sync/customers/batch').send({
            members: [sampleMember()],
        });

        const res = await agent.post('/api/sync/validate').send({
            members: [sampleMember()], // 동일 여권번호
        });
        expect(res.status).toBe(200);
        expect(res.body.duplicates).toHaveLength(1);
        expect(res.body.duplicates[0].match_type).toBe('passport');
    });
});

// ==================== GET /api/sync/history ====================

describe('GET /api/sync/history', () => {
    it('200: 빈 목록 반환', async () => {
        const res = await agent.get('/api/sync/history');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(0);
    });

    it('200: 동기화 후 이력 조회', async () => {
        await agent.post('/api/sync/customers/batch').send({
            members: [sampleMember()],
            group_name: '이력테스트',
        });

        const res = await agent.get('/api/sync/history');
        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0]).toHaveProperty('sync_type');
        expect(res.body[0]).toHaveProperty('status');
    });

    it('200: limit 파라미터 적용', async () => {
        const res = await agent.get('/api/sync/history?limit=1&offset=0');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('200: details JSON 자동 파싱', async () => {
        await agent.post('/api/sync/customers/batch').send({
            members: [sampleMember({ passportNo: 'D44444444' })],
        });

        const res = await agent.get('/api/sync/history');
        expect(res.status).toBe(200);
        if (res.body.length > 0 && res.body[0].details) {
            expect(typeof res.body[0].details).toBe('object');
        }
    });
});

// ==================== 전화번호 일치 경고 (logger.warn line 42) ====================

describe('findExistingCustomer — 전화번호 일치 경고', () => {
    it('200: 전화번호만 일치하는 고객 존재 → 신규 생성 (경고만)', async () => {
        // 고객 A 생성 (고유 여권번호)
        await agent.post('/api/sync/customers/batch').send({
            members: [sampleMember({ passportNo: 'PHONE001', nameKor: '고객A', birthDate: '1980-01-01', phone: '010-7777-9999' })],
        });

        // 멤버 B: 다른 여권번호, 다른 이름+생년월일, 같은 전화번호 → 경고만, 신규 생성
        const res = await agent.post('/api/sync/customers/batch').send({
            members: [sampleMember({ passportNo: 'PHONE002', nameKor: '고객B', birthDate: '1990-02-02', phone: '010-7777-9999' })],
        });
        expect(res.status).toBe(200);
        expect(res.body.created).toBe(1);
        expect(res.body.skipped).toBe(0);
    });
});

// ==================== 추가 검증 경로 (lines 127, 255) ====================

describe('POST /api/sync/customers/batch — 추가 검증', () => {
    it('200: nameKor/nameEn 모두 없는 멤버 → skipped', async () => {
        const res = await agent.post('/api/sync/customers/batch').send({
            members: [{ passportNo: 'X123456', birthDate: '1990-01-01', passportExpire: '2030-01-01' }],
        });
        expect(res.status).toBe(200);
        expect(res.body.skipped).toBe(1);
        expect(res.body.errors[0].errors).toContain('한글명 또는 영문명 필수');
    });

    it('200: group_id 제공 시 groups 테이블 업데이트 시도', async () => {
        const res = await agent.post('/api/sync/customers/batch').send({
            members: [sampleMember({ passportNo: 'GRPID001' })],
            group_id: 'test-group-uuid-1234',
            group_name: '테스트그룹',
        });
        expect(res.status).toBe(200);
        expect(res.body.created).toBe(1);
    });
});

// ==================== POST /api/sync/validate — 추가 검증 (line 293) ====================

describe('POST /api/sync/validate — 추가 검증', () => {
    it('200: nameKor/nameEn 모두 없는 멤버 → invalid[]', async () => {
        const res = await agent.post('/api/sync/validate').send({
            members: [{ passportNo: 'X123', birthDate: '1990-01-01', passportExpire: '2030-01-01' }],
        });
        expect(res.status).toBe(200);
        expect(res.body.invalid).toHaveLength(1);
        expect(res.body.invalid[0].errors).toContain('한글명 또는 영문명 필수');
    });
});

// ==================== GET /api/sync/history — 필터 파라미터 (lines 341-347) ====================

describe('GET /api/sync/history — 필터', () => {
    it('200: group_id 필터 적용', async () => {
        const res = await agent.get('/api/sync/history?group_id=nonexistent-group');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(0);
    });

    it('200: sync_type 필터 적용', async () => {
        const res = await agent.get('/api/sync/history?sync_type=customer_sync');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('200: limit=abc (비정수) → safeLimit defaults to 50 (L351 || 50 falsy 분기)', async () => {
        // parseInt('abc', 10) = NaN → NaN || 50 = 50 → falsy 분기 커버
        const res = await agent.get('/api/sync/history?limit=abc');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('200: details 잘못된 JSON → catch 분기 + details=null → if false 분기 (L360 전체 커버)', async () => {
        // 1) 잘못된 JSON → if(log.details) true → JSON.parse 오류 → catch 실행 (try-throw 분기)
        await db.run(
            `INSERT INTO sync_logs (id, sync_type, operation, entity_type, status, details, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ['bad-json-log-001', 'test_type', 'batch_sync', 'customer', 'success', 'invalid{json', new Date().toISOString()]
        );
        // 2) details=null → if(log.details) false → skip JSON.parse (if-false 분기)
        await db.run(
            `INSERT INTO sync_logs (id, sync_type, operation, entity_type, status, details, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ['null-details-log-001', 'test_type', 'batch_sync', 'customer', 'success', null, new Date().toISOString()]
        );
        const res = await agent.get('/api/sync/history');
        expect(res.status).toBe(200);
        // catch 분기 확인: 잘못된 JSON → 원본 문자열 반환
        const badLog = res.body.find(l => l.id === 'bad-json-log-001');
        expect(badLog).toBeDefined();
        expect(badLog.details).toBe('invalid{json');
        // if false 분기 확인: null details → details는 null 유지
        const nullLog = res.body.find(l => l.id === 'null-details-log-001');
        expect(nullLog).toBeDefined();
        expect(nullLog.details).toBeNull();
    });
});

// ==================== findExistingCustomer — nameKor/phone 없는 분기 (L25=false, L36=false) ====================

describe('findExistingCustomer — nameKor/phone 없음 분기 (L25=false, L36=false)', () => {
    it('200: nameEn만 있고 nameKor/phone 없는 멤버 → 신규 생성 (L25=false, L36=false, L189 falsy, L194 falsy)', async () => {
        // nameKor 없음 → L25: member.nameKor && member.birthDate = false (L25 분기 커버)
        // phone 없음 → L36: member.phone = false (L36 분기 커버)
        // 신규고객: name_kor: undefined || '' = '' (L189 falsy), phone: undefined || '' = '' (L194 falsy)
        const res = await agent.post('/api/sync/customers/batch').send({
            members: [{
                nameEn: 'NO KOR NAME',
                passportNo: 'ENONLY001',
                birthDate: '1990-01-01',
                passportExpire: '2030-01-01',
                // nameKor: 없음, phone: 없음
            }],
        });
        expect(res.status).toBe(200);
        expect(res.body.created).toBe(1);
        expect(res.body.skipped).toBe(0);
    });

    it('200: nameKor만 있고 nameEn 없는 멤버 → 신규 생성 (L190 falsy 분기)', async () => {
        // nameEn 없음 → 신규고객: name_eng: undefined || '' = '' (L190 falsy 분기 커버)
        const res = await agent.post('/api/sync/customers/batch').send({
            members: [{
                nameKor: '한글전용',
                passportNo: 'KORONLY001',
                birthDate: '1988-03-03',
                passportExpire: '2032-03-03',
                // nameEn: 없음
            }],
        });
        expect(res.status).toBe(200);
        expect(res.body.created).toBe(1);
    });

    it('200: UPDATE — nameKor/phone 없는 멤버 → existing 값으로 대체 (L155, L160 falsy 분기)', async () => {
        // 먼저 완전한 멤버로 고객 생성
        await agent.post('/api/sync/customers/batch').send({
            members: [sampleMember({ passportNo: 'UPDATE_ENONLY_01' })],
        });
        // 같은 passportNo, nameKor/phone 없음으로 재동기화 → UPDATE 경로 → existing 값 사용
        // L155: member.nameKor || existing.name_kor → undefined → falsy (L155 falsy 커버)
        // L160: member.phone || existing.phone → undefined → falsy (L160 falsy 커버)
        const res = await agent.post('/api/sync/customers/batch').send({
            members: [{
                nameEn: 'UPDATE WITHOUT KOR',
                passportNo: 'UPDATE_ENONLY_01',
                birthDate: '1990-01-15',
                passportExpire: '2030-12-31',
                // nameKor: 없음, phone: 없음
            }],
        });
        expect(res.status).toBe(200);
        expect(res.body.updated).toBe(1);
    });

    it('200: UPDATE — nameEn 없는 멤버 → existing name_eng 유지 (L156 falsy 분기)', async () => {
        // 먼저 완전한 멤버로 생성
        await agent.post('/api/sync/customers/batch').send({
            members: [sampleMember({ passportNo: 'UPDATE_NOENG_01' })],
        });
        // nameKor만 있고 nameEn 없음 → L156: member.nameEn || existing.name_eng → undefined → falsy
        const res = await agent.post('/api/sync/customers/batch').send({
            members: [{
                nameKor: '한글전용업데이트',
                passportNo: 'UPDATE_NOENG_01',
                birthDate: '1990-01-15',
                passportExpire: '2030-12-31',
                // nameEn: 없음
            }],
        });
        expect(res.status).toBe(200);
        expect(res.body.updated).toBe(1);
    });

    it('200: UPDATE — gender 양쪽 없음 → empty string (L161 || \'\' 최종 fallback 분기)', async () => {
        // gender 없이 신규 생성 → existing.gender = '' (falsy)
        await agent.post('/api/sync/customers/batch').send({
            members: [{
                nameEn: 'NO GENDER MEMBER',
                passportNo: 'NOGENDER_001',
                birthDate: '1995-07-07',
                passportExpire: '2031-07-07',
                // gender: 없음 → '' 저장
            }],
        });
        // gender 없이 재동기화 → member.gender falsy + existing.gender '' (falsy) → || '' 최종 fallback
        const res = await agent.post('/api/sync/customers/batch').send({
            members: [{
                nameEn: 'NO GENDER UPDATE',
                passportNo: 'NOGENDER_001',
                birthDate: '1995-07-07',
                passportExpire: '2031-07-07',
                // gender: 없음
            }],
        });
        expect(res.status).toBe(200);
        expect(res.body.updated).toBe(1);
    });

    it('200: validate — nameEn만 있고 nameKor/phone 없는 멤버 → valid', async () => {
        const res = await agent.post('/api/sync/validate').send({
            members: [{
                nameEn: 'VALIDATE NO KOR',
                passportNo: 'ENONLY002',
                birthDate: '1985-05-05',
                passportExpire: '2031-05-05',
            }],
        });
        expect(res.status).toBe(200);
        expect(res.body.valid).toHaveLength(1);
        expect(res.body.invalid).toHaveLength(0);
    });
});

// ==================== 500 에러 처리 (lines 229-235, 267-268, 327-328, 367-368) ====================

describe('500 에러 처리', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('POST /customers/batch - 500: BEGIN TRANSACTION 실패', async () => {
        jest.spyOn(db, 'run').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.post('/api/sync/customers/batch').send({
            members: [sampleMember()],
        });
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/배치 동기화 실패/);
    });

    it('POST /customers/batch - 200: 개별 멤버 INSERT 실패 → 해당 멤버만 skipped', async () => {
        const origRun = db.run.bind(db);
        jest.spyOn(db, 'run').mockImplementation((sql, ...args) => {
            if (typeof sql === 'string' && sql.trim().startsWith('INSERT INTO customers')) {
                return Promise.reject(new Error('Customer insert failed'));
            }
            return origRun(sql, ...args);
        });

        const res = await agent.post('/api/sync/customers/batch').send({
            members: [sampleMember({ passportNo: 'MOCK001' })],
        });
        expect(res.status).toBe(200);
        expect(res.body.skipped).toBe(1);
        expect(res.body.errors).toHaveLength(1);
    });

    it('POST /validate - 500: DB 오류', async () => {
        jest.spyOn(db, 'get').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.post('/api/sync/validate').send({
            members: [sampleMember()],
        });
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/검증 실패/);
    });

    it('GET /history - 500: DB 오류', async () => {
        jest.spyOn(db, 'all').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.get('/api/sync/history');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/조회 실패/);
    });
});
