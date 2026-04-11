const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const crypto = require('crypto');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const { initializeDatabase } = require('./database');
const { requireAuth } = require('./middleware/auth');
const { router: authRouter, setDb: setAuthDb } = require('./routes/auth');
const { initEmail } = require('./services/notify');

const path = require('path');
const fs = require('fs');
require('sqlite3').verbose();
require('dotenv').config();
const logger = require('./logger');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

// @TASK T8.2 - 글로벌 프로세스 에러 핸들러
// unhandledRejection: 로그만 찍고 서버 계속 실행 (개별 요청 실패일 수 있으므로)
process.on('unhandledRejection', (reason, _promise) => {
    logger.error('처리되지 않은 Promise 거부:', reason);
});

// uncaughtException: 로그 후 프로세스 종료 (복구 불가능한 상태이므로)
process.on('uncaughtException', (error) => {
    logger.error('처리되지 않은 예외:', error);
    process.exit(1);
});

const app = express();
// 포트 설정: 환경 변수에서 가져오거나 기본값 5000 사용
const port = process.env.PORT || 5000;

// 전역 데이터베이스 인스턴스
let dbInstance = null;


// --- 서버 시작 전 ENV 유효성 검사 ---
function validateEnvironment() {
    const warnings = [];
    if (!process.env.GEMINI_API_KEY) {
        warnings.push('GEMINI_API_KEY가 설정되지 않았습니다. 파일 업로드 기능이 작동하지 않습니다.');
    }
    if (!process.env.SESSION_SECRET) {
        warnings.push('SESSION_SECRET이 설정되지 않았습니다. 서버 재시작 시 기존 세션이 무효화됩니다.');
    }
    if (!process.env.ADMIN_PASSWORD) {
        warnings.push('ADMIN_PASSWORD가 설정되지 않았습니다. 로그인이 불가능합니다.');
    }
    if (warnings.length > 0) {
        logger.warn('환경 변수 경고:');
        warnings.forEach(w => logger.warn(`   - ${w}`));
    }
    return warnings;
}
validateEnvironment();

// --- 간단한 인메모리 Rate Limiter ---
function createRateLimiter(windowMs, maxRequests) {
    const requests = new Map();
    // 주기적으로 만료된 항목 정리
    const cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, data] of requests) {
            if (now - data.start > windowMs) requests.delete(key);
        }
    }, windowMs);
    cleanupInterval.unref(); // 서버 종료 시 이벤트 루프 블로킹 방지

    const limiter = (req, res, next) => {
        const key = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const record = requests.get(key);

        if (!record || now - record.start > windowMs) {
            requests.set(key, { start: now, count: 1 });
            return next();
        }
        record.count++;
        if (record.count > maxRequests) {
            return res.status(429).json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' });
        }
        next();
    };
    return limiter;
}
const uploadRateLimit = createRateLimiter(60 * 1000, 10); // 1분에 10회
const batchSyncRateLimit = createRateLimiter(60 * 1000, 20); // 1분에 20회
const loginRateLimit = createRateLimiter(60 * 1000, 5); // 1분에 5회 (브루트포스 방어)
const apiRateLimit = createRateLimiter(60 * 1000, 100); // 1분에 100회 (전역 API)



// 빈 favicon 응답
app.get('/favicon.ico', (_req, res) => { res.setHeader('Access-Control-Allow-Origin', '*'); res.status(204).end(); });

