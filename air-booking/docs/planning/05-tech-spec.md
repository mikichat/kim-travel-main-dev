# 05-tech-spec.md — 기술 명세 (DB 스키마, API, 마이그레이션)

**프로젝트명**: DB 통합 및 서버 일원화
**버전**: 1.0
**작성일**: 2026-04-01

---

## 개요

**아키텍처 원칙: 원데이터 하나 → 두 가지 뷰**

```
single source of truth: flight_bookings 테이블
    ↓
    ├→ 항공편 변환기 (고객용): API 응답 변환 → 도시명, 이미지
    └→ 예약장부 (업무용): API 응답 표시 → 공항코드, 마감, 정산

결과: 같은 DB 데이터, 다른 UI 표현
```

**핵심 기술**:
- **서버**: Express + TypeScript
- **DB**: SQLite (WAL 모드) — PNR 중복 UNIQUE 제약으로 강제
- **프론트**: React + vanilla HTML/JS

---

## 1. 데이터베이스 설계

### 1.1 통합 테이블 (flight_bookings)

```sql
CREATE TABLE flight_bookings (
  -- 기본 키
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- PNR 정보
  pnr VARCHAR(6) NOT NULL UNIQUE,
  source ENUM_LIKE('booking', 'converter', 'schedule') NOT NULL DEFAULT 'booking',

  -- 항공편 정보
  airline VARCHAR(3),                    -- 항공사 코드 (KE, OZ, AA 등)
  flight_number VARCHAR(6),              -- 편명 (1001, 2001 등)
  route_from VARCHAR(3),                 -- 출발 공항 (ICN, NRT 등)
  route_to VARCHAR(3),                   -- 도착 공항
  departure_date DATE,                   -- 출발 날짜
  departure_time TIME,                   -- 출발 시간
  arrival_date DATE,                     -- 도착 날짜 (다음날 도착 시)
  arrival_time TIME,                     -- 도착 시간

  -- 탑승객 정보 (JSON 배열)
  passengers JSON NOT NULL DEFAULT '[]',
  -- [
  --   {
  --     "name_kr": "김철수",
  --     "name_en": "KIM CHULSU",
  --     "title": "MR",
  --     "gender": "M",
  --     "passport_number": "M12345678",
  --     "seat_number": "1A"
  --   }
  -- ]

  -- 마감 정보
  nmtl_date DATE,                        -- NMTL 마감 날짜
  tl_date DATE,                          -- TL 마감 날짜

  -- 예약 상태
  status ENUM_LIKE('saved', 'booked', 'ticketed', 'cancelled') DEFAULT 'saved',

  -- 여행사 정보
  agency VARCHAR(100),                   -- 여행사 이름
  group_id INTEGER,                      -- 그룹 ID (항공편 그룹핑)

  -- 추가 정보
  remarks TEXT,                          -- 비고
  data JSON,                             -- 기타 데이터 (JSON)

  -- 타임스탬프
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- 인덱스
  CONSTRAINT fk_group FOREIGN KEY (group_id) REFERENCES flight_schedules(group_id)
);

-- 인덱스
CREATE INDEX idx_pnr ON flight_bookings(pnr);
CREATE INDEX idx_departure_date ON flight_bookings(departure_date);
CREATE INDEX idx_status ON flight_bookings(status);
CREATE INDEX idx_source ON flight_bookings(source);
CREATE INDEX idx_airline ON flight_bookings(airline);
CREATE INDEX idx_created_at ON flight_bookings(created_at);
```

**SQLite에서 ENUM_LIKE 대신 TEXT 사용**:

```sql
-- 실제 SQLite 구현
CREATE TABLE flight_bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pnr TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'booking',  -- 'booking', 'converter', 'schedule'

  airline TEXT,
  flight_number TEXT,
  route_from TEXT,
  route_to TEXT,
  departure_date TEXT,
  departure_time TEXT,
  arrival_date TEXT,
  arrival_time TEXT,

  passengers TEXT NOT NULL DEFAULT '[]',  -- JSON string

  nmtl_date TEXT,
  tl_date TEXT,

  status TEXT DEFAULT 'saved',  -- 'saved', 'booked', 'ticketed', 'cancelled'

  agency TEXT,
  group_id INTEGER,

  remarks TEXT,
  data TEXT,  -- JSON string

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### 1.2 항공편 관리 테이블 (flight_schedules) — 기존 유지

```sql
CREATE TABLE flight_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  group_id INTEGER NOT NULL,
  group_name TEXT,

  airline TEXT NOT NULL,
  flight_number TEXT NOT NULL,

  departure_airport TEXT NOT NULL,
  departure_date TEXT NOT NULL,
  departure_time TEXT NOT NULL,

  arrival_airport TEXT NOT NULL,
  arrival_date TEXT,
  arrival_time TEXT NOT NULL,

  passengers INTEGER DEFAULT 0,
  pnr TEXT,

  source TEXT,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### 1.3 탑승객 상세 테이블 (air_booking_passengers) — 기존 유지

