jest.mock('../../services/notify', () => ({
    initEmail: jest.fn(),
    sendLoginNotification: jest.fn().mockResolvedValue(undefined),
}));

const supertest = require('supertest');
const { createTestDb, cleanupTestDb } = require('../setup/test-db');
const { createTestApp } = require('../setup/test-app');
const { loginAsAdmin, sampleBankAccount } = require('../setup/test-helpers');

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
        const res = await supertest(app).get('/api/bank-accounts');
        expect(res.status).toBe(401);
    });
});

// ==================== GET /api/bank-accounts ====================

describe('GET /api/bank-accounts', () => {
    it('성공: 빈 목록 반환', async () => {
        const res = await agent.get('/api/bank-accounts');
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
    });

    it('성공: 여러 계좌 반환 (기본 계좌 우선 정렬)', async () => {
        await agent.post('/api/bank-accounts').send(sampleBankAccount());
        await agent.post('/api/bank-accounts').send(sampleBankAccount({
            bank_name: '신한은행',
            account_number: '999-888-777',
            is_default: true,
        }));

        const res = await agent.get('/api/bank-accounts');
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(2);
        // 기본 계좌가 먼저
        expect(res.body.data[0].is_default).toBe(1);
    });
});

// ==================== GET /api/bank-accounts/default ====================

describe('GET /api/bank-accounts/default', () => {
    it('404: 기본 계좌 없음', async () => {
        const res = await agent.get('/api/bank-accounts/default');
        expect(res.status).toBe(404);
    });

    it('성공: 기본 계좌 반환', async () => {
        await agent.post('/api/bank-accounts').send(sampleBankAccount({ is_default: true }));

        const res = await agent.get('/api/bank-accounts/default');
        expect(res.status).toBe(200);
        expect(res.body.is_default).toBe(1);
        expect(res.body.bank_name).toBe('국민은행');
    });
});

// ==================== POST /api/bank-accounts ====================

describe('POST /api/bank-accounts', () => {
    it('성공: 계좌 생성', async () => {
        const res = await agent
            .post('/api/bank-accounts')
            .send(sampleBankAccount());

        expect(res.status).toBe(201);
        expect(res.body.id).toBeDefined();
        expect(res.body.bank_name).toBe('국민은행');
        expect(res.body.account_number).toBe('123-456-789');
        expect(res.body.is_default).toBe(0);
    });

    it('성공: 기본 계좌로 생성 시 기존 기본 계좌 해제', async () => {
        // 첫 번째 계좌를 기본으로
        const first = await agent
            .post('/api/bank-accounts')
            .send(sampleBankAccount({ is_default: true }));
        expect(first.body.is_default).toBe(1);

        // 두 번째 계좌를 기본으로 → 첫 번째 해제
        const second = await agent
            .post('/api/bank-accounts')
            .send(sampleBankAccount({
                bank_name: '신한은행',
                account_number: '111-222-333',
                is_default: true,
            }));
        expect(second.body.is_default).toBe(1);

        // 첫 번째 계좌 확인
        const check = await db.get('SELECT is_default FROM bank_accounts WHERE id = ?', [first.body.id]);
        expect(check.is_default).toBe(0);
    });

    it('400: 필수 필드 누락 (bank_name)', async () => {
        const res = await agent
            .post('/api/bank-accounts')
            .send({ account_number: '123', account_holder: '홍' });

        expect(res.status).toBe(400);
    });

    it('400: 필수 필드 누락 (account_number)', async () => {
        const res = await agent
            .post('/api/bank-accounts')
            .send({ bank_name: '은행', account_holder: '홍' });

        expect(res.status).toBe(400);
    });

    it('400: 필수 필드 누락 (account_holder)', async () => {
        const res = await agent
            .post('/api/bank-accounts')
            .send({ bank_name: '은행', account_number: '123' });

        expect(res.status).toBe(400);
    });

    it('400: bank_name 100자 초과', async () => {
        const res = await agent
            .post('/api/bank-accounts')
            .send({ bank_name: 'a'.repeat(101), account_number: '123-456', account_holder: '홍길동' });

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('100자');
    });
});

// ==================== PUT /api/bank-accounts/:id ====================

