# Database Design — 여행사 계약·견적·일정 자동화 시스템

## 1. 개요

본 문서는 여행사 인트라넷 시스템의 데이터베이스 설계를 정의합니다.

### 1.1 설계 목표
- 단체 정보의 일원화된 관리
- 자동 계산 로직 지원을 위한 유연한 구조
- 문서 이력 및 감사 추적 지원
- 확장 가능한 스키마 구조

### 1.2 데이터베이스 시스템
- **DBMS**: PostgreSQL 14+
- **문자 인코딩**: UTF-8
- **타임존**: Asia/Seoul

---

## 2. ERD (Entity Relationship Diagram)

```
┌─────────────────┐
│     groups      │
│ (단체 기본정보)  │
└────────┬────────┘
         │ 1
         │
         │ N
    ┌────┴────┬─────────┬──────────────┐
    │         │         │              │
┌───┴───┐ ┌──┴──┐  ┌───┴────┐  ┌─────┴─────┐
│itinerary│ │cancel│  │includes│  │documents │
│(일정)   │ │rules │  │(포함항목)│  │(문서이력)│
└─────────┘ └─────┘  └────────┘  └───────────┘

                    ┌──────────────┐
                    │ audit_logs   │
                    │ (감사 로그)   │
                    └──────────────┘
```

---

## 3. 테이블 상세 설계

### 3.1 groups (단체 기본 정보)

**목적**: 여행 단체의 핵심 정보를 저장하고 모든 자동 계산의 기준이 되는 테이블

#### 3.1.1 스키마

| 컬럼명 | 데이터 타입 | 제약조건 | 기본값 | 설명 |
|--------|------------|---------|--------|------|
| **id** | UUID | PRIMARY KEY | gen_random_uuid() | 단체 고유 식별자 |
| **name** | VARCHAR(255) | NOT NULL | - | 단체명 (중복 허용) |
| **start_date** | DATE | NOT NULL | - | 출발일 (모든 계산의 기준) |
| **end_date** | DATE | NOT NULL, CHECK(end_date > start_date) | - | 도착일 |
| **nights** | INTEGER | NOT NULL | - | 박수 (자동 계산) |
| **nights_manual** | BOOLEAN | NOT NULL | FALSE | 박수 수동 수정 여부 |
| **days** | INTEGER | NOT NULL | - | 일수 (자동 계산) |
| **days_manual** | BOOLEAN | NOT NULL | FALSE | 일수 수동 수정 여부 |
| **pax** | INTEGER | NOT NULL, CHECK(pax > 0) | - | 인원수 |
| **price_per_pax** | DECIMAL(12,2) | NOT NULL, CHECK(price_per_pax >= 0) | - | 1인당 요금 |
| **total_price** | DECIMAL(12,2) | NOT NULL | - | 총액 (자동 계산) |
| **total_price_manual** | BOOLEAN | NOT NULL | FALSE | 총액 수동 수정 여부 |
| **deposit** | DECIMAL(12,2) | CHECK(deposit >= 0) | 0 | 계약금 |
| **balance** | DECIMAL(12,2) | NOT NULL | - | 잔액 (자동 계산) |
| **balance_manual** | BOOLEAN | NOT NULL | FALSE | 잔액 수동 수정 여부 |
| **balance_due_date** | DATE | - | - | 잔액 완납일 (자동 계산) |
| **balance_due_date_manual** | BOOLEAN | NOT NULL | FALSE | 잔액 완납일 수동 수정 여부 |
| **status** | VARCHAR(20) | NOT NULL, CHECK(status IN ('estimate', 'contract', 'confirmed')) | 'estimate' | 상태 (견적/계약/확정) |
| **created_by** | VARCHAR(100) | - | - | 생성자 |
| **created_at** | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 생성 일시 |
| **updated_by** | VARCHAR(100) | - | - | 최종 수정자 |
| **updated_at** | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 수정 일시 |

#### 3.1.2 인덱스

```sql
-- 기본 키
CREATE INDEX idx_groups_pk ON groups(id);

-- 단체명 검색용
CREATE INDEX idx_groups_name ON groups(name);

-- 출발일 범위 검색용
CREATE INDEX idx_groups_start_date ON groups(start_date);

-- 상태별 필터링용
CREATE INDEX idx_groups_status ON groups(status);

-- 복합 인덱스 (상태 + 출발일)
CREATE INDEX idx_groups_status_start_date ON groups(status, start_date);
```