```sql
CREATE TABLE air_booking_passengers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,

  name_en TEXT NOT NULL,
  name_kr TEXT NOT NULL,
  title TEXT,
  gender TEXT,
  passport_number TEXT,
  seat_number TEXT,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (booking_id) REFERENCES air_bookings(id) ON DELETE CASCADE
);
```

### 1.4 항공편 세그먼트 테이블 (air_booking_segments) — 기존 유지, arrival_date 추가

```sql
CREATE TABLE air_booking_segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,

  seg_index INTEGER NOT NULL,

  airline TEXT NOT NULL,
  flight_number TEXT NOT NULL,
  route_from TEXT NOT NULL,
  route_to TEXT NOT NULL,

  departure_date TEXT NOT NULL,
  departure_time TEXT NOT NULL,
  arrival_date TEXT,                          -- NEW: 도착일 (PNR 파싱에서 추출)
  arrival_time TEXT NOT NULL,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (booking_id) REFERENCES air_bookings(id) ON DELETE CASCADE
);
```

**arrival_date 사용**:
- PNR 파싱 시 도착일 자동 추출
- NULL 값인 경우 도착일 표시 안 함
- 도착일 = 출발일 + 1 (익일 도착) 시 빨간색 표시
- 공항코드는 도시명으로 변환 (ICN → 인천)

---

## 2. API 명세

### 2.1 기본 구조

**Base URL**: `http://localhost:5001/api`

**Response Format** (모든 응답):

```json
{
  "success": true,
  "data": { ... },
  "message": "작업 완료",
  "timestamp": "2026-04-01T10:00:00Z"
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "INVALID_PNR",
  "message": "PNR은 6자 영숫자여야 합니다",
  "timestamp": "2026-04-01T10:00:00Z"
}
```

### 2.2 Bookings API

#### POST /api/bookings — 예약 생성

**Request**:

```json
{
  "pnr": "ABC123",
  "airline": "KE",
  "flight_number": "1001",
  "route_from": "ICN",
  "route_to": "NRT",
  "departure_date": "2026-04-15",
  "departure_time": "10:20",
  "arrival_date": "2026-04-15",
  "arrival_time": "16:45",

  "passengers": [
    {
      "name_kr": "김철수",
      "name_en": "KIM CHULSU",
      "title": "MR",
      "gender": "M",
      "passport_number": "M12345678",
      "seat_number": "1A"
    }
  ],

  "nmtl_date": "2026-04-10",
  "tl_date": "2026-04-13",
  "status": "booked",
  "agency": "ABC 여행사",
  "remarks": "성인 1명, 일반석"
}
```

**Response** (201 Created):

```json
{
  "success": true,
  "data": {
    "id": 1,
    "pnr": "ABC123",
    "airline": "KE",
    "flight_number": "1001",
    ...
    "created_at": "2026-04-01T10:00:00Z",
    "updated_at": "2026-04-01T10:00:00Z"
  }
}
```

**Validation**:

| 필드 | 규칙 | 에러 코드 |
|------|------|---------|
| pnr | 6자 영숫자, UNIQUE | DUPLICATE_PNR |
| airline | 필수, 2-3자 | INVALID_AIRLINE |
| flight_number | 필수, 숫자 | INVALID_FLIGHT |
| departure_date | 필수, YYYY-MM-DD | INVALID_DATE |
| passengers | 1명 이상 | NO_PASSENGERS |

---

#### GET /api/bookings — 예약 목록

**Query Parameters**:

```
GET /api/bookings?
  airline=KE&
  status=booked&
  departure_date_from=2026-04-01&
  departure_date_to=2026-04-30&
  page=1&
  limit=20&
  sort=departure_date:asc
```

