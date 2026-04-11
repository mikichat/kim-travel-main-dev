jest.mock('../../services/notify', () => ({
    initEmail: jest.fn(),
    sendLoginNotification: jest.fn().mockResolvedValue(undefined),
}));

const supertest = require('supertest');
const { createTestDb, cleanupTestDb } = require('../setup/test-db');
const { createTestApp } = require('../setup/test-app');
const { loginAsAdmin, sampleSchedule } = require('../setup/test-helpers');

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
        const res = await supertest(app).get('/api/schedules');
        expect(res.status).toBe(401);
    });
});

// ==================== POST /api/schedules ====================

describe('POST /api/schedules', () => {
    it('성공: 일정 생성', async () => {
        const res = await agent
            .post('/api/schedules')
            .send(sampleSchedule());

        expect(res.status).toBe(201);
        expect(res.body.id).toBeDefined();
        expect(res.body.schedule).toBe('왓포 사원 관람');
        expect(res.body.group_name).toBe('테스트단체');
        expect(res.body.event_date).toBe('2026-06-15');
    });

    it('성공: 선택 필드 없이 생성 (schedule만 필수)', async () => {
        const res = await agent
            .post('/api/schedules')
            .send({ schedule: '자유 시간' });

        expect(res.status).toBe(201);
        expect(res.body.schedule).toBe('자유 시간');
        expect(res.body.color).toBe('#7B61FF'); // DEFAULT_SCHEDULE_COLOR 적용
    });

    it('400: schedule 누락', async () => {
        const res = await agent
            .post('/api/schedules')
            .send(sampleSchedule({ schedule: undefined }));

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('일정');
    });
});

// ==================== GET /api/schedules ====================