#### 3.1.3 DDL

```sql
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL CHECK (end_date > start_date),
    nights INTEGER NOT NULL,
    nights_manual BOOLEAN NOT NULL DEFAULT FALSE,
    days INTEGER NOT NULL,
    days_manual BOOLEAN NOT NULL DEFAULT FALSE,
    pax INTEGER NOT NULL CHECK (pax > 0),
    price_per_pax DECIMAL(12,2) NOT NULL CHECK (price_per_pax >= 0),
    total_price DECIMAL(12,2) NOT NULL,
    total_price_manual BOOLEAN NOT NULL DEFAULT FALSE,
    deposit DECIMAL(12,2) DEFAULT 0 CHECK (deposit >= 0),
    balance DECIMAL(12,2) NOT NULL,
    balance_manual BOOLEAN NOT NULL DEFAULT FALSE,
    balance_due_date DATE,
    balance_due_date_manual BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'estimate' CHECK (status IN ('estimate', 'contract', 'confirmed')),
    created_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_groups_name ON groups(name);
CREATE INDEX idx_groups_start_date ON groups(start_date);
CREATE INDEX idx_groups_status ON groups(status);
CREATE INDEX idx_groups_status_start_date ON groups(status, start_date);
```

#### 3.1.4 비즈니스 규칙

1. **단체명 중복 허용**: name 컬럼에 UNIQUE 제약조건 없음. 고유 식별은 id(UUID) 사용
2. **자동/수동 플래그**: 모든 자동 계산 컬럼에는 `*_manual` 플래그 포함
3. **상태 전환**: estimate → contract → confirmed 순서로만 전환 가능
4. **계약금 검증**: deposit ≤ total_price 검증 필요
5. **출발일 기준 계산**: start_date 변경 시 모든 관련 날짜 자동 재계산

---

### 3.2 group_itinerary (일정)

**목적**: 단체별 일정 정보를 일차(day_no) 순서로 관리

#### 3.2.1 스키마

| 컬럼명 | 데이터 타입 | 제약조건 | 기본값 | 설명 |
|--------|------------|---------|--------|------|
| **id** | UUID | PRIMARY KEY | gen_random_uuid() | 일정 고유 식별자 |
| **group_id** | UUID | NOT NULL, FOREIGN KEY | - | 단체 ID |
| **day_no** | INTEGER | NOT NULL, CHECK(day_no > 0) | - | 일차 번호 (1부터 시작) |
| **itinerary_date** | DATE | NOT NULL | - | 일정 날짜 (자동 계산) |
| **itinerary_date_manual** | BOOLEAN | NOT NULL | FALSE | 일정 날짜 수동 수정 여부 |
| **location** | VARCHAR(255) | - | - | 지역/장소 |
| **transport** | VARCHAR(255) | - | - | 교통편 정보 |
| **time** | VARCHAR(50) | - | - | 시간 정보 |
| **schedule** | TEXT | - | - | 일정 내용 |
| **meals** | VARCHAR(255) | - | - | 식사 정보 |
| **accommodation** | VARCHAR(255) | - | - | 숙박 정보 |
| **created_at** | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 생성 일시 |
| **updated_at** | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 수정 일시 |

#### 3.2.2 제약조건

```sql
-- group_id + day_no 복합 유니크 (동일 단체 내 일차 중복 방지)
CONSTRAINT uk_itinerary_group_day UNIQUE (group_id, day_no)

-- 외래키
CONSTRAINT fk_itinerary_group FOREIGN KEY (group_id)
    REFERENCES groups(id) ON DELETE CASCADE
```

#### 3.2.3 인덱스

```sql
-- 단체별 일정 조회용
CREATE INDEX idx_itinerary_group_id ON group_itinerary(group_id);

-- 단체별 일차 순서 정렬용
CREATE INDEX idx_itinerary_group_day ON group_itinerary(group_id, day_no);
```

#### 3.2.4 DDL

```sql
CREATE TABLE group_itinerary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    day_no INTEGER NOT NULL CHECK (day_no > 0),
    itinerary_date DATE NOT NULL,
    itinerary_date_manual BOOLEAN NOT NULL DEFAULT FALSE,
    location VARCHAR(255),
    transport VARCHAR(255),
    time VARCHAR(50),
    schedule TEXT,
    meals VARCHAR(255),
    accommodation VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_itinerary_group_day UNIQUE (group_id, day_no)
);

-- 인덱스 생성
CREATE INDEX idx_itinerary_group_id ON group_itinerary(group_id);
CREATE INDEX idx_itinerary_group_day ON group_itinerary(group_id, day_no);
```