**Response** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "pnr": "ABC123",
      "airline": "KE",
      ...
    },
    ...
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "pages": 1
  }
}
```

---

#### GET /api/bookings/:id — 예약 상세

**Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": 1,
    "pnr": "ABC123",
    "airline": "KE",
    "flight_number": "1001",
    ...
    "passengers": [ ... ],
    "created_at": "2026-04-01T10:00:00Z",
    "updated_at": "2026-04-01T10:00:00Z"
  }
}
```

---

#### PUT /api/bookings/:id — 예약 수정

**Request** (기존 필드 일부만 전송):

```json
{
  "status": "ticketed",
  "remarks": "발권 완료",
  "tl_date": "2026-04-13"
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": 1,
    "pnr": "ABC123",
    ...
    "status": "ticketed",
    "updated_at": "2026-04-01T10:05:00Z"
  }
}
```

---

#### DELETE /api/bookings/:id — 예약 삭제

**Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": 1,
    "message": "예약 삭제됨"
  }
}
```

**Error** (404 Not Found):

```json
{
  "success": false,
  "error": "NOT_FOUND",
  "message": "예약을 찾을 수 없습니다"
}
```

---

### 2.3 Schedules API

#### POST /api/schedules — 항공편 추가

**Request**:

```json
{
  "group_id": 1,
  "group_name": "서울-도쿄",
  "airline": "KE",
  "flight_number": "1001",
  "departure_airport": "ICN",
  "departure_date": "2026-04-15",
  "departure_time": "10:20",
  "arrival_airport": "NRT",
  "arrival_time": "16:45"
}
```

**Response** (201 Created):

```json
{
  "success": true,
  "data": {
    "id": 1,
    "group_id": 1,
    "airline": "KE",
    ...
  }
}
```

---

#### GET /api/schedules — 항공편 목록

**Query Parameters**:

```
GET /api/schedules?
  airline=KE&
  departure_date_from=2026-04-01&
  departure_date_to=2026-04-30&
  page=1&
  limit=20
```

**Response** (200 OK):

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": { ... }
}
```

---

#### GET /api/schedules/search — 항공편 검색 (자동완성)

**Query Parameters**:

```
GET /api/schedules/search?
  airline=KE&
  flight_number=100&
  departure_airport=ICN&
  limit=10
```

**Response** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "airline": "KE",
      "flight_number": "1001",
      "departure_airport": "ICN",
      "departure_date": "2026-04-15",
      "departure_time": "10:20",
      "arrival_airport": "NRT",
      "arrival_time": "16:45"
    },
    ...
  ]
}
```

---

#### PUT /api/schedules/:id — 항공편 수정

**Request**:

```json
{
  "departure_time": "10:30",
  "arrival_time": "17:00"
}
```

**Response** (200 OK): 수정된 항공편

---

#### DELETE /api/schedules/:id — 항공편 삭제

**Response** (200 OK): 삭제 확인

---

### 2.3-1 Flight Saves API (미전환 → 서버 DB 전환)

#### GET /api/flight-saves — 저장된 항공편 (인증 제거, 내부망 전용)

**Query Parameters**:

```
GET /api/flight-saves?limit=20&page=1
```

**Response** (200 OK):

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": { ... }
}
```

---

### 2.3-2 Estimates API (미전환 → 서버 DB 전환)

#### GET /api/estimates — 견적서 목록 (인증 제거, 내부망 전용)

**Response** (200 OK):

```json
{
  "success": true,
  "data": [ ... ]
}
```

#### POST /api/estimates — 견적서 생성

---

### 2.3-3 Bus Reservations API (신규)

#### POST /api/bus-reservations — 버스예약 저장

#### GET /api/bus-reservations — 버스예약 목록

---

### 2.3-4 Announcements API (신규)

#### GET /api/announcements — 안내문 목록

#### POST /api/announcements — 안내문 추가

---

### 2.4 Converter API (변환기 통합)

#### POST /api/converter/parse — PNR 텍스트 파싱

**Request**:

```json
{
  "text": "KE 1001 ICN NRT 04/15 김철수 M12345678 1A"
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "airline": "KE",
    "flight_number": "1001",
    "route_from": "ICN",
    "route_to": "NRT",
    "departure_date": "2026-04-15",
    "arrival_date": "2026-04-16",      -- NEW: PNR 파싱에서 추출
    "passengers": [
      {
        "name_kr": "김철수",
        "passport_number": "M12345678",
        "seat_number": "1A"
      }
    ],
    "original_pnr_text": "KE 1001 ICN NRT 04/15 김철수 M12345678 1A"  -- NEW: 메모 저장용
  }
}
```

