# 여행사 관리 시스템 - 기술 요구사항 문서
# Project Analysis - Technical Requirements Document

**작성일**: 2026-01-03
**버전**: v1.0
**관련 PRD**: `docs/PROJECT_ANALYSIS_PRD.md`

---

## 1. 보안 강화 요구사항

### 1.1 SQL Injection 방어

**현재 문제:**
```javascript
// server.js:365-374 - 취약한 코드
app.get('/tables/:tableName', async (req, res) => {
    const { tableName } = req.params;
    const items = await db.all(`SELECT * FROM ${tableName} ...`);
});
```

**해결 방안:**
```javascript
// 허용된 테이블 목록 정의
const ALLOWED_TABLES = [
    'customers', 'products', 'bookings', 'schedules', 
    'todos', 'notifications', 'groups', 'cost_calculations'
];

app.get('/tables/:tableName', async (req, res) => {
    const { tableName } = req.params;
    
    // 화이트리스트 검증
    if (!ALLOWED_TABLES.includes(tableName)) {
        return res.status(400).json({ error: '허용되지 않은 테이블입니다.' });
    }
    
    const items = await db.all(`SELECT * FROM ${tableName} ...`);
});
```

### 1.2 CORS 설정 강화

**현재 코드:**
```javascript
app.use(cors()); // 모든 Origin 허용
```

**개선 코드:**
```javascript
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:5000',
            'http://localhost:3000',
            process.env.FRONTEND_URL
        ].filter(Boolean);
        
        // 개발 환경에서는 origin이 없는 요청 허용 (Postman 등)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS not allowed'));
        }
    },
    credentials: true
};

app.use(cors(corsOptions));
```

### 1.3 기본 인증 시스템

**구현 방안 (JWT 기반):**

```javascript
// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 토큰 검증 미들웨어
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: '인증이 필요합니다.' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: '토큰이 유효하지 않습니다.' });
        }
        req.user = user;
        next();
    });
}

module.exports = { authenticateToken };
```

### 1.4 Rate Limiting

```javascript
// npm install express-rate-limit
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15분
    max: 100, // IP당 최대 100 요청
    message: { error: '너무 많은 요청입니다. 잠시 후 다시 시도하세요.' }
});

app.use('/api/', limiter);
```

---

## 2. 코드 구조 개선

### 2.1 server.js 모듈화 계획

**현재 구조 (1341줄):**
```
server.js
├── 설정 및 미들웨어 (1-100)
├── 유틸리티 함수 (100-200)
├── 파일 업로드 API (200-355)
├── DB 초기화 및 모든 라우트 (355-1341)
```

**목표 구조:**
```
backend/
├── server.js (≤100줄) - 앱 초기화만
├── config/
│   ├── cors.js
│   ├── database.js
│   └── multer.js
├── middleware/
│   ├── auth.js
│   ├── errorHandler.js
│   └── rateLimiter.js
├── routes/
│   ├── index.js (라우트 통합)
│   ├── invoices.js ✅ (이미 분리됨)
│   ├── flight-schedules.js ✅ (이미 분리됨)
│   ├── bank-accounts.js ✅ (이미 분리됨)
│   ├── schedules.js (분리 필요)
│   ├── customers.js (분리 필요)
│   ├── products.js (분리 필요)
│   ├── bookings.js (분리 필요)
│   ├── sync.js (분리 필요)
│   ├── backup.js (분리 필요)
│   └── upload.js (분리 필요)
├── services/
│   ├── geminiService.js
│   └── syncService.js
└── utils/
    ├── logger.js
    └── helpers.js
```

### 2.2 새 server.js 예시

```javascript
// backend/server.js (목표: ≤100줄)
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { corsOptions } = require('./config/cors');
const { initializeDatabase } = require('./database');
const { errorHandler } = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();
const port = process.env.PORT || 5000;

// 미들웨어
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// 정적 파일
app.use(express.static(path.join(__dirname, '..')));

// 라우트
app.use('/api', routes);

// 에러 핸들러
app.use(errorHandler);

// 서버 시작
initializeDatabase().then(db => {
    app.locals.db = db;
    app.listen(port, () => {
        console.log(`서버 실행 중: http://localhost:${port}`);
    });
});
```

### 2.3 에러 핸들링 통일

```javascript
// backend/middleware/errorHandler.js
function errorHandler(err, req, res, next) {
    console.error(`[${new Date().toISOString()}] Error:`, err.message);
    
    // 개발 환경에서는 스택 트레이스 포함
    const isDev = process.env.NODE_ENV !== 'production';
    
    res.status(err.status || 500).json({
        success: false,
        error: err.message || '서버 오류가 발생했습니다.',
        ...(isDev && { stack: err.stack })
    });
}