#### 3.2.5 비즈니스 규칙

1. **일정 날짜 자동 계산**: `itinerary_date = start_date + (day_no - 1)`
2. **출발일 변경 시 재배치**: start_date 변경 시 수동 수정 여부와 관계없이 모든 일정 날짜 재계산
3. **day_no 유지**: 일정 삭제 시 남은 일정의 day_no는 유지 (재정렬하지 않음)
4. **일차 중복 방지**: 동일 단체 내 day_no는 UNIQUE

---

### 3.3 group_cancel_rules (취소 규정)

**목적**: 단체별 취소 규정 및 위약금 정보 관리

#### 3.3.1 스키마

| 컬럼명 | 데이터 타입 | 제약조건 | 기본값 | 설명 |
|--------|------------|---------|--------|------|
| **id** | UUID | PRIMARY KEY | gen_random_uuid() | 취소 규정 고유 식별자 |
| **group_id** | UUID | NOT NULL, FOREIGN KEY | - | 단체 ID |
| **days_before** | INTEGER | NOT NULL | - | 출발일 기준 며칠 전 |
| **cancel_date** | DATE | NOT NULL | - | 취소 기준일 (자동 계산) |
| **cancel_date_manual** | BOOLEAN | NOT NULL | FALSE | 취소 기준일 수동 수정 여부 |
| **penalty_rate** | DECIMAL(5,2) | NOT NULL, CHECK(penalty_rate >= 0 AND penalty_rate <= 100) | - | 위약금 비율 (%) |
| **penalty_amount** | DECIMAL(12,2) | - | - | 위약금 금액 |
| **description** | TEXT | - | - | 취소 규정 설명 |
| **created_at** | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 생성 일시 |

#### 3.3.2 제약조건

```sql
-- 외래키
CONSTRAINT fk_cancel_rules_group FOREIGN KEY (group_id)
    REFERENCES groups(id) ON DELETE CASCADE
```

#### 3.3.3 인덱스

```sql
-- 단체별 취소 규정 조회용
CREATE INDEX idx_cancel_rules_group_id ON group_cancel_rules(group_id);

-- 정렬용 (days_before 기준 내림차순)
CREATE INDEX idx_cancel_rules_days_before ON group_cancel_rules(group_id, days_before DESC);
```

#### 3.3.4 DDL

```sql
CREATE TABLE group_cancel_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    days_before INTEGER NOT NULL,
    cancel_date DATE NOT NULL,
    cancel_date_manual BOOLEAN NOT NULL DEFAULT FALSE,
    penalty_rate DECIMAL(5,2) NOT NULL CHECK (penalty_rate >= 0 AND penalty_rate <= 100),
    penalty_amount DECIMAL(12,2),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_cancel_rules_group_id ON group_cancel_rules(group_id);
CREATE INDEX idx_cancel_rules_days_before ON group_cancel_rules(group_id, days_before DESC);
```

#### 3.3.5 비즈니스 규칙

1. **취소일 자동 계산**: `cancel_date = start_date - days_before`
2. **출발일 변경 시 재계산**: start_date 변경 시 모든 취소 규정의 cancel_date 자동 재계산
3. **정렬 규칙**: days_before 기준 내림차순 정렬 (가장 늦은 날짜부터)
4. **위약금 비율**: 0~100 사이의 값만 허용

---

### 3.4 group_includes (포함/불포함 항목)

**목적**: 단체별 포함/불포함 항목 관리

#### 3.4.1 스키마

| 컬럼명 | 데이터 타입 | 제약조건 | 기본값 | 설명 |
|--------|------------|---------|--------|------|
| **id** | UUID | PRIMARY KEY | gen_random_uuid() | 항목 고유 식별자 |
| **group_id** | UUID | NOT NULL, FOREIGN KEY | - | 단체 ID |
| **item_type** | VARCHAR(20) | NOT NULL, CHECK(item_type IN ('include', 'exclude')) | - | 포함/불포함 구분 |
| **category** | VARCHAR(100) | - | - | 항목 카테고리 (항공, 호텔, 식사 등) |
| **description** | TEXT | NOT NULL | - | 항목 설명 |
| **display_order** | INTEGER | NOT NULL | 0 | 표시 순서 |
| **created_at** | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 생성 일시 |

