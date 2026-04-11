jest.mock('../../services/notify', () => ({
    initEmail: jest.fn(),
    sendLoginNotification: jest.fn().mockResolvedValue(undefined),
}));

const supertest = require('supertest');
const { createTestDb, cleanupTestDb } = require('../setup/test-db');
const { createTestApp } = require('../setup/test-app');
const { seedAdminUser, seedUser, loginAsAdmin, loginAsUser } = require('../setup/test-helpers');

let db, app;

beforeAll(async () => {
    db = await createTestDb();
    app = createTestApp(db);
});

afterEach(async () => {
    await cleanupTestDb(db);
});

afterAll(async () => {
    await db.close();
});

// ==================== POST /api/auth/login ====================

describe('POST /api/auth/login', () => {
    it('성공: 올바른 자격 증명으로 로그인', async () => {
        const admin = await seedAdminUser(db);

        const res = await supertest(app)
            .post('/api/auth/login')
            .send({ email: admin.email, password: admin.password });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            email: admin.email,
            name: admin.name,
            role: 'admin',
        });
        expect(res.body.id).toBeDefined();
        // 세션 쿠키 설정 확인
        expect(res.headers['set-cookie']).toBeDefined();
    });

    it('성공: 알림 발송 실패해도 로그인 성공 (notify .catch 분기)', async () => {
        const admin = await seedAdminUser(db);
        const notifyModule = require('../../services/notify');
        notifyModule.sendLoginNotification.mockRejectedValueOnce(new Error('SMTP error'));

        const res = await supertest(app)
            .post('/api/auth/login')
            .send({ email: admin.email, password: admin.password });

        expect(res.status).toBe(200);
        // .catch 콜백 실행 보장 (비동기 microtask)
        await new Promise(r => setTimeout(r, 20));
    });

    it('400: 이메일 누락', async () => {
        const res = await supertest(app)
            .post('/api/auth/login')
            .send({ password: 'something' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    it('400: 비밀번호 누락', async () => {
        const res = await supertest(app)
            .post('/api/auth/login')
            .send({ email: 'test@test.com' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    it('401: 존재하지 않는 이메일', async () => {
        const res = await supertest(app)
            .post('/api/auth/login')
            .send({ email: 'nobody@test.com', password: 'wrong' });

        expect(res.status).toBe(401);
    });

    it('401: 잘못된 비밀번호', async () => {
        await seedAdminUser(db);

        const res = await supertest(app)
            .post('/api/auth/login')
            .send({ email: 'admin@test.com', password: 'WrongPass1!' });

        expect(res.status).toBe(401);
    });

    it('403: 비활성 계정', async () => {
        await seedAdminUser(db, { is_active: 0 });

        const res = await supertest(app)
            .post('/api/auth/login')
            .send({ email: 'admin@test.com', password: 'Admin1234!' });

        expect(res.status).toBe(403);
        expect(res.body.error).toContain('비활성화');
    });
});

// ==================== POST /api/auth/logout ====================

describe('POST /api/auth/logout', () => {
    it('성공: 세션 파괴', async () => {
        const { agent } = await loginAsAdmin(app, db);

        const res = await agent.post('/api/auth/logout');
        expect(res.status).toBe(200);
        expect(res.body.message).toBeDefined();

        // 로그아웃 후 /me 접근 불가
        const meRes = await agent.get('/api/auth/me');
        expect(meRes.status).toBe(401);
    });
});

// ==================== GET /api/auth/me ====================

describe('GET /api/auth/me', () => {
    it('성공: 인증된 사용자 정보 반환', async () => {
        const { agent, admin } = await loginAsAdmin(app, db);

        const res = await agent.get('/api/auth/me');
        expect(res.status).toBe(200);
        expect(res.body.email).toBe(admin.email);
        expect(res.body.role).toBe('admin');
        // password_hash는 반환하지 않아야 함
        expect(res.body.password_hash).toBeUndefined();
    });

    it('401: 미인증 요청', async () => {
        const res = await supertest(app).get('/api/auth/me');
        expect(res.status).toBe(401);
    });

    it('401: 세션은 유효하나 DB에서 사용자가 삭제된 경우', async () => {
        const { agent, admin } = await loginAsAdmin(app, db);
        await db.run('DELETE FROM users WHERE id = ?', [admin.id]);

        const res = await agent.get('/api/auth/me');
        expect(res.status).toBe(401);
        expect(res.body.error).toContain('사용자를 찾을 수 없습니다');
    });
});

// ==================== GET /api/auth/users (Admin) ====================

describe('GET /api/auth/users', () => {
    it('성공: 관리자가 사용자 목록 조회', async () => {
        const { agent } = await loginAsAdmin(app, db);
        await seedUser(db, { email: 'extra@test.com' });

        const res = await agent.get('/api/auth/users');
        expect(res.status).toBe(200);
        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body.data.length).toBe(2); // admin + user
    });

    it('403: 일반 유저는 접근 불가', async () => {
        const { agent } = await loginAsUser(app, db);

        const res = await agent.get('/api/auth/users');
        expect(res.status).toBe(403);
    });

    it('401: 미인증 요청', async () => {
        const res = await supertest(app).get('/api/auth/users');
        expect(res.status).toBe(401);
    });
});

// ==================== POST /api/auth/users (Admin) ====================

describe('POST /api/auth/users', () => {
    it('성공: 관리자가 새 사용자 생성', async () => {
        const { agent } = await loginAsAdmin(app, db);

        const res = await agent
            .post('/api/auth/users')
            .send({ email: 'new@test.com', password: 'NewPass12!', name: '새유저', role: 'user' });

        expect(res.status).toBe(201);
        expect(res.body.email).toBe('new@test.com');
        expect(res.body.name).toBe('새유저');
        expect(res.body.role).toBe('user');
    });

    it('400: 필수 필드 누락', async () => {
        const { agent } = await loginAsAdmin(app, db);

        const res = await agent
            .post('/api/auth/users')
            .send({ email: 'x@test.com' }); // password, name 누락

        expect(res.status).toBe(400);
    });

    it('400: 비밀번호 8자 미만', async () => {
        const { agent } = await loginAsAdmin(app, db);

        const res = await agent
            .post('/api/auth/users')
            .send({ email: 'short@test.com', password: '1234567', name: 'Short' });

        expect(res.status).toBe(400);
    });

    it('409: 중복 이메일', async () => {
        const { agent } = await loginAsAdmin(app, db);
        await seedUser(db, { email: 'dup@test.com' });

        const res = await agent
            .post('/api/auth/users')
            .send({ email: 'dup@test.com', password: 'DupPass12!', name: 'Dup' });

        expect(res.status).toBe(409);
    });

    it('성공: role=admin으로 사용자 생성 (L402 ternary true 분기)', async () => {
        const { agent } = await loginAsAdmin(app, db);

        const res = await agent
            .post('/api/auth/users')
            .send({ email: 'admin2@test.com', password: 'AdminPass1!', name: '관리자2', role: 'admin' });

        expect(res.status).toBe(201);
        expect(res.body.role).toBe('admin');
    });

    it('403: 일반 유저는 생성 불가', async () => {
        const { agent } = await loginAsUser(app, db);

        const res = await agent
            .post('/api/auth/users')
            .send({ email: 'fail@test.com', password: 'FailPass1!', name: 'Fail' });

        expect(res.status).toBe(403);
    });
});

// ==================== PUT /api/auth/users/:id/password ====================

describe('PUT /api/auth/users/:id/password', () => {
    it('성공: 관리자가 비밀번호 변경', async () => {
        const { agent } = await loginAsAdmin(app, db);
        const user = await seedUser(db, { email: 'target@test.com' });

        const res = await agent
            .put(`/api/auth/users/${user.id}/password`)
            .send({ password: 'NewSecure1!' });

        expect(res.status).toBe(200);

        // 변경된 비밀번호로 로그인 확인
        const loginRes = await supertest(app)
            .post('/api/auth/login')
            .send({ email: 'target@test.com', password: 'NewSecure1!' });
        expect(loginRes.status).toBe(200);
    });

    it('400: 비밀번호 8자 미만', async () => {
        const { agent } = await loginAsAdmin(app, db);
        const user = await seedUser(db, { email: 'pw@test.com' });

        const res = await agent
            .put(`/api/auth/users/${user.id}/password`)
            .send({ password: 'short' });

        expect(res.status).toBe(400);
    });

    it('404: 존재하지 않는 사용자', async () => {
        const { agent } = await loginAsAdmin(app, db);

        const res = await agent
            .put('/api/auth/users/nonexistent-id/password')
            .send({ password: 'ValidPass1!' });

        expect(res.status).toBe(404);
    });
});

// ==================== PUT /api/auth/users/:id/toggle ====================

describe('PUT /api/auth/users/:id/toggle', () => {
    it('성공: 활성→비활성 토글', async () => {
        const { agent } = await loginAsAdmin(app, db);
        const user = await seedUser(db, { email: 'toggle@test.com' });

        const res = await agent.put(`/api/auth/users/${user.id}/toggle`);
        expect(res.status).toBe(200);
        expect(res.body.is_active).toBe(0);

        // 다시 토글: 비활성→활성
        const res2 = await agent.put(`/api/auth/users/${user.id}/toggle`);
        expect(res2.status).toBe(200);
        expect(res2.body.is_active).toBe(1);
    });

    it('404: 존재하지 않는 사용자', async () => {
        const { agent } = await loginAsAdmin(app, db);

        const res = await agent.put('/api/auth/users/nonexistent-id/toggle');
        expect(res.status).toBe(404);
    });
});

// ==================== DELETE /api/auth/users/:id ====================

describe('DELETE /api/auth/users/:id', () => {
    it('성공: 관리자가 다른 사용자 삭제', async () => {
        const { agent } = await loginAsAdmin(app, db);
        const user = await seedUser(db, { email: 'delete@test.com' });

        const res = await agent.delete(`/api/auth/users/${user.id}`);
        expect(res.status).toBe(200);

        // 삭제 확인
        const check = await db.get('SELECT * FROM users WHERE id = ?', [user.id]);
        expect(check).toBeUndefined();
    });

    it('400: 자기 자신 삭제 불가', async () => {
        const { agent, admin } = await loginAsAdmin(app, db);

        const res = await agent.delete(`/api/auth/users/${admin.id}`);
        expect(res.status).toBe(400);
    });

    it('404: 존재하지 않는 사용자', async () => {
        const { agent } = await loginAsAdmin(app, db);

        const res = await agent.delete('/api/auth/users/nonexistent-id');
        expect(res.status).toBe(404);
    });
});

// ==================== 500 에러 처리 ====================

describe('500 에러 처리', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('POST /login - 500: DB 오류', async () => {
        jest.spyOn(db, 'get').mockRejectedValueOnce(new Error('DB error'));
        const res = await supertest(app)
            .post('/api/auth/login')
            .send({ email: 'test@test.com', password: 'test1234' });
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/로그인 처리/);
    });

    it('GET /users - 500: requireAdmin DB 오류', async () => {
        const { agent } = await loginAsAdmin(app, db);
        jest.spyOn(db, 'get').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.get('/api/auth/users');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/서버 오류/);
    });

    it('PUT /:id/password - 500: DB 오류', async () => {
        const { agent } = await loginAsAdmin(app, db);
        const user = await seedUser(db, { email: 'pw500@test.com' });
        jest.spyOn(db, 'run').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent
            .put(`/api/auth/users/${user.id}/password`)
            .send({ password: 'Valid1234!' });
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/비밀번호 변경 실패/);
    });

    it('PUT /:id/toggle - 500: DB 오류', async () => {
        const { agent } = await loginAsAdmin(app, db);
        const user = await seedUser(db, { email: 'toggle500@test.com' });
        jest.spyOn(db, 'run').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.put(`/api/auth/users/${user.id}/toggle`);
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/계정 상태 변경 실패/);
    });

    it('DELETE /:id - 500: DB 오류', async () => {
        const { agent } = await loginAsAdmin(app, db);
        const user = await seedUser(db, { email: 'del500@test.com' });
        jest.spyOn(db, 'run').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.delete(`/api/auth/users/${user.id}`);
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/사용자 삭제 실패/);
    });
});

