# 🏗️ 여행사 관리 시스템 - 통합 아키텍처

**프로젝트명**: 여행세상 통합 관리 시스템
**버전**: v1.5.0
**작성일**: 2026-01-02
**타겟**: 전주 소재 여행사 (2-3명 규모)
**주요 고객층**: 중장년층 단체 여행 (교회, 동호회)
**목표**: 상담 → 견적서 → 예약 10분 내 완료

---

## 📋 목차

1. [시스템 개요](#시스템-개요)
2. [전체 시스템 아키텍처](#전체-시스템-아키텍처)
3. [기술 스택 상세](#기술-스택-상세)
4. [데이터베이스 스키마 (ERD)](#데이터베이스-스키마-erd)
5. [핵심 데이터 흐름](#핵심-데이터-흐름)
6. [API 엔드포인트 맵](#api-엔드포인트-맵)
7. [핵심 컴포넌트 & 매니저](#핵심-컴포넌트--매니저)
8. [보안 아키텍처](#보안-아키텍처)
9. [확장성 & 로드맵](#확장성--로드맵)
10. [배포 구조](#배포-구조)
11. [성능 고려사항](#성능-고려사항)
12. [주요 특징 요약](#주요-특징-요약)

---

## 🎯 전체 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Browser    │  │   Mobile     │  │  Tablet      │          │
│  │  (Chrome)    │  │  (Safari)    │  │  (Edge)      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         └──────────────────┴──────────────────┘                   │
│                            │                                       │
└────────────────────────────┼───────────────────────────────────────┘
                             │
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                 Frontend Application                      │  │
│  │  ┌─────────────┬──────────────┬──────────────────────┐  │  │
│  │  │  index.html │ Components   │  Static Assets       │  │  │
│  │  │  (Main SPA) │              │                      │  │  │
│  │  ├─────────────┼──────────────┼──────────────────────┤  │  │
│  │  │ Dashboard   │ Sidebar      │ CSS (40KB)          │  │  │
│  │  │ Flight Mgr  │ Modals       │ JS (100KB+)         │  │  │
│  │  │ Group Roster│ Forms        │ Images              │  │  │
│  │  │ Invoice     │ Tables       │ Fonts               │  │  │
│  │  │ Cost Calc   │ Wizards      │                      │  │  │
│  │  └─────────────┴──────────────┴──────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Storage:                                                         │
│  ├─ localStorage (5-10MB)                                        │
│  │  ├─ flight_saves_v2                                          │
│  │  ├─ group-roster-data                                        │
│  │  ├─ invoice_recipients                                       │
│  │  └─ cost_templates                                           │
│  └─ sessionStorage (임시 데이터)                                │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             │ REST API (JSON)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Express.js Backend Server                    │  │
│  │                  (Port: 5000)                             │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │              Route Handlers                         │  │  │
│  │  ├────────────────────────────────────────────────────┤  │  │
│  │  │ /tables/:tableName      # Generic CRUD             │  │  │
│  │  │ /api/invoices           # Invoice Management       │  │  │
│  │  │ /api/flight-schedules   # Flight Schedules         │  │  │
│  │  │ /api/bank-accounts      # Bank Accounts            │  │  │
│  │  │ /api/schedules          # Travel Schedules         │  │  │
│  │  │ /api/sync/*             # Data Synchronization     │  │  │
│  │  │ /api/upload             # File Upload (AI Parse)   │  │  │
│  │  │ /api/cost-calculations  # Cost Calculator          │  │  │
│  │  │ /api/backup/*           # Backup Management        │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │           Business Logic Layer                      │  │  │
│  │  ├────────────────────────────────────────────────────┤  │  │
│  │  │ • Invoice Number Generation (INV-YYYYMMDD-XXX)     │  │  │
│  │  │ • Auto Calculation (Price × Quantity)              │  │  │
│  │  │ • Customer Deduplication (Passport Priority)       │  │  │
│  │  │ • Product Matching (Levenshtein Distance)          │  │  │
│  │  │ • Sync Event Logging                               │  │  │
│  │  │ • Gemini AI Integration (Document Parsing)         │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Middleware:                                                      │
│  ├─ CORS (모든 Origin 허용)                                      │
│  ├─ Body Parser (JSON 10MB)                                      │
│  ├─ Multer (File Upload)                                         │
│  └─ CSP Headers                                                  │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             │ SQL Queries
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              SQLite Database (travel_agency.db)           │  │
│  │                      (256KB ~ 1MB)                        │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │                 11 Tables                           │  │  │
│  │  ├────────────────────────────────────────────────────┤  │  │
│  │  │ customers           # 고객 정보 (여권, 이력)       │  │  │
│  │  │ products            # 여행 상품                     │  │  │
│  │  │ bookings            # 예약                          │  │  │
│  │  │ schedules           # 일정표                        │  │  │
│  │  │ flight_schedules    # 항공 스케줄                  │  │  │
│  │  │ invoices            # 인보이스                      │  │  │
│  │  │ bank_accounts       # 은행 계좌                     │  │  │
│  │  │ cost_calculations   # 원가 계산서                  │  │  │
│  │  │ groups              # 단체 정보                     │  │  │
│  │  │ sync_logs           # 동기화 이력                   │  │  │
│  │  │ notifications, todos                                │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │                   Indexes (13개)                    │  │  │
│  │  ├────────────────────────────────────────────────────┤  │  │
│  │  │ idx_sync_logs_group, idx_sync_logs_created         │  │  │
│  │  │ idx_flight_schedules_group_id                      │  │  │
│  │  │ idx_customers_sync_group                           │  │  │
│  │  │ idx_invoices_date, idx_invoices_flight_schedule    │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │ File I/O
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STORAGE LAYER                                 │
│  ┌──────────────┬──────────────┬──────────────┐                │
│  │   uploads/   │   backups/   │   exports/   │                │
│  │              │              │              │                │
│  │ • PDF Files  │ • DB Backups │ • Excel      │                │
│  │ • Excel      │ • JSON       │ • PDF        │                │
│  │ • Word       │ • Timestamp  │              │                │
│  │ • HWP        │              │              │                │
│  └──────────────┴──────────────┴──────────────┘                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                              │
│  ┌──────────────┬──────────────┬──────────────┐                │
│  │  Gemini AI   │  Font CDN    │  Tailwind    │                │
│  │              │              │              │                │
│  │ • Document   │ • Google     │ • Styling    │                │
│  │   Parsing    │   Fonts      │   Framework  │                │
│  │ • Schedule   │ • Font       │              │                │
│  │   Extraction │   Awesome    │              │                │
│  └──────────────┴──────────────┴──────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💻 기술 스택 상세

### Frontend

```yaml
Core:
  - Vanilla JavaScript (ES6+)
  - HTML5
  - CSS3

Frameworks & Libraries:
  - Tailwind CSS 3.x (CDN)
  - React 18 (단체명단만 - Babel Standalone)
  - XLSX.js 0.18.5 (Excel 처리)

UI Components:
  - Font Awesome 6.4.0 (아이콘)
  - Material Icons (아이콘)
  - Google Fonts (Noto Sans KR)

Module Structure:
  js/
    ├─ app.js (100KB - Main Orchestrator)
    ├─ modules/
    │  ├─ state.js (전역 상태)
    │  ├─ api.js (API 통신)
    │  ├─ ui.js (50KB - UI 렌더링)
    │  ├─ modals.js (19KB - 모달 관리)
    │  ├─ eventHandlers.js (24KB - 이벤트)
    │  └─ sampleData.js (샘플 데이터)
    ├─ flight-sync-manager.js (20KB)
    ├─ group-sync-manager.js (18KB)
    ├─ airport-database.js (10KB)
    └─ cost-calculator.js (56KB)

Build:
  - None (직접 실행)
  - v1.6 예정: Webpack 번들링
```

### Backend

```yaml
Runtime:
  - Node.js (v18+)
  - Express.js 4.19.2

Core Dependencies:
  - sqlite3 5.1.7
  - sqlite 5.1.1
  - cors 2.8.5
  - dotenv 17.2.3

AI & Document Processing:
  - @google/generative-ai 0.24.1 (Gemini)
  - mammoth 1.11.0 (Word)
  - unpdf 1.4.0 (PDF)
  - xlsx 0.18.5 (Excel)

File Handling:
  - multer 2.0.2 (파일 업로드)

Development:
  - nodemon 3.1.11

Architecture:
  backend/
    ├─ server.js (1337줄 - Main Server)
    ├─ database.js (DB 초기화)
    ├─ config.js (설정)
    ├─ routes/
    │  ├─ invoices.js (243줄)
    │  ├─ flight-schedules.js (179줄)
    │  └─ bank-accounts.js (158줄)
    └─ uploads/ (업로드 파일)
```

### Database

```yaml
Type: SQLite 3
File: travel_agency.db (256KB)
Tables: 11개
Indexes: 13개

특징:
  - 파일 기반 (서버리스)
  - 트랜잭션 지원
  - 자동 마이그레이션
  - 외래키 제약조건
```

---

## 🗄️ 데이터베이스 스키마 (ERD)

```
┌─────────────────────────┐
│      customers          │
├─────────────────────────┤
│ PK id                   │
│    name_kor             │
│    name_eng             │
│ UK passport_number      │
│    birth_date           │
│    passport_expiry      │
│    phone                │
│    email                │
│    group_name           │
│    travel_region        │
│    sync_source          │◄───┐
│ FK sync_group_id        │    │
│    is_active            │    │
│    created_at           │    │
└─────────────────────────┘    │
                               │
┌─────────────────────────┐    │
│       products          │    │
├─────────────────────────┤    │
│ PK id                   │    │
│    name                 │    │
│    destination          │    │
│    duration             │    │
│    price                │    │
│    status               │    │
│    created_at           │    │
└─────────────────────────┘    │
          │                    │
          │                    │
┌─────────▼───────────────┐    │
│       bookings          │    │
├─────────────────────────┤    │
│ PK id                   │    │
│ FK customer_id          │    │
│ FK product_id           │    │
│    customer_name        │    │
│    product_name         │    │
│    group_name           │    │
│    departure_date       │    │
│    return_date          │    │
│    participants         │    │
│    total_price          │    │
│    status               │    │
│    created_at           │    │
└─────────────────────────┘    │
                               │
┌─────────────────────────┐    │
│        groups           │    │
├─────────────────────────┤    │
│ PK id                   ├────┘
│    name                 │
│    destination          │
│    departure_date       │
│    return_date          │
│    members (JSON)       │
│    last_sync_at         │
│    sync_status          │
│    created_at           │
└─────────────────────────┘
          │
          │
┌─────────▼───────────────┐
│     sync_logs           │
├─────────────────────────┤
│ PK id                   │
│ FK group_id             │
│    sync_type            │
│    group_name           │
│    operation            │
│    entity_type          │
│    entity_id            │
│    status               │
│    details (JSON)       │
│    error_message        │
│    created_at           │
└─────────────────────────┘

┌─────────────────────────┐
│   flight_schedules      │
├─────────────────────────┤
│ PK id                   │
│ FK group_id             │
│    group_name           │
│    airline              │
│    flight_number        │
│    departure_date       │
│    departure_airport    │
│    departure_time       │
│    arrival_date         │
│    arrival_airport      │
│    arrival_time         │
│    passengers           │
│    created_at           │
└─────────────────────────┘
          │
          │
┌─────────▼───────────────┐
│       invoices          │
├─────────────────────────┤
│ PK id                   │
│ UK invoice_number       │
│ FK flight_schedule_id   │
│ FK bank_account_id      │
│    recipient            │
│    invoice_date         │
│    description          │
│    airfare_unit_price   │
│    airfare_quantity     │
│    airfare_total        │
│    seat_unit_price      │
│    seat_quantity        │
│    seat_total           │
│    total_amount         │
│    pdf_file_path        │
│    created_at           │
│    updated_at           │
└─────────────────────────┘

┌─────────────────────────┐
│    bank_accounts        │
├─────────────────────────┤
│ PK id                   │
│    bank_name            │
│    account_number       │
│    account_holder       │
│    is_default           │
│    created_at           │
└─────────────────────────┘

┌─────────────────────────┐
│       schedules         │
├─────────────────────────┤
│ PK id (AUTO)            │
│    group_name           │
│    event_date           │
│    location             │
│    transport            │
│    time                 │
│    schedule             │
│    meals                │
│    color                │
│    created_at           │
└─────────────────────────┘

┌─────────────────────────┐
│  cost_calculations      │
├─────────────────────────┤
│ PK id (AUTO)            │
│ UK code                 │
│    name                 │
│    destination          │
│    departure_date       │
│    arrival_date         │
│    nights, days         │
│    adults, children     │
│    flight_data (JSON)   │
│    etc_costs (JSON)     │
│    land_cost_1 (JSON)   │
│    land_cost_2 (JSON)   │
│    margin_amount_1      │
│    margin_amount_2      │
│    created_at           │
│    updated_at           │
└─────────────────────────┘
```

---

## 🔄 핵심 데이터 흐름

### 1. 항공편 저장 → 상품 생성 (자동입력)

```
┌──────────────┐
│ 항공사 PNR   │
│ (문자열)      │
└──────┬───────┘
       │
       ▼
┌──────────────────────────┐
│ air1/index.html          │
│ (항공편 변환기)           │
├──────────────────────────┤
│ 1. PNR 파싱              │
│ 2. 항공편 정보 추출      │
│ 3. FlightSyncManager     │
│    .addFlight()          │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ localStorage             │
│ flight_saves_v2          │
├──────────────────────────┤
│ {                        │
│   id: "FLIGHT-xxx",      │
│   name: "단체명",        │
│   airline: "대한항공",   │
│   flights: [...]         │
│ }                        │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ index.html               │
│ (상품 관리 모달)         │
├──────────────────────────┤
│ 1. 항공편 선택           │
│ 2. 자동입력 실행         │
│    • 단체명              │
│    • 목적지              │
│    • 여행기간 계산       │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ POST /tables/products    │
│ (백엔드 API)             │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ SQLite DB                │
│ products 테이블          │
└──────────────────────────┘
```

### 2. 단체명단 → 고객 DB 동기화

```
┌──────────────┐
│ Excel 파일   │
│ (명단)       │
└──────┬───────┘
       │
       ▼
┌──────────────────────────┐
│ group-roster-manager.html│
│ (React 컴포넌트)          │
├──────────────────────────┤
│ 1. XLSX.js 파싱          │
│ 2. 데이터 검증           │
│    • 이름, 여권, 생년월일│
│ 3. localStorage 저장     │
└──────┬───────────────────┘
       │
       ▼ (동기화 버튼)
┌──────────────────────────┐
│ POST /api/sync/customers │
│           /batch         │
├──────────────────────────┤
│ Body: {                  │
│   members: [...],        │
│   group_id: "xxx",       │
│   group_name: "단체명"   │
│ }                        │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Backend Logic            │
├──────────────────────────┤
│ for member in members:   │
│   existing = find        │
│     ByPassport(member)   │
│   if existing:           │
│     UPDATE customers     │
│   else:                  │
│     INSERT customers     │
│                          │
│ INSERT sync_logs         │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ SQLite DB                │
│ • customers (업데이트)   │
│ • sync_logs (이력 기록)  │
└──────────────────────────┘
```

### 3. 일정표 업로드 → Gemini AI 파싱

```
┌──────────────┐
│ PDF/Excel    │
│ (일정표)      │
└──────┬───────┘
       │
       ▼
┌──────────────────────────┐
│ POST /api/upload         │
├──────────────────────────┤
│ FormData:                │
│   schedule_file: File    │
│   group_name: "단체명"   │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Multer (파일 저장)       │
│ uploads/xxx.pdf          │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Gemini AI API            │
├──────────────────────────┤
│ 1. 모델 선택 (동적)      │
│    getLatestFlashModel() │
│ 2. 파일 → Base64         │
│ 3. Prompt 전송           │
│ 4. JSON 응답 파싱        │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ [{                       │
│   event_date: "2025-...",│
│   location: "방콕",      │
│   transport: "전용차량", │
│   schedule: "호텔 체크인"│
│ }]                       │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ INSERT INTO schedules    │
│ (일정 저장)              │
└──────────────────────────┘
```

### 4. 인보이스 생성

```
┌──────────────────────────┐
│ invoice-editor.html      │
├──────────────────────────┤
│ 1. 수신 거래처 입력      │
│ 2. 항공 스케줄 선택      │
│    (FlightSyncManager)   │
│ 3. 항목/금액 입력        │
│ 4. 은행 계좌 선택        │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ 자동 계산                │
│ • 단가 × 수량            │
│ • 총액 합산              │
└──────┬───────────────────┘
       │
       ▼ (미리보기)
┌──────────────────────────┐
│ invoice-preview.html     │
│ (새 창)                  │
├──────────────────────────┤
│ • URL 파라미터 (< 2KB)   │
│ • sessionStorage (>= 2KB)│
└──────┬───────────────────┘
       │
       ▼ (저장)
┌──────────────────────────┐
│ POST /api/invoices       │
├──────────────────────────┤
│ 1. 인보이스 번호 생성    │
│    INV-YYYYMMDD-XXX      │
│ 2. 금액 자동 계산        │
│ 3. DB 저장               │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ SQLite DB                │
│ invoices 테이블          │
└──────────────────────────┘
```

---

## 🔌 API 엔드포인트 맵

### Generic CRUD (범용)

```
GET    /tables/:tableName           # 전체 조회 (limit, sort, order)
GET    /tables/:tableName/:id       # 단일 조회
POST   /tables/:tableName            # 생성 (UUID 자동)
PUT    /tables/:tableName/:id       # 전체 수정
PATCH  /tables/:tableName/:id       # 부분 수정
DELETE /tables/:tableName/:id       # 삭제
```

### Invoices (인보이스)

```
GET    /api/invoices                # 목록 (필터: 일자, 수신처, 페이징)
GET    /api/invoices/:id            # 상세 (flight_schedule, bank_account 포함)
POST   /api/invoices                # 생성 (번호 자동, 계산 자동)
PUT    /api/invoices/:id            # 수정
DELETE /api/invoices/:id            # 삭제
```

### Flight Schedules (항공 스케줄)

```
GET    /api/flight-schedules        # 목록 (필터: group_id, 일자)
GET    /api/flight-schedules/:id    # 상세
POST   /api/flight-schedules        # 생성
PUT    /api/flight-schedules/:id    # 수정
DELETE /api/flight-schedules/:id    # 삭제
```

### Bank Accounts (은행 계좌)

```
GET    /api/bank-accounts           # 목록
GET    /api/bank-accounts/default   # 기본 계좌
POST   /api/bank-accounts           # 추가
PUT    /api/bank-accounts/:id       # 수정
PUT    /api/bank-accounts/:id/set-default  # 기본 설정
DELETE /api/bank-accounts/:id       # 삭제
```

### Schedules (일정)

```
GET    /api/schedules               # 전체 조회 (?group=그룹명)
GET    /api/schedules/:id           # 상세
GET    /api/schedules/date/:date    # 날짜별
GET    /api/schedules/export        # Excel 내보내기
POST   /api/schedules               # 추가
PUT    /api/schedules/:id           # 수정
DELETE /api/schedules/:id           # 삭제
```

### File Upload (AI 파싱)

```
POST   /api/upload                  # 파일 업로드 (PDF, Excel, Word, HWP)
                                    # → Gemini AI 파싱 → DB 저장
```

### Sync (동기화)

```
POST   /api/sync/customers/batch   # 배치 고객 동기화
POST   /api/sync/validate           # 동기화 전 검증
GET    /api/products/match          # 상품 매칭 (유사도)
GET    /api/sync/history            # 동기화 이력
```

### Cost Calculations (원가 계산서)

```
GET    /api/cost-calculations       # 목록
GET    /api/cost-calculations/:id   # 상세
POST   /api/cost-calculations       # 저장 (코드 자동: COST-YYYY-MM-XXX)
DELETE /api/cost-calculations/:id   # 삭제
```

### Backup (백업)

```
GET    /api/backup/database         # JSON 백업
GET    /api/backup/download         # JSON 다운로드
GET    /api/backup/file             # SQLite 파일 백업 (최근 7개 유지)
```

---

## 🛠️ 핵심 컴포넌트 & 매니저

### Frontend Managers

#### 1. FlightSyncManager (flight-sync-manager.js)

```javascript
class FlightSyncManager {
  static STORAGE_KEY = 'flight_saves_v2';

  // CRUD
  static getFlights()        // localStorage 조회
  static getFlightById(id)   // ID로 조회
  static addFlight(data)     // 추가 (ID 자동)
  static updateFlight(id, updates)  // 수정
  static deleteFlight(id)    // 삭제

  // 실시간 동기화
  static onFlightChange(callback)   // Storage Event
  static notifyChange(action, id)   // 변경 알림
}
```

**주요 역할**:
- localStorage 기반 항공편 CRUD
- 실시간 동기화 (Storage Event API)
- invoice-editor.html과 연동

#### 2. GroupSyncManager (group-sync-manager.js)

- 단체명단 ↔ 고객 DB 동기화
- 중복 검사 (여권번호 우선)

#### 3. ProductMatcher (product-matcher.js)

- 목적지 기반 상품 자동 매칭
- Levenshtein Distance 유사도

#### 4. ConflictResolver (conflict-resolver.js)

- 데이터 충돌 해결

#### 5. AutoBackup (auto-backup.js)

- 자동 백업 (v1.6 예정)

### Backend Utilities

#### 1. Invoice Auto Calculation

```javascript
function calculateInvoiceTotals(invoice) {
  airfare_total = unit_price × quantity
  seat_total = unit_price × quantity
  total_amount = airfare_total + seat_total
}
```

#### 2. Invoice Number Generator

```javascript
function generateInvoiceNumber() {
  // INV-20250102-123
  return `INV-${YYYYMMDD}-${random3digit}`
}
```

#### 3. Customer Deduplication

```javascript
async function findExistingCustomer(member) {
  // 우선순위:
  // 1. 여권번호 (가장 신뢰도 높음)
  // 2. 이름 + 생년월일
  // 3. 전화번호 (경고만)
}
```

#### 4. Gemini AI Dynamic Model

```javascript
async function getLatestFlashModel(apiKey) {
  // 최신 Gemini Flash 모델 자동 감지
  // 예: gemini-1.5-flash, gemini-2.0-flash
}
```

---

## 🔐 보안 아키텍처

### 현재 구현

```yaml
Frontend:
  - XSS 방지: 입력값 이스케이프
  - localStorage: 클라이언트 저장 (암호화 없음)
  - CSP: Content-Security-Policy 헤더

Backend:
  - CORS: 모든 Origin 허용 (개발 환경)
  - Body Parser: JSON 10MB 제한
  - SQL Injection: sqlite3 parameterized queries
  - 파일 업로드: Multer 파일 크기 제한

Database:
  - SQLite: 파일 권한 (OS 레벨)
  - Foreign Key: 제약조건 활성화
```

### 개선 필요 (v2.0)

```yaml
Critical:
  - ⚠️ localStorage 민감 정보 암호화
  - ⚠️ HTTPS 강제 (Production)
  - ⚠️ API 인증 (JWT Token)
  - ⚠️ CORS 출처 제한

Important:
  - Rate Limiting (DDoS 방지)
  - CSRF Token
  - Input Validation 강화
  - 파일 업로드 검증 (MIME Type)
```

---

## 📈 확장성 & 로드맵

### Phase 1: 현재 (v1.5.0) ✅

```
Architecture: Monolith (Single Server)
Frontend: Vanilla JS
Backend: Express.js
Database: SQLite (256KB)
Storage: localStorage (5-10MB)
Users: 1-3명 (동시)

장점: 간단, 빠른 개발
단점: 확장성 제한
```

### Phase 2: 자동화 (v1.6~v1.8)

```
목표:
  - IndexedDB 마이그레이션 (50MB+)
  - 자동 백업 (매일 23:00)
  - 템플릿 시스템
  - 일괄 작업

변경사항:
  + Webpack 번들링
  + Service Worker (오프라인)
  + 백업 파일 다운로드/복원
```

### Phase 3: 클라우드 (v2.0~v2.2)

```
Architecture: Cloud-Native
Frontend: Next.js + React
Backend: Next.js API Routes
Database: Supabase (PostgreSQL)
Auth: Supabase Auth
Deploy: Vercel
CDN: CloudFront

추가 기능:
  - 실시간 동기화
  - 다중 디바이스
  - 협업 기능
  - PWA (모바일 앱)
  - 사용자 권한 관리

예상 사용자: 5-10명 (동시)
```

### Phase 4: AI & 분석 (v3.0~)

```
Architecture: Microservices
AI: OpenAI API (GPT-4)
Analytics: Custom Dashboard
Infrastructure: AWS ECS/Fargate

추가 기능:
  - AI 가격 추천
  - 수요 예측
  - 고객 분석 (LTV, 재방문율)
  - 매출 대시보드
  - 트렌드 분석
```

---

## 🚀 배포 구조

### 현재 (로컬 개발 환경)

```
┌─────────────────────────┐
│   Local Machine         │
├─────────────────────────┤
│ Backend:                │
│   node server.js        │
│   Port: 5000            │
│                         │
│ Frontend:               │
│   http://localhost:5000 │
│   정적 파일 서빙        │
│                         │
│ Database:               │
│   travel_agency.db      │
│   (256KB 파일)          │
└─────────────────────────┘
```

### v1.6 (로컬 + 백업)

```
┌─────────────────────────┐
│   Local Machine         │
│                         │
│ + IndexedDB (50MB)      │
│ + 자동 백업 (매일)      │
│ + backups/ 폴더         │
│   (최근 7개 유지)       │
└─────────────────────────┘
```

### v2.0 (클라우드)

```
┌─────────────────────────┐
│   Vercel (Frontend)     │
│   Next.js               │
│   Static Assets         │
└───────┬─────────────────┘
        │
        ▼
┌─────────────────────────┐
│   Supabase (Backend)    │
│   PostgreSQL            │
│   Auth                  │
│   Real-time Sync        │
└─────────────────────────┘
```

---

## 📊 성능 고려사항

### 현재 성능

```
Frontend:
  - 초기 로드: ~2초 (Tailwind CDN 포함)
  - localStorage 읽기: < 10ms
  - 페이지 전환: < 100ms

Backend:
  - API 응답: 10-50ms (SQLite)
  - 파일 업로드: 1-5초 (Gemini AI)
  - Excel 내보내기: < 500ms

Database:
  - 조회: < 10ms
  - 삽입: < 5ms
  - 인덱스: 13개
```

### 병목 지점

```
1. localStorage 용량 제한 (5-10MB)
   → v1.6: IndexedDB (50MB+)

2. Gemini AI 응답 시간 (1-5초)
   → 캐싱, 비동기 처리

3. 대량 데이터 렌더링 (100+ 항목)
   → 페이지네이션, Virtual Scroll

4. Excel 파싱 (대용량 파일)
   → Web Worker
```

---

## 📝 주요 특징 요약

### 1. 하이브리드 아키텍처
- Frontend: Vanilla JS + React (부분)
- Backend: Express.js
- Database: SQLite
- Storage: localStorage + (v1.6) IndexedDB

### 2. AI 통합
- Gemini AI: 문서 자동 파싱
- 동적 모델 선택 (최신 Flash)
- PDF, Excel, Word, HWP 지원

### 3. 데이터 동기화
- FlightSyncManager: 항공편 동기화
- GroupSyncManager: 단체명단 ↔ 고객 DB
- localStorage ↔ Backend 실시간 동기화

### 4. 자동화 기능
- 인보이스 번호 자동 생성
- 금액 자동 계산
- 항공편 → 상품 자동입력
- 고객 중복 자동 검사

### 5. 확장 가능한 설계
- Phase 1: Monolith (현재)
- Phase 2: 자동화
- Phase 3: Cloud-Native
- Phase 4: AI & Microservices

---

## 🎯 핵심 비즈니스 로직

### 1. 중복 고객 검사 (우선순위)

```
1순위: 여권번호 (가장 신뢰도 높음)
2순위: 이름 + 생년월일
3순위: 전화번호 (경고만)
```

### 2. 인보이스 번호 생성

```
Format: INV-YYYYMMDD-XXX
Example: INV-20250102-123
```

### 3. 원가 계산서 코드 생성

```
Format: COST-YYYY-MM-XXX
Example: COST-2025-01-001
```

### 4. 상품 자동 매칭 (유사도)

```
Levenshtein Distance 알고리즘
유사도 = 1 - (편집거리 / 최대길이)
```

---

## 📚 관련 문서

- [USER_FLOW.md](../../USER_FLOW.md) - 핵심 업무 플로우
- [ROADMAP.md](../../ROADMAP.md) - 개발 로드맵
- [PRD_v1.0.md](../../PRD_v1.0.md) - 제품 요구사항
- [Database-Design.md](./Database-Design.md) - DB 설계
- [Design-System.md](./Design-System.md) - 디자인 시스템

---

**작성일**: 2026-01-02
**버전**: v1.0
**다음 업데이트**: Phase 2 시작 시
