jest.mock('../../services/notify', () => ({
    initEmail: jest.fn(),
    sendLoginNotification: jest.fn().mockResolvedValue(undefined),
}));

const supertest = require('supertest');
const { createTestDb, cleanupTestDb } = require('../setup/test-db');
const { createTestApp } = require('../setup/test-app');
const { loginAsAdmin, sampleFlightSchedule } = require('../setup/test-helpers');

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
        const res = await supertest(app).get('/api/flight-schedules');
        expect(res.status).toBe(401);
    });
});

// ==================== POST /api/flight-schedules ====================

describe('POST /api/flight-schedules', () => {
    it('성공: 스케줄 생성', async () => {
        const res = await agent
            .post('/api/flight-schedules')
            .send(sampleFlightSchedule());

        expect(res.status).toBe(201);
        expect(res.body.id).toBeDefined();
        expect(res.body.airline).toBe('대한항공');
        expect(res.body.flight_number).toBe('KE123');
        expect(res.body.passengers).toBe(20);
    });

    it('성공: flight_number 없이 생성', async () => {
        const res = await agent
            .post('/api/flight-schedules')
            .send(sampleFlightSchedule({ flight_number: undefined }));

        expect(res.status).toBe(201);
        expect(res.body.flight_number).toBeNull();
    });

    it('400: group_name 누락', async () => {
        const res = await agent
            .post('/api/flight-schedules')
            .send(sampleFlightSchedule({ group_name: '' }));

        expect(res.status).toBe(400);
        expect(res.body.details).toContain('group_name');
    });

    it('400: departure_date 누락', async () => {
        const res = await agent
            .post('/api/flight-schedules')
            .send(sampleFlightSchedule({ departure_date: undefined }));

        expect(res.status).toBe(400);
        expect(res.body.details).toContain('departure_date');
    });

    it('400: 필수 필드 (airline) 누락', async () => {
        const res = await agent
            .post('/api/flight-schedules')
            .send(sampleFlightSchedule({ airline: '' }));

        expect(res.status).toBe(400);
    });

    it('400: 잘못된 날짜 형식', async () => {
        const res = await agent
            .post('/api/flight-schedules')
            .send(sampleFlightSchedule({ departure_date: '2026/06/01' }));

        expect(res.status).toBe(400);
        expect(res.body.details).toContain('departure_date');
    });

    it('400: 잘못된 arrival_date 형식', async () => {
        const res = await agent
            .post('/api/flight-schedules')
            .send(sampleFlightSchedule({ arrival_date: '06/05/2026' }));

        expect(res.status).toBe(400);
        expect(res.body.details).toContain('arrival_date');
    });

    it('400: 잘못된 arrival_time 형식', async () => {
        const res = await agent
            .post('/api/flight-schedules')
            .send(sampleFlightSchedule({ arrival_time: '14:00:00' }));

        expect(res.status).toBe(400);
        expect(res.body.details).toContain('arrival_time');
    });

    it('400: 도착일 < 출발일', async () => {
        const res = await agent
            .post('/api/flight-schedules')
            .send(sampleFlightSchedule({
                departure_date: '2026-06-10',
                arrival_date: '2026-06-09',
            }));

        expect(res.status).toBe(400);
        expect(res.body.details).toContain('arrival_date');
    });

    it('400: 잘못된 시간 형식', async () => {
        const res = await agent
            .post('/api/flight-schedules')
            .send(sampleFlightSchedule({ departure_time: '10:00:00' }));

        expect(res.status).toBe(400);
        expect(res.body.details).toContain('departure_time');
    });

    it('400: 잘못된 편명 형식', async () => {
        const res = await agent
            .post('/api/flight-schedules')
            .send(sampleFlightSchedule({ flight_number: 'INVALID' }));

        expect(res.status).toBe(400);
        expect(res.body.details).toContain('flight_number');
    });

    it('성공: 다양한 유효한 편명', async () => {
        for (const fn of ['KE123', 'OZ456', 'TW7890', '7C100']) {
            const res = await agent
                .post('/api/flight-schedules')
                .send(sampleFlightSchedule({ flight_number: fn }));
            expect(res.status).toBe(201);
        }
    });
});

