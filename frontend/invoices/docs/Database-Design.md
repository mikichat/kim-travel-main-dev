# Database Design — 인보이스 생성 시스템

## 1. 개요

본 문서는 인보이스 생성 시스템의 데이터베이스 설계를 정의합니다.

### 1.1 설계 목표
- 항공 스케줄 정보의 일원화된 관리
- 은행 계좌 정보의 일원화된 관리
- 인보이스 메타데이터 저장
- 자동 계산 로직 지원을 위한 구조

### 1.2 데이터베이스 시스템
- **Node.js**: SQLite 3
- **Python**: PostgreSQL 14+ (또는 SQLite)
- **문자 인코딩**: UTF-8
- **타임존**: Asia/Seoul

---

## 2. ERD (Entity Relationship Diagram)

```
┌──────────────────┐
│ flight_schedules │
│  (항공 스케줄)    │
└────────┬─────────┘
         │ 1
         │
         │ N
    ┌────┴────┐
    │        │
┌───┴───┐ ┌─┴──────────┐
│invoices│ │bank_accounts│
│(인보이스)│ │(은행 계좌) │
└────────┘ └────────────┘
    │            │
    └─────┬──────┘
          │
          │ N
          │
    ┌─────┴─────┐
    │ invoices │
    │(인보이스) │
    └──────────┘
```

---

## 3. 테이블 상세 설계

### 3.1 flight_schedules (항공 스케줄)

**목적**: 항공 스케줄 정보를 저장하고 인보이스에서 재사용

#### 3.1.1 스키마 (SQLite)

| 컬럼명 | 데이터 타입 | 제약조건 | 기본값 | 설명 |
|--------|------------|---------|--------|------|
| **id** | TEXT | PRIMARY KEY | - | 항공 스케줄 고유 식별자 |
| **group_id** | TEXT | FOREIGN KEY | - | 단체 ID (선택적) |
| **group_name** | TEXT | | - | 단체명 |
| **airline** | TEXT | NOT NULL | - | 항공사명 |
| **flight_number** | TEXT | | - | 항공편명 |
| **departure_date** | TEXT | NOT NULL | - | 출발일 |
| **departure_airport** | TEXT | NOT NULL | - | 출발 공항 코드 |
| **departure_time** | TEXT | NOT NULL | - | 출발 시간 |
| **arrival_date** | TEXT | NOT NULL | - | 도착일 |
| **arrival_airport** | TEXT | NOT NULL | - | 도착 공항 코드 |
| **arrival_time** | TEXT | NOT NULL | - | 도착 시간 |
| **passengers** | INTEGER | | 0 | 승객 수 |
| **created_at** | TEXT | | (datetime('now','localtime')) | 생성 일시 |

#### 3.1.2 DDL (SQLite)

```sql
CREATE TABLE IF NOT EXISTS flight_schedules (
    id TEXT PRIMARY KEY,
    group_id TEXT,
    group_name TEXT,
    airline TEXT NOT NULL,
    flight_number TEXT,
    departure_date TEXT NOT NULL,
    departure_airport TEXT NOT NULL,
    departure_time TEXT NOT NULL,
    arrival_date TEXT NOT NULL,
    arrival_airport TEXT NOT NULL,
    arrival_time TEXT NOT NULL,
    passengers INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_flight_schedules_group_id ON flight_schedules(group_id);
CREATE INDEX IF NOT EXISTS idx_flight_schedules_departure ON flight_schedules(departure_date);
```

#### 3.1.3 DDL (PostgreSQL)

```sql
CREATE TABLE flight_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    group_name VARCHAR(255),
    airline VARCHAR(255) NOT NULL,
    flight_number VARCHAR(50),
    departure_date DATE NOT NULL,
    departure_airport VARCHAR(10) NOT NULL,
    departure_time TIME NOT NULL,
    arrival_date DATE NOT NULL,
    arrival_airport VARCHAR(10) NOT NULL,
    arrival_time TIME NOT NULL,
    passengers INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_flight_schedules_group_id ON flight_schedules(group_id);
CREATE INDEX idx_flight_schedules_departure ON flight_schedules(departure_date);
```

