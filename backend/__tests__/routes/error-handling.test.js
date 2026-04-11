/**
 * Database Error Handling Tests
 * Tests that verify 500 error responses when database operations fail
 * in backend route handlers.
 */

jest.mock('../../services/notify', () => ({
    initEmail: jest.fn(),
    sendLoginNotification: jest.fn().mockResolvedValue(undefined),
}));

const { createTestDb, cleanupTestDb } = require('../setup/test-db');
const { createTestApp } = require('../setup/test-app');
const { loginAsAdmin, sampleFlightSchedule, sampleBankAccount, sampleInvoiceSimple } = require('../setup/test-helpers');

let db, app;

beforeAll(async () => {
    db = await createTestDb();
    app = createTestApp(db);
});

afterEach(async () => {
    await cleanupTestDb(db);
    jest.restoreAllMocks();
});

afterAll(async () => {
    await db.close();
});

// ==================== Auth Routes Error Handling ====================

describe('Auth Routes - Database Error Handling', () => {
    describe('GET /api/auth/me', () => {
        it('500 when db.get throws on user lookup', async () => {
            const { agent } = await loginAsAdmin(app, db);

            // After login succeeds, spy on db.get to throw on subsequent calls
            jest.spyOn(db, 'get').mockRejectedValueOnce(new Error('Database connection failed'));

            const res = await agent.get('/api/auth/me');

            expect(res.status).toBe(500);
            expect(res.body.error).toBeDefined();
            expect(res.body.error).toContain('오류');
        });
    });

    describe('GET /api/auth/users', () => {
        it('500 when db.all throws on users list', async () => {
            const { agent } = await loginAsAdmin(app, db);

            // After login succeeds, spy on db.all to throw on subsequent calls
            jest.spyOn(db, 'all').mockRejectedValueOnce(new Error('Query failed'));

            const res = await agent.get('/api/auth/users');

            expect(res.status).toBe(500);
            expect(res.body.error).toBeDefined();
        });
    });

    describe('POST /api/auth/users', () => {
        it('500 when db.run throws on user insert', async () => {
            const { agent } = await loginAsAdmin(app, db);

            // Mock db.run to throw on any call (covers both the GET check and INSERT)
            jest.spyOn(db, 'run').mockRejectedValueOnce(new Error('INSERT failed'));

            const res = await agent
                .post('/api/auth/users')
                .send({
                    email: 'newuser@test.com',
                    password: 'SecurePass1!',
                    name: 'New User',
                    role: 'user'
                });

            expect(res.status).toBe(500);
            expect(res.body.error).toBeDefined();
        });
    });
});

// ==================== Bank Accounts Routes Error Handling ====================

describe('Bank Accounts Routes - Database Error Handling', () => {
    describe('GET /api/bank-accounts', () => {
        it('500 when db.all throws on accounts list', async () => {
            const { agent } = await loginAsAdmin(app, db);

            jest.spyOn(db, 'all').mockRejectedValueOnce(new Error('Database error'));

            const res = await agent.get('/api/bank-accounts');

            expect(res.status).toBe(500);
            expect(res.body.error).toBeDefined();
            expect(res.body.error).toContain('실패');
        });
    });

    describe('POST /api/bank-accounts', () => {
        it('500 when db.run throws on account insert', async () => {
            const { agent } = await loginAsAdmin(app, db);

            jest.spyOn(db, 'run').mockRejectedValueOnce(new Error('INSERT failed'));

            const res = await agent
                .post('/api/bank-accounts')
                .send(sampleBankAccount());

            expect(res.status).toBe(500);
            expect(res.body.error).toBeDefined();
        });
    });
});

// ==================== Flight Schedules Routes Error Handling ====================

describe('Flight Schedules Routes - Database Error Handling', () => {
    describe('GET /api/flight-schedules', () => {
        it('500 when db.all throws on schedules list', async () => {
            const { agent } = await loginAsAdmin(app, db);

            jest.spyOn(db, 'all').mockRejectedValueOnce(new Error('Database error'));

            const res = await agent.get('/api/flight-schedules');

            expect(res.status).toBe(500);
            expect(res.body.error).toBeDefined();
            expect(res.body.error).toContain('실패');
        });
    });

    describe('POST /api/flight-schedules', () => {
        it('500 when db.run throws on schedule insert', async () => {
            const { agent } = await loginAsAdmin(app, db);

            jest.spyOn(db, 'run').mockRejectedValueOnce(new Error('INSERT failed'));

            const res = await agent
                .post('/api/flight-schedules')
                .send(sampleFlightSchedule());

            expect(res.status).toBe(500);
            expect(res.body.error).toBeDefined();
        });
    });
});

// ==================== Invoices Routes Error Handling ====================

describe('Invoices Routes - Database Error Handling', () => {
    describe('GET /api/invoices', () => {
        it('500 when db.all throws on invoices list', async () => {
            const { agent } = await loginAsAdmin(app, db);

            jest.spyOn(db, 'all').mockRejectedValueOnce(new Error('Database error'));

            const res = await agent.get('/api/invoices');

            expect(res.status).toBe(500);
            expect(res.body.error).toBeDefined();
            expect(res.body.error).toContain('실패');
        });
    });

    describe('POST /api/invoices', () => {
        it('500 when db.run throws on invoice insert', async () => {
            const { agent } = await loginAsAdmin(app, db);

            jest.spyOn(db, 'run').mockRejectedValueOnce(new Error('INSERT failed'));

            const res = await agent
                .post('/api/invoices')
                .send(sampleInvoiceSimple());

            expect(res.status).toBe(500);
            expect(res.body.error).toBeDefined();
        });
    });

    describe('GET /api/invoices/:id', () => {
        it('500 when db.get throws on invoice lookup', async () => {
            const { agent } = await loginAsAdmin(app, db);

            jest.spyOn(db, 'get').mockRejectedValueOnce(new Error('Query failed'));

            const res = await agent.get('/api/invoices/nonexistent-id');

            expect(res.status).toBe(500);
            expect(res.body.error).toBeDefined();
        });
    });
});

// ==================== Additional Error Scenarios ====================

describe('Error Handling - Edge Cases', () => {
    describe('Flight Schedules GET /expired/count', () => {
        it('500 when db.get throws on expired count', async () => {
            const { agent } = await loginAsAdmin(app, db);

            jest.spyOn(db, 'get').mockRejectedValueOnce(new Error('Query failed'));

            const res = await agent.get('/api/flight-schedules/expired/count');

            expect(res.status).toBe(500);
            expect(res.body.error).toBeDefined();
        });
    });

    describe('Bank Accounts GET /default', () => {
        it('500 when db.get throws on default account lookup', async () => {
            const { agent } = await loginAsAdmin(app, db);

            jest.spyOn(db, 'get').mockRejectedValueOnce(new Error('Query failed'));

            const res = await agent.get('/api/bank-accounts/default');

            expect(res.status).toBe(500);
            expect(res.body.error).toBeDefined();
        });
    });
});