#### 3.4.2 제약조건

```sql
-- 외래키
CONSTRAINT fk_includes_group FOREIGN KEY (group_id)
    REFERENCES groups(id) ON DELETE CASCADE
```

#### 3.4.3 인덱스

```sql
-- 단체별 항목 조회용
CREATE INDEX idx_includes_group_id ON group_includes(group_id);

-- 정렬용 (타입 + 순서)
CREATE INDEX idx_includes_type_order ON group_includes(group_id, item_type, display_order);
```

#### 3.4.4 DDL

```sql
CREATE TABLE group_includes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('include', 'exclude')),
    category VARCHAR(100),
    description TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_includes_group_id ON group_includes(group_id);
CREATE INDEX idx_includes_type_order ON group_includes(group_id, item_type, display_order);
```

---

### 3.5 documents (문서 이력)

**목적**: 생성된 PDF 문서의 이력 및 버전 관리

#### 3.5.1 스키마

| 컬럼명 | 데이터 타입 | 제약조건 | 기본값 | 설명 |
|--------|------------|---------|--------|------|
| **id** | UUID | PRIMARY KEY | gen_random_uuid() | 문서 고유 식별자 |
| **group_id** | UUID | NOT NULL, FOREIGN KEY | - | 단체 ID |
| **document_type** | VARCHAR(20) | NOT NULL, CHECK(document_type IN ('estimate', 'contract', 'itinerary', 'bundle')) | - | 문서 종류 |
| **version** | INTEGER | NOT NULL | 1 | 버전 번호 |
| **file_path** | VARCHAR(500) | NOT NULL | - | PDF 파일 저장 경로 |
| **file_name** | VARCHAR(255) | NOT NULL | - | 파일명 |
| **generated_at** | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 생성 일시 |
| **generated_by** | VARCHAR(100) | - | - | 생성자 |
| **file_size** | BIGINT | - | - | 파일 크기 (bytes) |

#### 3.5.2 제약조건

```sql
-- 외래키
CONSTRAINT fk_documents_group FOREIGN KEY (group_id)
    REFERENCES groups(id) ON DELETE CASCADE
```

#### 3.5.3 인덱스

```sql
-- 단체별 문서 조회용
CREATE INDEX idx_documents_group_id ON documents(group_id);

-- 버전 관리용
CREATE INDEX idx_documents_type_version ON documents(group_id, document_type, version DESC);

-- 생성일시 조회용
CREATE INDEX idx_documents_generated_at ON documents(generated_at DESC);
```

#### 3.5.4 DDL

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('estimate', 'contract', 'itinerary', 'bundle')),
    version INTEGER NOT NULL DEFAULT 1,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    generated_by VARCHAR(100),
    file_size BIGINT
);

-- 인덱스 생성
CREATE INDEX idx_documents_group_id ON documents(group_id);
CREATE INDEX idx_documents_type_version ON documents(group_id, document_type, version DESC);
CREATE INDEX idx_documents_generated_at ON documents(generated_at DESC);
```

#### 3.5.5 파일명 규칙

- **견적서**: `견적서_{단체명}_v{version}_{YYYYMMDD}.pdf`
- **계약서**: `계약서_{단체명}_v{version}_{YYYYMMDD}.pdf`
- **일정표**: `일정표_{단체명}_v{version}_{YYYYMMDD}.pdf`
- **통합**: `통합_{단체명}_v{version}_{YYYYMMDD}.pdf`

---

### 3.6 audit_logs (감사 로그)

**목적**: 시스템 내 모든 중요 작업의 감사 추적

#### 3.6.1 스키마

| 컬럼명 | 데이터 타입 | 제약조건 | 기본값 | 설명 |
|--------|------------|---------|--------|------|
| **id** | UUID | PRIMARY KEY | gen_random_uuid() | 로그 고유 식별자 |
| **action** | VARCHAR(50) | NOT NULL | - | 액션 타입 (AUTO_CALCULATE, MANUAL_MODIFY 등) |
| **entity_type** | VARCHAR(50) | NOT NULL | - | 엔티티 타입 (group, document 등) |
| **entity_id** | UUID | NOT NULL | - | 엔티티 ID |
| **field_name** | VARCHAR(100) | - | - | 수정된 필드명 |
| **old_value** | TEXT | - | - | 이전 값 |
| **new_value** | TEXT | - | - | 새 값 |
| **reason** | TEXT | - | - | 수정 사유 (수동 수정인 경우) |
| **metadata** | JSONB | - | - | 추가 메타데이터 |
| **user_id** | VARCHAR(100) | NOT NULL | - | 사용자 ID |
| **ip_address** | VARCHAR(45) | - | - | IP 주소 |
| **created_at** | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 생성 일시 |

#### 3.6.2 인덱스

```sql
-- 엔티티 조회용
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- 사용자별 조회용
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);