// ==================== test-helpers.js L44 is_active=0 분기 커버 ====================

describe('비활성 일반 유저 로그인 (test-helpers.js L44 분기)', () => {
    it('403: is_active=0인 일반 유저 로그인 시도 (seedUser L44 truthy 분기)', async () => {
        // seedUser(db, { is_active: 0 }) → L44 true: overrides.is_active !== undefined → 0 사용
        const user = await seedUser(db, { is_active: 0 });

        const res = await supertest(app)
            .post('/api/auth/login')
            .send({ email: user.email, password: user.password });

        expect(res.status).toBe(403);
        expect(res.body.error).toContain('비활성화');
    });
});

// ==================== auth.js L170-171 session.destroy 오류 분기 ====================

describe('POST /api/auth/logout - session.destroy 오류 분기 (L170-171)', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('500: MemoryStore.destroy 콜백에 오류 전달 → 500 응답 (L170-171 분기)', async () => {
        const { agent } = await loginAsAdmin(app, db);

        // MemoryStore.prototype.destroy를 에러로 호출하도록 모킹
        const session = require('express-session');
        const MemoryStore = session.MemoryStore;
        jest.spyOn(MemoryStore.prototype, 'destroy').mockImplementationOnce((sid, fn) => {
            fn(new Error('Session store error'));
        });

        const res = await agent.post('/api/auth/logout');
        expect(res.status).toBe(500);
        expect(res.body.error).toContain('로그아웃 처리');
    });
});