// ==================== GET /api/flight-schedules ====================

describe('GET /api/flight-schedules', () => {
    it('성공: 빈 목록', async () => {
        const res = await agent.get('/api/flight-schedules');
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
        expect(res.body.total).toBe(0);
    });

    it('성공: 페이지네이션', async () => {
        // 3개 생성
        for (let i = 0; i < 3; i++) {
            await agent.post('/api/flight-schedules').send(
                sampleFlightSchedule({ group_name: `그룹${i}` })
            );
        }

        const res = await agent.get('/api/flight-schedules?page=1&limit=2');
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(2);
        expect(res.body.total).toBe(3);
        expect(res.body.page).toBe(1);
        expect(res.body.limit).toBe(2);
    });

    it('성공: 날짜 필터링', async () => {
        await agent.post('/api/flight-schedules').send(
            sampleFlightSchedule({ departure_date: '2026-05-01', arrival_date: '2026-05-05' })
        );
        await agent.post('/api/flight-schedules').send(
            sampleFlightSchedule({ departure_date: '2026-07-01', arrival_date: '2026-07-05' })
        );

        const res = await agent.get('/api/flight-schedules?departure_date_from=2026-06-01');
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].departure_date).toBe('2026-07-01');
    });

    it('성공: group_id 필터링', async () => {
        await db.run("INSERT INTO groups (id, name) VALUES (?, ?)", ['g-filter', '필터단체']);
        await agent.post('/api/flight-schedules').send(
            sampleFlightSchedule({ group_name: '필터단체' })
        );
        await db.run(
            "UPDATE flight_schedules SET group_id = 'g-filter' WHERE group_name = '필터단체'"
        );
        await agent.post('/api/flight-schedules').send(
            sampleFlightSchedule({ group_name: '다른단체' })
        );

        const res = await agent.get('/api/flight-schedules?group_id=g-filter');
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].group_name).toBe('필터단체');
    });

    it('성공: departure_date_to 필터링', async () => {
        await agent.post('/api/flight-schedules').send(
            sampleFlightSchedule({ departure_date: '2026-03-01', arrival_date: '2026-03-05' })
        );
        await agent.post('/api/flight-schedules').send(
            sampleFlightSchedule({ departure_date: '2026-09-01', arrival_date: '2026-09-05' })
        );

        const res = await agent.get('/api/flight-schedules?departure_date_to=2026-06-01');
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].departure_date).toBe('2026-03-01');
    });
});

// ==================== GET /api/flight-schedules/:id ====================

describe('GET /api/flight-schedules/:id', () => {
    it('성공: 상세 조회', async () => {
        const created = await agent
            .post('/api/flight-schedules')
            .send(sampleFlightSchedule());

        const res = await agent.get(`/api/flight-schedules/${created.body.id}`);
        expect(res.status).toBe(200);
        expect(res.body.airline).toBe('대한항공');
    });

    it('404: 존재하지 않는 스케줄', async () => {
        const res = await agent.get('/api/flight-schedules/nonexistent');
        expect(res.status).toBe(404);
    });
});

// ==================== PUT /api/flight-schedules/:id ====================

