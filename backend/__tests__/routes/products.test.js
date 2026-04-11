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

// ==================== 헬퍼 ====================

async function seedProduct(overrides = {}) {
    const crypto = require('crypto');
    const id = crypto.randomUUID();
    const p = {
        name: '태국 방콕 4박5일',
        destination: '태국',
        duration: 5,
        price: 1500000,
        status: '활성',
        description: '테스트 상품',
        ...overrides,
    };
    await db.run(
        'INSERT INTO products (id, name, destination, duration, price, status, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, p.name, p.destination, p.duration, p.price, p.status, p.description]
    );
    return { id, ...p };
}

// ==================== 인증 체크 ====================

describe('인증 필요', () => {
    it('401: 미인증 요청은 거부', async () => {
        const res = await supertest(app).get('/api/products/match?destination=태국');
        expect(res.status).toBe(401);
    });
});

// ==================== GET /api/products/match ====================

describe('GET /api/products/match', () => {
    it('400: destination 파라미터 없음', async () => {
        const res = await agent.get('/api/products/match');
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/목적지/);
    });

    it('200: 정확한 매칭 → exact_match 반환', async () => {
        await seedProduct({ destination: '태국' });

        const res = await agent.get('/api/products/match?destination=태국');
        expect(res.status).toBe(200);
        expect(res.body.exact_match).toBeTruthy();
        expect(res.body.exact_match.destination).toBe('태국');
        expect(res.body.similar_matches).toHaveLength(0);
    });

    it('200: 유사 매칭 → similar_matches 반환', async () => {
        await seedProduct({ destination: '태국 방콕' });

        const res = await agent.get('/api/products/match?destination=방콕');
        expect(res.status).toBe(200);
        expect(res.body.exact_match).toBeNull();
        expect(res.body.similar_matches.length).toBeGreaterThan(0);
    });

    it('200: 유사 매칭 결과에 similarity 점수 포함', async () => {
        await seedProduct({ destination: '베트남 하노이' });

        const res = await agent.get('/api/products/match?destination=하노이');
        expect(res.status).toBe(200);
        if (res.body.similar_matches.length > 0) {
            expect(res.body.similar_matches[0]).toHaveProperty('similarity');
            expect(res.body.similar_matches[0].similarity).toBeGreaterThan(0);
        }
    });

    it('200: 매칭 없음 → exact_match null, similar_matches 빈 배열, message 포함', async () => {
        const res = await agent.get('/api/products/match?destination=존재하지않는여행지');
        expect(res.status).toBe(200);
        expect(res.body.exact_match).toBeNull();
        expect(res.body.similar_matches).toHaveLength(0);
        expect(res.body.message).toBeDefined();
    });

    it('200: 비활성 상품은 결과에서 제외', async () => {
        await seedProduct({ destination: '일본', status: '비활성' });

        const res = await agent.get('/api/products/match?destination=일본');
        expect(res.status).toBe(200);
        expect(res.body.exact_match).toBeNull();
    });

    it('200: 유사 매칭 2개 이상 → sort 비교함수 호출 (80% Funcs → 100%)', async () => {
        await seedProduct({ destination: '방콕 패키지', name: '방콕 패키지 여행' });
        await seedProduct({ destination: '방콕 투어', name: '방콕 투어 여행' });

        const res = await agent.get('/api/products/match?destination=방콕');
        expect(res.status).toBe(200);
        expect(res.body.exact_match).toBeNull();
        expect(res.body.similar_matches.length).toBeGreaterThanOrEqual(2);
        // sort comparator (a, b) => b.similarity - a.similarity 호출됨 → 유사도 내림차순 확인
        const scores = res.body.similar_matches.map(p => p.similarity);
        for (let i = 0; i < scores.length - 1; i++) {
            expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
        }
    });

    it('200: 정확한 매칭이 있으면 유사 매칭 검색하지 않음', async () => {
        await seedProduct({ destination: '제주도' });
        await seedProduct({ destination: '제주도 서귀포', name: '제주도 서귀포 상품' });

        const res = await agent.get('/api/products/match?destination=제주도');
        expect(res.status).toBe(200);
        expect(res.body.exact_match).toBeTruthy();
        expect(res.body.similar_matches).toHaveLength(0);
    });
});

// ==================== 500 에러 처리 ====================

describe('500 에러 처리', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('GET /match - 500: DB 오류', async () => {
        jest.spyOn(db, 'get').mockRejectedValueOnce(new Error('DB error'));
        const res = await agent.get('/api/products/match?destination=태국');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/상품 매칭 실패/);
    });
});