module.exports = { errorHandler };
```

---

## 3. 파일 구조 정리

### 3.1 이동 대상 파일

**테스트 파일 → `/tests/` 이동:**
```
test-*.html (15개+)
├── test-flight-sync.html
├── test-full-sync.html
├── test-sync-ui.html
├── test-workflow.html
├── test-sidebar.html
├── test-menu-click.html
├── test-passport-warning.html
├── test-formatdate-fix.html
└── ... 
```

**디버그 스크립트 → `/scripts/debug/` 이동:**
```
check-*.js, verify-*.js, debug-*.js (20개+)
├── check-data.html
├── check-agrigento-customers.js
├── verify-sync-setup.js
└── ...
```

**레거시 파일 → 아카이브 또는 삭제:**
```
contract/legacy-html/ (전체)
*-backup.html, *-copy.html (임시 파일)
```

### 3.2 권장 디렉토리 구조

```
root/
├── backend/           # 백엔드 서버
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   └── config/
├── frontend/          # 프론트엔드 페이지
│   ├── pages/
│   └── static/
├── in/                # 인보이스 시스템
├── air1/              # 항공편 변환기
├── quote-editor-v1/   # 견적서 생성기
├── docs/              # 문서
├── tests/             # 테스트 파일
│   ├── html/
│   └── scripts/
├── scripts/           # 유틸리티 스크립트
│   ├── debug/
│   └── migration/
└── archive/           # 레거시/백업 파일
```

---

## 4. 로깅 시스템

### 4.1 Winston 로거 설정

```javascript
// backend/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
});

// 개발 환경에서는 콘솔 출력
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

module.exports = logger;
```

---

## 5. API 문서화 (Swagger)

### 5.1 Swagger 설정

```javascript
// npm install swagger-jsdoc swagger-ui-express

const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: '여행사 관리 시스템 API',
            version: '1.0.0',
            description: 'Travel Agency Management System API'
        },
        servers: [
            { url: 'http://localhost:5000/api' }
        ]
    },
    apis: ['./routes/*.js']
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
```

---

## 6. 환경 설정

### 6.1 .env 파일 예시

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_PATH=./travel_agency.db

# Security
JWT_SECRET=your-super-secret-key-change-in-production
CORS_ORIGIN=http://localhost:5000

# AI
GEMINI_API_KEY=your-gemini-api-key

# Logging
LOG_LEVEL=info
```

### 6.2 .env.example 생성

```bash
# 프로덕션 배포 시 참조용
cp .env .env.example
# .env.example에서 실제 값 제거
```

---

## 7. 의존성 추가

### 7.1 보안 관련

```bash
npm install --save helmet express-rate-limit jsonwebtoken
npm install --save-dev @types/jsonwebtoken
```

### 7.2 로깅/문서화

```bash
npm install --save winston swagger-jsdoc swagger-ui-express
```

### 7.3 package.json 스크립트 추가

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "start:prod": "NODE_ENV=production node server.js",
    "lint": "eslint .",
    "test": "jest"
  }
}
```

---

## 8. 마이그레이션 순서

1. **1단계**: SQL Injection 방어 (긴급)
2. **2단계**: CORS 설정 강화
3. **3단계**: 에러 핸들러 추가
4. **4단계**: 라우트 분리 시작
5. **5단계**: 로깅 시스템 도입
6. **6단계**: 테스트 파일 정리
7. **7단계**: API 문서화
8. **8단계**: 인증 시스템 추가

---

## 9. 참고 문서

- PRD: `docs/PROJECT_ANALYSIS_PRD.md`
- Task 목록: `docs/PROJECT_ANALYSIS_TASKS.md`