describe('PUT /api/flight-schedules/:id', () => {
    it('성공: 부분 업데이트', async () => {
        const created = await agent
            .post('/api/flight-schedules')
            .send(sampleFlightSchedule());

        const res = await agent
            .put(`/api/flight-schedules/${created.body.id}`)
            .send({ airline: '아시아나', passengers: 30 });

        expect(res.status).toBe(200);
        expect(res.body.airline).toBe('아시아나');
        expect(res.body.passengers).toBe(30);
        // 변경하지 않은 필드는 유지
        expect(res.body.departure_airport).toBe('ICN');
    });

    it('400: 병합된 데이터에서 도착일 < 출발일', async () => {
        const created = await agent
            .post('/api/flight-schedules')
            .send(sampleFlightSchedule({
                departure_date: '2026-06-01',
                arrival_date: '2026-06-05',
            }));

        // 출발일을 도착일 이후로 변경
        const res = await agent
            .put(`/api/flight-schedules/${created.body.id}`)
            .send({ departure_date: '2026-06-10' });

        expect(res.status).toBe(400);
    });

    it('404: 존재하지 않는 스케줄', async () => {
        const res = await agent
            .put('/api/flight-schedules/nonexistent')
            .send({ airline: '제주항공' });

        expect(res.status).toBe(404);
    });

    it('400: 허용되지 않은 필드만 전송', async () => {
        const created = await agent
            .post('/api/flight-schedules')
            .send(sampleFlightSchedule());

        const res = await agent
            .put(`/api/flight-schedules/${created.body.id}`)
            .send({ id: 'hacked', created_at: '2000-01-01' });

        expect(res.status).toBe(400);
    });
});

// ==================== GET /api/flight-schedules/expired/count ====================

