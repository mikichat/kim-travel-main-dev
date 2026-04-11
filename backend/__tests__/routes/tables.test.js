jest.mock('../../services/notify', () => ({
    initEmail: jest.fn(),
    sendLoginNotification: jest.fn().mockResolvedValue(undefined),
}));

const supertest = require('supertest');
const { createTestDb, cleanupTestDb } = require('../setup/test-db');
const { createTestApp } = require('../setup/test-app');
const { loginAsAdmin } = require('../setup/test-helpers');

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
        const res = await supertest(app).get('/tables/groups');
        expect(res.status).toBe(401);
    });
});

// ==================== 화이트리스트 검증 ====================

describe('테이블 화이트리스트 검증', () => {
    it('400: 허용되지 않은 테이블 — GET', async () => {
        const res = await agent.get('/tables/users');
        expect(res.status).toBe(400);
        expect(res.body.error).toContain('허용되지 않은');
    });

    it('400: 허용되지 않은 테이블 — POST', async () => {
        const res = await agent.post('/tables/users').send({ email: 'hack@test.com' });
        expect(res.status).toBe(400);
    });

    it('400: 허용되지 않은 테이블 — DELETE', async () => {
        const res = await agent.delete('/tables/users/some-id');
        expect(res.status).toBe(400);
    });

    it('400: 허용되지 않은 테이블 — PUT', async () => {
        const res = await agent.put('/tables/users/some-id').send({ name: '이름' });
        expect(res.status).toBe(400);
    });

    it('400: 허용되지 않은 테이블 — PATCH', async () => {
        const res = await agent.patch('/tables/users/some-id').send({ name: '이름' });
        expect(res.status).toBe(400);
    });
});

// ==================== GET /tables/:tableName ====================

describe('GET /tables/:tableName', () => {
    it('성공: 빈 목록', async () => {
        const res = await agent.get('/tables/groups');
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
    });

    it('성공: 데이터 목록 조회', async () => {
        await agent.post('/tables/groups').send({ name: '테스트단체', destination: '태국' });

        const res = await agent.get('/tables/groups');
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].name).toBe('테스트단체');
    });

    it('성공: filter 파라미터로 필터링', async () => {
        await agent.post('/tables/groups').send({ name: '단체A' });
        await agent.post('/tables/groups').send({ name: '단체B' });

        const res = await agent.get('/tables/groups?filter=name:단체A');
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].name).toBe('단체A');
    });

    it('성공: 허용되지 않은 sort/order/limit → 안전한 기본값으로 폴백', async () => {
        await agent.post('/tables/groups').send({ name: '테스트' });

        const res = await agent.get('/tables/groups?sort=DROP+TABLE&order=INVALID&limit=abc');
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
    });

    it('성공: filter 컬럼명이 유효하지 않으면 WHERE 절 생략', async () => {
        await agent.post('/tables/groups').send({ name: '단체A' });
        await agent.post('/tables/groups').send({ name: '단체B' });

        // "1invalid:단체A" → col='1invalid', validateColumnName('1invalid')=false → WHERE 없이 전체 조회
        const res = await agent.get('/tables/groups?filter=1invalid:단체A');
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(2);
    });
});

// ==================== GET /tables/:tableName/:id ====================

describe('GET /tables/:tableName/:id', () => {
    it('성공: 단일 데이터 조회', async () => {
        const created = await agent.post('/tables/groups').send({ name: '조회대상' });
        const id = created.body.id;

        const res = await agent.get(`/tables/groups/${id}`);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(id);
        expect(res.body.name).toBe('조회대상');
    });

    it('404: 존재하지 않는 id', async () => {
        const res = await agent.get('/tables/groups/nonexistent-id');
        expect(res.status).toBe(404);
        expect(res.body.error).toContain('찾을 수 없습니다');
    });
});

// ==================== POST /tables/:tableName ====================

