const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const supertest = require('supertest');

const TEST_BCRYPT_ROUNDS = 4; // 테스트 속도를 위해 낮은 rounds

// ==================== 사용자 시드 데이터 ====================

async function seedAdminUser(db, overrides = {}) {
    const id = overrides.id || crypto.randomUUID();
    const password = overrides.password || 'Admin1234!';
    const hash = await bcrypt.hash(password, TEST_BCRYPT_ROUNDS);

    await db.run(
        'INSERT INTO users (id, email, password_hash, name, provider, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
            id,
            overrides.email || 'admin@test.com',
            hash,
            overrides.name || 'Admin',
            'local',
            'admin',
            overrides.is_active !== undefined ? overrides.is_active : 1,
        ]
    );

    return { id, email: overrides.email || 'admin@test.com', password, name: overrides.name || 'Admin' };
}

async function seedUser(db, overrides = {}) {
    const id = overrides.id || crypto.randomUUID();
    const password = overrides.password || 'User1234!';
    const hash = await bcrypt.hash(password, TEST_BCRYPT_ROUNDS);

    await db.run(
        'INSERT INTO users (id, email, password_hash, name, provider, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
            id,
            overrides.email || 'user@test.com',
            hash,
            overrides.name || 'TestUser',
            'local',
            'user',
            overrides.is_active !== undefined ? overrides.is_active : 1,
        ]
    );

    return { id, email: overrides.email || 'user@test.com', password, name: overrides.name || 'TestUser' };
}

// ==================== 로그인 헬퍼 ====================

/**
 * 관리자로 로그인한 supertest agent 반환
 * agent는 쿠키(세션)를 자동 유지
 */
async function loginAsAdmin(app, db) {
    const admin = await seedAdminUser(db);
    const agent = supertest.agent(app);
    await agent
        .post('/api/auth/login')
        .send({ email: admin.email, password: admin.password })
        .expect(200);
    return { agent, admin };
}

/**
 * 일반 유저로 로그인한 supertest agent 반환
 */
async function loginAsUser(app, db) {
    const user = await seedUser(db);
    const agent = supertest.agent(app);
    await agent
        .post('/api/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);
    return { agent, user };
}

// ==================== 샘플 데이터 팩토리 ====================

function sampleFlightSchedule(overrides = {}) {
    return {
        group_name: '테스트단체',
        airline: '대한항공',
        flight_number: 'KE123',
        departure_date: '2026-06-01',
        departure_airport: 'ICN',
        departure_time: '10:00',
        arrival_date: '2026-06-01',
        arrival_airport: 'BKK',
        arrival_time: '14:00',
        passengers: 20,
        ...overrides,
    };
}

function sampleBankAccount(overrides = {}) {
    return {
        bank_name: '국민은행',
        account_number: '123-456-789',
        account_holder: '홍길동',
        ...overrides,
    };
}

function sampleInvoiceSimple(overrides = {}) {
    return {
        recipient: '테스트여행사',
        invoice_date: '2026-03-01',
        description: '테스트 인보이스',
        calculation_mode: 'simple',
        airfare_unit_price: 500000,
        airfare_quantity: 10,
        seat_preference_unit_price: 50000,
        seat_preference_quantity: 5,
        ...overrides,
    };
}

function sampleInvoiceAdvanced(overrides = {}) {
    return {
        recipient: '고급여행사',
        invoice_date: '2026-03-01',
        description: '고급 인보이스',
        calculation_mode: 'advanced',
        base_price_per_person: 1500000,
        total_participants: 20,
        total_travel_cost: 30000000,
        deposit_amount: 10000000,
        deposit_description: '계약금',
        additional_items: [
            { name: '관광버스', amount: 500000 },
            { name: '가이드비', amount: 300000 },
        ],
        balance_due: 20800000,
        ...overrides,
    };
}

function sampleCostCalculation(overrides = {}) {
    return {
        name: '태국 방콕 4박5일',
        destination: '태국',
        departure_date: '2026-06-01',
        arrival_date: '2026-06-05',
        nights: 4,
        days: 5,
        adults: 20,
        children: 2,
        infants: 0,
        tc: 1,
        ...overrides,
    };
}

function sampleSchedule(overrides = {}) {
    return {
        group_name: '테스트단체',
        event_date: '2026-06-15',
        location: '방콕',
        transport: '버스',
        time: '09:00',
        schedule: '왓포 사원 관람',
        meals: '조식',
        color: '#7B61FF',
        ...overrides,
    };
}

function sampleMember(overrides = {}) {
    return {
        nameKor: '홍길동',
        nameEn: 'HONG GILDONG',
        passportNo: 'M12345678',
        birthDate: '1990-01-15',
        passportExpire: '2030-12-31',
        phone: '010-1234-5678',
        gender: 'M',
        ...overrides,
    };
}

module.exports = {
    seedAdminUser,
    seedUser,
    loginAsAdmin,
    loginAsUser,
    sampleFlightSchedule,
    sampleBankAccount,
    sampleInvoiceSimple,
    sampleInvoiceAdvanced,
    sampleSchedule,
    sampleCostCalculation,
    sampleMember,
};