// 미들웨어 설정
// 보안 헤더 (helmet): CSP는 인라인 스크립트/CDN 사용으로 비활성화, iframe은 same-origin 허용
app.use(helmet({
    contentSecurityPolicy: false,
    frameguard: { action: 'sameorigin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: false,
}));

// CORS 설정: .env의 CORS_ORIGINS로 커스텀 가능 (콤마 구분)
const defaultOrigins = ['http://localhost:5000', 'http://localhost:5001', 'http://localhost:5505', 'http://127.0.0.1:5000', 'http://192.168.0.15:5001'];
const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
    : defaultOrigins;
app.use(cors({
    origin: corsOrigins,
    credentials: true
}));
app.use(express.json({ limit: '50mb' })); // JSON 요청 본문 파싱 (용량 제한 50MB - 여권 이미지 base64 포함)

// --- 세션 설정 ---
if (!process.env.SESSION_SECRET) {
    logger.warn('SESSION_SECRET이 .env에 설정되지 않았습니다. 랜덤 시크릿을 생성합니다. (서버 재시작 시 기존 세션 무효화됨)');
}
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
app.use(session({
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: __dirname,
        concurrentDB: true
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// --- API 문서 (인증 불필요) ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    swaggerOptions: { docExpansion: 'none', persistAuthorization: true },
}));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// --- Rate Limiting ---
app.use('/api', apiRateLimit); // 전역 API 100회/분
app.use('/api/auth/login', loginRateLimit); // 로그인 5회/분 (브루트포스 방어)

// --- 인증 라우터 (인증 불필요) ---
app.use('/api/auth', authRouter);

// --- 인증 미들웨어 (이후 모든 요청에 적용) ---
app.use(requireAuth);

// --- 여권 OCR 프록시 (landing 서버로 전달) ---
const LANDING_API = process.env.LANDING_API_URL || 'http://localhost:5505';
app.post('/api/passport-ocr/scan', (req, res) => {
    fetch(`${LANDING_API}/api/passport-ocr/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
    })
    .then(async (proxyRes) => {
        const data = await proxyRes.json();
        res.status(proxyRes.status).json(data);
    })
    .catch((err) => {
        logger.error('여권 OCR 프록시 오류:', err.message);
        res.status(502).json({ error: 'Landing 서버 연결 실패. 서버가 실행 중인지 확인해주세요.' });
    });
});

// === 업로드 / 파싱 / OCR API ===
const { createUploadRoutes, uploadDir } = require('./routes/upload');
app.use('/api', createUploadRoutes({ uploadRateLimit, getDbInstance: () => dbInstance }));
app.get('/schedule-upload', (req, res) => {
    res.sendFile(path.join(__dirname, '../upload.html'));
});


// 라우터 팩토리 (DB 초기화 후 initializeDatabase().then() 에서 등록)
const createInvoiceRoutes = require('./routes/invoices');
const createFlightScheduleRoutes = require('./routes/flight-schedules');
const createBankAccountRoutes = require('./routes/bank-accounts');

// --- 프론트엔드 통합: 정적 파일 제공 ---
// 프로젝트 루트 디렉토리를 정적 파일 경로로 설정
const publicPath = path.join(__dirname, '..');
app.use(express.static(publicPath));

// 기본 경로 접속 시 index.html 제공
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// 인보이스 관련 라우트 (더 구체적인 경로를 먼저 정의)
app.get('/invoice/preview', (req, res) => {
    res.sendFile(path.join(__dirname, '../in/invoice-preview.html'));
});

app.get('/invoices', (req, res) => {
    res.sendFile(path.join(__dirname, '../in/invoice-list.html'));
});

app.get('/invoice', (req, res) => {
    res.sendFile(path.join(__dirname, '../in/invoice-editor.html'));
});

// 인보이스 정적 파일 서빙 (CSS, JS, 이미지 등)
app.use('/in', express.static(path.join(__dirname, '../in')));

// JS 파일 서빙 (FlightSyncManager 등)
app.use('/js', express.static(path.join(__dirname, '../js')));
// --- 프론트엔드 통합 종료 ---



// 데이터베이스 초기화 및 서버 시작
initializeDatabase().then(async (db) => {
    // 업로드 디렉토리 비동기 생성 (recursive: true로 존재 여부 체크 불필요)
    await fs.promises.mkdir(uploadDir, { recursive: true });

    dbInstance = db; // 전역 변수에 할당
    setAuthDb(db); // 인증 라우터에 DB 인스턴스 주입
    initEmail(); // 이메일 알림 초기화

    // 라우터에 DB 인스턴스 주입 후 등록
    app.use('/api/invoices', createInvoiceRoutes(db));
    app.use('/api/flight-schedules', createFlightScheduleRoutes(db));
    app.use('/api/bank-accounts', createBankAccountRoutes(db));

    // === 예약장부 API (air-booking 연동) ===
    const createAirBookingRoutes = require('./routes/air-bookings');
    app.use('/api/air-bookings', createAirBookingRoutes(db));


    logger.info('API 서버가 데이터베이스와 연결되었습니다.');

    // 모든 테이블에 대한 RESTful API 엔드포인트
    const createTableRoutes = require('./routes/tables');
    app.use('/tables', createTableRoutes(db));

    // === 일정 관리 API ===
    const createScheduleRoutes = require('./routes/schedules');
    app.use('/api/schedules', createScheduleRoutes(db));

    // === 여행 안내문 저장 API ===
    const createTravelSaveRoutes = require('./routes/travel-saves');
    app.use('/api/travel-saves', createTravelSaveRoutes(db));

    // === 항공편 저장 API (FlightSyncManager DB 전환) ===
    const createFlightSaveRoutes = require('./routes/flight-saves');
    app.use('/api/flight-saves', createFlightSaveRoutes(db));

    // === 단체 명단 API ===
    const createGroupRosterRoutes = require('./routes/group-rosters');
    app.use('/api/group-rosters', createGroupRosterRoutes(db));

    // === 버스 예약 API ===
    const createBusReservationRoutes = require('./routes/bus-reservations');
    app.use('/api/bus-reservations', createBusReservationRoutes(db));

    // === 공지사항/안내문 API ===
    const createSavedNoticeRoutes = require('./routes/saved-notices');
    app.use('/api/saved-notices', createSavedNoticeRoutes(db));

    // === 인보이스 수신자/템플릿 API ===
    const createInvoiceRecipientRoutes = require('./routes/invoice-recipients');
    app.use('/api/invoice-recipients', createInvoiceRecipientRoutes(db));
    const createInvoiceTemplateRoutes = require('./routes/invoice-templates');
    app.use('/api/invoice-templates', createInvoiceTemplateRoutes(db));

    // === 원가 계산서 API ===
    const createCostCalculationRoutes = require('./routes/cost-calculations');
    app.use('/api/cost-calculations', createCostCalculationRoutes(db));

    // === 동기화 API ===
    const createSyncRoutes = require('./routes/sync');
    app.use('/api/sync', createSyncRoutes(db, { batchSyncRateLimit }));

    // === 상품 API ===
    const createProductRoutes = require('./routes/products');
    app.use('/api/products', createProductRoutes(db));

    // === 백업 API ===
    const createBackupRoutes = require('./routes/backup');
    app.use('/api/backup', createBackupRoutes(db));

    // === 자동 백업 스케줄러 시작 (매일 23:00) ===
    const { startAutoBackupSchedule } = require('./services/backup.service');
    startAutoBackupSchedule();


    // 서버 시작
    const server = app.listen(port, '0.0.0.0', () => {
        logger.info(`백엔드 서버가 http://localhost:${port} 에서 실행 중입니다.`);
        logger.info(`인보이스 편집 페이지: http://localhost:${port}/invoice`);
        logger.info(`인보이스 미리보기: http://localhost:${port}/invoice/preview`);
    });

    // Graceful Shutdown
    function gracefulShutdown(signal) {
        logger.info(`${signal} 수신, 서버를 종료합니다...`);
        server.close(() => {
            logger.info('HTTP 서버 종료 완료');
            db.close().then(() => {
                logger.info('데이터베이스 연결 종료 완료');
                process.exit(0);
            }).catch(err => {
                logger.error('데이터베이스 종료 오류:', err);
                process.exit(1);
            });
        });
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

}).catch(error => {
    logger.error("데이터베이스 연결 실패:", error);
    process.exit(1);
});