#### 3.1.4 비즈니스 규칙
1. 항공 스케줄은 여러 인보이스에서 재사용 가능
2. group_id는 선택적 (단체와 연동 가능)
3. 출발일 기준으로 정렬하여 조회

---

### 3.2 bank_accounts (은행 계좌 정보)

**목적**: 은행 계좌 정보를 저장하고 인보이스에서 재사용

#### 3.2.1 스키마 (SQLite)

| 컬럼명 | 데이터 타입 | 제약조건 | 기본값 | 설명 |
|--------|------------|---------|--------|------|
| **id** | TEXT | PRIMARY KEY | - | 은행 계좌 고유 식별자 |
| **bank_name** | TEXT | NOT NULL | - | 은행명 |
| **account_number** | TEXT | NOT NULL | - | 계좌번호 |
| **account_holder** | TEXT | NOT NULL | - | 예금주 |
| **is_default** | INTEGER | | 0 | 기본 계좌 여부 (0: 아니오, 1: 예) |
| **created_at** | TEXT | | (datetime('now','localtime')) | 생성 일시 |

#### 3.2.2 DDL (SQLite)

```sql
CREATE TABLE IF NOT EXISTS bank_accounts (
    id TEXT PRIMARY KEY,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_holder TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_default ON bank_accounts(is_default);
```

#### 3.2.3 DDL (PostgreSQL)

```sql
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_holder VARCHAR(255) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bank_accounts_default ON bank_accounts(is_default);
```

#### 3.2.4 비즈니스 규칙
1. 기본 계좌는 하나만 설정 가능
2. 은행 계좌는 여러 인보이스에서 재사용 가능
3. 계좌번호는 중복 허용 (다른 은행일 수 있음)

---

### 3.3 invoices (인보이스 메타데이터)

**목적**: 인보이스 정보를 저장하고 PDF 생성에 사용

#### 3.3.1 스키마 (SQLite)

| 컬럼명 | 데이터 타입 | 제약조건 | 기본값 | 설명 |
|--------|------------|---------|--------|------|
| **id** | TEXT | PRIMARY KEY | - | 인보이스 고유 식별자 |
| **invoice_number** | TEXT | UNIQUE | - | 인보이스 번호 |
| **recipient** | TEXT | NOT NULL | - | 수신 |
| **invoice_date** | TEXT | NOT NULL | - | 일자 |
| **description** | TEXT | | - | 설명 |
| **flight_schedule_id** | TEXT | FOREIGN KEY | - | 항공 스케줄 ID |
| **airfare_unit_price** | INTEGER | | 0 | 항공료 단가 |
| **airfare_quantity** | INTEGER | | 0 | 항공료 수량 |
| **airfare_total** | INTEGER | | 0 | 항공료 합계 |
| **seat_preference_unit_price** | INTEGER | | 0 | 선호좌석 단가 |
| **seat_preference_quantity** | INTEGER | | 0 | 선호좌석 수량 |
| **seat_preference_total** | INTEGER | | 0 | 선호좌석 합계 |
| **total_amount** | INTEGER | NOT NULL | - | 총액 |
| **bank_account_id** | TEXT | FOREIGN KEY | - | 은행 계좌 ID |
| **logo_path** | TEXT | | - | 로고 이미지 경로 |
| **seal_path** | TEXT | | - | 도장 이미지 경로 |
| **pdf_file_path** | TEXT | | - | PDF 파일 경로 |
| **created_at** | TEXT | | (datetime('now','localtime')) | 생성 일시 |
| **updated_at** | TEXT | | (datetime('now','localtime')) | 수정 일시 |

#### 3.3.2 DDL (SQLite)