describe('GET /api/schedules', () => {
    it('성공: 전체 목록 조회', async () => {
        await agent.post('/api/schedules').send(sampleSchedule());
        await agent.post('/api/schedules').send(sampleSchedule({ schedule: '두 번째 일정' }));

        const res = await agent.get('/api/schedules');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(2);
    });

    it('성공: group 쿼리로 필터링', async () => {
        await agent.post('/api/schedules').send(sampleSchedule({ group_name: '그룹A' }));
        await agent.post('/api/schedules').send(sampleSchedule({ group_name: '그룹B' }));

        const res = await agent.get('/api/schedules?group=그룹A');

        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);
        expect(res.body[0].group_name).toBe('그룹A');
    });

    it('성공: 데이터 없으면 빈 배열', async () => {
        const res = await agent.get('/api/schedules');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
});

// ==================== GET /api/schedules/:id ====================

describe('GET /api/schedules/:id', () => {
    it('성공: 특정 일정 조회', async () => {
        const created = await agent
            .post('/api/schedules')
            .send(sampleSchedule());
        const id = created.body.id;

        const res = await agent.get(`/api/schedules/${id}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(id);
        expect(res.body.schedule).toBe('왓포 사원 관람');
    });

    it('404: 존재하지 않는 id', async () => {
        const res = await agent.get('/api/schedules/999999');

        expect(res.status).toBe(404);
        expect(res.body.error).toContain('찾을 수 없습니다');
    });
});

// ==================== GET /api/schedules/date/:date ====================

describe('GET /api/schedules/date/:date', () => {
    it('성공: 특정 날짜 일정 조회', async () => {
        await agent.post('/api/schedules').send(sampleSchedule({ event_date: '2026-06-15' }));
        await agent.post('/api/schedules').send(sampleSchedule({ event_date: '2026-06-16' }));

        const res = await agent.get('/api/schedules/date/2026-06-15');

        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);
        expect(res.body[0].event_date).toBe('2026-06-15');
    });

    it('성공: 해당 날짜 없으면 빈 배열', async () => {
        const res = await agent.get('/api/schedules/date/2099-01-01');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
});

// ==================== PUT /api/schedules/:id ====================

describe('PUT /api/schedules/:id', () => {
    it('성공: 일정 수정', async () => {
        const created = await agent
            .post('/api/schedules')
            .send(sampleSchedule());
        const id = created.body.id;

        const res = await agent
            .put(`/api/schedules/${id}`)
            .send({ ...sampleSchedule(), schedule: '수정된 일정', location: '치앙마이' });

        expect(res.status).toBe(200);
        expect(res.body.schedule).toBe('수정된 일정');
        expect(res.body.location).toBe('치앙마이');
    });

    it('400: schedule 누락', async () => {
        const created = await agent
            .post('/api/schedules')
            .send(sampleSchedule());
        const id = created.body.id;

        const res = await agent
            .put(`/api/schedules/${id}`)
            .send({ location: '방콕' }); // schedule 없음

        expect(res.status).toBe(400);
    });

    it('404: 존재하지 않는 id', async () => {
        const res = await agent
            .put('/api/schedules/999999')
            .send(sampleSchedule());

        expect(res.status).toBe(404);
    });

    it('성공: 선택 필드 없이 수정 — || null 분기 커버', async () => {
        const created = await agent.post('/api/schedules').send(sampleSchedule());
        const id = created.body.id;

        const res = await agent
            .put(`/api/schedules/${id}`)
            .send({ schedule: '최소 수정' });

        expect(res.status).toBe(200);
        expect(res.body.schedule).toBe('최소 수정');
        expect(res.body.group_name).toBeNull();
        expect(res.body.event_date).toBeNull();
        expect(res.body.color).toBe('#7B61FF'); // DEFAULT_SCHEDULE_COLOR
    });
});

// ==================== DELETE /api/schedules/:id ====================

describe('DELETE /api/schedules/:id', () => {
    it('성공: 일정 삭제', async () => {
        const created = await agent
            .post('/api/schedules')
            .send(sampleSchedule());
        const id = created.body.id;

        const res = await agent.delete(`/api/schedules/${id}`);

        expect(res.status).toBe(204);

        const check = await agent.get(`/api/schedules/${id}`);
        expect(check.status).toBe(404);
    });

    it('404: 존재하지 않는 id', async () => {
        const res = await agent.delete('/api/schedules/999999');

        expect(res.status).toBe(404);
    });
});

// ==================== GET /api/schedules/export ====================

describe('GET /api/schedules/export', () => {
    it('성공: xlsx 파일 다운로드', async () => {
        await agent.post('/api/schedules').send(sampleSchedule());

        const res = await agent.get('/api/schedules/export');

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
        expect(res.headers['content-disposition']).toContain('.xlsx');
    });

    it('성공: group_name으로 필터링 내보내기', async () => {
        await agent.post('/api/schedules').send(sampleSchedule({ group_name: '수출단체' }));

        const res = await agent.get('/api/schedules/export?group_name=수출단체');

        expect(res.status).toBe(200);
        expect(res.headers['content-disposition']).toContain('schedules.xlsx');
    });

    it('404: 내보낼 데이터 없음', async () => {
        const res = await agent.get('/api/schedules/export');

        expect(res.status).toBe(404);
        expect(res.body.error).toContain('내보낼 데이터가 없습니다');
    });
});

// ==================== 500 에러 처리 ====================

describe('500 에러 처리', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('GET / - 500: DB 오류', async () => {
        jest.spyOn(db, 'all').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.get('/api/schedules');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/조회 실패/);
    });

    it('GET /date/:date - 500: DB 오류', async () => {
        jest.spyOn(db, 'all').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.get('/api/schedules/date/2026-06-15');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/조회 실패/);
    });

    it('GET /export - 500: DB 오류', async () => {
        jest.spyOn(db, 'all').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.get('/api/schedules/export');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/생성 실패/);
    });

    it('POST / - 500: DB 오류', async () => {
        jest.spyOn(db, 'run').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.post('/api/schedules').send(sampleSchedule());
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/추가 실패/);
    });

    it('GET /:id - 500: DB 오류', async () => {
        jest.spyOn(db, 'get').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.get('/api/schedules/999');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/조회 실패/);
    });

    it('PUT /:id - 500: DB 오류', async () => {
        jest.spyOn(db, 'run').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.put('/api/schedules/999').send(sampleSchedule());
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/수정 실패/);
    });

    it('DELETE /:id - 500: DB 오류', async () => {
        jest.spyOn(db, 'run').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.delete('/api/schedules/999');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/삭제 실패/);
    });
});