describe('PUT /api/bank-accounts/:id', () => {
    it('성공: 계좌 수정', async () => {
        const created = await agent
            .post('/api/bank-accounts')
            .send(sampleBankAccount());

        const res = await agent
            .put(`/api/bank-accounts/${created.body.id}`)
            .send({ bank_name: '하나은행', account_number: '555-666-777' });

        expect(res.status).toBe(200);
        expect(res.body.bank_name).toBe('하나은행');
        expect(res.body.account_number).toBe('555-666-777');
        // 변경하지 않은 필드는 유지
        expect(res.body.account_holder).toBe('홍길동');
    });

    it('404: 존재하지 않는 계좌', async () => {
        const res = await agent
            .put('/api/bank-accounts/nonexistent')
            .send({ bank_name: '은행' });

        expect(res.status).toBe(404);
    });

    it('400: 허용되지 않은 필드만 전송', async () => {
        const created = await agent
            .post('/api/bank-accounts')
            .send(sampleBankAccount());

        const res = await agent
            .put(`/api/bank-accounts/${created.body.id}`)
            .send({ id: 'hacked', created_at: '2000-01-01' });

        expect(res.status).toBe(400);
    });

    it('성공: is_default=true로 수정 시 기존 기본 계좌 해제', async () => {
        const first = await agent.post('/api/bank-accounts').send(sampleBankAccount({ is_default: true }));
        const second = await agent.post('/api/bank-accounts').send(sampleBankAccount({
            bank_name: '신한은행',
            account_number: '999-888-777',
        }));

        const res = await agent
            .put(`/api/bank-accounts/${second.body.id}`)
            .send({ is_default: true });

        expect(res.status).toBe(200);
        expect(res.body.is_default).toBe(1);

        const checkFirst = await db.get('SELECT is_default FROM bank_accounts WHERE id = ?', [first.body.id]);
        expect(checkFirst.is_default).toBe(0);
    });

    it('400: bank_name 100자 초과 수정', async () => {
        const created = await agent.post('/api/bank-accounts').send(sampleBankAccount());

        const res = await agent
            .put(`/api/bank-accounts/${created.body.id}`)
            .send({ bank_name: 'b'.repeat(101) });

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('100자');
    });
});

// ==================== PUT /api/bank-accounts/:id/set-default ====================

describe('PUT /api/bank-accounts/:id/set-default', () => {
    it('성공: 기본 계좌 설정', async () => {
        const a = await agent.post('/api/bank-accounts').send(sampleBankAccount({ is_default: true }));
        const b = await agent.post('/api/bank-accounts').send(sampleBankAccount({
            bank_name: '우리은행',
            account_number: '777-888',
        }));

        // b를 기본 계좌로
        const res = await agent.put(`/api/bank-accounts/${b.body.id}/set-default`);
        expect(res.status).toBe(200);
        expect(res.body.is_default).toBe(1);

        // a는 해제됨
        const checkA = await db.get('SELECT is_default FROM bank_accounts WHERE id = ?', [a.body.id]);
        expect(checkA.is_default).toBe(0);
    });

    it('404: 존재하지 않는 계좌', async () => {
        const res = await agent.put('/api/bank-accounts/nonexistent/set-default');
        expect(res.status).toBe(404);
    });
});

// ==================== DELETE /api/bank-accounts/:id ====================

describe('DELETE /api/bank-accounts/:id', () => {
    it('성공: 204 반환', async () => {
        const created = await agent
            .post('/api/bank-accounts')
            .send(sampleBankAccount());

        const res = await agent.delete(`/api/bank-accounts/${created.body.id}`);
        expect(res.status).toBe(204);

        // 삭제 확인
        const check = await db.get('SELECT * FROM bank_accounts WHERE id = ?', [created.body.id]);
        expect(check).toBeUndefined();
    });

    it('404: 존재하지 않는 계좌', async () => {
        const res = await agent.delete('/api/bank-accounts/nonexistent');
        expect(res.status).toBe(404);
    });
});

// ==================== 500 에러 처리 (lines 337-338, 396-397, 444-445) ====================

describe('500 에러 처리', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('PUT /:id - 500: DB 오류', async () => {
        jest.spyOn(db, 'get').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.put('/api/bank-accounts/test-id').send({ bank_name: '신한은행' });
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/수정 실패/);
    });

    it('PUT /:id/set-default - 500: DB 오류', async () => {
        jest.spyOn(db, 'get').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.put('/api/bank-accounts/test-id/set-default');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/설정 실패/);
    });

    it('DELETE /:id - 500: DB 오류', async () => {
        jest.spyOn(db, 'run').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.delete('/api/bank-accounts/test-id');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/삭제 실패/);
    });
});

// ==================== getDb() _db=null → throw 분기 (L51) ====================

describe('getDb() _db=null → throw 분기 (L51 true 분기)', () => {
    it('500: DB 초기화 없이 요청 → getDb() throw → 500 (L51 true 분기)', async () => {
        await jest.isolateModules(async () => {
            const express = require('express');
            const st = require('supertest');
            const createRoutes = require('../../routes/bank-accounts');
            // factory에 null 전달 → _db = null (격리된 모듈 인스턴스)
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