```sql
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE,
    recipient TEXT NOT NULL,
    invoice_date TEXT NOT NULL,
    description TEXT,
    flight_schedule_id TEXT,
    airfare_unit_price INTEGER DEFAULT 0,
    airfare_quantity INTEGER DEFAULT 0,
    airfare_total INTEGER DEFAULT 0,
    seat_preference_unit_price INTEGER DEFAULT 0,
    seat_preference_quantity INTEGER DEFAULT 0,
    seat_preference_total INTEGER DEFAULT 0,
    total_amount INTEGER NOT NULL,
    bank_account_id TEXT,
    logo_path TEXT,
    seal_path TEXT,
    pdf_file_path TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (flight_schedule_id) REFERENCES flight_schedules(id) ON DELETE SET NULL,
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_flight_schedule ON invoices(flight_schedule_id);
CREATE INDEX IF NOT EXISTS idx_invoices_bank_account ON invoices(bank_account_id);
```

#### 3.3.3 DDL (PostgreSQL)

```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    invoice_date DATE NOT NULL,
    description TEXT,
    flight_schedule_id UUID REFERENCES flight_schedules(id) ON DELETE SET NULL,
    airfare_unit_price DECIMAL(12,2) DEFAULT 0,
    airfare_quantity INTEGER DEFAULT 0,
    airfare_total DECIMAL(12,2) DEFAULT 0,
    seat_preference_unit_price DECIMAL(12,2) DEFAULT 0,
    seat_preference_quantity INTEGER DEFAULT 0,
    seat_preference_total DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    logo_path VARCHAR(500),
    seal_path VARCHAR(500),
    pdf_file_path VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_flight_schedule ON invoices(flight_schedule_id);
CREATE INDEX idx_invoices_bank_account ON invoices(bank_account_id);
```

#### 3.3.4 비즈니스 규칙
1. 인보이스 번호는 고유해야 함
2. 항공 스케줄 및 은행 계좌는 선택적 (NULL 허용)
3. 총액은 항공료 합계 + 선호좌석 합계로 자동 계산
4. PDF 파일 경로는 생성 후 저장

---

## 4. 자동 계산 로직

### 4.1 계산 공식

```sql
-- 항공료 합계
airfare_total = airfare_unit_price × airfare_quantity

-- 선호좌석 합계
seat_preference_total = seat_preference_unit_price × seat_preference_quantity

-- 총액
total_amount = airfare_total + seat_preference_total
```

### 4.2 계산 트리거 조건

| 변경 필드 | 재계산 대상 |
|----------|------------|
| airfare_unit_price | airfare_total, total_amount |
| airfare_quantity | airfare_total, total_amount |
| seat_preference_unit_price | seat_preference_total, total_amount |
| seat_preference_quantity | seat_preference_total, total_amount |

---

## 5. 데이터 무결성 규칙

### 5.1 참조 무결성
- flight_schedule_id는 flight_schedules.id 참조 (ON DELETE SET NULL)
- bank_account_id는 bank_accounts.id 참조 (ON DELETE SET NULL)
- 삭제 시 인보이스는 유지되며 참조만 NULL로 설정

### 5.2 도메인 무결성
- invoice_number는 UNIQUE 제약조건
- recipient, invoice_date, total_amount는 NOT NULL
- 금액 필드는 0 이상의 값만 허용

---

## 6. 인덱싱 전략

### 6.1 조회 성능 최적화
- flight_schedules.group_id: 단체별 조회
- flight_schedules.departure_date: 날짜 범위 검색
- bank_accounts.is_default: 기본 계좌 조회
- invoices.invoice_date: 날짜별 조회
- invoices.flight_schedule_id: 항공 스케줄별 조회
- invoices.bank_account_id: 은행 계좌별 조회

---

## 7. 마이그레이션 전략

### 7.1 Node.js (SQLite)
- `backend/migrate_invoice_tables.js` 스크립트 생성
- 기존 database.js에 테이블 생성 로직 추가

### 7.2 Python (PostgreSQL)
- Alembic 마이그레이션 파일 생성
- 또는 models.py에 테이블 정의 추가

---

**작성일**: 2026-01-01
**버전**: 1.0
**작성자**: Database Design Team