**주의사항**:
- arrival_date를 모르면 NULL로 응답
- 도시명 변환은 프론트엔드에서 수행 (ICN → 인천)

---

#### POST /api/converter/save — 변환기에서 저장

**Request**:

```json
{
  "pnr": "ABC123",
  "airline": "KE",
  "flight_number": "1001",
  "route_from": "ICN",
  "route_to": "NRT",
  "departure_date": "2026-04-15",
  "arrival_date": "2026-04-16",
  "passengers": [ ... ],
  "remarks": "KE 1001 ICN NRT 04/15 김철수 M12345678 1A",  -- NEW: 원본 PNR 저장
  "source": "converter"
}
```

**Response** (201 Created): 생성된 예약

**주의사항**:
- remarks에 원본 PNR 텍스트 저장
- 불러오기 시 remarks에서 원본 추출 가능

---

### 2.5 Image API (이미지/랜딩카드 생성)

#### POST /api/images/generate — 이미지 생성

**Request**:

```json
{
  "booking_id": 1,
  "format": "image",  -- 'image', 'landing', 'pdf'
  "size": "normal"    -- 'normal', 'large'
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "image_url": "/images/ABC123_2026-04-01.png",
    "base64": "data:image/png;base64,iVBORw0KGgo...",
    "mime_type": "image/png"
  }
}
```

---

## 3. 데이터 마이그레이션

### 3.1 마이그레이션 전략

```
기존 시스템:
  ├─ flight_saves (변환기 localStorage) → flight_bookings
  ├─ flight_schedules (항공편 관리) → flight_bookings + flight_schedules 유지
  └─ air_bookings (예약장부) → flight_bookings

↓ 통합 시스템:
  └─ flight_bookings (통합)
  └─ flight_schedules (항공편 관리, 유지)
```

### 3.2 마이그레이션 스크립트

```typescript
// server/src/scripts/migrate-db.ts

import Database from 'better-sqlite3';

async function migrateDatabase() {
  const db = new Database('travel_agency.db');

  // 1. flight_bookings 테이블 생성
  db.exec(`
    CREATE TABLE IF NOT EXISTS flight_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pnr TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL DEFAULT 'booking',
      airline TEXT,
      flight_number TEXT,
      route_from TEXT,
      route_to TEXT,
      departure_date TEXT,
      departure_time TEXT,
      arrival_date TEXT,
      arrival_time TEXT,
      passengers TEXT NOT NULL DEFAULT '[]',
      nmtl_date TEXT,
      tl_date TEXT,
      status TEXT DEFAULT 'saved',
      agency TEXT,
      group_id INTEGER,
      remarks TEXT,
      data TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. flight_saves → flight_bookings 이관
  const flights = db.prepare(`SELECT * FROM flight_saves`).all();
  const insertBooking = db.prepare(`
    INSERT OR IGNORE INTO flight_bookings
    (pnr, source, airline, flight_number, route_from, route_to,
     departure_date, passengers, created_at, updated_at)
    VALUES (?, 'converter', ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const flight of flights) {
    const parsed = JSON.parse(flight.data || '{}');
    insertBooking.run(
      flight.pnr,
      parsed.airline || null,
      parsed.flight_number || null,
      parsed.route_from || null,
      parsed.route_to || null,
      parsed.departure_date || null,
      JSON.stringify(parsed.passengers || []),
      flight.created_at,
      flight.updated_at
    );
  }

  // 3. air_bookings → flight_bookings 이관
  const bookings = db.prepare(`SELECT * FROM air_bookings`).all();
  const insertAirBooking = db.prepare(`
    INSERT OR IGNORE INTO flight_bookings
    (pnr, source, airline, flight_number, route_from, route_to,
     departure_date, nmtl_date, tl_date, status, agency, remarks, created_at, updated_at)
    VALUES (?, 'booking', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const booking of bookings) {
    // 탑승객 정보 수집
    const pax = db.prepare(
      `SELECT * FROM air_booking_passengers WHERE booking_id = ?`
    ).all(booking.id);

    const passengers = pax.map((p: any) => ({
      name_kr: p.name_kr,
      name_en: p.name_en,
      title: p.title,
      gender: p.gender,
      passport_number: p.passport_number,
      seat_number: p.seat_number
    }));

    insertAirBooking.run(
      booking.pnr,
      booking.airline,
      booking.flight_number,
      booking.route_from,
      booking.route_to,
      booking.departure_date,
      booking.nmtl_date,
      booking.tl_date,
      booking.status || 'booked',
      booking.agency,
      booking.remarks,
      booking.created_at || new Date().toISOString(),
      booking.updated_at || new Date().toISOString()
    );
  }

  // 4. 검증
  const count = db.prepare(`SELECT COUNT(*) as cnt FROM flight_bookings`).get();
  console.log(`✓ ${count.cnt}개 예약 이관 완료`);

  // 5. 중복 제거 (같은 PNR 최신 데이터만 유지)
  db.exec(`
    DELETE FROM flight_bookings
    WHERE id NOT IN (
      SELECT MAX(id) FROM flight_bookings
      GROUP BY pnr
    )
  `);

  const finalCount = db.prepare(`SELECT COUNT(*) as cnt FROM flight_bookings`).get();
  console.log(`✓ 중복 제거 후: ${finalCount.cnt}개`);

  db.close();
}