describe('POST /tables/:tableName', () => {
    it('성공: 데이터 생성 (201)', async () => {
        const res = await agent.post('/tables/groups').send({ name: '신규단체', destination: '일본' });
        expect(res.status).toBe(201);
        expect(res.body.id).toBeDefined();
        expect(res.body.name).toBe('신규단체');
    });

    it('성공: id가 UUID 형식으로 자동 생성됨', async () => {
        const res = await agent.post('/tables/groups').send({ name: '자동ID테스트' });
        expect(res.status).toBe(201);
        expect(res.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('성공: created_at이 자동 설정됨', async () => {
        const res = await agent.post('/tables/groups').send({ name: '시간테스트' });
        expect(res.status).toBe(201);
        expect(res.body.created_at).toBeDefined();
    });
});

// ==================== PUT /tables/:tableName/:id ====================

describe('PUT /tables/:tableName/:id', () => {
    it('성공: 전체 수정 (200)', async () => {
        const created = await agent.post('/tables/groups').send({ name: '원본이름' });
        const id = created.body.id;

        const res = await agent.put(`/tables/groups/${id}`).send({ name: '수정이름' });
        expect(res.status).toBe(200);

        const check = await agent.get(`/tables/groups/${id}`);
        expect(check.body.name).toBe('수정이름');
    });

    it('404: 존재하지 않는 id', async () => {
        const res = await agent.put('/tables/groups/nonexistent-id').send({ name: '이름' });
        expect(res.status).toBe(404);
    });

    it('400: 유효한 필드 없음 (빈 바디)', async () => {
        const created = await agent.post('/tables/groups').send({ name: '이름' });
        const id = created.body.id;

        const res = await agent.put(`/tables/groups/${id}`).send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toContain('유효한 필드');
    });
});

// ==================== PATCH /tables/:tableName/:id ====================

describe('PATCH /tables/:tableName/:id', () => {
    it('성공: 부분 수정 — 다른 필드 유지', async () => {
        const created = await agent.post('/tables/groups').send({ name: '원본', destination: '일본' });
        const id = created.body.id;

        const res = await agent.patch(`/tables/groups/${id}`).send({ name: '수정됨' });
        expect(res.status).toBe(200);

        const check = await agent.get(`/tables/groups/${id}`);
        expect(check.body.name).toBe('수정됨');
        expect(check.body.destination).toBe('일본');
    });

    it('404: 존재하지 않는 id', async () => {
        const res = await agent.patch('/tables/groups/nonexistent-id').send({ name: '이름' });
        expect(res.status).toBe(404);
    });

    it('400: 유효한 필드 없음', async () => {
        const created = await agent.post('/tables/groups').send({ name: '이름' });
        const id = created.body.id;

        const res = await agent.patch(`/tables/groups/${id}`).send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toContain('유효한 필드');
    });
});

// ==================== DELETE /tables/:tableName/:id ====================

describe('DELETE /tables/:tableName/:id', () => {
    it('성공: 삭제 (204)', async () => {
        const created = await agent.post('/tables/groups').send({ name: '삭제대상' });
        const id = created.body.id;

        const res = await agent.delete(`/tables/groups/${id}`);
        expect(res.status).toBe(204);

        const check = await agent.get(`/tables/groups/${id}`);
        expect(check.status).toBe(404);
    });

    it('404: 존재하지 않는 id', async () => {
        const res = await agent.delete('/tables/groups/nonexistent-id');
        expect(res.status).toBe(404);
    });
});

// ==================== 500 에러 처리 + 미검증 경로 ====================

describe('500 에러 처리 + 미검증 경로', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('GET /:tableName/:id - 400: 허용되지 않은 테이블', async () => {
        const res = await agent.get('/tables/users/some-id');
        expect(res.status).toBe(400);
        expect(res.body.error).toContain('허용되지 않은');
    });

    it('GET /:tableName - 500: DB 오류', async () => {
        jest.spyOn(db, 'all').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.get('/tables/groups');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/조회 실패/);
    });

    it('GET /:tableName/:id - 500: DB 오류', async () => {
        jest.spyOn(db, 'get').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.get('/tables/groups/test-id');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/조회 실패/);
    });

    it('POST /:tableName - 500: DB 오류', async () => {
        jest.spyOn(db, 'run').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.post('/tables/groups').send({ name: '테스트' });
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/생성 실패/);
    });

    it('PUT /:tableName/:id - 500: DB 오류', async () => {
        jest.spyOn(db, 'run').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.put('/tables/groups/test-id').send({ name: '이름' });
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/업데이트 실패/);
    });

    it('PATCH /:tableName/:id - 500: DB 오류', async () => {
        jest.spyOn(db, 'run').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.patch('/tables/groups/test-id').send({ name: '이름' });
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/패치 실패/);
    });

    it('DELETE /:tableName/:id - 500: DB 오류', async () => {
        jest.spyOn(db, 'run').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.delete('/tables/groups/test-id');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/삭제 실패/);
    });
});