-- 액션별 조회용
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- 날짜별 조회용
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

#### 3.6.3 DDL

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    metadata JSONB,
    user_id VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

---

## 4. 자동 계산 로직 관련 설계

### 4.1 계산 트리거 조건

| 변경 필드 | 재계산 대상 |
|----------|------------|
| start_date | nights, days, balance_due_date, itinerary_dates, cancel_dates |
| end_date | nights, days |
| pax | total_price, balance |
| price_per_pax | total_price, balance |
| deposit | balance |

### 4.2 수동 수정 보호 메커니즘

- 모든 자동 계산 컬럼에는 `*_manual` 플래그 존재
- `*_manual = TRUE`인 경우 재계산 생략
- **예외**: `itinerary_date`는 수동 수정 여부와 관계없이 start_date 변경 시 재계산

### 4.3 계산 공식

```sql
-- 기간 계산
nights = (end_date - start_date).days
days = nights + 1

-- 요금 계산
total_price = pax × price_per_pax
balance = total_price - deposit

-- 잔액 완납일 계산
balance_due_date = start_date - 7일  -- 기본값 7일, 설정 가능

-- 취소 규정 날짜 계산
cancel_date = start_date - days_before

-- 일정 날짜 계산
itinerary_date = start_date + (day_no - 1)
```

---

## 5. 데이터 무결성 규칙

### 5.1 참조 무결성

- 모든 외래키는 `ON DELETE CASCADE` 설정
- 단체(groups) 삭제 시 관련된 모든 데이터 자동 삭제

### 5.2 도메인 무결성

- CHECK 제약조건으로 유효한 값 범위 제한
- NOT NULL 제약조건으로 필수 필드 보장

### 5.3 엔티티 무결성

- 모든 테이블은 UUID PRIMARY KEY 사용
- 단, 단체명(name)은 중복 허용 (비즈니스 요구사항)

---

## 6. 인덱싱 전략

### 6.1 조회 성능 최적화

- 자주 조회되는 컬럼에 인덱스 생성
- 복합 인덱스로 정렬 쿼리 최적화

### 6.2 인덱스 유지보수

- 정기적인 인덱스 재구축 (REINDEX)
- 쿼리 실행 계획 모니터링 (EXPLAIN ANALYZE)

---

## 7. 백업 및 복구 전략

### 7.1 백업 정책

- **일일 전체 백업**: 매일 02:00 AM
- **시간별 증분 백업**: 매시간
- **트랜잭션 로그 백업**: 15분마다

### 7.2 보관 기간

- 활성 백업: 7일
- 아카이브 백업: 1년
- 감사 로그: 5년

---

## 8. 성능 고려사항

### 8.1 쿼리 최적화

- 인덱스 활용한 조회 쿼리
- JOIN 최소화 (필요 시 적절한 인덱스 사용)
- LIMIT/OFFSET 페이징 대신 커서 기반 페이징 권장

### 8.2 커넥션 풀링

- 최소 연결: 10
- 최대 연결: 50
- 유휴 타임아웃: 10분

---

## 9. 보안 고려사항

### 9.1 접근 제어

- 역할 기반 접근 제어 (RBAC)
- 최소 권한 원칙

### 9.2 데이터 암호화

- 전송 중 암호화: TLS/SSL
- 저장 데이터 암호화: 민감 정보 컬럼 암호화

---

## 10. 확장 고려사항

### 10.1 수평 확장

- 읽기 전용 복제본 구성
- 샤딩 전략 (단체 ID 기반)

### 10.2 수직 확장

- 파티셔닝 (날짜 기반)
- 아카이빙 전략 (1년 이상 된 데이터)

---

**작성일**: 2024-12-23
**버전**: 1.0
**작성자**: Database Design Team