export default migrateDatabase;
```

### 3.3 마이그레이션 검증

```typescript
async function validateMigration() {
  const db = new Database('travel_agency.db');

  // 1. 중복 PNR 확인
  const duplicates = db.prepare(`
    SELECT pnr, COUNT(*) as cnt FROM flight_bookings
    GROUP BY pnr
    HAVING cnt > 1
  `).all();

  if (duplicates.length > 0) {
    console.error('❌ 중복 PNR 발견:', duplicates);
    return false;
  }

  // 2. 필수 필드 확인
  const nullPnr = db.prepare(`
    SELECT COUNT(*) as cnt FROM flight_bookings WHERE pnr IS NULL
  `).get();

  if (nullPnr.cnt > 0) {
    console.error(`❌ PNR이 NULL인 행: ${nullPnr.cnt}개`);
    return false;
  }

  // 3. 데이터 형식 확인
  const invalidDates = db.prepare(`
    SELECT COUNT(*) as cnt FROM flight_bookings
    WHERE departure_date IS NOT NULL
      AND departure_date NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  `).get();

  if (invalidDates.cnt > 0) {
    console.warn(`⚠️ 날짜 형식 오류: ${invalidDates.cnt}개`);
  }

  console.log('✓ 마이그레이션 검증 완료');
  return true;
}
```

---

## 4. 서버 구성 및 배포

### 4.1 Express 서버 구조

```
server/
├── src/
│   ├── index.ts                    -- 진입점
│   ├── db.ts                       -- DB 연결
│   ├── middleware/
│   │   ├── errorHandler.ts         -- 에러 처리
│   │   ├── logger.ts               -- 로깅
│   │   └── cors.ts                 -- CORS
│   ├── routes/
│   │   ├── bookings.ts             -- /api/bookings
│   │   ├── schedules.ts            -- /api/schedules
│   │   ├── converter.ts            -- /api/converter
│   │   └── images.ts               -- /api/images
│   ├── services/
│   │   ├── booking.service.ts      -- 예약 로직
│   │   ├── schedule.service.ts     -- 항공편 로직
│   │   └── converter.service.ts    -- 변환기 로직
│   ├── models/
│   │   ├── booking.ts              -- 타입
│   │   └── schedule.ts
│   ├── scripts/
│   │   └── migrate-db.ts           -- 마이그레이션
│   └── utils/
│       ├── validators.ts            -- 유효성 검사
│       └── parsers.ts               -- PNR 파싱
├── package.json
└── tsconfig.json
```

### 4.2 package.json

```json
{
  "name": "air-booking-server",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.ts",
    "migrate": "ts-node src/scripts/migrate-db.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "better-sqlite3": "^9.0.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "ts-node-dev": "^2.0.0"
  }
}
```

### 4.3 포트 설정

| 서비스 | 포트 | 상태 |
|--------|------|------|
| 통합 서버 (Express) | 5001 또는 3000 | 새 포트로 통일 |
| air-booking Dev (React) | 5174 | 개발 중 제거 (프로덕션은 5001에서 제공) |
| 변환기 (vanilla JS) | 5001 | 통합 서버에서 제공 |

### 4.4 인증 화이트리스트 (내부망 전용)

```typescript
// server/src/middleware/authWhitelist.ts