describe('GET /api/flight-schedules/expired/count', () => {
    it('성공: 만료된 스케줄 개수', async () => {
        // 과거 스케줄
        await db.run(
            `INSERT INTO flight_schedules (id, group_name, airline, departure_date, departure_airport, departure_time, arrival_date, arrival_airport, arrival_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['expired-1', '과거단체', '항공', '2020-01-01', 'ICN', '10:00', '2020-01-02', 'BKK', '14:00']
        );

        const res = await agent.get('/api/flight-schedules/expired/count');
        expect(res.status).toBe(200);
        expect(res.body.count).toBeGreaterThanOrEqual(1);
    });
});

// ==================== DELETE /api/flight-schedules/:id ====================

describe('DELETE /api/flight-schedules/:id', () => {
    it('성공: 204 반환', async () => {
        const created = await agent
            .post('/api/flight-schedules')
            .send(sampleFlightSchedule());

        const res = await agent.delete(`/api/flight-schedules/${created.body.id}`);
        expect(res.status).toBe(204);
    });

    it('404: 존재하지 않는 스케줄', async () => {
        const res = await agent.delete('/api/flight-schedules/nonexistent');
        expect(res.status).toBe(404);
    });
});

// ==================== DELETE /api/flight-schedules/cleanup/expired ====================

describe('DELETE /api/flight-schedules/cleanup/expired', () => {
    it('성공: 만료된 스케줄 없으면 deleted=0', async () => {
        const res = await agent.delete('/api/flight-schedules/cleanup/expired');
        expect(res.status).toBe(200);
        expect(res.body.deleted).toBe(0);
    });

    it('성공: 만료된 스케줄과 관련 인보이스 삭제', async () => {
        // 그룹 생성
        await db.run(
            "INSERT INTO groups (id, name) VALUES (?, ?)",
            ['g1', '만료단체']
        );

        // 과거 스케줄 (group_id 포함)
        await db.run(
            `INSERT INTO flight_schedules (id, group_id, group_name, airline, departure_date, departure_airport, departure_time, arrival_date, arrival_airport, arrival_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['fs-expired', 'g1', '만료단체', '항공', '2020-01-01', 'ICN', '10:00', '2020-01-02', 'BKK', '14:00']
        );

        // 관련 인보이스
        await db.run(
            `INSERT INTO invoices (id, invoice_number, recipient, invoice_date, total_amount, flight_schedule_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
            ['inv-1', 'INV-20200101-001', '테스트', '2020-01-01', 1000, 'fs-expired']
        );

        const res = await agent.delete('/api/flight-schedules/cleanup/expired');
        expect(res.status).toBe(200);
        expect(res.body.deleted.flightSchedules).toBeGreaterThanOrEqual(1);

        // 스케줄 삭제 확인
        const check = await db.get('SELECT * FROM flight_schedules WHERE id = ?', ['fs-expired']);
        expect(check).toBeUndefined();
    });
});

// ==================== 500 에러 처리 ====================

describe('500 에러 처리', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('GET /:id - 500: DB 오류', async () => {
        jest.spyOn(db, 'get').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.get('/api/flight-schedules/test-id');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/조회 실패/);
    });

    it('PUT /:id - 500: DB 오류', async () => {
        jest.spyOn(db, 'get').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.put('/api/flight-schedules/test-id').send({ airline: '항공' });
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/수정 실패/);
    });

    it('DELETE /cleanup/expired - 500: DB 오류', async () => {
        jest.spyOn(db, 'all').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.delete('/api/flight-schedules/cleanup/expired');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/정리 실패/);
    });

    it('DELETE /:id - 500: DB 오류', async () => {
        jest.spyOn(db, 'run').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.delete('/api/flight-schedules/test-id');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/삭제 실패/);
    });
});

// ==================== POST passengers || 0 falsy 분기 (L514) ====================

describe('POST passengers || 0 falsy 분기 (L514)', () => {
    it('성공: passengers 미제공 → 0으로 저장 (|| 0 falsy 분기)', async () => {
        const res = await agent
            .post('/api/flight-schedules')
            .send(sampleFlightSchedule({ passengers: undefined }));

        expect(res.status).toBe(201);
        expect(res.body.passengers).toBe(0);
    });
});

// ==================== validateFlightScheduleInput isNaN(Date.parse) 분기 (L41, L46) ====================

describe('validateFlightScheduleInput - isNaN(Date.parse) 분기 (L41, L46)', () => {
    it('400: departure_date 형식 맞지만 실제로 유효하지 않은 날짜 (L41 isNaN 분기)', async () => {
        // '2026-99-99'는 DATE_REGEX 통과, Date.parse = NaN → 두 번째 조건 발동
        const res = await agent
            .post('/api/flight-schedules')
            .send(sampleFlightSchedule({ departure_date: '2026-99-99' }));

        expect(res.status).toBe(400);
        expect(res.body.details).toContain('departure_date');
    });

    it('400: arrival_date 형식 맞지만 실제로 유효하지 않은 날짜 (L46 isNaN 분기)', async () => {
        // departure_date 유효, arrival_date='2026-99-99' → L46 isNaN 발동
        const res = await agent
            .post('/api/flight-schedules')
            .send(sampleFlightSchedule({ arrival_date: '2026-99-99' }));

        expect(res.status).toBe(400);
        expect(res.body.details).toContain('arrival_date');
    });
});

// ==================== cleanup/expired - filter(Boolean) null group_id 분기 (L759) ====================

describe('cleanup/expired - group_id null → filter(Boolean) 제거 (L759)', () => {
    it('성공: group_id 없는 만료 스케줄 → expiredGroupIds=[] (null이 filter(Boolean)로 제거됨)', async () => {
        await db.run(
            `INSERT INTO flight_schedules (id, group_name, airline, departure_date, departure_airport, departure_time, arrival_date, arrival_airport, arrival_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['no-group-expired', '그룹없음단체', '항공', '2020-01-01', 'ICN', '10:00', '2020-01-02', 'BKK', '14:00']
        );

        const res = await agent.delete('/api/flight-schedules/cleanup/expired');
        expect(res.status).toBe(200);
        expect(res.body.deleted.flightSchedules).toBeGreaterThanOrEqual(1);
        expect(res.body.expiredGroupIds).toEqual([]); // null이 filter(Boolean)로 제거
    });
});

// ==================== cleanup/expired - changes || 0 falsy 분기 (L773) ====================

describe('cleanup/expired - invoiceResult.changes || 0 falsy 분기 (L773)', () => {
    it('성공: group_id 있지만 관련 인보이스 없음 → deletedInvoices=0 (|| 0 falsy 분기)', async () => {
        await db.run("INSERT INTO groups (id, name) VALUES (?, ?)", ['g-no-inv', '인보이스없는단체']);
        await db.run(
            `INSERT INTO flight_schedules (id, group_id, group_name, airline, departure_date, departure_airport, departure_time, arrival_date, arrival_airport, arrival_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['fs-no-inv', 'g-no-inv', '인보이스없는단체', '항공', '2020-01-01', 'ICN', '10:00', '2020-01-02', 'BKK', '14:00']
        );
        // 인보이스 생성 안 함 → invoiceResult.changes=0 → 0||0=0 (falsy 분기 커버)

        const res = await agent.delete('/api/flight-schedules/cleanup/expired');
        expect(res.status).toBe(200);
        expect(res.body.deleted.invoices).toBe(0);
        expect(res.body.deleted.flightSchedules).toBeGreaterThanOrEqual(1);
    });
});

// ==================== 500 에러 처리 (GET, POST 추가) ====================

describe('500 에러 처리 (GET, POST 추가)', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('GET / - 500: DB 오류', async () => {
        jest.spyOn(db, 'get').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.get('/api/flight-schedules');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/조회 실패/);
    });

    it('GET /expired/count - 500: DB 오류', async () => {
        jest.spyOn(db, 'get').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.get('/api/flight-schedules/expired/count');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/조회 실패/);
    });

    it('POST / - 500: DB 오류', async () => {
        jest.spyOn(db, 'run').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.post('/api/flight-schedules').send(sampleFlightSchedule());
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/생성 실패/);
    });
});

// ==================== PUT validateFlightScheduleInput null/empty 분기 (L40, L45, L52, L60, L65 false) ====================

describe('PUT validateFlightScheduleInput — null/empty 분기 (L40, L45, L52, L60, L65 false)', () => {
    let scheduleId;

    beforeEach(async () => {
        const created = await agent.post('/api/flight-schedules').send(sampleFlightSchedule());
        scheduleId = created.body.id;
    });

    it('departure_date=null → L40 B-false, L52 A-false 분기 (NOT NULL 위반 → 500)', async () => {
        // null !== undefined = true, null !== null = false → L40 B-false (short-circuit)
        // L52: null && ... = false → L52 A-false
        const res = await agent
            .put(`/api/flight-schedules/${scheduleId}`)
            .send({ departure_date: null });
        expect(res.status).toBe(500); // SQLite NOT NULL constraint 위반
    });

    it('arrival_date=null → L45 B-false 분기 (NOT NULL 위반 → 500)', async () => {
        // null !== null = false → L45 B-false
        const res = await agent
            .put(`/api/flight-schedules/${scheduleId}`)
            .send({ arrival_date: null });
        expect(res.status).toBe(500);
    });

    it('departure_time="" → L60 C-false 분기 (빈 문자열 허용 → 200)', async () => {
        // '' !== '' = false → L60 C-false, TIME_REGEX 검증 생략, NOT NULL 허용
        const res = await agent
            .put(`/api/flight-schedules/${scheduleId}`)
            .send({ departure_time: '' });
        expect(res.status).toBe(200);
    });

    it('arrival_time="" → L65 C-false 분기 (빈 문자열 허용 → 200)', async () => {
        // '' !== '' = false → L65 C-false, TIME_REGEX 검증 생략
        const res = await agent
            .put(`/api/flight-schedules/${scheduleId}`)
            .send({ arrival_time: '' });
        expect(res.status).toBe(200);
    });
});

// ==================== getDb() _db=null → throw 분기 (L10) ====================

describe('getDb() _db=null → throw 분기 (L10 true 분기)', () => {
    it('500: DB 초기화 없이 요청 → getDb() throw → 500 (L10 true 분기)', async () => {
        await jest.isolateModules(async () => {
            const express = require('express');
            const st = require('supertest');
            const createRoutes = require('../../routes/flight-schedules');
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
