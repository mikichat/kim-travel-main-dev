const express = require('express');
const session = require('express-session');

/**
 * 테스트용 Express 앱 팩토리
 * 프로덕션 server.js의 미들웨어 스택을 재현하되,
 * MemoryStore 세션 + in-memory DB 사용
 */
function createTestApp(db) {
    const app = express();

    // JSON body parser
    app.use(express.json({ limit: '10mb' }));

    // 세션: MemoryStore (파일 생성 방지)
    app.use(session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false },
    }));

    // Auth 라우터 (인증 불필요 — 프로덕션과 동일)
    const { router: authRouter, setDb: setAuthDb } = require('../../routes/auth');
    setAuthDb(db);
    app.use('/api/auth', authRouter);

    // requireAuth 미들웨어 (프로덕션과 동일)
    const { requireAuth } = require('../../middleware/auth');
    app.use(requireAuth);

    // 인증 필요한 라우터들
    const createBankAccountRoutes = require('../../routes/bank-accounts');
    const createFlightScheduleRoutes = require('../../routes/flight-schedules');
    const createInvoiceRoutes = require('../../routes/invoices');
    const createScheduleRoutes = require('../../routes/schedules');
    const createCostCalculationRoutes = require('../../routes/cost-calculations');
    const createTableRoutes = require('../../routes/tables');
    const createBackupRoutes = require('../../routes/backup');
    const createSyncRoutes = require('../../routes/sync');
    const createProductRoutes = require('../../routes/products');

    app.use('/api/bank-accounts', createBankAccountRoutes(db));
    app.use('/api/flight-schedules', createFlightScheduleRoutes(db));
    app.use('/api/invoices', createInvoiceRoutes(db));
    app.use('/api/schedules', createScheduleRoutes(db));
    app.use('/api/cost-calculations', createCostCalculationRoutes(db));
    app.use('/tables', createTableRoutes(db));
    app.use('/api/backup', createBackupRoutes(db));
    app.use('/api/sync', createSyncRoutes(db));
    app.use('/api/products', createProductRoutes(db));

    return app;
}

module.exports = { createTestApp };