const WHITELIST_ENDPOINTS = [
  '/api/flight-saves',
  '/api/estimates'
];

const INTERNAL_IP_RANGE = /^192\.168\.0\./;

export function authWhitelistMiddleware(req, res, next) {
  const path = req.path;

  // 화이트리스트 엔드포인트 → 인증 제거
  if (WHITELIST_ENDPOINTS.some(ep => path.startsWith(ep))) {
    // 내부망 확인
    const clientIp = req.ip || req.connection.remoteAddress;

    if (!INTERNAL_IP_RANGE.test(clientIp)) {
      console.warn(`외부 접근 시도: ${clientIp} → ${path}`);
      return res.status(403).json({ error: 'Forbidden: Internal network only' });
    }

    return next();  // 인증 스킵
  }

  // 기타 엔드포인트 → 인증 검사 (향후)
  next();
}

app.use(authWhitelistMiddleware);
```

---

## 5. 폴링 및 동기화 구현

### 5.1 클라이언트 폴링 로직 (React)

```typescript
// client/src/hooks/useBookingSync.ts

import { useEffect, useRef, useState } from 'react';

export function useBookingSync(interval = 1000) {
  const [bookings, setBookings] = useState([]);
  const intervalRef = useRef<NodeJS.Timeout>();

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/bookings');
      const { data } = await res.json();
      setBookings(data);
    } catch (err) {
      console.error('Polling 실패:', err);
    }
  };

  useEffect(() => {
    fetchBookings(); // 초기 로드

    // 1초마다 폴링
    intervalRef.current = setInterval(fetchBookings, interval);

    return () => clearInterval(intervalRef.current);
  }, [interval]);

  return { bookings, refetch: fetchBookings };
}
```

### 5.2 낙관적 업데이트 (Optimistic Updates)

```typescript
// client/src/services/bookingService.ts

export async function updateBooking(id: number, data: Partial<Booking>) {
  // 1. 로컬 상태 즉시 업데이트
  const prevBooking = bookings[id];
  setBooking(id, { ...prevBooking, ...data });

  try {
    // 2. 서버에 요청
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error('Update failed');

    // 3. 서버 응답 병합
    const { data: updated } = await res.json();
    setBooking(id, updated);

  } catch (err) {
    // 4. 오류 시 롤백
    setBooking(id, prevBooking);
    throw err;
  }
}
```

---

## 6. 에러 처리 및 로깅

### 6.1 에러 코드 정의

| 코드 | HTTP | 메시지 | 원인 |
|------|------|--------|------|
| INVALID_PNR | 400 | PNR이 유효하지 않음 | 형식 오류 |
| DUPLICATE_PNR | 409 | 이미 존재하는 PNR | 중복 |
| NOT_FOUND | 404 | 예약을 찾을 수 없음 | ID 오류 |
| DATABASE_ERROR | 500 | DB 오류 | 연결 실패 |
| VALIDATION_ERROR | 400 | 유효성 검사 실패 | 필드 오류 |

### 6.2 로깅 구현

```typescript
// server/src/middleware/logger.ts

export function loggerMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.path} ${res.statusCode} ${duration}ms`
    );
  });

  next();
}
```

---

## 7. 성능 최적화

### 7.1 DB 최적화

```sql
-- WAL 모드 활성화
PRAGMA journal_mode = WAL;

-- 동기화 모드 설정 (성능 vs 안정성 트레이드오프)
PRAGMA synchronous = NORMAL;  -- DEFAULT=2(FULL), NORMAL=1, OFF=0

-- 캐시 크기 증가
PRAGMA cache_size = -64000;  -- 64MB
```

### 7.2 API 캐싱

```typescript
// server/src/middleware/cache.ts

export function cacheMiddleware(duration = 60) {
  return (req, res, next) => {
    res.set('Cache-Control', `public, max-age=${duration}`);
    next();
  };
}

// 사용 예시
app.get('/api/schedules', cacheMiddleware(300), scheduleRoutes);
```

### 7.3 쿼리 최적화

```sql
-- 검색 최적화 인덱스
CREATE INDEX idx_airline_date
  ON flight_bookings(airline, departure_date);

CREATE INDEX idx_status_date
  ON flight_bookings(status, departure_date);
```

---

## 참고 자료

- [01-prd.md](./01-prd.md) — 제품 요구사항
- [02-features.md](./02-features.md) — 기능 목록
- [06-tasks.md](./06-tasks.md) — 구현 태스크
