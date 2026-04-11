# TASK — 여행사 계약·견적·일정 자동화 인트라넷 (v2 개선판)

본 문서는 PRD / TRD를 기반으로 실제 개발을 위한 **작업 단위(Task) 분해 문서**이다.
각 TASK는 개발·테스트·배포까지 바로 연결될 수 있는 수준으로 정의한다.

**v2 개선 사항:**
- 모든 task에 PRD/TRD 명시적 레퍼런스 추가
- AI가 실행 가능한 수준의 자연어 기반 상세 설명
- 실행 절차, 중요 사항, 검증 방법, 의존성 명시
- 배경 및 맥락 정보 추가

---

## 0. 공통 개발 기준

- 모든 TASK는 단체(group_id) 기준으로 동작
- 자동 계산 로직은 서버 단에서만 수행
- HTML 템플릿 → PDF 출력은 동일 파이프라인 사용
- 상태값(견적/계약/확정)에 따른 제어 필수
- 단체명(name)은 중복 허용, 고유 식별은 id(UUID) 사용
- 모든 날짜 관련 필드는 출발일(start_date) 변경 시 자동 재계산
- 수동 수정된 필드는 *_manual 플래그로 보호 (일정 날짜 제외)

---

## 1. DB 구축 TASK

### [] T-DB-01 기본 테이블 생성

**참조 문서:**
- PRD Section 6.2.1: groups 테이블 스키마 정의 (컬럼, 제약조건, 인덱스)
- PRD Section 6.2.2: group_itinerary 테이블 스키마 정의
- PRD Section 6.2.3: group_cancel_rules 테이블 스키마 정의
- PRD Section 6.2.4: group_includes 테이블 스키마 정의
- PRD Section 6.2.5: documents 테이블 스키마 정의
- PRD Section 6.3: 데이터베이스 설계 원칙
- TRD Section 3.2.1: PostgreSQL DDL 예시 코드

**목표**: 여행사 인트라넷 시스템의 핵심 데이터를 저장할 5개 테이블을 PostgreSQL 데이터베이스에 생성합니다.

**배경:**
PRD Section 6에서 정의된 데이터 모델을 기반으로, 단체 정보, 일정, 취소 규정, 포함/불포함 항목, 문서 이력을 관리하기 위한 데이터베이스 스키마가 필요합니다. 이 task는 전체 시스템의 데이터 기반을 구축하는 첫 단계로, 모든 후속 task들이 이 테이블들에 의존합니다.

**작업 내용:**

1. **groups 테이블 생성**

   단체의 기본 정보를 저장하는 핵심 테이블을 생성하세요. 이 테이블은 모든 자동 계산의 기준이 되는 출발일(start_date)을 포함하며, 시스템의 중심 엔티티입니다.

   **컬럼 정의:**
   - `id`: UUID 타입, PRIMARY KEY, 자동 생성 (gen_random_uuid() 사용)
     - 단체의 고유 식별자로 사용됩니다
     - 모든 관련 테이블의 외래키 참조 대상입니다

   - `name`: VARCHAR(255) 타입, NOT NULL
     - 단체명을 저장합니다
     - **중요**: UNIQUE 제약조건이 없습니다. PRD Section 6.2.1에 따라 동일한 단체명이 여러 개 존재할 수 있습니다
     - 예시: "하노이 골프단 1기", "하노이 골프단 2기"
     - 검색 성능을 위해 인덱스가 생성됩니다

   - `start_date`: DATE 타입, NOT NULL
     - 출발일을 저장합니다
     - **핵심**: 모든 자동 계산(일정 날짜, 취소 규정 날짜, 잔액 완납일)의 기준점이 됩니다
     - 이 값이 변경되면 관련된 모든 날짜가 자동 재계산됩니다

   - `end_date`: DATE 타입, NOT NULL
     - 도착일을 저장합니다
     - CHECK 제약조건: `end_date > start_date` (도착일은 출발일보다 반드시 이후여야 함)
     - 이 값으로부터 nights와 days가 자동 계산됩니다

   - `nights`: INTEGER 타입, NOT NULL
     - 여행 박수를 저장합니다
     - 자동 계산 공식: `nights = (end_date - start_date).days`
     - PRD Section 7.1 참조

   - `nights_manual`: BOOLEAN 타입, DEFAULT FALSE
     - 박수를 사용자가 수동으로 수정했는지 여부를 표시합니다
     - TRUE인 경우, start_date나 end_date 변경 시에도 nights는 재계산되지 않습니다
     - 수동 수정 보호 메커니즘의 일부입니다

   - `days`: INTEGER 타입, NOT NULL
     - 여행 일수를 저장합니다
     - 자동 계산 공식: `days = nights + 1`
     - PRD Section 7.1 참조

   - `days_manual`: BOOLEAN 타입, DEFAULT FALSE
     - 일수를 사용자가 수동으로 수정했는지 여부를 표시합니다

   - `pax`: INTEGER 타입, NOT NULL, CHECK (pax > 0)
     - 인원수를 저장합니다
     - 1명 이상이어야 합니다
     - 총액 계산의 기준이 됩니다

   - `price_per_pax`: DECIMAL(12,2) 타입, NOT NULL, CHECK (price_per_pax >= 0)
     - 1인당 요금을 저장합니다
     - 소수점 2자리까지 저장 가능합니다
     - 0 이상의 값이어야 합니다

   - `total_price`: DECIMAL(12,2) 타입, NOT NULL
     - 총액을 저장합니다
     - 자동 계산 공식: `total_price = pax × price_per_pax`
     - PRD Section 7.2 참조

   - `total_price_manual`: BOOLEAN 타입, DEFAULT FALSE
     - 총액을 사용자가 수동으로 수정했는지 여부

   - `deposit`: DECIMAL(12,2) 타입, DEFAULT 0, CHECK (deposit >= 0)
     - 계약금을 저장합니다
     - 기본값은 0입니다
     - 0 이상의 값이어야 합니다

   - `balance`: DECIMAL(12,2) 타입, NOT NULL
     - 잔액을 저장합니다
     - 자동 계산 공식: `balance = total_price - deposit`
     - PRD Section 7.2 참조

   - `balance_manual`: BOOLEAN 타입, DEFAULT FALSE
     - 잔액을 사용자가 수동으로 수정했는지 여부

   - `balance_due_date`: DATE 타입
     - 잔액 완납일을 저장합니다
     - 자동 계산 공식: `balance_due_date = start_date - N일` (N은 설정값, 기본 7일)
     - PRD Section 7.3 참조

   - `balance_due_date_manual`: BOOLEAN 타입, DEFAULT FALSE
     - 잔액 완납일을 사용자가 수동으로 수정했는지 여부

   - `status`: VARCHAR(20) 타입, DEFAULT 'estimate', CHECK (status IN ('estimate', 'contract', 'confirmed'))
     - 단체의 상태를 저장합니다
     - 'estimate': 견적 단계
     - 'contract': 계약 단계
     - 'confirmed': 확정 단계 (이 상태에서는 자동 계산 및 수정이 차단됩니다)
     - PRD Section 10 참조

   - `created_by`: VARCHAR(100) 타입
     - 단체를 생성한 사용자 ID

   - `created_at`: TIMESTAMP 타입, DEFAULT CURRENT_TIMESTAMP
     - 생성 일시

   - `updated_by`: VARCHAR(100) 타입
     - 마지막으로 수정한 사용자 ID

   - `updated_at`: TIMESTAMP 타입, DEFAULT CURRENT_TIMESTAMP
     - 마지막 수정 일시

   **제약조건:**
   - PRIMARY KEY (id): id를 기본키로 설정
   - CHECK (end_date > start_date): 도착일은 출발일보다 이후여야 함
   - CHECK (pax > 0): 인원수는 양수여야 함
   - CHECK (price_per_pax >= 0): 1인당 요금은 0 이상이어야 함
   - CHECK (deposit >= 0): 계약금은 0 이상이어야 함
   - CHECK (status IN ('estimate', 'contract', 'confirmed')): 상태값은 정의된 3가지 중 하나여야 함

   **인덱스 생성:**
   - `idx_groups_name ON groups(name)`: 단체명 검색 성능 향상
   - `idx_groups_start_date ON groups(start_date)`: 날짜 범위 검색 최적화 (예: 특정 기간에 출발하는 단체 조회)
   - `idx_groups_status ON groups(status)`: 상태별 필터링 최적화 (예: 모든 확정된 계약 조회)

2. **group_itinerary 테이블 생성**

   단체의 일정 정보를 저장하는 테이블을 생성하세요. 일정은 day_no 순서로 정렬되며, 출발일을 기준으로 날짜가 자동 계산됩니다.

   **컬럼 정의:**
   - `id`: UUID 타입, PRIMARY KEY, 자동 생성
   - `group_id`: UUID 타입, NOT NULL, FOREIGN KEY (groups.id) ON DELETE CASCADE
     - 단체 ID (외래키)
     - CASCADE 삭제: 단체가 삭제되면 관련 일정도 모두 삭제됩니다

   - `day_no`: INTEGER 타입, NOT NULL, CHECK (day_no > 0)
     - 일차 번호 (1부터 시작)
     - 일정의 순서를 나타냅니다
     - UNIQUE 제약: 동일 단체 내에서 day_no는 중복될 수 없습니다

   - `itinerary_date`: DATE 타입, NOT NULL
     - 일정 날짜
     - 자동 계산 공식: `itinerary_date = start_date + (day_no - 1)`
     - PRD Section 7.5 참조
     - **특수 규칙**: 출발일 변경 시 manual 플래그와 관계없이 **항상** 재계산됩니다

   - `itinerary_date_manual`: BOOLEAN 타입, DEFAULT FALSE
     - 일정 날짜를 사용자가 수동으로 수정했는지 여부
     - 다른 필드와 달리, 이 플래그가 TRUE여도 출발일 변경 시 재계산됩니다
     - 플래그는 유지되어 사용자에게 "수동 수정되었음"을 알리는 용도로만 사용됩니다

   - `location`: VARCHAR(255) 타입
     - 지역/장소 (예: "인천", "하노이")

   - `transport`: VARCHAR(255) 타입
     - 교통편 정보 (예: "OZ729", "전용버스")

   - `time`: VARCHAR(50) 타입
     - 시간 정보 (예: "09:10", "오후 2시")

   - `schedule`: TEXT 타입
     - 일정 내용 상세 설명

   - `meals`: VARCHAR(255) 타입
     - 식사 정보 (예: "조:기내식", "중:현지식", "석:한식")

   - `accommodation`: VARCHAR(255) 타입
     - 숙박 정보 (예: "Sofitel Legend Metropole Hanoi 5성급")

   - `created_at`: TIMESTAMP 타입, DEFAULT CURRENT_TIMESTAMP
   - `updated_at`: TIMESTAMP 타입, DEFAULT CURRENT_TIMESTAMP

   **제약조건:**
   - PRIMARY KEY (id)
   - FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
   - CHECK (day_no > 0)
   - UNIQUE (group_id, day_no): 동일 단체 내에서 day_no 중복 방지

   **인덱스 생성:**
   - `idx_itinerary_group_id ON group_itinerary(group_id)`: 단체별 일정 조회 최적화
   - `idx_itinerary_group_day ON group_itinerary(group_id, day_no)`: 단체별 일차 순서 정렬 최적화

3. **group_cancel_rules 테이블 생성**

   단체의 취소 규정을 저장하는 테이블을 생성하세요. 취소 규정은 출발일을 기준으로 며칠 전부터 적용되는지와 위약금 비율을 정의합니다.

   **컬럼 정의:**
   - `id`: UUID 타입, PRIMARY KEY, 자동 생성
   - `group_id`: UUID 타입, NOT NULL, FOREIGN KEY (groups.id) ON DELETE CASCADE
   - `days_before`: INTEGER 타입, NOT NULL
     - 출발일 기준 며칠 전 (예: 30일 전, 15일 전)
     - 이 값으로부터 cancel_date가 자동 계산됩니다

   - `cancel_date`: DATE 타입, NOT NULL
     - 취소 기준일
     - 자동 계산 공식: `cancel_date = start_date - days_before`
     - PRD Section 7.4 참조

   - `cancel_date_manual`: BOOLEAN 타입, DEFAULT FALSE
     - 취소 기준일을 사용자가 수동으로 수정했는지 여부

   - `penalty_rate`: DECIMAL(5,2) 타입, NOT NULL, CHECK (penalty_rate >= 0 AND penalty_rate <= 100)
     - 위약금 비율 (%)
     - 0~100 사이의 값이어야 합니다
     - 소수점 2자리까지 지원 (예: 10.50%)

   - `penalty_amount`: DECIMAL(12,2) 타입
     - 위약금 금액 (선택사항)
     - 고정 금액으로 위약금을 설정할 때 사용

   - `description`: TEXT 타입
     - 취소 규정 설명 (예: "여행 개시 30일 전까지 취소 시 계약금의 10% 공제")

   - `created_at`: TIMESTAMP 타입, DEFAULT CURRENT_TIMESTAMP

   **제약조건:**
   - PRIMARY KEY (id)
   - FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
   - CHECK (penalty_rate >= 0 AND penalty_rate <= 100)

   **인덱스 생성:**
   - `idx_cancel_rules_group_id ON group_cancel_rules(group_id)`
   - `idx_cancel_rules_days_before ON group_cancel_rules(group_id, days_before)`: days_before 기준 정렬용

4. **group_includes 테이블 생성**

   단체의 포함/불포함 항목을 저장하는 테이블을 생성하세요. 견적서와 계약서에 표시될 항목들을 관리합니다.

   **컬럼 정의:**
   - `id`: UUID 타입, PRIMARY KEY, 자동 생성
   - `group_id`: UUID 타입, NOT NULL, FOREIGN KEY (groups.id) ON DELETE CASCADE
   - `item_type`: VARCHAR(20) 타입, NOT NULL, CHECK (item_type IN ('include', 'exclude'))
     - 'include': 포함 항목 (예: 항공료, 숙박비, 식사 등)
     - 'exclude': 불포함 항목 (예: 개인 경비, 여행자 보험 등)

   - `category`: VARCHAR(100) 타입
     - 항목 카테고리 (예: "항공", "호텔", "식사", "관광", "보험")
     - 그룹화 및 정렬에 사용

   - `description`: TEXT 타입, NOT NULL
     - 항목 설명

   - `display_order`: INTEGER 타입, DEFAULT 0
     - 표시 순서
     - 숫자가 작을수록 먼저 표시됩니다

   - `created_at`: TIMESTAMP 타입, DEFAULT CURRENT_TIMESTAMP

   **제약조건:**
   - PRIMARY KEY (id)
   - FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
   - CHECK (item_type IN ('include', 'exclude'))

   **인덱스 생성:**
   - `idx_includes_group_id ON group_includes(group_id)`
   - `idx_includes_type_order ON group_includes(group_id, item_type, display_order)`: 타입별 순서 정렬용

5. **documents 테이블 생성**

   생성된 문서(PDF)의 이력을 저장하는 테이블을 생성하세요. 버전 관리와 파일 추적에 사용됩니다.

   **컬럼 정의:**
   - `id`: UUID 타입, PRIMARY KEY, 자동 생성
   - `group_id`: UUID 타입, NOT NULL, FOREIGN KEY (groups.id) ON DELETE CASCADE
   - `document_type`: VARCHAR(20) 타입, NOT NULL, CHECK (document_type IN ('estimate', 'contract', 'itinerary', 'bundle'))
     - 'estimate': 견적서
     - 'contract': 계약서
     - 'itinerary': 일정표
     - 'bundle': 통합 PDF (견적서+계약서+일정표)

   - `version`: INTEGER 타입, NOT NULL, DEFAULT 1
     - 버전 번호
     - 동일한 document_type 내에서 자동 증가합니다

   - `file_path`: VARCHAR(500) 타입, NOT NULL
     - PDF 파일 저장 경로 (예: "/documents/견적서_하노이골프단_v1_20250101.pdf")

   - `file_name`: VARCHAR(255) 타입, NOT NULL
     - 파일명 (예: "견적서_하노이골프단_v1_20250101.pdf")
     - PRD Section 6.2.5의 파일명 규칙 참조

   - `generated_at`: TIMESTAMP 타입, DEFAULT CURRENT_TIMESTAMP
     - 생성 일시

   - `generated_by`: VARCHAR(100) 타입
     - 생성한 사용자 ID

   - `file_size`: BIGINT 타입
     - 파일 크기 (bytes)

   **제약조건:**
   - PRIMARY KEY (id)
   - FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
   - CHECK (document_type IN ('estimate', 'contract', 'itinerary', 'bundle'))

   **인덱스 생성:**
   - `idx_documents_group_id ON documents(group_id)`
   - `idx_documents_type_version ON documents(group_id, document_type, version)`: 버전 관리용

**실행 절차:**

1. `database/schema.sql` 파일을 생성하세요
   ```bash
   mkdir -p database
   touch database/schema.sql
   ```

2. TRD Section 3.2.1의 DDL 코드를 참조하여 파일에 CREATE TABLE 문을 작성하세요

3. groups 테이블 DDL을 작성하세요:
   ```sql
   -- groups 테이블
   CREATE TABLE groups (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       name VARCHAR(255) NOT NULL,
       start_date DATE NOT NULL,
       end_date DATE NOT NULL CHECK (end_date > start_date),
       nights INTEGER NOT NULL,
       nights_manual BOOLEAN DEFAULT FALSE,
       days INTEGER NOT NULL,
       days_manual BOOLEAN DEFAULT FALSE,
       pax INTEGER NOT NULL CHECK (pax > 0),
       price_per_pax DECIMAL(12,2) NOT NULL CHECK (price_per_pax >= 0),
       total_price DECIMAL(12,2) NOT NULL,
       total_price_manual BOOLEAN DEFAULT FALSE,
       deposit DECIMAL(12,2) DEFAULT 0 CHECK (deposit >= 0),
       balance DECIMAL(12,2) NOT NULL,
       balance_manual BOOLEAN DEFAULT FALSE,
       balance_due_date DATE,
       balance_due_date_manual BOOLEAN DEFAULT FALSE,
       status VARCHAR(20) DEFAULT 'estimate' CHECK (status IN ('estimate', 'contract', 'confirmed')),
       created_by VARCHAR(100),
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_by VARCHAR(100),
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   -- 인덱스 생성
   CREATE INDEX idx_groups_name ON groups(name);
   CREATE INDEX idx_groups_start_date ON groups(start_date);
   CREATE INDEX idx_groups_status ON groups(status);
   ```

4. group_itinerary 테이블 DDL을 작성하세요:
   ```sql
   -- group_itinerary 테이블
   CREATE TABLE group_itinerary (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
       day_no INTEGER NOT NULL CHECK (day_no > 0),
       itinerary_date DATE NOT NULL,
       itinerary_date_manual BOOLEAN DEFAULT FALSE,
       location VARCHAR(255),
       transport VARCHAR(255),
       time VARCHAR(50),
       schedule TEXT,
       meals VARCHAR(255),
       accommodation VARCHAR(255),
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       UNIQUE(group_id, day_no)  -- 동일 단체 내 day_no 중복 방지
   );

   CREATE INDEX idx_itinerary_group_id ON group_itinerary(group_id);
   CREATE INDEX idx_itinerary_group_day ON group_itinerary(group_id, day_no);
   ```

5. group_cancel_rules 테이블 DDL을 작성하세요:
   ```sql
   -- group_cancel_rules 테이블
   CREATE TABLE group_cancel_rules (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
       days_before INTEGER NOT NULL,
       cancel_date DATE NOT NULL,
       cancel_date_manual BOOLEAN DEFAULT FALSE,
       penalty_rate DECIMAL(5,2) NOT NULL CHECK (penalty_rate >= 0 AND penalty_rate <= 100),
       penalty_amount DECIMAL(12,2),
       description TEXT,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE INDEX idx_cancel_rules_group_id ON group_cancel_rules(group_id);
   CREATE INDEX idx_cancel_rules_days_before ON group_cancel_rules(group_id, days_before);
   ```

6. group_includes 테이블 DDL을 작성하세요:
   ```sql
   -- group_includes 테이블
   CREATE TABLE group_includes (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
       item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('include', 'exclude')),
       category VARCHAR(100),
       description TEXT NOT NULL,
       display_order INTEGER DEFAULT 0,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE INDEX idx_includes_group_id ON group_includes(group_id);
   CREATE INDEX idx_includes_type_order ON group_includes(group_id, item_type, display_order);
   ```

7. documents 테이블 DDL을 작성하세요:
   ```sql
   -- documents 테이블
   CREATE TABLE documents (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
       document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('estimate', 'contract', 'itinerary', 'bundle')),
       version INTEGER NOT NULL DEFAULT 1,
       file_path VARCHAR(500) NOT NULL,
       file_name VARCHAR(255) NOT NULL,
       generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       generated_by VARCHAR(100),
       file_size BIGINT
   );

   CREATE INDEX idx_documents_group_id ON documents(group_id);
   CREATE INDEX idx_documents_type_version ON documents(group_id, document_type, version);
   ```

8. PostgreSQL에 연결하여 DDL을 실행하세요:
   ```bash
   psql -U your_username -d your_database_name -f database/schema.sql
   ```

   또는 pgAdmin이나 DBeaver 같은 GUI 도구를 사용하여 DDL을 실행하세요.

9. 테이블 생성을 확인하세요:
   ```sql
   -- 테이블 목록 조회
   \dt

   -- 또는
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;

   -- groups 테이블 상세 정보 확인
   \d groups
   ```

**중요 사항:**

- **단체명 중복 허용**: `groups.name` 컬럼에는 UNIQUE 제약조건을 추가하지 마세요. PRD Section 6.2.1과 TRD Section 3.2.2에 명시된 대로 중복을 허용합니다. 동일한 단체명으로 여러 단체를 생성할 수 있습니다.

- **CASCADE 삭제**: 모든 외래키는 ON DELETE CASCADE로 설정하여 단체 삭제 시 관련 데이터(일정, 취소규정, 포함항목, 문서)도 함께 삭제되도록 합니다. 이는 PRD Section 6.3의 설계 원칙입니다.

- **UUID 자동 생성**: UUID는 PostgreSQL의 `gen_random_uuid()` 함수를 사용하여 자동 생성합니다. 이 함수를 사용하려면 PostgreSQL 13 이상이 필요하거나, `uuid-ossp` 확장을 설치해야 할 수 있습니다.
  ```sql
  -- uuid-ossp 확장이 필요한 경우
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  -- 그리고 gen_random_uuid() 대신 uuid_generate_v4() 사용
  ```

- **manual 플래그**: 모든 자동 계산 필드에는 대응하는 `*_manual` BOOLEAN 플래그 컬럼이 있습니다. 기본값은 FALSE입니다. 이 플래그가 TRUE인 경우, 해당 필드는 자동 재계산에서 보호됩니다 (단, itinerary_date는 예외).

- **CHECK 제약조건**: 비즈니스 규칙을 데이터베이스 레벨에서 강제하기 위해 CHECK 제약조건을 적극 활용합니다:
  - end_date > start_date
  - pax > 0
  - price_per_pax >= 0, deposit >= 0
  - penalty_rate BETWEEN 0 AND 100
  - status, item_type, document_type의 값 범위 제한

- **인덱스 전략**: 자주 조회되는 컬럼과 JOIN, WHERE, ORDER BY에 사용되는 컬럼에 인덱스를 생성합니다:
  - groups: name (검색), start_date (날짜 범위 검색), status (필터링)
  - group_itinerary: group_id (JOIN), (group_id, day_no) (정렬)
  - 기타 테이블: group_id (JOIN)

**검증 방법:**

1. **테이블 생성 확인**:
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('groups', 'group_itinerary', 'group_cancel_rules', 'group_includes', 'documents')
   ORDER BY table_name;
   ```

   결과: 5개 테이블이 모두 조회되어야 합니다.

2. **제약조건 확인**:
   ```sql
   -- groups 테이블의 제약조건 확인
   SELECT constraint_name, constraint_type
   FROM information_schema.table_constraints
   WHERE table_name = 'groups'
   ORDER BY constraint_type, constraint_name;
   ```

   확인 사항:
   - PRIMARY KEY 제약: groups_pkey
   - CHECK 제약: groups_end_date_check, groups_pax_check, groups_price_per_pax_check, groups_deposit_check, groups_status_check

3. **외래키 확인**:
   ```sql
   SELECT
       tc.table_name,
       kcu.column_name,
       ccu.table_name AS foreign_table_name,
       ccu.column_name AS foreign_column_name
   FROM information_schema.table_constraints AS tc
   JOIN information_schema.key_column_usage AS kcu
       ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
   JOIN information_schema.constraint_column_usage AS ccu
       ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
   WHERE tc.constraint_type = 'FOREIGN KEY'
   AND tc.table_schema = 'public'
   ORDER BY tc.table_name;
   ```

   확인 사항:
   - group_itinerary.group_id → groups.id
   - group_cancel_rules.group_id → groups.id
   - group_includes.group_id → groups.id
   - documents.group_id → groups.id

4. **인덱스 확인**:
   ```sql
   SELECT
       tablename,
       indexname,
       indexdef
   FROM pg_indexes
   WHERE schemaname = 'public'
   AND tablename IN ('groups', 'group_itinerary', 'group_cancel_rules', 'group_includes', 'documents')
   ORDER BY tablename, indexname;
   ```

   확인 사항: 계획된 모든 인덱스가 생성되었는지 확인

5. **테스트 데이터 삽입**:
   ```sql
   -- 테스트 단체 생성
   INSERT INTO groups (
       name, start_date, end_date, nights, days, pax,
       price_per_pax, total_price, deposit, balance, status
   ) VALUES (
       '테스트 하노이 골프단',
       '2025-01-15',
       '2025-01-20',
       5,
       6,
       20,
       1500000,
       30000000,
       10000000,
       20000000,
       'estimate'
   )
   RETURNING id, name, start_date, end_date, status;

   -- 데이터 조회 확인
   SELECT * FROM groups WHERE name LIKE '%테스트%';

   -- 테스트 데이터 삭제
   DELETE FROM groups WHERE name LIKE '%테스트%';
   ```

6. **CHECK 제약조건 테스트**:
   ```sql
   -- 잘못된 데이터 삽입 시도 (도착일 < 출발일)
   INSERT INTO groups (name, start_date, end_date, nights, days, pax, price_per_pax, total_price, deposit, balance)
   VALUES ('오류 테스트', '2025-01-20', '2025-01-15', 0, 0, 10, 1000000, 10000000, 0, 10000000);
   -- 예상 결과: ERROR: new row for relation "groups" violates check constraint "groups_end_date_check"

   -- 잘못된 인원수 삽입 시도 (pax = 0)
   INSERT INTO groups (name, start_date, end_date, nights, days, pax, price_per_pax, total_price, deposit, balance)
   VALUES ('오류 테스트', '2025-01-15', '2025-01-20', 5, 6, 0, 1000000, 0, 0, 0);
   -- 예상 결과: ERROR: new row for relation "groups" violates check constraint "groups_pax_check"
   ```

7. **CASCADE 삭제 테스트**:
   ```sql
   -- 테스트 단체 생성
   INSERT INTO groups (name, start_date, end_date, nights, days, pax, price_per_pax, total_price, deposit, balance)
   VALUES ('CASCADE 테스트', '2025-01-15', '2025-01-20', 5, 6, 10, 1000000, 10000000, 0, 10000000)
   RETURNING id;

   -- 위에서 반환된 id를 사용하여 일정 추가
   INSERT INTO group_itinerary (group_id, day_no, itinerary_date, location)
   VALUES ('[위에서 받은 UUID]', 1, '2025-01-15', '인천');

   -- 단체 삭제
   DELETE FROM groups WHERE name = 'CASCADE 테스트';

   -- 일정도 함께 삭제되었는지 확인
   SELECT * FROM group_itinerary WHERE group_id = '[위에서 받은 UUID]';
   -- 예상 결과: 0 rows (일정도 함께 삭제되었음)
   ```

**산출물:**

- `database/schema.sql`: DDL 스크립트 파일
- (선택사항) `database/migrations/001_create_tables.sql`: 마이그레이션 스크립트

**의존성:**

- **선행 task**: 없음 (첫 번째 task)
- **후행 task**:
  - T-DB-02: 자동/수동 플래그 컬럼 추가 (이미 이 task에 포함되어 있으므로 실제로는 T-DB-03부터)
  - T-API-01: 단체 목록 조회 API (groups 테이블 사용)
  - T-CALC-01: 기간 계산 로직 (groups 테이블의 dates, nights, days 컬럼 사용)
  - 모든 API 및 계산 로직 task들이 이 테이블들에 의존함

---

### T-DB-02 자동/수동 플래그 컬럼 추가

**참조 문서:**
- PRD Section 6.2.1: groups 테이블의 manual 플래그 컬럼
- PRD Section 6.2.2: group_itinerary 테이블의 itinerary_date_manual 컬럼
- PRD Section 6.2.3: group_cancel_rules 테이블의 cancel_date_manual 컬럼
- TRD Section 3.2.3: 자동/수동 플래그 정책

**목표**: *(이미 T-DB-01에 포함됨)* 자동 계산 필드에 수동 수정 여부를 추적하는 플래그 컬럼을 추가합니다.

**배경:**
PRD Section 6과 TRD Section 3.2.3에 따르면, 자동 계산되는 모든 필드는 사용자가 수동으로 수정할 수 있어야 하며, 수동 수정 여부를 추적해야 합니다. 이는 자동 재계산 시 수동 수정된 값을 보호하기 위한 메커니즘입니다.

**참고**: T-DB-01에서 이미 모든 manual 플래그 컬럼을 포함하여 테이블을 생성했으므로, 이 task는 실질적으로 완료되었습니다. T-DB-01에서 누락된 경우에만 아래 내용을 실행하세요.

**작업 내용:**

T-DB-01에서 이미 다음 컬럼들을 추가했는지 확인하세요:
- `groups` 테이블: nights_manual, days_manual, total_price_manual, balance_manual, balance_due_date_manual
- `group_itinerary` 테이블: itinerary_date_manual
- `group_cancel_rules` 테이블: cancel_date_manual

만약 T-DB-01에서 누락되었다면 ALTER TABLE 문으로 추가하세요.

**실행 절차:**

1. 현재 테이블 스키마를 확인하여 manual 컬럼이 있는지 체크하세요:
   ```sql
   \d groups
   \d group_itinerary
   \d group_cancel_rules
   ```

2. (누락된 경우만) ALTER TABLE 마이그레이션 스크립트 작성:
   ```sql
   -- groups 테이블에 manual 플래그 추가
   ALTER TABLE groups ADD COLUMN IF NOT EXISTS nights_manual BOOLEAN DEFAULT FALSE;
   ALTER TABLE groups ADD COLUMN IF NOT EXISTS days_manual BOOLEAN DEFAULT FALSE;
   ALTER TABLE groups ADD COLUMN IF NOT EXISTS total_price_manual BOOLEAN DEFAULT FALSE;
   ALTER TABLE groups ADD COLUMN IF NOT EXISTS balance_manual BOOLEAN DEFAULT FALSE;
   ALTER TABLE groups ADD COLUMN IF NOT EXISTS balance_due_date_manual BOOLEAN DEFAULT FALSE;

   -- group_itinerary 테이블에 manual 플래그 추가
   ALTER TABLE group_itinerary ADD COLUMN IF NOT EXISTS itinerary_date_manual BOOLEAN DEFAULT FALSE;

   -- group_cancel_rules 테이블에 manual 플래그 추가
   ALTER TABLE group_cancel_rules ADD COLUMN IF NOT EXISTS cancel_date_manual BOOLEAN DEFAULT FALSE;
   ```

**검증 방법:**
```sql
-- 컬럼 존재 확인
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'groups'
AND column_name LIKE '%_manual'
ORDER BY column_name;
```

**산출물:**
- (필요시) `database/migrations/002_add_manual_flags.sql`: ALTER TABLE 마이그레이션 스크립트

**의존성:**
- **선행 task**: T-DB-01 (테이블이 먼저 생성되어야 함)
- **후행 task**: T-CALC-* (자동 계산 로직들이 이 플래그를 확인함)

---

### T-DB-03 상태 제어 컬럼

**참조 문서:**
- PRD Section 10: 상태별 제어 규칙
- PRD Section 6.2.1: groups.status 컬럼 정의
- TRD Section 8: 상태 기반 제어 로직

**목표**: *(이미 T-DB-01에 포함됨)* 단체의 상태 (견적/계약/확정)를 관리하기 위한 status 컬럼과 제약조건을 설정합니다.

**배경:**
PRD Section 10에 따르면, 단체는 '견적 → 계약 → 확정' 순서로 상태가 변경되며, 확정 상태에서는 자동 계산 및 수정이 차단됩니다. 이를 위해 status 컬럼과 관련 제약조건이 필요합니다.

**참고**: T-DB-01에서 이미 status 컬럼을 포함하여 테이블을 생성했으므로, 이 task는 실질적으로 완료되었습니다.

**작업 내용:**

T-DB-01에서 이미 다음 내용을 포함했는지 확인하세요:
- `groups.status` 컬럼: VARCHAR(20), DEFAULT 'estimate'
- CHECK 제약조건: `status IN ('estimate', 'contract', 'confirmed')`
- 인덱스: `idx_groups_status`

**실행 절차:**

1. status 컬럼 존재 확인:
   ```sql
   \d groups

   -- 또는
   SELECT column_name, data_type, column_default
   FROM information_schema.columns
   WHERE table_name = 'groups'
   AND column_name = 'status';
   ```

2. CHECK 제약조건 확인:
   ```sql
   SELECT constraint_name, check_clause
   FROM information_schema.check_constraints
   WHERE constraint_name LIKE '%status%';
   ```

3. 인덱스 확인:
   ```sql
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename = 'groups'
   AND indexname = 'idx_groups_status';
   ```

**검증 방법:**
```sql
-- 유효한 status 값 삽입 테스트
INSERT INTO groups (name, start_date, end_date, nights, days, pax, price_per_pax, total_price, deposit, balance, status)
VALUES ('상태 테스트', '2025-01-15', '2025-01-20', 5, 6, 10, 1000000, 10000000, 0, 10000000, 'estimate');

-- 잘못된 status 값 삽입 시도
INSERT INTO groups (name, start_date, end_date, nights, days, pax, price_per_pax, total_price, deposit, balance, status)
VALUES ('상태 테스트2', '2025-01-15', '2025-01-20', 5, 6, 10, 1000000, 10000000, 0, 10000000, 'invalid_status');
-- 예상 결과: ERROR

-- 기본값 확인 (status 미지정 시)
INSERT INTO groups (name, start_date, end_date, nights, days, pax, price_per_pax, total_price, deposit, balance)
VALUES ('기본값 테스트', '2025-01-15', '2025-01-20', 5, 6, 10, 1000000, 10000000, 0, 10000000);

SELECT status FROM groups WHERE name = '기본값 테스트';
-- 예상 결과: estimate

-- 정리
DELETE FROM groups WHERE name LIKE '%테스트%';
```

**산출물:**
- (이미 T-DB-01에 포함됨)

**의존성:**
- **선행 task**: T-DB-01
- **후행 task**: T-STATE-* (상태별 제어 로직), T-API-05 (상태 변경 API)

---

### T-DB-04 감사 로그 테이블 생성

**참조 문서:**
- TRD Section 11.5: 감사 로그 테이블 설계
- TRD Section 11.2: 자동 계산 실행 로그
- TRD Section 11.3: 수동 수정 로그
- TRD Section 11.4: 문서 출력 로그

**목표**: 모든 데이터 변경 및 시스템 동작을 추적하기 위한 감사 로그 테이블을 생성합니다.

**배경:**
TRD Section 11에 따르면, 자동 계산 실행, 수동 수정, 문서 출력 등 모든 중요한 동작에 대한 감사 추적이 필요합니다. 이는 시스템 투명성, 문제 해결, 규정 준수를 위해 필수적입니다.

**작업 내용:**

1. **audit_logs 테이블 생성**

   시스템의 모든 중요한 동작을 기록하는 감사 로그 테이블을 생성하세요.

   **컬럼 정의:**
   - `id`: UUID 타입, PRIMARY KEY, 자동 생성
     - 로그 레코드의 고유 식별자

   - `action`: VARCHAR(50) 타입, NOT NULL
     - 수행된 동작 유형
     - 예시: 'AUTO_CALCULATE', 'MANUAL_MODIFY', 'DOCUMENT_GENERATE', 'STATUS_CHANGE', 'CREATE', 'UPDATE', 'DELETE'

   - `entity_type`: VARCHAR(50) 타입, NOT NULL
     - 동작이 수행된 엔티티 타입
     - 예시: 'group', 'itinerary', 'cancel_rule', 'document'

   - `entity_id`: UUID 타입, NOT NULL
     - 동작이 수행된 엔티티의 ID
     - 해당 엔티티 테이블의 id를 참조 (외래키는 설정하지 않음 - 삭제 후에도 로그 유지)

   - `field_name`: VARCHAR(100) 타입
     - 수정된 필드명 (수정 동작인 경우)
     - 예시: 'total_price', 'start_date', 'status'

   - `old_value`: TEXT 타입
     - 변경 전 값
     - 모든 타입의 값을 TEXT로 저장

   - `new_value`: TEXT 타입
     - 변경 후 값

   - `reason`: TEXT 타입
     - 변경 사유 (수동 수정인 경우 사용자가 입력)
     - 예시: "항공료 인상으로 인한 요금 조정", "고객 요청으로 일정 변경"

   - `metadata`: JSONB 타입
     - 추가 메타데이터를 JSON 형식으로 저장
     - 예시: {"document_type": "estimate", "version": 1, "file_size": 1024000}

   - `user_id`: VARCHAR(100) 타입, NOT NULL
     - 동작을 수행한 사용자 ID

   - `ip_address`: VARCHAR(45) 타입
     - 요청이 발생한 IP 주소 (IPv4: 최대 15자, IPv6: 최대 45자)

   - `created_at`: TIMESTAMP 타입, DEFAULT CURRENT_TIMESTAMP
     - 로그 생성 일시

   **인덱스 생성:**
   - `idx_audit_logs_entity ON audit_logs(entity_type, entity_id)`: 특정 엔티티의 모든 로그 조회
   - `idx_audit_logs_user ON audit_logs(user_id)`: 사용자별 활동 조회
   - `idx_audit_logs_action ON audit_logs(action)`: 동작 유형별 조회
   - `idx_audit_logs_created_at ON audit_logs(created_at)`: 시간 범위 검색

**실행 절차:**

1. `database/schema.sql` 파일에 audit_logs 테이블 DDL 추가 (또는 별도의 마이그레이션 파일 생성):
   ```sql
   -- audit_logs 테이블
   CREATE TABLE audit_logs (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       action VARCHAR(50) NOT NULL,  -- AUTO_CALCULATE, MANUAL_MODIFY, DOCUMENT_GENERATE 등
       entity_type VARCHAR(50) NOT NULL,  -- group, document, itinerary 등
       entity_id UUID NOT NULL,
       field_name VARCHAR(100),  -- 수정된 필드명
       old_value TEXT,  -- 이전 값
       new_value TEXT,  -- 새 값
       reason TEXT,  -- 수정 사유 (수동 수정인 경우)
       metadata JSONB,  -- 추가 메타데이터
       user_id VARCHAR(100) NOT NULL,  -- 사용자 ID
       ip_address VARCHAR(45),  -- IP 주소 (IPv4 또는 IPv6)
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   -- 인덱스 생성
   CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
   CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
   CREATE INDEX idx_audit_logs_action ON audit_logs(action);
   CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
   ```

2. DDL 실행:
   ```bash
   psql -U your_username -d your_database_name -f database/schema.sql
   ```

3. 테이블 생성 확인:
   ```sql
   \d audit_logs

   -- 또는
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'audit_logs'
   ORDER BY ordinal_position;
   ```

**중요 사항:**

- **외래키 없음**: audit_logs 테이블은 다른 테이블과 외래키 관계를 맺지 않습니다. 이는 엔티티가 삭제된 후에도 로그를 유지하기 위함입니다.

- **JSONB 타입**: metadata 컬럼은 JSONB 타입을 사용하여 유연한 메타데이터 저장을 지원합니다. JSONB는 바이너리 JSON 형식으로 저장되어 쿼리 성능이 우수합니다.

- **IP 주소 저장**: IPv4와 IPv6를 모두 지원하기 위해 VARCHAR(45)를 사용합니다.

- **불변성**: 감사 로그는 생성 후 수정하거나 삭제하지 않습니다. INSERT만 허용하고 UPDATE/DELETE는 비즈니스 로직에서 차단해야 합니다.

- **보관 정책**: TRD Section 11.7에 따라, 로그는 최소 5년간 보관되어야 하며, 1년 이상 된 로그는 아카이브 스토리지로 이동할 수 있습니다.

**검증 방법:**

1. **테이블 생성 확인**:
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name = 'audit_logs';
   ```

2. **인덱스 확인**:
   ```sql
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename = 'audit_logs'
   ORDER BY indexname;
   ```

   확인 사항: 4개 인덱스가 모두 생성되었는지 확인

3. **테스트 로그 삽입**:
   ```sql
   -- 자동 계산 로그 예시
   INSERT INTO audit_logs (
       action, entity_type, entity_id, field_name,
       old_value, new_value, user_id, ip_address
   ) VALUES (
       'AUTO_CALCULATE',
       'group',
       gen_random_uuid(),
       'total_price',
       '30000000',
       '32000000',
       'system',
       '127.0.0.1'
   );

   -- 수동 수정 로그 예시
   INSERT INTO audit_logs (
       action, entity_type, entity_id, field_name,
       old_value, new_value, reason, user_id, ip_address
   ) VALUES (
       'MANUAL_MODIFY',
       'group',
       gen_random_uuid(),
       'total_price',
       '30000000',
       '32000000',
       '항공료 인상으로 인한 요금 조정',
       'user123',
       '192.168.1.100'
   );

   -- 문서 생성 로그 예시 (metadata 포함)
   INSERT INTO audit_logs (
       action, entity_type, entity_id,
       metadata, user_id, ip_address
   ) VALUES (
       'DOCUMENT_GENERATE',
       'document',
       gen_random_uuid(),
       '{"document_type": "estimate", "version": 1, "file_size": 1024000}'::jsonb,
       'user123',
       '192.168.1.100'
   );

   -- 로그 조회
   SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;

   -- 정리
   DELETE FROM audit_logs;
   ```

4. **JSONB 쿼리 테스트**:
   ```sql
   -- metadata에서 특정 값 검색
   SELECT *
   FROM audit_logs
   WHERE metadata->>'document_type' = 'estimate';

   -- metadata에 특정 키가 존재하는지 확인
   SELECT *
   FROM audit_logs
   WHERE metadata ? 'document_type';
   ```

5. **인덱스 사용 확인**:
   ```sql
   EXPLAIN ANALYZE
   SELECT *
   FROM audit_logs
   WHERE entity_type = 'group'
   AND entity_id = '[특정 UUID]'
   ORDER BY created_at DESC;
   -- 예상: idx_audit_logs_entity 인덱스 사용
   ```

**산출물:**

- `database/schema.sql` 또는 `database/migrations/00X_create_audit_logs.sql`: audit_logs 테이블 DDL
- (선택사항) 로그 보관 및 아카이브 정책 문서

**의존성:**

- **선행 task**: T-DB-01 (다른 테이블들이 먼저 생성되어야 하지만, 외래키가 없으므로 독립적으로 생성 가능)
- **후행 task**:
  - T-LOG-01: 로깅 시스템 구축 (audit_logs 테이블 사용)
  - T-LOG-02: 자동 계산 실행 로그 (audit_logs에 INSERT)
  - T-LOG-03: 수동 수정 로그 (audit_logs에 INSERT)
  - T-LOG-04: 문서 출력 로그 (audit_logs에 INSERT)
  - T-LOG-05: 감사 로그 조회 API (audit_logs 조회)

---

## 2. 백엔드 API TASK

### T-API-01 단체 목록 조회 API

**참조 문서:**
- PRD Section 5: 핵심 사용자 시나리오 (단체 선택)
- PRD Section 8.1: 단체 선택 화면 요구사항
- TRD Section 4.1.1: 단체 목록 조회 API 명세

**목표**: 단체 목록을 조회하고 검색/필터링/페이징 기능을 제공하는 REST API를 구현합니다.

**배경:**
PRD Section 5의 사용자 시나리오에서 첫 번째 단계는 "단체 선택 또는 신규 생성"입니다. 사용자가 작업할 단체를 선택하려면 모든 단체의 목록을 조회하고, 필요한 경우 단체명으로 검색하거나 상태/날짜로 필터링할 수 있어야 합니다. 이 API는 프론트엔드 단체 선택 화면의 백엔드 지원을 담당합니다.

**작업 내용:**

1. **FastAPI 라우터 구조 설정**

   `backend/routers/groups.py` 파일을 생성하고 FastAPI 라우터를 설정하세요.

   ```python
   from fastapi import APIRouter, Query, HTTPException
   from typing import Optional, List
   from datetime import date
   from uuid import UUID

   router = APIRouter(prefix="/api/groups", tags=["groups"])
   ```

2. **GET /api/groups 엔드포인트 구현**

   **Query Parameters:**
   - `name`: Optional[str] = None
     - 단체명 부분 검색 (LIKE '%name%')
     - 대소문자 구분 없이 검색

   - `status`: Optional[str] = None
     - 상태 필터링 ('estimate', 'contract', 'confirmed' 중 하나)
     - 유효하지 않은 값이 들어오면 400 에러 반환

   - `start_date_from`: Optional[date] = None
     - 출발일 시작 범위
     - start_date >= start_date_from 조건

   - `start_date_to`: Optional[date] = None
     - 출발일 종료 범위
     - start_date <= start_date_to 조건

   - `page`: int = Query(1, ge=1)
     - 페이지 번호 (1부터 시작)
     - 1 이상의 값만 허용

   - `limit`: int = Query(20, ge=1, le=100)
     - 페이지당 항목 수
     - 1~100 사이의 값만 허용

   **응답 형식:**
   ```python
   {
       "data": [
           {
               "id": "uuid",
               "name": "하노이 골프단",
               "start_date": "2025-01-15",
               "end_date": "2025-01-20",
               "nights": 5,
               "days": 6,
               "pax": 20,
               "status": "estimate",
               "created_at": "2025-01-01T10:00:00",
               "updated_at": "2025-01-01T10:00:00"
           },
           ...
       ],
       "total": 100,  # 전체 항목 수
       "page": 1,     # 현재 페이지
       "limit": 20,   # 페이지당 항목 수
       "total_pages": 5  # 전체 페이지 수
   }
   ```

3. **데이터베이스 쿼리 최적화**

   - SQLAlchemy를 사용하여 groups 테이블 조회
   - WHERE 절에 검색/필터 조건 동적 추가
   - LIMIT/OFFSET을 사용한 페이징 처리
   - 총 개수 조회를 위한 COUNT 쿼리
   - 인덱스 활용 확인 (name, start_date, status)

**실행 절차:**

1. `backend/routers/groups.py` 파일 생성:
   ```bash
   mkdir -p backend/routers
   touch backend/routers/groups.py
   ```

2. 필요한 모듈 import 및 라우터 설정:
   ```python
   from fastapi import APIRouter, Query, HTTPException, Depends
   from sqlalchemy.orm import Session
   from typing import Optional, List
   from datetime import date
   from uuid import UUID

   from database import get_db
   from models import Group
   from schemas import GroupListResponse, GroupSummary

   router = APIRouter(prefix="/api/groups", tags=["groups"])
   ```

3. GET 엔드포인트 함수 구현:
   ```python
   @router.get("", response_model=GroupListResponse)
   def get_groups(
       name: Optional[str] = None,
       status: Optional[str] = None,
       start_date_from: Optional[date] = None,
       start_date_to: Optional[date] = None,
       page: int = Query(1, ge=1),
       limit: int = Query(20, ge=1, le=100),
       db: Session = Depends(get_db)
   ):
       """
       단체 목록 조회

       - **name**: 단체명 검색 (부분 일치)
       - **status**: 상태 필터 (estimate/contract/confirmed)
       - **start_date_from**: 출발일 시작 범위
       - **start_date_to**: 출발일 종료 범위
       - **page**: 페이지 번호 (기본값: 1)
       - **limit**: 페이지당 항목 수 (기본값: 20, 최대: 100)
       """

       # 1. 기본 쿼리 생성
       query = db.query(Group)

       # 2. 검색/필터 조건 적용
       if name:
           query = query.filter(Group.name.ilike(f"%{name}%"))

       if status:
           # 상태 값 검증
           valid_statuses = ['estimate', 'contract', 'confirmed']
           if status not in valid_statuses:
               raise HTTPException(
                   status_code=400,
                   detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
               )
           query = query.filter(Group.status == status)

       if start_date_from:
           query = query.filter(Group.start_date >= start_date_from)

       if start_date_to:
           query = query.filter(Group.start_date <= start_date_to)

       # 3. 총 개수 조회
       total = query.count()

       # 4. 페이징 적용
       offset = (page - 1) * limit
       groups = query.order_by(Group.created_at.desc())\
                    .offset(offset)\
                    .limit(limit)\
                    .all()

       # 5. 응답 데이터 구성
       total_pages = (total + limit - 1) // limit  # 올림 계산

       return {
           "data": groups,
           "total": total,
           "page": page,
           "limit": limit,
           "total_pages": total_pages
       }
   ```

4. Pydantic 스키마 정의 (`backend/schemas.py`):
   ```python
   from pydantic import BaseModel
   from datetime import date, datetime
   from typing import List
   from uuid import UUID

   class GroupSummary(BaseModel):
       id: UUID
       name: str
       start_date: date
       end_date: date
       nights: int
       days: int
       pax: int
       status: str
       created_at: datetime
       updated_at: datetime

       class Config:
           from_attributes = True  # Pydantic v2
           # orm_mode = True  # Pydantic v1

   class GroupListResponse(BaseModel):
       data: List[GroupSummary]
       total: int
       page: int
       limit: int
       total_pages: int
   ```

5. 메인 앱에 라우터 등록 (`backend/main.py`):
   ```python
   from fastapi import FastAPI
   from routers import groups

   app = FastAPI(title="여행사 계약 관리 시스템")

   # 라우터 등록
   app.include_router(groups.router)
   ```

6. 서버 실행 및 테스트:
   ```bash
   # FastAPI 서버 실행
   uvicorn backend.main:app --reload --port 8000

   # API 문서 확인
   # http://localhost:8000/docs
   ```

**중요 사항:**

- **대소문자 구분 없는 검색**: `ilike()` 메서드를 사용하여 대소문자 구분 없이 검색합니다. PostgreSQL에서는 성능을 위해 `lower()` 함수와 함께 인덱스를 생성할 수 있습니다.

- **인덱스 활용**: name, start_date, status 컬럼에 인덱스가 생성되어 있으므로 (T-DB-01 참조) 검색 성능이 최적화됩니다.

- **페이지 번호 검증**: page는 1 이상, limit는 1~100 사이여야 합니다. FastAPI의 Query 검증을 사용합니다.

- **정렬 순서**: 기본적으로 최신 생성 순으로 정렬 (`created_at DESC`)합니다.

- **NULL 처리**: 모든 Query Parameter는 Optional이며, 제공되지 않으면 해당 조건은 적용하지 않습니다.

**검증 방법:**

1. **기본 조회 테스트**:
   ```bash
   curl http://localhost:8000/api/groups
   ```

2. **단체명 검색 테스트**:
   ```bash
   curl "http://localhost:8000/api/groups?name=하노이"
   ```

3. **상태 필터 테스트**:
   ```bash
   curl "http://localhost:8000/api/groups?status=estimate"
   ```

4. **날짜 범위 검색 테스트**:
   ```bash
   curl "http://localhost:8000/api/groups?start_date_from=2025-01-01&start_date_to=2025-12-31"
   ```

5. **페이징 테스트**:
   ```bash
   curl "http://localhost:8000/api/groups?page=2&limit=10"
   ```

6. **복합 조건 테스트**:
   ```bash
   curl "http://localhost:8000/api/groups?name=골프&status=estimate&page=1&limit=20"
   ```

7. **유효하지 않은 status 값 테스트**:
   ```bash
   curl "http://localhost:8000/api/groups?status=invalid"
   # 예상 결과: 400 Bad Request
   ```

8. **단위 테스트 작성** (`tests/test_groups_api.py`):
   ```python
   from fastapi.testclient import TestClient
   from main import app

   client = TestClient(app)

   def test_get_groups_default():
       response = client.get("/api/groups")
       assert response.status_code == 200
       data = response.json()
       assert "data" in data
       assert "total" in data
       assert "page" in data
       assert "limit" in data
       assert data["page"] == 1
       assert data["limit"] == 20

   def test_get_groups_with_name_filter():
       response = client.get("/api/groups?name=하노이")
       assert response.status_code == 200
       data = response.json()
       # 모든 결과의 name에 "하노이"가 포함되어야 함
       for group in data["data"]:
           assert "하노이" in group["name"]

   def test_get_groups_with_invalid_status():
       response = client.get("/api/groups?status=invalid")
       assert response.status_code == 400

   def test_get_groups_pagination():
       response = client.get("/api/groups?page=1&limit=5")
       assert response.status_code == 200
       data = response.json()
       assert data["limit"] == 5
       assert len(data["data"]) <= 5
   ```

**산출물:**

- `backend/routers/groups.py`: 단체 라우터 및 GET /api/groups 엔드포인트
- `backend/schemas.py`: GroupSummary, GroupListResponse Pydantic 스키마
- `tests/test_groups_api.py`: 단위 테스트 코드

**의존성:**

- **선행 task**: T-DB-01 (groups 테이블 필요)
- **후행 task**: T-UI-01 (단체 선택 화면에서 이 API 사용)

---

### T-API-02 단체 상세 조회 API

**참조 문서:**
- PRD Section 5: 핵심 사용자 시나리오
- PRD Section 8.2: 입력 화면 요구사항
- TRD Section 4.1.2: 단체 상세 조회 API 명세

**목표**: 특정 단체의 상세 정보와 관련된 모든 데이터(일정, 취소 규정, 포함/불포함 항목)를 조회하는 API를 구현합니다.

**배경:**
사용자가 단체를 선택한 후, 해당 단체의 모든 정보를 화면에 표시하거나 수정하려면 단체 기본 정보뿐만 아니라 일정, 취소 규정, 포함/불포함 항목 등 관련된 모든 데이터를 한 번에 조회해야 합니다. 이 API는 단일 요청으로 모든 필요한 데이터를 제공하여 프론트엔드의 요청 횟수를 최소화합니다.

**작업 내용:**

1. **GET /api/groups/{group_id} 엔드포인트 구현**

   **Path Parameter:**
   - `group_id`: UUID - 조회할 단체의 고유 ID

   **응답 형식:**
   ```python
   {
       "id": "uuid",
       "name": "하노이 골프단",
       "start_date": "2025-01-15",
       "end_date": "2025-01-20",
       "nights": 5,
       "nights_manual": false,
       "days": 6,
       "days_manual": false,
       "pax": 20,
       "price_per_pax": 1500000,
       "total_price": 30000000,
       "total_price_manual": false,
       "deposit": 10000000,
       "balance": 20000000,
       "balance_manual": false,
       "balance_due_date": "2025-01-08",
       "balance_due_date_manual": false,
       "status": "estimate",
       "created_by": "user123",
       "created_at": "2025-01-01T10:00:00",
       "updated_by": "user123",
       "updated_at": "2025-01-01T12:00:00",

       "itineraries": [
           {
               "id": "uuid",
               "day_no": 1,
               "itinerary_date": "2025-01-15",
               "itinerary_date_manual": false,
               "location": "인천",
               "transport": "OZ729",
               "time": "09:10",
               "schedule": "인천 국제공항 출발",
               "meals": "조:기내식",
               "accommodation": null
           },
           ...
       ],

       "cancel_rules": [
           {
               "id": "uuid",
               "days_before": 30,
               "cancel_date": "2024-12-16",
               "cancel_date_manual": false,
               "penalty_rate": 10.0,
               "penalty_amount": null,
               "description": "여행 개시 30일 전까지 취소 시"
           },
           ...
       ],

       "includes": [
           {
               "id": "uuid",
               "item_type": "include",
               "category": "항공",
               "description": "왕복 항공료",
               "display_order": 1
           },
           ...
       ]
   }
   ```

2. **N+1 쿼리 문제 방지**

   SQLAlchemy의 `joinedload()` 또는 `selectinload()`를 사용하여 관련 데이터를 한 번에 로드합니다.

**실행 절차:**

1. `backend/routers/groups.py`에 GET 엔드포인트 추가:
   ```python
   from sqlalchemy.orm import joinedload

   @router.get("/{group_id}", response_model=GroupDetailResponse)
   def get_group_detail(
       group_id: UUID,
       db: Session = Depends(get_db)
   ):
       """
       단체 상세 정보 조회

       - **group_id**: 조회할 단체의 UUID

       Returns:
           단체 기본 정보 + 일정 + 취소 규정 + 포함/불포함 항목
       """

       # Eager loading으로 관련 데이터 한 번에 조회
       group = db.query(Group)\
           .options(
               joinedload(Group.itineraries),
               joinedload(Group.cancel_rules),
               joinedload(Group.includes)
           )\
           .filter(Group.id == group_id)\
           .first()

       if not group:
           raise HTTPException(
               status_code=404,
               detail=f"Group not found: {group_id}"
           )

       return group
   ```

2. Pydantic 스키마 정의 (`backend/schemas.py`):
   ```python
   from typing import List, Optional

   class ItineraryDetail(BaseModel):
       id: UUID
       day_no: int
       itinerary_date: date
       itinerary_date_manual: bool
       location: Optional[str]
       transport: Optional[str]
       time: Optional[str]
       schedule: Optional[str]
       meals: Optional[str]
       accommodation: Optional[str]

       class Config:
           from_attributes = True

   class CancelRuleDetail(BaseModel):
       id: UUID
       days_before: int
       cancel_date: date
       cancel_date_manual: bool
       penalty_rate: float
       penalty_amount: Optional[float]
       description: Optional[str]

       class Config:
           from_attributes = True

   class IncludeItemDetail(BaseModel):
       id: UUID
       item_type: str
       category: Optional[str]
       description: str
       display_order: int

       class Config:
           from_attributes = True

   class GroupDetailResponse(BaseModel):
       # 기본 정보
       id: UUID
       name: str
       start_date: date
       end_date: date
       nights: int
       nights_manual: bool
       days: int
       days_manual: bool
       pax: int
       price_per_pax: float
       total_price: float
       total_price_manual: bool
       deposit: float
       balance: float
       balance_manual: bool
       balance_due_date: Optional[date]
       balance_due_date_manual: bool
       status: str
       created_by: Optional[str]
       created_at: datetime
       updated_by: Optional[str]
       updated_at: datetime

       # 관련 데이터
       itineraries: List[ItineraryDetail]
       cancel_rules: List[CancelRuleDetail]
       includes: List[IncludeItemDetail]

       class Config:
           from_attributes = True
   ```

3. SQLAlchemy 모델에 relationship 정의 (`backend/models.py`):
   ```python
   from sqlalchemy import Column, String, Integer, Date, Boolean, DECIMAL, TIMESTAMP, ForeignKey, Text
   from sqlalchemy.dialects.postgresql import UUID
   from sqlalchemy.orm import relationship
   import uuid

   class Group(Base):
       __tablename__ = "groups"

       id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
       # ... 다른 컬럼들 ...

       # Relationships
       itineraries = relationship("Itinerary", back_populates="group", order_by="Itinerary.day_no")
       cancel_rules = relationship("CancelRule", back_populates="group", order_by="CancelRule.days_before.desc()")
       includes = relationship("IncludeItem", back_populates="group", order_by="IncludeItem.display_order")

   class Itinerary(Base):
       __tablename__ = "group_itinerary"

       id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
       group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
       # ... 다른 컬럼들 ...

       group = relationship("Group", back_populates="itineraries")

   # CancelRule, IncludeItem도 유사하게 정의
   ```

**중요 사항:**

- **Eager Loading**: `joinedload()` 또는 `selectinload()`를 사용하여 N+1 쿼리 문제를 방지합니다.
  - `joinedload()`: LEFT JOIN을 사용하여 한 번의 쿼리로 로드 (1:N 관계가 적을 때 효율적)
  - `selectinload()`: 별도의 SELECT 쿼리로 로드 (1:N 관계가 많을 때 효율적)

- **정렬 순서**: relationship의 `order_by` 파라미터로 관련 데이터의 정렬 순서를 지정합니다.
  - itineraries: day_no 오름차순
  - cancel_rules: days_before 내림차순 (가장 늦은 날짜부터)
  - includes: display_order 오름차순

- **404 처리**: 존재하지 않는 group_id로 요청 시 404 Not Found 반환

**검증 방법:**

1. **정상 조회 테스트**:
   ```bash
   curl http://localhost:8000/api/groups/{valid_uuid}
   ```

2. **존재하지 않는 ID 테스트**:
   ```bash
   curl http://localhost:8000/api/groups/00000000-0000-0000-0000-000000000000
   # 예상 결과: 404 Not Found
   ```

3. **N+1 쿼리 확인**: SQLAlchemy 로깅을 활성화하여 실행된 SQL 쿼리 수 확인
   ```python
   import logging
   logging.basicConfig()
   logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
   ```

4. **단위 테스트**:
   ```python
   def test_get_group_detail_success(db, sample_group):
       response = client.get(f"/api/groups/{sample_group.id}")
       assert response.status_code == 200
       data = response.json()
       assert data["id"] == str(sample_group.id)
       assert "itineraries" in data
       assert "cancel_rules" in data
       assert "includes" in data

   def test_get_group_detail_not_found():
       response = client.get("/api/groups/00000000-0000-0000-0000-000000000000")
       assert response.status_code == 404
   ```

**산출물:**

- `backend/routers/groups.py`: GET /api/groups/{group_id} 엔드포인트
- `backend/schemas.py`: GroupDetailResponse 및 관련 스키마
- `backend/models.py`: relationship 정의
- `tests/test_groups_api.py`: 단위 테스트 추가

**의존성:**

- **선행 task**: T-DB-01 (모든 테이블 필요)
- **후행 task**: T-UI-02 (단체 입력 화면에서 이 API 사용)

---

### T-API-03 단체 생성 API

**참조 문서:**

- PRD Section 5.1: 단체 등록 시나리오
- PRD Section 6.2.1: groups 테이블 스키마
- PRD Section 7: 자동 계산 로직 (생성 시 기본값)
- PRD Section 12.1: 단체 정보 검증 규칙
- TRD Section 4.1.3: POST /api/groups API 명세
- TRD Section 5.4.6: 생성 시 자동 계산 로직

**목표**: 새로운 단체를 생성하는 API를 구현합니다. 생성 시 기본 자동 계산 로직을 적용하고 데이터 검증을 수행합니다.

**배경:**

PRD Section 5.1에 따르면, 사용자가 단체명, 출발일, 도착일, 인원, 1인당 요금, 계약금 등의 기본 정보를 입력하면 시스템이 자동으로 박수, 일수, 총액, 잔액을 계산하여 저장합니다. 또한 PRD Section 12.1의 검증 규칙을 준수해야 합니다.

**작업 내용:**

1. **POST /api/groups 엔드포인트 구현**

   새로운 단체를 생성하는 REST API 엔드포인트를 구현하세요.

   **요청 스키마 (GroupCreateRequest):**
   ```python
   class GroupCreateRequest(BaseModel):
       name: str = Field(..., min_length=1, max_length=255, description="단체명")
       start_date: date = Field(..., description="출발일")
       end_date: date = Field(..., description="도착일")
       pax: int = Field(..., gt=0, description="인원수 (양수)")
       price_per_pax: Decimal = Field(..., ge=0, description="1인당 요금 (0 이상)")
       deposit: Decimal = Field(..., ge=0, description="계약금 (0 이상)")
       region: Optional[str] = Field(None, max_length=100, description="지역")
       notes: Optional[str] = Field(None, description="비고")

       @validator('end_date')
       def validate_end_date(cls, v, values):
           if 'start_date' in values and v <= values['start_date']:
               raise ValueError('도착일은 출발일보다 이후여야 합니다')
           return v

       @validator('deposit')
       def validate_deposit(cls, v, values):
           if 'pax' in values and 'price_per_pax' in values:
               total_price = values['pax'] * values['price_per_pax']
               if v > total_price:
                   raise ValueError('계약금은 총액을 초과할 수 없습니다')
           return v
   ```

   **응답 스키마 (GroupResponse):**
   ```python
   class GroupResponse(BaseModel):
       id: UUID
       name: str
       start_date: date
       end_date: date
       nights: int  # 자동 계산됨
       days: int    # 자동 계산됨
       pax: int
       price_per_pax: Decimal
       total_price: Decimal  # 자동 계산됨
       deposit: Decimal
       balance: Decimal  # 자동 계산됨
       status: str  # 기본값: 'estimate'
       region: Optional[str]
       notes: Optional[str]
       created_at: datetime
       updated_at: datetime

       class Config:
           from_attributes = True
   ```

2. **자동 계산 로직 적용**

   생성 시 다음 필드를 자동으로 계산하세요 (PRD Section 7 참조):
   - `nights = end_date - start_date` (박수)
   - `days = nights + 1` (일수)
   - `total_price = pax * price_per_pax` (총액)
   - `balance = total_price - deposit` (잔액)
   - `status = 'estimate'` (기본 상태: 견적)

3. **데이터 검증**

   PRD Section 12.1의 검증 규칙을 구현하세요:
   - 단체명: 1자 이상 255자 이하
   - 출발일 < 도착일
   - 인원수 > 0
   - 1인당 요금 >= 0
   - 계약금 >= 0
   - 계약금 <= 총액

4. **에러 처리**

   - 400 Bad Request: 입력값 검증 실패
   - 500 Internal Server Error: 데이터베이스 오류

**실행 절차:**

1. `backend/routers/groups.py`에 POST 엔드포인트 추가:
   ```python
   @router.post("", response_model=GroupResponse, status_code=201)
   def create_group(
       group_data: GroupCreateRequest,
       db: Session = Depends(get_db),
       current_user: User = Depends(get_current_user)
   ):
       """
       새로운 단체 생성

       - 기본 정보 입력받아 단체 생성
       - 자동 계산 로직 적용 (nights, days, total_price, balance)
       - 기본 상태는 'estimate'
       """
       try:
           # 1. 자동 계산
           nights = (group_data.end_date - group_data.start_date).days
           days = nights + 1
           total_price = group_data.pax * group_data.price_per_pax
           balance = total_price - group_data.deposit

           # 2. Group 객체 생성
           new_group = Group(
               name=group_data.name,
               start_date=group_data.start_date,
               end_date=group_data.end_date,
               nights=nights,
               days=days,
               pax=group_data.pax,
               price_per_pax=group_data.price_per_pax,
               total_price=total_price,
               deposit=group_data.deposit,
               balance=balance,
               status='estimate',
               region=group_data.region,
               notes=group_data.notes,
               nights_manual=False,  # 자동 계산
               days_manual=False,
               total_price_manual=False,
               balance_manual=False
           )

           # 3. 데이터베이스에 저장
           db.add(new_group)
           db.commit()
           db.refresh(new_group)

           # 4. 감사 로그 기록
           log_audit(
               db=db,
               user_id=current_user.id,
               action='CREATE',
               table_name='groups',
               record_id=new_group.id,
               changes={'created': group_data.dict()}
           )

           return new_group

       except SQLAlchemyError as e:
           db.rollback()
           raise HTTPException(status_code=500, detail=f"데이터베이스 오류: {str(e)}")
   ```

2. `backend/schemas.py`에 스키마 정의 추가

3. `backend/services/audit.py`에 감사 로그 함수 추가:
   ```python
   def log_audit(db: Session, user_id: UUID, action: str, table_name: str, record_id: UUID, changes: dict):
       audit_log = AuditLog(
           user_id=user_id,
           action=action,
           table_name=table_name,
           record_id=record_id,
           changes=changes,
           timestamp=datetime.now()
       )
       db.add(audit_log)
       # commit은 호출자가 담당
   ```

4. 단위 테스트 작성:
   ```python
   def test_create_group_success():
       # Given: 유효한 단체 데이터
       group_data = {
           "name": "하노이 골프단",
           "start_date": "2025-03-15",
           "end_date": "2025-03-20",
           "pax": 20,
           "price_per_pax": 1500000,
           "deposit": 10000000,
           "region": "베트남"
       }

       # When: 단체 생성 API 호출
       response = client.post("/api/groups", json=group_data, headers=auth_headers)

       # Then: 201 Created
       assert response.status_code == 201
       data = response.json()
       assert data["name"] == "하노이 골프단"
       assert data["nights"] == 5  # 자동 계산
       assert data["days"] == 6    # 자동 계산
       assert data["total_price"] == 30000000  # 자동 계산
       assert data["balance"] == 20000000  # 자동 계산
       assert data["status"] == "estimate"  # 기본값

   def test_create_group_invalid_dates():
       # Given: 잘못된 날짜 (출발일 >= 도착일)
       group_data = {
           "name": "테스트 단체",
           "start_date": "2025-03-20",
           "end_date": "2025-03-15",  # 출발일보다 이전
           "pax": 20,
           "price_per_pax": 1500000,
           "deposit": 10000000
       }

       # When: 단체 생성 API 호출
       response = client.post("/api/groups", json=group_data, headers=auth_headers)

       # Then: 400 Bad Request
       assert response.status_code == 400
       assert "도착일은 출발일보다 이후여야 합니다" in response.json()["detail"]

   def test_create_group_excess_deposit():
       # Given: 계약금이 총액을 초과
       group_data = {
           "name": "테스트 단체",
           "start_date": "2025-03-15",
           "end_date": "2025-03-20",
           "pax": 20,
           "price_per_pax": 1500000,
           "deposit": 40000000  # 총액(30,000,000)보다 큼
       }

       # When: 단체 생성 API 호출
       response = client.post("/api/groups", json=group_data, headers=auth_headers)

       # Then: 400 Bad Request
       assert response.status_code == 400
       assert "계약금은 총액을 초과할 수 없습니다" in response.json()["detail"]
   ```

**중요 사항:**

- 자동 계산 필드는 모든 `*_manual` 플래그를 FALSE로 설정하세요
- 기본 상태는 항상 `'estimate'`입니다
- 계약금은 총액을 초과할 수 없습니다 (검증 필수)
- 감사 로그는 생성과 동일한 트랜잭션 내에서 기록되어야 합니다
- UUID는 데이터베이스에서 자동 생성됩니다 (gen_random_uuid())

**검증 방법:**

1. 단위 테스트 실행:
   ```bash
   pytest tests/test_groups_api.py::test_create_group_success -v
   pytest tests/test_groups_api.py::test_create_group_invalid_dates -v
   pytest tests/test_groups_api.py::test_create_group_excess_deposit -v
   ```

2. 수동 테스트 (curl):
   ```bash
   curl -X POST http://localhost:8000/api/groups \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $TOKEN" \
     -d '{
       "name": "하노이 골프단",
       "start_date": "2025-03-15",
       "end_date": "2025-03-20",
       "pax": 20,
       "price_per_pax": 1500000,
       "deposit": 10000000,
       "region": "베트남"
     }'
   ```

3. 데이터베이스 확인:
   ```sql
   SELECT id, name, nights, days, total_price, balance, status
   FROM groups
   WHERE name = '하노이 골프단';
   ```

4. 감사 로그 확인:
   ```sql
   SELECT * FROM audit_logs
   WHERE table_name = 'groups' AND action = 'CREATE'
   ORDER BY timestamp DESC LIMIT 1;
   ```

**산출물:**

- `backend/routers/groups.py`: POST /api/groups 엔드포인트
- `backend/schemas.py`: GroupCreateRequest, GroupResponse 스키마
- `backend/services/audit.py`: log_audit() 함수
- `tests/test_groups_api.py`: 단위 테스트 추가

**의존성:**

- **선행 task**: T-DB-01 (groups, audit_logs 테이블 필요)
- **후행 task**: T-UI-02 (단체 입력 화면에서 이 API 호출), T-LOG-01 (감사 로그 조회)

---

### T-API-04 단체 수정 API

**참조 문서:**

- PRD Section 5.2: 단체 정보 수정 시나리오
- PRD Section 7: 자동 재계산 로직 (수정 시)
- PRD Section 7.6: manual 플래그와 재계산 규칙
- PRD Section 12.1: 단체 정보 검증 규칙
- TRD Section 4.1.4: PUT /api/groups/{group_id} API 명세
- TRD Section 5.4.1~5.4.5: 자동 재계산 알고리즘

**목표**: 기존 단체의 정보를 수정하는 API를 구현합니다. 수정 시 변경 감지 및 자동 재계산 로직을 적용하고, manual 플래그를 고려합니다.

**배경:**

PRD Section 5.2에 따르면, 사용자가 단체 정보를 수정할 때 다음 규칙이 적용됩니다:
- **자동 계산 필드를 직접 수정**하면 해당 필드의 `manual` 플래그가 TRUE로 설정됩니다
- **기준 필드를 수정**하면 manual 플래그가 FALSE인 자동 계산 필드만 재계산됩니다
- **일정 날짜는 예외**: 출발일 변경 시 manual 플래그와 관계없이 모든 일정 날짜가 재계산됩니다

**작업 내용:**

1. **PUT /api/groups/{group_id} 엔드포인트 구현**

   기존 단체의 정보를 수정하는 REST API 엔드포인트를 구현하세요.

   **요청 스키마 (GroupUpdateRequest):**
   ```python
   class GroupUpdateRequest(BaseModel):
       name: Optional[str] = Field(None, min_length=1, max_length=255)
       start_date: Optional[date] = None
       end_date: Optional[date] = None
       nights: Optional[int] = Field(None, gt=0)  # 수동 수정 가능
       days: Optional[int] = Field(None, gt=0)    # 수동 수정 가능
       pax: Optional[int] = Field(None, gt=0)
       price_per_pax: Optional[Decimal] = Field(None, ge=0)
       total_price: Optional[Decimal] = Field(None, ge=0)  # 수동 수정 가능
       deposit: Optional[Decimal] = Field(None, ge=0)
       balance: Optional[Decimal] = Field(None, ge=0)  # 수동 수정 가능
       region: Optional[str] = Field(None, max_length=100)
       notes: Optional[str] = None

       @validator('end_date')
       def validate_end_date(cls, v, values):
           if v and 'start_date' in values and values['start_date'] and v <= values['start_date']:
               raise ValueError('도착일은 출발일보다 이후여야 합니다')
           return v
   ```

2. **변경 감지 및 manual 플래그 설정**

   수정된 필드를 감지하여 적절한 manual 플래그를 설정하세요:
   - `nights`를 직접 수정 → `nights_manual = TRUE`
   - `days`를 직접 수정 → `days_manual = TRUE`
   - `total_price`를 직접 수정 → `total_price_manual = TRUE`
   - `balance`를 직접 수정 → `balance_manual = TRUE`

3. **자동 재계산 로직**

   기준 필드 수정 시 manual 플래그가 FALSE인 필드만 재계산:
   - `start_date` 또는 `end_date` 변경 → `nights_manual == FALSE`인 경우 nights 재계산
   - `nights` 변경 → `days_manual == FALSE`인 경우 days 재계산
   - `pax` 또는 `price_per_pax` 변경 → `total_price_manual == FALSE`인 경우 total_price 재계산
   - `total_price` 또는 `deposit` 변경 → `balance_manual == FALSE`인 경우 balance 재계산

4. **출발일 변경 시 일정 재배치**

   `start_date`가 변경되면 모든 일정 날짜를 재계산하세요 (T-CALC-05 호출).

5. **감사 로그 기록**

   변경된 필드만 감사 로그에 기록하세요 (before/after 값).

**실행 절차:**

1. `backend/routers/groups.py`에 PUT 엔드포인트 추가:
   ```python
   @router.put("/{group_id}", response_model=GroupResponse)
   def update_group(
       group_id: UUID,
       update_data: GroupUpdateRequest,
       db: Session = Depends(get_db),
       current_user: User = Depends(get_current_user)
   ):
       """
       단체 정보 수정

       - 변경 감지 및 manual 플래그 설정
       - 자동 재계산 로직 적용 (manual 플래그 고려)
       - 출발일 변경 시 일정 재배치
       """
       # 1. 기존 단체 조회
       group = db.query(Group).filter(Group.id == group_id).first()
       if not group:
           raise HTTPException(status_code=404, detail="단체를 찾을 수 없습니다")

       # 2. 변경 사항 추적 (감사 로그용)
       changes = {}
       old_start_date = group.start_date

       # 3. 업데이트 및 manual 플래그 설정
       update_dict = update_data.dict(exclude_unset=True)

       for field, new_value in update_dict.items():
           old_value = getattr(group, field)
           if old_value != new_value:
               changes[field] = {"old": old_value, "new": new_value}
               setattr(group, field, new_value)

               # manual 플래그 설정
               if field == 'nights':
                   group.nights_manual = True
               elif field == 'days':
                   group.days_manual = True
               elif field == 'total_price':
                   group.total_price_manual = True
               elif field == 'balance':
                   group.balance_manual = True

       # 4. 자동 재계산 (manual 플래그가 FALSE인 필드만)
       if 'start_date' in changes or 'end_date' in changes:
           if not group.nights_manual:
               new_nights = (group.end_date - group.start_date).days
               changes['nights'] = {"old": group.nights, "new": new_nights, "auto": True}
               group.nights = new_nights

       if 'nights' in changes:
           if not group.days_manual:
               new_days = group.nights + 1
               changes['days'] = {"old": group.days, "new": new_days, "auto": True}
               group.days = new_days

       if 'pax' in changes or 'price_per_pax' in changes:
           if not group.total_price_manual:
               new_total = group.pax * group.price_per_pax
               changes['total_price'] = {"old": group.total_price, "new": new_total, "auto": True}
               group.total_price = new_total

       if 'total_price' in changes or 'deposit' in changes:
           if not group.balance_manual:
               new_balance = group.total_price - group.deposit
               changes['balance'] = {"old": group.balance, "new": new_balance, "auto": True}
               group.balance = new_balance

       # 5. 출발일 변경 시 일정 재배치
       if 'start_date' in changes:
           recalculate_itinerary_dates(db, group_id, group.start_date)
           changes['itinerary_recalculated'] = True

       # 6. 데이터베이스 저장
       db.commit()
       db.refresh(group)

       # 7. 감사 로그 기록
       if changes:
           log_audit(
               db=db,
               user_id=current_user.id,
               action='UPDATE',
               table_name='groups',
               record_id=group_id,
               changes=changes
           )
           db.commit()

       return group
   ```

2. `backend/services/calculation.py`에 일정 재배치 함수 추가:
   ```python
   def recalculate_itinerary_dates(db: Session, group_id: UUID, new_start_date: date):
       """
       출발일 변경 시 모든 일정 날짜 재계산

       Note: manual 플래그와 관계없이 모든 일정 날짜를 재계산합니다.
       """
       itineraries = db.query(Itinerary)\
           .filter_by(group_id=group_id)\
           .order_by(Itinerary.day_no)\
           .all()

       for itinerary in itineraries:
           new_date = new_start_date + timedelta(days=itinerary.day_no - 1)
           itinerary.itinerary_date = new_date

       # commit은 호출자가 담당
   ```

3. 단위 테스트 작성:
   ```python
   def test_update_group_auto_recalculation():
       # Given: 자동 계산 필드인 단체
       group = create_test_group(
           start_date='2025-03-15',
           end_date='2025-03-20',
           nights=5,
           nights_manual=False  # 자동 계산 모드
       )

       # When: 도착일만 변경
       update_data = {"end_date": "2025-03-22"}
       response = client.put(f"/api/groups/{group.id}", json=update_data, headers=auth_headers)

       # Then: nights가 자동 재계산됨
       assert response.status_code == 200
       data = response.json()
       assert data["nights"] == 7  # 자동 재계산 (3/22 - 3/15 = 7박)

   def test_update_group_manual_no_recalculation():
       # Given: 수동 수정된 필드
       group = create_test_group(
           start_date='2025-03-15',
           end_date='2025-03-20',
           nights=10,  # 실제 5박이지만 수동으로 10박 설정
           nights_manual=True  # 수동 수정 모드
       )

       # When: 도착일 변경
       update_data = {"end_date": "2025-03-22"}
       response = client.put(f"/api/groups/{group.id}", json=update_data, headers=auth_headers)

       # Then: nights는 재계산되지 않음 (수동 값 유지)
       assert response.status_code == 200
       data = response.json()
       assert data["nights"] == 10  # 수동 값 유지

   def test_update_group_manual_flag_set():
       # Given: 자동 계산 필드인 단체
       group = create_test_group(nights=5, nights_manual=False)

       # When: nights를 직접 수정
       update_data = {"nights": 10}
       response = client.put(f"/api/groups/{group.id}", json=update_data, headers=auth_headers)

       # Then: nights_manual 플래그가 TRUE로 설정됨
       assert response.status_code == 200
       updated_group = db.query(Group).filter_by(id=group.id).first()
       assert updated_group.nights_manual == True

   def test_update_group_start_date_recalculates_itinerary():
       # Given: 출발일 2025-03-15인 단체와 일정
       group = create_test_group(start_date='2025-03-15')
       create_test_itinerary(group.id, day_no=1, date='2025-03-15')
       create_test_itinerary(group.id, day_no=2, date='2025-03-16')

       # When: 출발일을 2025-04-01로 변경
       update_data = {"start_date": "2025-04-01"}
       response = client.put(f"/api/groups/{group.id}", json=update_data, headers=auth_headers)

       # Then: 모든 일정 날짜가 재계산됨
       assert response.status_code == 200
       itineraries = db.query(Itinerary).filter_by(group_id=group.id).order_by(Itinerary.day_no).all()
       assert itineraries[0].itinerary_date == date(2025, 4, 1)  # Day 1
       assert itineraries[1].itinerary_date == date(2025, 4, 2)  # Day 2
   ```

**중요 사항:**

- **manual 플래그 규칙을 정확히 준수**하세요:
  - 자동 계산 필드를 직접 수정 → manual 플래그 TRUE
  - 기준 필드 수정 시 manual == FALSE인 필드만 재계산
- **일정 날짜는 예외**: 출발일 변경 시 manual 플래그와 관계없이 모든 일정 날짜 재계산
- 변경되지 않은 필드는 감사 로그에 기록하지 마세요
- 자동 재계산된 필드는 감사 로그에 `"auto": true` 표시

**검증 방법:**

1. 단위 테스트 실행:
   ```bash
   pytest tests/test_groups_api.py::test_update_group_auto_recalculation -v
   pytest tests/test_groups_api.py::test_update_group_manual_no_recalculation -v
   pytest tests/test_groups_api.py::test_update_group_manual_flag_set -v
   pytest tests/test_groups_api.py::test_update_group_start_date_recalculates_itinerary -v
   ```

2. 수동 테스트 (자동 재계산):
   ```bash
   # 1. 단체 생성 (자동 계산 모드)
   GROUP_ID=$(curl -X POST http://localhost:8000/api/groups \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"name":"테스트","start_date":"2025-03-15","end_date":"2025-03-20",...}' \
     | jq -r '.id')

   # 2. 도착일 변경 → nights 자동 재계산 확인
   curl -X PUT http://localhost:8000/api/groups/$GROUP_ID \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"end_date":"2025-03-25"}' | jq '.nights'  # 10 (자동 계산)
   ```

3. 수동 테스트 (manual 플래그 설정):
   ```bash
   # nights를 직접 수정 → manual 플래그 TRUE 확인
   curl -X PUT http://localhost:8000/api/groups/$GROUP_ID \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"nights":15}'

   # 데이터베이스에서 manual 플래그 확인
   psql -c "SELECT nights, nights_manual FROM groups WHERE id = '$GROUP_ID';"
   ```

4. 감사 로그 확인:
   ```sql
   SELECT changes FROM audit_logs
   WHERE table_name = 'groups' AND action = 'UPDATE' AND record_id = '$GROUP_ID'
   ORDER BY timestamp DESC LIMIT 1;
   ```

**산출물:**

- `backend/routers/groups.py`: PUT /api/groups/{group_id} 엔드포인트
- `backend/schemas.py`: GroupUpdateRequest 스키마
- `backend/services/calculation.py`: recalculate_itinerary_dates() 함수
- `tests/test_groups_api.py`: 단위 테스트 추가

**의존성:**

- **선행 task**: T-API-03 (단체 생성 필요), T-DB-01 (manual 플래그 컬럼 필요)
- **후행 task**: T-CALC-06 (통합 재계산 로직), T-UI-02 (단체 수정 화면)

---

### T-API-05 상태 변경 API

**참조 문서:**

- PRD Section 10: 상태별 제어 요구사항
- PRD Section 10.1: 상태 전환 규칙 (견적 → 계약 → 확정)
- PRD Section 10.2: 상태별 수정 권한
- PRD Section 11.5: 감사 로그 요구사항
- TRD Section 4.1.5: PUT /api/groups/{group_id}/status API 명세
- TRD Section 7.1: 상태 전환 검증 로직

**목표**: 단체의 상태를 변경하는 API를 구현합니다. 상태 전환 규칙을 검증하고 권한을 확인합니다.

**배경:**

PRD Section 10.1에 따르면, 단체 상태는 반드시 **견적(estimate) → 계약(contract) → 확정(confirmed)** 순서로만 변경되어야 합니다. 역방향 전환(예: 확정 → 계약)은 관리자 권한이 있어야 허용됩니다. 또한 PRD Section 10.2에 따라 확정 상태에서는 대부분의 수정이 금지됩니다.

**작업 내용:**

1. **PUT /api/groups/{group_id}/status 엔드포인트 구현**

   단체의 상태를 변경하는 REST API 엔드포인트를 구현하세요.

   **요청 스키마 (StatusChangeRequest):**
   ```python
   class StatusChangeRequest(BaseModel):
       new_status: str = Field(..., regex="^(estimate|contract|confirmed)$", description="새로운 상태")
       reason: Optional[str] = Field(None, max_length=500, description="상태 변경 사유")

       @validator('new_status')
       def validate_status(cls, v):
           allowed_statuses = ['estimate', 'contract', 'confirmed']
           if v not in allowed_statuses:
               raise ValueError(f'상태는 {allowed_statuses} 중 하나여야 합니다')
           return v
   ```

   **응답 스키마 (StatusChangeResponse):**
   ```python
   class StatusChangeResponse(BaseModel):
       id: UUID
       name: str
       old_status: str
       new_status: str
       changed_by: str  # 사용자 이름
       changed_at: datetime
       reason: Optional[str]
   ```

2. **상태 전환 규칙 검증**

   PRD Section 10.1의 규칙을 구현하세요:

   **정방향 전환 (권한 불요):**
   - `estimate → contract`: 누구나 가능
   - `contract → confirmed`: 누구나 가능

   **역방향 전환 (관리자 권한 필요):**
   - `contract → estimate`: 관리자만 가능
   - `confirmed → contract`: 관리자만 가능
   - `confirmed → estimate`: 관리자만 가능

   **금지된 전환:**
   - 동일 상태로의 전환 (예: `estimate → estimate`)

3. **권한 검증**

   역방향 전환 시 사용자 역할을 확인하세요:
   ```python
   if is_backward_transition and current_user.role != 'admin':
       raise HTTPException(status_code=403, detail="역방향 상태 전환은 관리자만 가능합니다")
   ```

4. **감사 로그 기록**

   모든 상태 변경을 감사 로그에 기록하세요 (변경 사유 포함).

**실행 절차:**

1. `backend/routers/groups.py`에 PUT /status 엔드포인트 추가:
   ```python
   @router.put("/{group_id}/status", response_model=StatusChangeResponse)
   def change_group_status(
       group_id: UUID,
       status_data: StatusChangeRequest,
       db: Session = Depends(get_db),
       current_user: User = Depends(get_current_user)
   ):
       """
       단체 상태 변경

       - 상태 전환 규칙 검증 (정방향/역방향)
       - 역방향 전환 시 관리자 권한 확인
       - 감사 로그 기록
       """
       # 1. 기존 단체 조회
       group = db.query(Group).filter(Group.id == group_id).first()
       if not group:
           raise HTTPException(status_code=404, detail="단체를 찾을 수 없습니다")

       old_status = group.status
       new_status = status_data.new_status

       # 2. 동일 상태 전환 방지
       if old_status == new_status:
           raise HTTPException(status_code=400, detail="동일한 상태로는 변경할 수 없습니다")

       # 3. 상태 전환 방향 판단
       status_order = {'estimate': 1, 'contract': 2, 'confirmed': 3}
       is_backward = status_order[new_status] < status_order[old_status]

       # 4. 역방향 전환 시 권한 검증
       if is_backward:
           if current_user.role != 'admin':
               raise HTTPException(
                   status_code=403,
                   detail="역방향 상태 전환은 관리자만 가능합니다"
               )

       # 5. 상태 변경
       group.status = new_status
       db.commit()
       db.refresh(group)

       # 6. 감사 로그 기록
       log_audit(
           db=db,
           user_id=current_user.id,
           action='STATUS_CHANGE',
           table_name='groups',
           record_id=group_id,
           changes={
               'old_status': old_status,
               'new_status': new_status,
               'reason': status_data.reason,
               'is_backward': is_backward
           }
       )
       db.commit()

       return StatusChangeResponse(
           id=group.id,
           name=group.name,
           old_status=old_status,
           new_status=new_status,
           changed_by=current_user.name,
           changed_at=datetime.now(),
           reason=status_data.reason
       )
   ```

2. `backend/models.py`에 User 모델 추가 (아직 없는 경우):
   ```python
   class User(Base):
       __tablename__ = 'users'

       id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
       name = Column(String(255), nullable=False)
       email = Column(String(255), unique=True, nullable=False)
       role = Column(String(50), nullable=False, default='user')  # user, admin
       created_at = Column(DateTime, default=datetime.now)
   ```

3. 단위 테스트 작성:
   ```python
   def test_status_change_forward_success():
       # Given: 견적 상태의 단체
       group = create_test_group(status='estimate')

       # When: 계약 상태로 변경 (정방향)
       response = client.put(
           f"/api/groups/{group.id}/status",
           json={"new_status": "contract", "reason": "계약 체결"},
           headers=user_auth_headers  # 일반 사용자
       )

       # Then: 200 OK, 상태 변경 성공
       assert response.status_code == 200
       data = response.json()
       assert data["old_status"] == "estimate"
       assert data["new_status"] == "contract"

   def test_status_change_backward_forbidden_for_user():
       # Given: 계약 상태의 단체
       group = create_test_group(status='contract')

       # When: 견적 상태로 변경 (역방향, 일반 사용자)
       response = client.put(
           f"/api/groups/{group.id}/status",
           json={"new_status": "estimate"},
           headers=user_auth_headers  # 일반 사용자
       )

       # Then: 403 Forbidden
       assert response.status_code == 403
       assert "관리자만 가능" in response.json()["detail"]

   def test_status_change_backward_success_for_admin():
       # Given: 확정 상태의 단체
       group = create_test_group(status='confirmed')

       # When: 계약 상태로 변경 (역방향, 관리자)
       response = client.put(
           f"/api/groups/{group.id}/status",
           json={"new_status": "contract", "reason": "수정 필요"},
           headers=admin_auth_headers  # 관리자
       )

       # Then: 200 OK, 상태 변경 성공
       assert response.status_code == 200
       data = response.json()
       assert data["old_status"] == "confirmed"
       assert data["new_status"] == "contract"

   def test_status_change_same_status_fails():
       # Given: 견적 상태의 단체
       group = create_test_group(status='estimate')

       # When: 동일한 견적 상태로 변경 시도
       response = client.put(
           f"/api/groups/{group.id}/status",
           json={"new_status": "estimate"},
           headers=user_auth_headers
       )

       # Then: 400 Bad Request
       assert response.status_code == 400
       assert "동일한 상태로는 변경할 수 없습니다" in response.json()["detail"]
   ```

**중요 사항:**

- **상태 순서를 명확히 정의**하세요: `estimate(1) → contract(2) → confirmed(3)`
- 역방향 전환은 반드시 관리자 권한 확인
- 동일 상태로의 전환은 허용하지 않음
- 감사 로그에 변경 사유를 반드시 기록
- 상태 변경은 별도의 엔드포인트로 관리 (PUT /groups/{id}와 분리)

**검증 방법:**

1. 단위 테스트 실행:
   ```bash
   pytest tests/test_groups_api.py::test_status_change_forward_success -v
   pytest tests/test_groups_api.py::test_status_change_backward_forbidden_for_user -v
   pytest tests/test_groups_api.py::test_status_change_backward_success_for_admin -v
   pytest tests/test_groups_api.py::test_status_change_same_status_fails -v
   ```

2. 수동 테스트 (정방향 전환):
   ```bash
   # 견적 → 계약
   curl -X PUT http://localhost:8000/api/groups/$GROUP_ID/status \
     -H "Authorization: Bearer $USER_TOKEN" \
     -d '{"new_status":"contract","reason":"계약 체결"}'
   ```

3. 수동 테스트 (역방향 전환, 관리자):
   ```bash
   # 확정 → 계약 (관리자만 가능)
   curl -X PUT http://localhost:8000/api/groups/$GROUP_ID/status \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -d '{"new_status":"contract","reason":"수정 필요"}'
   ```

4. 감사 로그 확인:
   ```sql
   SELECT * FROM audit_logs
   WHERE table_name = 'groups' AND action = 'STATUS_CHANGE'
   ORDER BY timestamp DESC LIMIT 5;
   ```

**산출물:**

- `backend/routers/groups.py`: PUT /api/groups/{group_id}/status 엔드포인트
- `backend/schemas.py`: StatusChangeRequest, StatusChangeResponse 스키마
- `backend/models.py`: User 모델 (권한 관리용)
- `tests/test_groups_api.py`: 단위 테스트 추가

**의존성:**

- **선행 task**: T-DB-01 (groups.status 컬럼 필요), T-API-03 (단체 생성 필요)
- **후행 task**: T-STATE-01 (상태별 수정 제어), T-UI-01 (상태별 색상 표시)

---

### T-API-06 자동 계산 트리거 API

**참조 문서:**

- PRD Section 7: 자동 계산 로직 전체
- PRD Section 7.6: manual 플래그 규칙
- PRD Section 10.2: 확정 상태에서 재계산 금지
- TRD Section 4.1.6: POST /api/groups/{group_id}/recalculate API 명세
- TRD Section 5.4: 통합 재계산 알고리즘

**목표**: 사용자가 수동으로 자동 계산을 트리거할 수 있는 API를 구현합니다. manual 플래그를 존중하며 선택적 필드 재계산을 지원합니다.

**배경:**

PRD Section 7에 따르면, 자동 계산 필드는 기준 필드 변경 시 자동으로 재계산됩니다. 하지만 사용자가 명시적으로 재계산을 트리거하고 싶은 경우가 있습니다. 예를 들어:
- 수동으로 수정한 필드를 다시 자동 계산 모드로 되돌리고 싶을 때
- 데이터 불일치가 발생했을 때 전체 재계산이 필요할 때

이 API는 **선택적 필드 재계산**을 지원하며, manual 플래그가 TRUE인 필드는 기본적으로 보호합니다. 단, 사용자가 명시적으로 요청하면 manual 플래그를 FALSE로 리셋하고 재계산합니다.

**작업 내용:**

1. **POST /api/groups/{group_id}/recalculate 엔드포인트 구현**

   단체의 자동 계산 필드를 재계산하는 REST API 엔드포인트를 구현하세요.

   **요청 스키마 (RecalculateRequest):**
   ```python
   class RecalculateRequest(BaseModel):
       fields: Optional[List[str]] = Field(
           None,
           description="재계산할 필드 목록 (생략 시 모든 자동 계산 필드). 예: ['nights', 'days', 'total_price', 'balance']"
       )
       reset_manual_flags: bool = Field(
           False,
           description="True인 경우 지정된 필드의 manual 플래그를 FALSE로 리셋하고 재계산"
       )

       @validator('fields')
       def validate_fields(cls, v):
           if v:
               allowed_fields = ['nights', 'days', 'total_price', 'balance']
               invalid = [f for f in v if f not in allowed_fields]
               if invalid:
                   raise ValueError(f'잘못된 필드: {invalid}. 허용: {allowed_fields}')
           return v
   ```

   **응답 스키마 (RecalculateResponse):**
   ```python
   class RecalculateResponse(BaseModel):
       group_id: UUID
       recalculated_fields: Dict[str, Any]  # {"nights": {"old": 5, "new": 7, "manual_reset": True}, ...}
       skipped_fields: List[str]  # manual 플래그로 인해 건너뛴 필드
       message: str
   ```

2. **상태 검증**

   확정 상태에서는 재계산을 금지하세요 (PRD Section 10.2):
   ```python
   if group.status == 'confirmed':
       raise HTTPException(status_code=403, detail="확정 상태에서는 재계산할 수 없습니다")
   ```

3. **선택적 필드 재계산 로직**

   사용자가 지정한 필드만 재계산하거나, 생략 시 모든 자동 계산 필드를 재계산하세요.

4. **manual 플래그 처리**

   - `reset_manual_flags=False` (기본값): manual 플래그가 TRUE인 필드는 건너뜀
   - `reset_manual_flags=True`: manual 플래그를 FALSE로 리셋하고 재계산

**실행 절차:**

1. `backend/routers/groups.py`에 POST /recalculate 엔드포인트 추가:
   ```python
   @router.post("/{group_id}/recalculate", response_model=RecalculateResponse)
   def recalculate_group(
       group_id: UUID,
       request: RecalculateRequest,
       db: Session = Depends(get_db),
       current_user: User = Depends(get_current_user)
   ):
       """
       자동 계산 트리거

       - 선택적 필드 재계산 지원
       - manual 플래그 보호 또는 리셋 옵션
       - 확정 상태에서는 재계산 금지
       """
       # 1. 기존 단체 조회
       group = db.query(Group).filter(Group.id == group_id).first()
       if not group:
           raise HTTPException(status_code=404, detail="단체를 찾을 수 없습니다")

       # 2. 상태 확인
       if group.status == 'confirmed':
           raise HTTPException(status_code=403, detail="확정 상태에서는 재계산할 수 없습니다")

       # 3. 재계산할 필드 목록 결정
       fields_to_recalc = request.fields or ['nights', 'days', 'total_price', 'balance']

       recalculated = {}
       skipped = []

       # 4. 각 필드 재계산
       for field in fields_to_recalc:
           manual_flag = f"{field}_manual"
           is_manual = getattr(group, manual_flag, False)

           # manual 플래그 확인
           if is_manual and not request.reset_manual_flags:
               skipped.append(field)
               continue

           old_value = getattr(group, field)

           # 재계산 로직
           if field == 'nights':
               new_value = (group.end_date - group.start_date).days
           elif field == 'days':
               new_value = group.nights + 1
           elif field == 'total_price':
               new_value = group.pax * group.price_per_pax
           elif field == 'balance':
               new_value = group.total_price - group.deposit
           else:
               continue

           # 값 업데이트
           setattr(group, field, new_value)

           # manual 플래그 리셋 (요청 시)
           if request.reset_manual_flags:
               setattr(group, manual_flag, False)
               recalculated[field] = {
                   "old": old_value,
                   "new": new_value,
                   "manual_reset": True
               }
           else:
               recalculated[field] = {
                   "old": old_value,
                   "new": new_value
               }

       # 5. 데이터베이스 저장
       db.commit()
       db.refresh(group)

       # 6. 감사 로그 기록
       log_audit(
           db=db,
           user_id=current_user.id,
           action='RECALCULATE',
           table_name='groups',
           record_id=group_id,
           changes={
               'recalculated_fields': recalculated,
               'skipped_fields': skipped,
               'reset_manual_flags': request.reset_manual_flags
           }
       )
       db.commit()

       # 7. 응답 생성
       message = f"{len(recalculated)}개 필드 재계산 완료"
       if skipped:
           message += f", {len(skipped)}개 필드 건너뜀 (수동 수정됨)"

       return RecalculateResponse(
           group_id=group_id,
           recalculated_fields=recalculated,
           skipped_fields=skipped,
           message=message
       )
   ```

2. `backend/services/calculation.py`에 통합 재계산 함수 추가 (재사용용):
   ```python
   def recalculate_all_fields(group: Group, fields: List[str] = None, reset_manual: bool = False):
       """
       모든 자동 계산 필드 재계산

       Args:
           group: Group 객체
           fields: 재계산할 필드 목록 (None이면 모든 필드)
           reset_manual: True인 경우 manual 플래그 리셋

       Returns:
           (recalculated_dict, skipped_list)
       """
       # 위 엔드포인트와 동일한 로직
       pass
   ```

3. 단위 테스트 작성:
   ```python
   def test_recalculate_all_fields():
       # Given: 자동 계산 필드인 단체
       group = create_test_group(
           start_date='2025-03-15',
           end_date='2025-03-20',
           pax=20,
           price_per_pax=1500000,
           deposit=10000000
       )
       # 수동으로 값 변경 (DB 직접 수정)
       db.execute(f"UPDATE groups SET nights = 10 WHERE id = '{group.id}'")

       # When: 전체 재계산 요청
       response = client.post(
           f"/api/groups/{group.id}/recalculate",
           json={},
           headers=auth_headers
       )

       # Then: 모든 필드 재계산됨
       assert response.status_code == 200
       data = response.json()
       assert 'nights' in data['recalculated_fields']
       assert data['recalculated_fields']['nights']['new'] == 5  # 정확한 값으로 재계산

   def test_recalculate_manual_field_protected():
       # Given: 수동 수정된 필드
       group = create_test_group(nights=10, nights_manual=True)

       # When: 재계산 요청 (reset_manual_flags=False)
       response = client.post(
           f"/api/groups/{group.id}/recalculate",
           json={"fields": ["nights"], "reset_manual_flags": False},
           headers=auth_headers
       )

       # Then: 수동 필드는 건너뜀
       assert response.status_code == 200
       data = response.json()
       assert 'nights' in data['skipped_fields']
       assert 'nights' not in data['recalculated_fields']

   def test_recalculate_manual_field_with_reset():
       # Given: 수동 수정된 필드
       group = create_test_group(
           start_date='2025-03-15',
           end_date='2025-03-20',
           nights=10,  # 실제는 5박이지만 수동으로 10박 설정
           nights_manual=True
       )

       # When: manual 플래그 리셋하며 재계산
       response = client.post(
           f"/api/groups/{group.id}/recalculate",
           json={"fields": ["nights"], "reset_manual_flags": True},
           headers=auth_headers
       )

       # Then: manual 플래그 리셋되고 재계산됨
       assert response.status_code == 200
       data = response.json()
       assert 'nights' in data['recalculated_fields']
       assert data['recalculated_fields']['nights']['new'] == 5
       assert data['recalculated_fields']['nights']['manual_reset'] == True

       # DB 확인: manual 플래그가 FALSE로 변경
       updated_group = db.query(Group).filter_by(id=group.id).first()
       assert updated_group.nights_manual == False

   def test_recalculate_confirmed_status_forbidden():
       # Given: 확정 상태의 단체
       group = create_test_group(status='confirmed')

       # When: 재계산 시도
       response = client.post(
           f"/api/groups/{group.id}/recalculate",
           json={},
           headers=auth_headers
       )

       # Then: 403 Forbidden
       assert response.status_code == 403
       assert "확정 상태에서는 재계산할 수 없습니다" in response.json()["detail"]
   ```

**중요 사항:**

- **확정 상태에서는 재계산 금지** (PRD Section 10.2)
- manual 플래그가 TRUE인 필드는 기본적으로 보호 (`reset_manual_flags=False`)
- `reset_manual_flags=True` 옵션으로 사용자가 명시적으로 자동 계산 모드로 전환 가능
- 재계산된 필드와 건너뛴 필드를 명확히 응답에 포함
- 감사 로그에 어떤 필드가 재계산되었는지 기록

**검증 방법:**

1. 단위 테스트 실행:
   ```bash
   pytest tests/test_groups_api.py::test_recalculate_all_fields -v
   pytest tests/test_groups_api.py::test_recalculate_manual_field_protected -v
   pytest tests/test_groups_api.py::test_recalculate_manual_field_with_reset -v
   pytest tests/test_groups_api.py::test_recalculate_confirmed_status_forbidden -v
   ```

2. 수동 테스트 (전체 재계산):
   ```bash
   curl -X POST http://localhost:8000/api/groups/$GROUP_ID/recalculate \
     -H "Authorization: Bearer $TOKEN" \
     -d '{}'
   ```

3. 수동 테스트 (선택적 필드 재계산):
   ```bash
   curl -X POST http://localhost:8000/api/groups/$GROUP_ID/recalculate \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"fields":["nights","days"],"reset_manual_flags":false}'
   ```

4. 수동 테스트 (manual 플래그 리셋):
   ```bash
   curl -X POST http://localhost:8000/api/groups/$GROUP_ID/recalculate \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"fields":["nights"],"reset_manual_flags":true}'
   ```

**산출물:**

- `backend/routers/groups.py`: POST /api/groups/{group_id}/recalculate 엔드포인트
- `backend/schemas.py`: RecalculateRequest, RecalculateResponse 스키마
- `backend/services/calculation.py`: recalculate_all_fields() 함수
- `tests/test_groups_api.py`: 단위 테스트 추가

**의존성:**

- **선행 task**: T-API-04 (단체 수정 API), T-DB-01 (manual 플래그 컬럼)
- **후행 task**: T-CALC-06 (통합 재계산 로직), T-UI-02 (재계산 버튼 UI)

---

### T-API-07 일정 관리 API

**참조 문서:**

- PRD Section 5.3: 일정 관리 시나리오
- PRD Section 6.2.2: group_itinerary 테이블 스키마
- PRD Section 7.5: 일정 날짜 자동 재배치
- PRD Section 8.3: 일정 관리 화면 요구사항
- TRD Section 4.2.1: 일정 CRUD API 명세
- TRD Section 5.3.2: 일정 추가/삭제 시 day_no 처리

**목표**: 일정의 추가, 수정, 삭제, 조회 기능을 구현하는 API를 제공합니다. day_no 자동 부여 및 날짜 자동 계산 로직을 포함합니다.

**배경:**

PRD Section 5.3에 따르면, 사용자는 단체별로 여러 개의 일정을 추가할 수 있으며, 각 일정은 day_no(일차)와 itinerary_date(날짜)를 가집니다. 일정 추가 시 day_no가 생략되면 자동으로 마지막 번호 + 1을 부여합니다. 일정 날짜는 출발일 기준으로 자동 계산되지만, 사용자가 직접 수정할 수도 있습니다 (manual 플래그 설정).

**중요 규칙:**
- 일정 삭제 시 **day_no를 재정렬하지 않습니다** (의도적인 빈 번호 허용)
- 출발일 변경 시 모든 일정 날짜가 자동 재계산됩니다 (T-API-04에서 구현)

**작업 내용:**

1. **GET /api/groups/{group_id}/itineraries - 일정 목록 조회**

   특정 단체의 모든 일정을 조회하는 API를 구현하세요.

   **응답 스키마 (ItineraryListResponse):**
   ```python
   class ItineraryResponse(BaseModel):
       id: UUID
       group_id: UUID
       day_no: int
       itinerary_date: date
       itinerary_date_manual: bool
       description: str
       created_at: datetime
       updated_at: datetime

       class Config:
           from_attributes = True

   class ItineraryListResponse(BaseModel):
       data: List[ItineraryResponse]
       total: int
   ```

   **엔드포인트 구현:**
   ```python
   @itinerary_router.get("", response_model=ItineraryListResponse)
   def get_itineraries(
       group_id: UUID,
       db: Session = Depends(get_db)
   ):
       """일정 목록 조회 (day_no 순서대로 정렬)"""
       itineraries = db.query(Itinerary)\
           .filter(Itinerary.group_id == group_id)\
           .order_by(Itinerary.day_no)\
           .all()

       return ItineraryListResponse(
           data=itineraries,
           total=len(itineraries)
       )
   ```

2. **POST /api/groups/{group_id}/itineraries - 일정 추가**

   새로운 일정을 추가하는 API를 구현하세요.

   **요청 스키마 (ItineraryCreateRequest):**
   ```python
   class ItineraryCreateRequest(BaseModel):
       day_no: Optional[int] = Field(None, gt=0, description="일차 (생략 시 자동 부여)")
       itinerary_date: Optional[date] = Field(None, description="날짜 (생략 시 자동 계산)")
       description: str = Field(..., min_length=1, max_length=1000, description="일정 내용")

       @validator('itinerary_date')
       def validate_date_with_day_no(cls, v, values):
           # itinerary_date를 직접 지정하면 day_no도 필수
           if v and 'day_no' not in values:
               raise ValueError('날짜를 직접 지정할 경우 day_no도 필요합니다')
           return v
   ```

   **엔드포인트 구현:**
   ```python
   @itinerary_router.post("", response_model=ItineraryResponse, status_code=201)
   def create_itinerary(
       group_id: UUID,
       itinerary_data: ItineraryCreateRequest,
       db: Session = Depends(get_db),
       current_user: User = Depends(get_current_user)
   ):
       """
       일정 추가

       - day_no 생략 시 자동 부여 (마지막 번호 + 1)
       - itinerary_date 생략 시 자동 계산 (start_date + day_no - 1)
       - itinerary_date 직접 지정 시 manual 플래그 TRUE
       """
       # 1. 단체 조회
       group = db.query(Group).filter(Group.id == group_id).first()
       if not group:
           raise HTTPException(status_code=404, detail="단체를 찾을 수 없습니다")

       # 2. day_no 결정 (생략 시 자동 부여)
       if itinerary_data.day_no is None:
           max_day = db.query(func.max(Itinerary.day_no))\
               .filter(Itinerary.group_id == group_id)\
               .scalar()
           day_no = (max_day or 0) + 1
       else:
           day_no = itinerary_data.day_no

       # 3. itinerary_date 결정
       if itinerary_data.itinerary_date is None:
           # 자동 계산: start_date + (day_no - 1)
           itinerary_date = group.start_date + timedelta(days=day_no - 1)
           date_manual = False
       else:
           # 사용자 직접 지정
           itinerary_date = itinerary_data.itinerary_date
           date_manual = True

       # 4. 일정 생성
       new_itinerary = Itinerary(
           group_id=group_id,
           day_no=day_no,
           itinerary_date=itinerary_date,
           itinerary_date_manual=date_manual,
           description=itinerary_data.description
       )

       db.add(new_itinerary)
       db.commit()
       db.refresh(new_itinerary)

       # 5. 감사 로그
       log_audit(
           db=db,
           user_id=current_user.id,
           action='CREATE',
           table_name='group_itinerary',
           record_id=new_itinerary.id,
           changes={'created': itinerary_data.dict()}
       )
       db.commit()

       return new_itinerary
   ```

3. **PUT /api/groups/{group_id}/itineraries/{itinerary_id} - 일정 수정**

   기존 일정을 수정하는 API를 구현하세요.

   **요청 스키마 (ItineraryUpdateRequest):**
   ```python
   class ItineraryUpdateRequest(BaseModel):
       day_no: Optional[int] = Field(None, gt=0)
       itinerary_date: Optional[date] = None
       description: Optional[str] = Field(None, min_length=1, max_length=1000)
   ```

   **엔드포인트 구현:**
   ```python
   @itinerary_router.put("/{itinerary_id}", response_model=ItineraryResponse)
   def update_itinerary(
       group_id: UUID,
       itinerary_id: UUID,
       update_data: ItineraryUpdateRequest,
       db: Session = Depends(get_db),
       current_user: User = Depends(get_current_user)
   ):
       """
       일정 수정

       - itinerary_date 수정 시 manual 플래그 TRUE
       - day_no 변경 시 itinerary_date 재계산 (manual == FALSE인 경우만)
       """
       itinerary = db.query(Itinerary)\
           .filter(Itinerary.id == itinerary_id, Itinerary.group_id == group_id)\
           .first()

       if not itinerary:
           raise HTTPException(status_code=404, detail="일정을 찾을 수 없습니다")

       changes = {}
       update_dict = update_data.dict(exclude_unset=True)

       for field, new_value in update_dict.items():
           old_value = getattr(itinerary, field)
           if old_value != new_value:
               changes[field] = {"old": old_value, "new": new_value}
               setattr(itinerary, field, new_value)

               # itinerary_date 직접 수정 시 manual 플래그 설정
               if field == 'itinerary_date':
                   itinerary.itinerary_date_manual = True
                   changes['itinerary_date_manual'] = {"old": False, "new": True}

       # day_no 변경 시 날짜 자동 재계산 (manual == FALSE인 경우만)
       if 'day_no' in changes and not itinerary.itinerary_date_manual:
           group = db.query(Group).filter(Group.id == group_id).first()
           new_date = group.start_date + timedelta(days=itinerary.day_no - 1)
           changes['itinerary_date'] = {"old": itinerary.itinerary_date, "new": new_date, "auto": True}
           itinerary.itinerary_date = new_date

       db.commit()
       db.refresh(itinerary)

       if changes:
           log_audit(db, current_user.id, 'UPDATE', 'group_itinerary', itinerary_id, changes)
           db.commit()

       return itinerary
   ```

4. **DELETE /api/groups/{group_id}/itineraries/{itinerary_id} - 일정 삭제**

   일정을 삭제하는 API를 구현하세요. **day_no는 재정렬하지 않습니다.**

   **엔드포인트 구현:**
   ```python
   @itinerary_router.delete("/{itinerary_id}", status_code=204)
   def delete_itinerary(
       group_id: UUID,
       itinerary_id: UUID,
       db: Session = Depends(get_db),
       current_user: User = Depends(get_current_user)
   ):
       """
       일정 삭제

       중요: day_no를 재정렬하지 않습니다 (의도적인 빈 번호 허용)
       """
       itinerary = db.query(Itinerary)\
           .filter(Itinerary.id == itinerary_id, Itinerary.group_id == group_id)\
           .first()

       if not itinerary:
           raise HTTPException(status_code=404, detail="일정을 찾을 수 없습니다")

       # 감사 로그 (삭제 전에 기록)
       log_audit(
           db=db,
           user_id=current_user.id,
           action='DELETE',
           table_name='group_itinerary',
           record_id=itinerary_id,
           changes={'deleted': {
               'day_no': itinerary.day_no,
               'description': itinerary.description
           }}
       )

       db.delete(itinerary)
       db.commit()

       return None
   ```

**실행 절차:**

1. `backend/routers/itineraries.py` 파일 생성 및 라우터 등록:
   ```python
   from fastapi import APIRouter, Depends, HTTPException
   from sqlalchemy.orm import Session
   from sqlalchemy import func

   itinerary_router = APIRouter(prefix="/api/groups/{group_id}/itineraries", tags=["itineraries"])
   ```

2. `backend/main.py`에 라우터 등록:
   ```python
   from routers.itineraries import itinerary_router
   app.include_router(itinerary_router)
   ```

3. 단위 테스트 작성 (`tests/test_itineraries_api.py`):
   ```python
   def test_create_itinerary_auto_day_no():
       # Given: 단체 생성
       group = create_test_group(start_date='2025-03-15')

       # When: day_no 생략하고 일정 추가
       response = client.post(
           f"/api/groups/{group.id}/itineraries",
           json={"description": "인천공항 출발"},
           headers=auth_headers
       )

       # Then: day_no = 1 자동 부여
       assert response.status_code == 201
       data = response.json()
       assert data["day_no"] == 1
       assert data["itinerary_date"] == "2025-03-15"  # start_date + 0일
       assert data["itinerary_date_manual"] == False

   def test_create_itinerary_manual_date():
       # Given: 단체 생성
       group = create_test_group(start_date='2025-03-15')

       # When: 날짜 직접 지정
       response = client.post(
           f"/api/groups/{group.id}/itineraries",
           json={
               "day_no": 2,
               "itinerary_date": "2025-03-17",
               "description": "하노이 도착"
           },
           headers=auth_headers
       )

       # Then: manual 플래그 TRUE
       assert response.status_code == 201
       data = response.json()
       assert data["itinerary_date_manual"] == True

   def test_delete_itinerary_no_reordering():
       # Given: 3개 일정 (day_no: 1, 2, 3)
       group = create_test_group()
       it1 = create_itinerary(group.id, day_no=1)
       it2 = create_itinerary(group.id, day_no=2)
       it3 = create_itinerary(group.id, day_no=3)

       # When: 2번 일정 삭제
       response = client.delete(
           f"/api/groups/{group.id}/itineraries/{it2.id}",
           headers=auth_headers
       )

       # Then: day_no는 1, 3으로 빈 번호 존재
       assert response.status_code == 204
       remaining = db.query(Itinerary).filter_by(group_id=group.id).all()
       day_nos = [it.day_no for it in remaining]
       assert day_nos == [1, 3]  # 2번이 비어있음 (재정렬 안 함)
   ```

**중요 사항:**

- **day_no 재정렬 금지**: 일정 삭제 시 빈 번호를 그대로 유지합니다
- day_no 자동 부여: `max(day_no) + 1`
- 날짜 자동 계산: `start_date + (day_no - 1)`
- 날짜 직접 수정 시 `itinerary_date_manual = TRUE`
- 출발일 변경 시 모든 일정 날짜 재계산 (T-API-04에서 구현)

**검증 방법:**

1. 단위 테스트 실행:
   ```bash
   pytest tests/test_itineraries_api.py -v
   ```

2. 수동 테스트:
   ```bash
   # 일정 추가 (자동 day_no)
   curl -X POST http://localhost:8000/api/groups/$GROUP_ID/itineraries \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"description":"인천공항 출발"}'

   # 일정 목록 조회
   curl http://localhost:8000/api/groups/$GROUP_ID/itineraries

   # 일정 수정
   curl -X PUT http://localhost:8000/api/groups/$GROUP_ID/itineraries/$ITINERARY_ID \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"description":"수정된 일정"}'

   # 일정 삭제
   curl -X DELETE http://localhost:8000/api/groups/$GROUP_ID/itineraries/$ITINERARY_ID \
     -H "Authorization: Bearer $TOKEN"
   ```

**산출물:**

- `backend/routers/itineraries.py`: 일정 CRUD API
- `backend/schemas.py`: Itinerary 관련 스키마
- `tests/test_itineraries_api.py`: 단위 테스트

**의존성:**

- **선행 task**: T-DB-01 (group_itinerary 테이블), T-API-03 (단체 생성)
- **후행 task**: T-UI-03 (일정 관리 화면), T-TPL-03 (일정표 템플릿)

---

### T-API-08 취소 규정 관리 API

**참조 문서:**

- PRD Section 6.2.3: group_cancel_rules 테이블 스키마
- PRD Section 7.4: 취소 규정 날짜 자동 계산
- PRD Section 8.4: 취소 규정 관리 화면
- TRD Section 4.2.2: 취소 규정 CRUD API 명세
- TRD Section 5.4.4: 취소 규정 날짜 재계산 로직

**목표**: 취소 규정의 추가, 수정, 삭제, 조회 기능을 구현하는 API를 제공합니다. 출발일 기준으로 취소 규정 날짜를 자동 계산합니다.

**배경:**

PRD Section 7.4에 따르면, 취소 규정의 날짜는 출발일을 기준으로 자동 계산됩니다. 예를 들어:
- "출발 30일 전": `start_date - 30일`
- "출발 7일 전": `start_date - 7일`

사용자가 days_before_departure를 입력하면 시스템이 자동으로 cancel_date를 계산합니다. 단, 사용자가 날짜를 직접 수정할 수도 있습니다 (manual 플래그).

**작업 내용:**

1. **GET /api/groups/{group_id}/cancel-rules - 취소 규정 목록 조회**

   **응답 스키마:**
   ```python
   class CancelRuleResponse(BaseModel):
       id: UUID
       group_id: UUID
       days_before_departure: int
       cancel_date: date
       cancel_date_manual: bool
       penalty_rate: Decimal  # 0.0 ~ 1.0 (0% ~ 100%)
       description: Optional[str]
       created_at: datetime
       updated_at: datetime

       class Config:
           from_attributes = True

   class CancelRuleListResponse(BaseModel):
       data: List[CancelRuleResponse]
       total: int
   ```

   **엔드포인트 구현:**
   ```python
   @cancel_rule_router.get("", response_model=CancelRuleListResponse)
   def get_cancel_rules(
       group_id: UUID,
       db: Session = Depends(get_db)
   ):
       """취소 규정 목록 조회 (출발일 역순 정렬)"""
       rules = db.query(CancelRule)\
           .filter(CancelRule.group_id == group_id)\
           .order_by(CancelRule.days_before_departure.desc())\
           .all()

       return CancelRuleListResponse(data=rules, total=len(rules))
   ```

2. **POST /api/groups/{group_id}/cancel-rules - 취소 규정 추가**

   **요청 스키마:**
   ```python
   class CancelRuleCreateRequest(BaseModel):
       days_before_departure: int = Field(..., ge=0, description="출발 N일 전")
       cancel_date: Optional[date] = Field(None, description="취소 규정 날짜 (생략 시 자동 계산)")
       penalty_rate: Decimal = Field(..., ge=0, le=1, description="위약금 비율 (0.0 ~ 1.0)")
       description: Optional[str] = Field(None, max_length=500)

       @validator('penalty_rate')
       def validate_penalty_rate(cls, v):
           if v < 0 or v > 1:
               raise ValueError('위약금 비율은 0.0 ~ 1.0 사이여야 합니다')
           return v
   ```

   **엔드포인트 구현:**
   ```python
   @cancel_rule_router.post("", response_model=CancelRuleResponse, status_code=201)
   def create_cancel_rule(
       group_id: UUID,
       rule_data: CancelRuleCreateRequest,
       db: Session = Depends(get_db),
       current_user: User = Depends(get_current_user)
   ):
       """
       취소 규정 추가

       - cancel_date 생략 시 자동 계산: start_date - days_before_departure
       - cancel_date 직접 지정 시 manual 플래그 TRUE
       """
       # 1. 단체 조회
       group = db.query(Group).filter(Group.id == group_id).first()
       if not group:
           raise HTTPException(status_code=404, detail="단체를 찾을 수 없습니다")

       # 2. cancel_date 결정
       if rule_data.cancel_date is None:
           # 자동 계산: start_date - days_before_departure
           cancel_date = group.start_date - timedelta(days=rule_data.days_before_departure)
           date_manual = False
       else:
           cancel_date = rule_data.cancel_date
           date_manual = True

       # 3. 취소 규정 생성
       new_rule = CancelRule(
           group_id=group_id,
           days_before_departure=rule_data.days_before_departure,
           cancel_date=cancel_date,
           cancel_date_manual=date_manual,
           penalty_rate=rule_data.penalty_rate,
           description=rule_data.description
       )

       db.add(new_rule)
       db.commit()
       db.refresh(new_rule)

       # 4. 감사 로그
       log_audit(db, current_user.id, 'CREATE', 'group_cancel_rules', new_rule.id, {'created': rule_data.dict()})
       db.commit()

       return new_rule
   ```

3. **PUT /api/groups/{group_id}/cancel-rules/{rule_id} - 취소 규정 수정**

   **요청 스키마:**
   ```python
   class CancelRuleUpdateRequest(BaseModel):
       days_before_departure: Optional[int] = Field(None, ge=0)
       cancel_date: Optional[date] = None
       penalty_rate: Optional[Decimal] = Field(None, ge=0, le=1)
       description: Optional[str] = Field(None, max_length=500)
   ```

   **엔드포인트 구현:**
   ```python
   @cancel_rule_router.put("/{rule_id}", response_model=CancelRuleResponse)
   def update_cancel_rule(
       group_id: UUID,
       rule_id: UUID,
       update_data: CancelRuleUpdateRequest,
       db: Session = Depends(get_db),
       current_user: User = Depends(get_current_user)
   ):
       """
       취소 규정 수정

       - cancel_date 수정 시 manual 플래그 TRUE
       - days_before_departure 변경 시 cancel_date 재계산 (manual == FALSE인 경우만)
       """
       rule = db.query(CancelRule)\
           .filter(CancelRule.id == rule_id, CancelRule.group_id == group_id)\
           .first()

       if not rule:
           raise HTTPException(status_code=404, detail="취소 규정을 찾을 수 없습니다")

       changes = {}
       update_dict = update_data.dict(exclude_unset=True)

       for field, new_value in update_dict.items():
           old_value = getattr(rule, field)
           if old_value != new_value:
               changes[field] = {"old": old_value, "new": new_value}
               setattr(rule, field, new_value)

               if field == 'cancel_date':
                   rule.cancel_date_manual = True

       # days_before_departure 변경 시 날짜 재계산
       if 'days_before_departure' in changes and not rule.cancel_date_manual:
           group = db.query(Group).filter(Group.id == group_id).first()
           new_date = group.start_date - timedelta(days=rule.days_before_departure)
           changes['cancel_date'] = {"old": rule.cancel_date, "new": new_date, "auto": True}
           rule.cancel_date = new_date

       db.commit()
       db.refresh(rule)

       if changes:
           log_audit(db, current_user.id, 'UPDATE', 'group_cancel_rules', rule_id, changes)
           db.commit()

       return rule
   ```

4. **DELETE /api/groups/{group_id}/cancel-rules/{rule_id} - 취소 규정 삭제**

   ```python
   @cancel_rule_router.delete("/{rule_id}", status_code=204)
   def delete_cancel_rule(
       group_id: UUID,
       rule_id: UUID,
       db: Session = Depends(get_db),
       current_user: User = Depends(get_current_user)
   ):
       """취소 규정 삭제"""
       rule = db.query(CancelRule)\
           .filter(CancelRule.id == rule_id, CancelRule.group_id == group_id)\
           .first()

       if not rule:
           raise HTTPException(status_code=404, detail="취소 규정을 찾을 수 없습니다")

       log_audit(db, current_user.id, 'DELETE', 'group_cancel_rules', rule_id, {
           'deleted': {'days_before': rule.days_before_departure, 'penalty_rate': float(rule.penalty_rate)}
       })

       db.delete(rule)
       db.commit()

       return None
   ```

**실행 절차:**

1. `backend/routers/cancel_rules.py` 파일 생성 및 라우터 등록
2. 단위 테스트 작성:
   ```python
   def test_create_cancel_rule_auto_date():
       # Given: 출발일 2025-03-15인 단체
       group = create_test_group(start_date='2025-03-15')

       # When: "출발 30일 전" 취소 규정 추가
       response = client.post(
           f"/api/groups/{group.id}/cancel-rules",
           json={
               "days_before_departure": 30,
               "penalty_rate": 0.1,
               "description": "출발 30일 전 취소 시 10% 위약금"
           },
           headers=auth_headers
       )

       # Then: cancel_date = 2025-02-13 (3/15 - 30일)
       assert response.status_code == 201
       data = response.json()
       assert data["cancel_date"] == "2025-02-13"
       assert data["cancel_date_manual"] == False

   def test_update_days_before_recalculates_date():
       # Given: 취소 규정 (30일 전)
       group = create_test_group(start_date='2025-03-15')
       rule = create_cancel_rule(group.id, days_before=30, cancel_date_manual=False)

       # When: days_before를 7일로 변경
       response = client.put(
           f"/api/groups/{group.id}/cancel-rules/{rule.id}",
           json={"days_before_departure": 7},
           headers=auth_headers
       )

       # Then: cancel_date = 2025-03-08 (3/15 - 7일)
       assert response.status_code == 200
       data = response.json()
       assert data["cancel_date"] == "2025-03-08"
   ```

**중요 사항:**

- 취소 규정 날짜 계산: `start_date - days_before_departure`
- 출발일 변경 시 모든 취소 규정 날짜 재계산 (T-API-04에서 처리 필요)
- penalty_rate는 0.0 ~ 1.0 범위 (0% ~ 100%)

**검증 방법:**

1. 단위 테스트 실행:
   ```bash
   pytest tests/test_cancel_rules_api.py -v
   ```

2. 수동 테스트:
   ```bash
   # 취소 규정 추가
   curl -X POST http://localhost:8000/api/groups/$GROUP_ID/cancel-rules \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"days_before_departure":30,"penalty_rate":0.1}'
   ```

**산출물:**

- `backend/routers/cancel_rules.py`: 취소 규정 CRUD API
- `backend/schemas.py`: CancelRule 관련 스키마
- `tests/test_cancel_rules_api.py`: 단위 테스트

**의존성:**

- **선행 task**: T-DB-01 (group_cancel_rules 테이블), T-API-03 (단체 생성)
- **후행 task**: T-UI-04 (취소 규정 관리 화면), T-TPL-02 (계약서 템플릿)

---

### T-API-09 포함/불포함 항목 관리 API

**참조 문서:**

- PRD Section 6.2.4: group_includes 테이블 스키마
- PRD Section 8.5: 포함/불포함 항목 관리 화면
- TRD Section 4.2.3: 포함/불포함 항목 CRUD API 명세

**목표**: 포함/불포함 항목의 추가, 수정, 삭제, 조회 기능을 구현하는 API를 제공합니다. 표시 순서(display_order) 관리를 포함합니다.

**배경:**

PRD Section 6.2.4에 따르면, 각 단체는 포함/불포함 항목을 관리할 수 있습니다. 예를 들어:
- **포함 항목**: 왕복 항공권, 호텔 숙박, 조식, 관광지 입장료 등
- **불포함 항목**: 개인 경비, 선택 관광, 팁 등

각 항목은 `display_order`를 가지며, 이를 통해 문서 출력 시 표시 순서를 제어합니다.

**작업 내용:**

1. **GET /api/groups/{group_id}/includes - 포함/불포함 항목 목록 조회**

   **응답 스키마:**
   ```python
   class IncludeItemResponse(BaseModel):
       id: UUID
       group_id: UUID
       is_included: bool  # True: 포함, False: 불포함
       item_text: str
       display_order: int
       created_at: datetime
       updated_at: datetime

       class Config:
           from_attributes = True

   class IncludeItemListResponse(BaseModel):
       included_items: List[IncludeItemResponse]  # is_included=True인 항목들
       excluded_items: List[IncludeItemResponse]  # is_included=False인 항목들
       total: int
   ```

   **엔드포인트 구현:**
   ```python
   @include_router.get("", response_model=IncludeItemListResponse)
   def get_include_items(
       group_id: UUID,
       db: Session = Depends(get_db)
   ):
       """포함/불포함 항목 목록 조회 (display_order 순서대로)"""
       items = db.query(IncludeItem)\
           .filter(IncludeItem.group_id == group_id)\
           .order_by(IncludeItem.is_included.desc(), IncludeItem.display_order)\
           .all()

       included = [item for item in items if item.is_included]
       excluded = [item for item in items if not item.is_included]

       return IncludeItemListResponse(
           included_items=included,
           excluded_items=excluded,
           total=len(items)
       )
   ```

2. **POST /api/groups/{group_id}/includes - 포함/불포함 항목 추가**

   **요청 스키마:**
   ```python
   class IncludeItemCreateRequest(BaseModel):
       is_included: bool = Field(..., description="True: 포함 항목, False: 불포함 항목")
       item_text: str = Field(..., min_length=1, max_length=500, description="항목 내용")
       display_order: Optional[int] = Field(None, ge=1, description="표시 순서 (생략 시 자동 부여)")
   ```

   **엔드포인트 구현:**
   ```python
   @include_router.post("", response_model=IncludeItemResponse, status_code=201)
   def create_include_item(
       group_id: UUID,
       item_data: IncludeItemCreateRequest,
       db: Session = Depends(get_db),
       current_user: User = Depends(get_current_user)
   ):
       """
       포함/불포함 항목 추가

       - display_order 생략 시 자동 부여 (마지막 번호 + 1)
       """
       # 1. 단체 조회
       group = db.query(Group).filter(Group.id == group_id).first()
       if not group:
           raise HTTPException(status_code=404, detail="단체를 찾을 수 없습니다")

       # 2. display_order 결정 (생략 시 자동 부여)
       if item_data.display_order is None:
           max_order = db.query(func.max(IncludeItem.display_order))\
               .filter(
                   IncludeItem.group_id == group_id,
                   IncludeItem.is_included == item_data.is_included
               )\
               .scalar()
           display_order = (max_order or 0) + 1
       else:
           display_order = item_data.display_order

       # 3. 항목 생성
       new_item = IncludeItem(
           group_id=group_id,
           is_included=item_data.is_included,
           item_text=item_data.item_text,
           display_order=display_order
       )

       db.add(new_item)
       db.commit()
       db.refresh(new_item)

       # 4. 감사 로그
       log_audit(db, current_user.id, 'CREATE', 'group_includes', new_item.id, {'created': item_data.dict()})
       db.commit()

       return new_item
   ```

3. **PUT /api/groups/{group_id}/includes/{item_id} - 포함/불포함 항목 수정**

   **요청 스키마:**
   ```python
   class IncludeItemUpdateRequest(BaseModel):
       is_included: Optional[bool] = None
       item_text: Optional[str] = Field(None, min_length=1, max_length=500)
       display_order: Optional[int] = Field(None, ge=1)
   ```

   **엔드포인트 구현:**
   ```python
   @include_router.put("/{item_id}", response_model=IncludeItemResponse)
   def update_include_item(
       group_id: UUID,
       item_id: UUID,
       update_data: IncludeItemUpdateRequest,
       db: Session = Depends(get_db),
       current_user: User = Depends(get_current_user)
   ):
       """포함/불포함 항목 수정"""
       item = db.query(IncludeItem)\
           .filter(IncludeItem.id == item_id, IncludeItem.group_id == group_id)\
           .first()

       if not item:
           raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다")

       changes = {}
       update_dict = update_data.dict(exclude_unset=True)

       for field, new_value in update_dict.items():
           old_value = getattr(item, field)
           if old_value != new_value:
               changes[field] = {"old": old_value, "new": new_value}
               setattr(item, field, new_value)

       db.commit()
       db.refresh(item)

       if changes:
           log_audit(db, current_user.id, 'UPDATE', 'group_includes', item_id, changes)
           db.commit()

       return item
   ```

4. **DELETE /api/groups/{group_id}/includes/{item_id} - 포함/불포함 항목 삭제**

   ```python
   @include_router.delete("/{item_id}", status_code=204)
   def delete_include_item(
       group_id: UUID,
       item_id: UUID,
       db: Session = Depends(get_db),
       current_user: User = Depends(get_current_user)
   ):
       """포함/불포함 항목 삭제"""
       item = db.query(IncludeItem)\
           .filter(IncludeItem.id == item_id, IncludeItem.group_id == group_id)\
           .first()

       if not item:
           raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다")

       log_audit(db, current_user.id, 'DELETE', 'group_includes', item_id, {
           'deleted': {'item_text': item.item_text, 'is_included': item.is_included}
       })

       db.delete(item)
       db.commit()

       return None
   ```

5. **POST /api/groups/{group_id}/includes/reorder - 표시 순서 일괄 변경**

   **요청 스키마:**
   ```python
   class ReorderItemsRequest(BaseModel):
       item_orders: List[Dict[str, Any]] = Field(
           ...,
           description="[{'item_id': 'uuid', 'display_order': 1}, ...]"
       )

       @validator('item_orders')
       def validate_orders(cls, v):
           if not v:
               raise ValueError('최소 1개 이상의 항목이 필요합니다')
           for item in v:
               if 'item_id' not in item or 'display_order' not in item:
                   raise ValueError('각 항목은 item_id와 display_order가 필요합니다')
           return v
   ```

   **엔드포인트 구현:**
   ```python
   @include_router.post("/reorder", status_code=200)
   def reorder_include_items(
       group_id: UUID,
       reorder_data: ReorderItemsRequest,
       db: Session = Depends(get_db),
       current_user: User = Depends(get_current_user)
   ):
       """표시 순서 일괄 변경 (드래그 앤 드롭 지원)"""
       changes = []

       for item_order in reorder_data.item_orders:
           item_id = UUID(item_order['item_id'])
           new_order = item_order['display_order']

           item = db.query(IncludeItem)\
               .filter(IncludeItem.id == item_id, IncludeItem.group_id == group_id)\
               .first()

           if item and item.display_order != new_order:
               old_order = item.display_order
               item.display_order = new_order
               changes.append({
                   'item_id': str(item_id),
                   'old_order': old_order,
                   'new_order': new_order
               })

       db.commit()

       if changes:
           log_audit(db, current_user.id, 'REORDER', 'group_includes', group_id, {'reordered': changes})
           db.commit()

       return {"message": f"{len(changes)}개 항목 순서 변경 완료", "changes": changes}
   ```

**실행 절차:**

1. `backend/routers/includes.py` 파일 생성 및 라우터 등록
2. 단위 테스트 작성:
   ```python
   def test_create_include_item_auto_order():
       # Given: 단체 생성
       group = create_test_group()

       # When: display_order 생략하고 포함 항목 추가
       response = client.post(
           f"/api/groups/{group.id}/includes",
           json={"is_included": True, "item_text": "왕복 항공권"},
           headers=auth_headers
       )

       # Then: display_order = 1 자동 부여
       assert response.status_code == 201
       data = response.json()
       assert data["display_order"] == 1

   def test_reorder_items():
       # Given: 3개 항목 (order: 1, 2, 3)
       group = create_test_group()
       item1 = create_include_item(group.id, order=1)
       item2 = create_include_item(group.id, order=2)
       item3 = create_include_item(group.id, order=3)

       # When: 순서 변경 (1 ↔ 3)
       response = client.post(
           f"/api/groups/{group.id}/includes/reorder",
           json={
               "item_orders": [
                   {"item_id": str(item3.id), "display_order": 1},
                   {"item_id": str(item2.id), "display_order": 2},
                   {"item_id": str(item1.id), "display_order": 3}
               ]
           },
           headers=auth_headers
       )

       # Then: 순서 변경 성공
       assert response.status_code == 200
       data = response.json()
       assert data["message"] == "2개 항목 순서 변경 완료"
   ```

**중요 사항:**

- display_order 자동 부여: `max(display_order) + 1` (포함/불포함 각각 별도 관리)
- 드래그 앤 드롭 UI 지원을 위한 `/reorder` 엔드포인트 제공
- 포함 항목과 불포함 항목은 별도로 정렬

**검증 방법:**

1. 단위 테스트 실행:
   ```bash
   pytest tests/test_includes_api.py -v
   ```

2. 수동 테스트:
   ```bash
   # 포함 항목 추가
   curl -X POST http://localhost:8000/api/groups/$GROUP_ID/includes \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"is_included":true,"item_text":"왕복 항공권"}'

   # 순서 변경
   curl -X POST http://localhost:8000/api/groups/$GROUP_ID/includes/reorder \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"item_orders":[{"item_id":"...","display_order":1}]}'
   ```

**산출물:**

- `backend/routers/includes.py`: 포함/불포함 항목 CRUD API
- `backend/schemas.py`: IncludeItem 관련 스키마
- `tests/test_includes_api.py`: 단위 테스트

**의존성:**

- **선행 task**: T-DB-01 (group_includes 테이블), T-API-03 (단체 생성)
- **후행 task**: T-UI-05 (포함/불포함 관리 화면), T-TPL-01 (견적서 템플릿)

---

### T-API-10 문서 출력 API

**참조 문서:**

- PRD Section 9: 문서 출력 요구사항
- PRD Section 6.2.5: documents 테이블 스키마
- PRD Section 11.2: 파일명 생성 규칙
- TRD Section 4.3.1: 문서 생성 API 명세
- TRD Section 6.5: PDF 변환 프로세스

**목표**: 견적서, 계약서, 일정표, 통합 문서를 생성하고 다운로드할 수 있는 API를 구현합니다. 문서 이력 관리 및 버전 관리를 포함합니다.

**배경:**

PRD Section 9에 따르면, 사용자는 다음 4가지 유형의 문서를 PDF로 생성할 수 있습니다:
1. **견적서 (estimate)**: 단체 기본 정보, 요금, 일정, 포함/불포함 항목
2. **계약서 (contract)**: 견적서 + 취소 규정 + 계약 조건
3. **일정표 (itinerary)**: 일정만 출력
4. **통합 문서 (bundle)**: 견적서 + 계약서 + 일정표 모두 포함

각 문서는 버전 관리되며, 파일명 규칙은 `[단체명]_[문서유형]_v[버전]_[날짜].pdf`입니다.

**작업 내용:**

1. **POST /api/groups/{group_id}/documents/generate - 문서 생성**

   **요청 스키마:**
   ```python
   class DocumentGenerateRequest(BaseModel):
       document_type: str = Field(
           ...,
           regex="^(estimate|contract|itinerary|bundle)$",
           description="문서 유형: estimate, contract, itinerary, bundle"
       )
       template_options: Optional[Dict[str, Any]] = Field(
           None,
           description="템플릿 옵션 (예: {'show_prices': True, 'logo_url': '...'})"
       )

       @validator('document_type')
       def validate_type(cls, v):
           allowed = ['estimate', 'contract', 'itinerary', 'bundle']
           if v not in allowed:
               raise ValueError(f'문서 유형은 {allowed} 중 하나여야 합니다')
           return v
   ```

   **응답 스키마:**
   ```python
   class DocumentResponse(BaseModel):
       id: UUID
       group_id: UUID
       document_type: str
       version: int
       file_name: str
       file_path: str
       file_size: int  # bytes
       generated_by: str  # 사용자 이름
       generated_at: datetime
       download_url: str

       class Config:
           from_attributes = True
   ```

   **엔드포인트 구현:**
   ```python
   @document_router.post("/generate", response_model=DocumentResponse, status_code=201)
   async def generate_document(
       group_id: UUID,
       doc_request: DocumentGenerateRequest,
       db: Session = Depends(get_db),
       current_user: User = Depends(get_current_user)
   ):
       """
       문서 생성 (HTML → PDF 변환)

       - 버전 자동 증가
       - 파일명 규칙 적용: [단체명]_[문서유형]_v[버전]_[날짜].pdf
       - 문서 이력 저장
       """
       # 1. 단체 조회 (eager loading으로 모든 관련 데이터 로드)
       group = db.query(Group)\
           .options(
               joinedload(Group.itineraries),
               joinedload(Group.cancel_rules),
               joinedload(Group.includes)
           )\
           .filter(Group.id == group_id)\
           .first()

       if not group:
           raise HTTPException(status_code=404, detail="단체를 찾을 수 없습니다")

       # 2. 버전 결정 (동일 유형의 최신 버전 + 1)
       latest_doc = db.query(Document)\
           .filter(
               Document.group_id == group_id,
               Document.document_type == doc_request.document_type
           )\
           .order_by(Document.version.desc())\
           .first()

       version = (latest_doc.version + 1) if latest_doc else 1

       # 3. 파일명 생성
       today = date.today().strftime('%Y%m%d')
       safe_group_name = group.name.replace(' ', '_').replace('/', '_')
       file_name = f"{safe_group_name}_{doc_request.document_type}_v{version}_{today}.pdf"

       # 4. HTML 템플릿 렌더링 (Jinja2)
       from services.template_renderer import render_template

       html_content = render_template(
           template_name=f"{doc_request.document_type}.html",
           context={
               'group': group,
               'itineraries': group.itineraries,
               'cancel_rules': group.cancel_rules,
               'includes': group.includes,
               'options': doc_request.template_options or {}
           }
       )

       # 5. PDF 변환 (WeasyPrint)
       from services.pdf_generator import generate_pdf

       pdf_bytes = generate_pdf(html_content)
       file_size = len(pdf_bytes)

       # 6. 파일 저장
       file_path = f"documents/{group_id}/{file_name}"
       save_file(file_path, pdf_bytes)

       # 7. 문서 이력 저장
       new_document = Document(
           group_id=group_id,
           document_type=doc_request.document_type,
           version=version,
           file_name=file_name,
           file_path=file_path,
           file_size=file_size,
           generated_by=current_user.id
       )

       db.add(new_document)
       db.commit()
       db.refresh(new_document)

       # 8. 감사 로그
       log_audit(db, current_user.id, 'GENERATE_DOCUMENT', 'documents', new_document.id, {
           'document_type': doc_request.document_type,
           'version': version,
           'file_name': file_name
       })
       db.commit()

       # 9. 다운로드 URL 생성
       download_url = f"/api/documents/{new_document.id}/download"

       return DocumentResponse(
           **new_document.__dict__,
           generated_by=current_user.name,
           download_url=download_url
       )
   ```

2. **GET /api/groups/{group_id}/documents - 문서 이력 조회**

   ```python
   @document_router.get("", response_model=List[DocumentResponse])
   def get_document_history(
       group_id: UUID,
       document_type: Optional[str] = Query(None, regex="^(estimate|contract|itinerary|bundle)$"),
       db: Session = Depends(get_db)
   ):
       """문서 이력 조회 (최신순)"""
       query = db.query(Document).filter(Document.group_id == group_id)

       if document_type:
           query = query.filter(Document.document_type == document_type)

       documents = query.order_by(Document.generated_at.desc()).all()

       return [
           DocumentResponse(
               **doc.__dict__,
               generated_by=doc.user.name,
               download_url=f"/api/documents/{doc.id}/download"
           )
           for doc in documents
       ]
   ```

3. **GET /api/documents/{document_id}/download - 문서 다운로드**

   ```python
   from fastapi.responses import FileResponse

   @document_router.get("/{document_id}/download")
   def download_document(
       document_id: UUID,
       db: Session = Depends(get_db)
   ):
       """문서 다운로드 (PDF 파일)"""
       document = db.query(Document).filter(Document.id == document_id).first()

       if not document:
           raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다")

       if not file_exists(document.file_path):
           raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")

       return FileResponse(
           path=document.file_path,
           filename=document.file_name,
           media_type="application/pdf",
           headers={
               "Content-Disposition": f'attachment; filename="{document.file_name}"'
           }
       )
   ```

**실행 절차:**

1. `backend/routers/documents.py` 파일 생성
2. `backend/services/template_renderer.py` 생성 (Jinja2 템플릿 렌더링)
3. `backend/services/pdf_generator.py` 생성 (WeasyPrint PDF 변환)
4. 단위 테스트 작성:
   ```python
   def test_generate_estimate_document():
       # Given: 단체 생성
       group = create_test_group_with_full_data()

       # When: 견적서 생성
       response = client.post(
           f"/api/groups/{group.id}/documents/generate",
           json={"document_type": "estimate"},
           headers=auth_headers
       )

       # Then: 문서 생성 성공, 버전 1
       assert response.status_code == 201
       data = response.json()
       assert data["document_type"] == "estimate"
       assert data["version"] == 1
       assert data["file_name"].endswith(".pdf")

   def test_generate_document_version_increment():
       # Given: 이미 견적서 v1 존재
       group = create_test_group()
       create_document(group.id, doc_type="estimate", version=1)

       # When: 견적서 재생성
       response = client.post(
           f"/api/groups/{group.id}/documents/generate",
           json={"document_type": "estimate"},
           headers=auth_headers
       )

       # Then: 버전 2로 자동 증가
       assert response.status_code == 201
       data = response.json()
       assert data["version"] == 2
   ```

**중요 사항:**

- 파일명 규칙: `[단체명]_[문서유형]_v[버전]_[날짜].pdf`
- 버전 자동 증가: 동일 유형의 최신 버전 + 1
- PDF 변환은 비동기 처리 가능 (대용량 문서의 경우)
- 문서 이력은 삭제하지 않고 보관 (감사 목적)

**검증 방법:**

1. 단위 테스트 실행:
   ```bash
   pytest tests/test_documents_api.py -v
   ```

2. 수동 테스트:
   ```bash
   # 견적서 생성
   curl -X POST http://localhost:8000/api/groups/$GROUP_ID/documents/generate \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"document_type":"estimate"}'

   # 문서 다운로드
   curl -O http://localhost:8000/api/documents/$DOCUMENT_ID/download
   ```

**산출물:**

- `backend/routers/documents.py`: 문서 생성/조회/다운로드 API
- `backend/services/template_renderer.py`: 템플릿 렌더링 서비스
- `backend/services/pdf_generator.py`: PDF 변환 서비스
- `tests/test_documents_api.py`: 단위 테스트

**의존성:**

- **선행 task**: T-DB-01 (documents 테이블), T-API-02 (단체 상세 조회), T-TPL-01~05 (HTML 템플릿)
- **후행 task**: T-PDF-01 (PDF 변환 모듈), T-UI-06 (문서 출력 화면)

---

### T-API-11 에러 처리 미들웨어

**참조 문서:**

- PRD Section 12.3: 에러 처리 요구사항
- TRD Section 8: 에러 응답 형식 및 HTTP 상태 코드
- TRD Section 8.1: 공통 에러 응답 스키마

**목표**: 공통 에러 처리 미들웨어를 구현하여 모든 API에서 일관된 에러 응답 형식을 제공합니다. 에러 로깅 및 사용자 친화적 메시지를 포함합니다.

**배경:**

PRD Section 12.3에 따르면, 모든 에러는 일관된 형식으로 응답되어야 하며, 사용자에게 명확한 에러 메시지를 제공해야 합니다. 또한 개발자를 위한 상세한 에러 정보는 로그에 기록되어야 합니다.

**작업 내용:**

1. **공통 에러 응답 스키마 정의**

   ```python
   # backend/schemas.py
   class ErrorResponse(BaseModel):
       error: str  # 에러 코드 (예: "VALIDATION_ERROR", "NOT_FOUND")
       message: str  # 사용자 친화적 메시지
       details: Optional[Dict[str, Any]] = None  # 추가 상세 정보
       timestamp: datetime = Field(default_factory=datetime.now)
       path: str  # 요청 경로

       class Config:
           schema_extra = {
               "example": {
                   "error": "VALIDATION_ERROR",
                   "message": "입력값이 올바르지 않습니다",
                   "details": {"field": "start_date", "issue": "도착일보다 이후여야 합니다"},
                   "timestamp": "2025-01-15T10:30:00",
                   "path": "/api/groups"
               }
           }
   ```

2. **커스텀 예외 클래스 정의**

   ```python
   # backend/exceptions.py
   class BaseAPIException(Exception):
       """기본 API 예외"""
       def __init__(
           self,
           message: str,
           error_code: str,
           status_code: int = 500,
           details: Dict[str, Any] = None
       ):
           self.message = message
           self.error_code = error_code
           self.status_code = status_code
           self.details = details or {}
           super().__init__(self.message)

   class ValidationError(BaseAPIException):
       """검증 에러 (400)"""
       def __init__(self, message: str, details: Dict[str, Any] = None):
           super().__init__(
               message=message,
               error_code="VALIDATION_ERROR",
               status_code=400,
               details=details
           )

   class NotFoundError(BaseAPIException):
       """리소스 없음 (404)"""
       def __init__(self, resource: str, resource_id: str = None):
           message = f"{resource}를 찾을 수 없습니다"
           if resource_id:
               message += f" (ID: {resource_id})"
           super().__init__(
               message=message,
               error_code="NOT_FOUND",
               status_code=404,
               details={"resource": resource, "id": resource_id}
           )

   class ForbiddenError(BaseAPIException):
       """권한 없음 (403)"""
       def __init__(self, message: str = "권한이 없습니다"):
           super().__init__(
               message=message,
               error_code="FORBIDDEN",
               status_code=403
           )

   class ConflictError(BaseAPIException):
       """충돌 (409)"""
       def __init__(self, message: str, details: Dict[str, Any] = None):
           super().__init__(
               message=message,
               error_code="CONFLICT",
               status_code=409,
               details=details
           )

   class InternalServerError(BaseAPIException):
       """내부 서버 오류 (500)"""
       def __init__(self, message: str = "내부 서버 오류가 발생했습니다"):
           super().__init__(
               message=message,
               error_code="INTERNAL_SERVER_ERROR",
               status_code=500
           )
   ```

3. **에러 처리 미들웨어 구현**

   ```python
   # backend/middleware/error_handler.py
   import logging
   from fastapi import Request, status
   from fastapi.responses import JSONResponse
   from fastapi.exceptions import RequestValidationError
   from sqlalchemy.exc import SQLAlchemyError
   from exceptions import BaseAPIException

   logger = logging.getLogger(__name__)

   async def error_handler_middleware(request: Request, call_next):
       """
       공통 에러 처리 미들웨어

       - 모든 예외를 catch하여 일관된 형식으로 응답
       - 에러 로깅
       - 사용자 친화적 메시지 제공
       """
       try:
           response = await call_next(request)
           return response

       except BaseAPIException as e:
           # 커스텀 API 예외
           logger.warning(f"{e.error_code}: {e.message}", extra={
               "path": str(request.url),
               "method": request.method,
               "details": e.details
           })

           return JSONResponse(
               status_code=e.status_code,
               content={
                   "error": e.error_code,
                   "message": e.message,
                   "details": e.details,
                   "timestamp": datetime.now().isoformat(),
                   "path": str(request.url.path)
               }
           )

       except RequestValidationError as e:
           # Pydantic 검증 에러
           errors = []
           for error in e.errors():
               field = ".".join(str(loc) for loc in error['loc'] if loc != 'body')
               errors.append({
                   "field": field,
                   "message": error['msg'],
                   "type": error['type']
               })

           logger.warning(f"Validation error: {errors}", extra={
               "path": str(request.url),
               "method": request.method
           })

           return JSONResponse(
               status_code=status.HTTP_400_BAD_REQUEST,
               content={
                   "error": "VALIDATION_ERROR",
                   "message": "입력값이 올바르지 않습니다",
                   "details": {"errors": errors},
                   "timestamp": datetime.now().isoformat(),
                   "path": str(request.url.path)
               }
           )

       except SQLAlchemyError as e:
           # 데이터베이스 에러
           logger.error(f"Database error: {str(e)}", exc_info=True, extra={
               "path": str(request.url),
               "method": request.method
           })

           return JSONResponse(
               status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
               content={
                   "error": "DATABASE_ERROR",
                   "message": "데이터베이스 오류가 발생했습니다",
                   "details": {},
                   "timestamp": datetime.now().isoformat(),
                   "path": str(request.url.path)
               }
           )

       except Exception as e:
           # 예상치 못한 에러
           logger.error(f"Unexpected error: {str(e)}", exc_info=True, extra={
               "path": str(request.url),
               "method": request.method
           })

           return JSONResponse(
               status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
               content={
                   "error": "INTERNAL_SERVER_ERROR",
                   "message": "내부 서버 오류가 발생했습니다",
                   "details": {},
                   "timestamp": datetime.now().isoformat(),
                   "path": str(request.url.path)
               }
           )
   ```

4. **미들웨어 등록 (main.py)**

   ```python
   # backend/main.py
   from fastapi import FastAPI
   from middleware.error_handler import error_handler_middleware

   app = FastAPI(title="Travel Agency Intranet API")

   # 에러 처리 미들웨어 등록
   app.middleware("http")(error_handler_middleware)

   # 라우터 등록
   # ...
   ```

5. **기존 코드 리팩토링 (예시)**

   ```python
   # 기존 코드:
   group = db.query(Group).filter(Group.id == group_id).first()
   if not group:
       raise HTTPException(status_code=404, detail="단체를 찾을 수 없습니다")

   # 개선된 코드:
   from exceptions import NotFoundError

   group = db.query(Group).filter(Group.id == group_id).first()
   if not group:
       raise NotFoundError("단체", str(group_id))
   ```

**실행 절차:**

1. `backend/exceptions.py` 파일 생성 (커스텀 예외 클래스)
2. `backend/middleware/error_handler.py` 파일 생성 (에러 미들웨어)
3. `backend/main.py`에 미들웨어 등록
4. 기존 라우터 코드를 커스텀 예외 사용으로 리팩토링
5. 단위 테스트 작성:
   ```python
   def test_validation_error_response():
       # Given: 잘못된 입력값
       # When: 단체 생성 시도
       response = client.post(
           "/api/groups",
           json={"name": "", "start_date": "invalid"},
           headers=auth_headers
       )

       # Then: 400 에러, 일관된 형식
       assert response.status_code == 400
       data = response.json()
       assert data["error"] == "VALIDATION_ERROR"
       assert "message" in data
       assert "details" in data
       assert "timestamp" in data
       assert "path" in data

   def test_not_found_error_response():
       # When: 존재하지 않는 단체 조회
       response = client.get(
           "/api/groups/00000000-0000-0000-0000-000000000000",
           headers=auth_headers
       )

       # Then: 404 에러, 일관된 형식
       assert response.status_code == 404
       data = response.json()
       assert data["error"] == "NOT_FOUND"
   ```

**중요 사항:**

- 모든 에러는 동일한 스키마로 응답 (일관성)
- 에러 로그는 상세하게, 사용자 메시지는 간결하게
- 예상치 못한 에러도 catch하여 500 응답
- 민감한 정보 (스택 트레이스, DB 오류 상세)는 응답에 포함하지 않음

**검증 방법:**

1. 단위 테스트 실행:
   ```bash
   pytest tests/test_error_handler.py -v
   ```

2. 수동 테스트:
   ```bash
   # Validation error 테스트
   curl -X POST http://localhost:8000/api/groups \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"name":"","start_date":"invalid"}'

   # Not found error 테스트
   curl http://localhost:8000/api/groups/00000000-0000-0000-0000-000000000000
   ```

**산출물:**

- `backend/exceptions.py`: 커스텀 예외 클래스
- `backend/middleware/error_handler.py`: 에러 처리 미들웨어
- `backend/schemas.py`: ErrorResponse 스키마
- `tests/test_error_handler.py`: 단위 테스트

**의존성:**

- **선행 task**: 모든 API 엔드포인트 (T-API-01 ~ T-API-10)
- **후행 task**: T-TEST-02 (통합 테스트)

---

## Phase 2 완료

Phase 2 (백엔드 API task 개선)의 11개 task를 모두 완료했습니다:

**완료된 task:**
1. T-API-01: 단체 목록 조회 API
2. T-API-02: 단체 상세 조회 API
3. T-API-03: 단체 생성 API
4. T-API-04: 단체 수정 API
5. T-API-05: 상태 변경 API
6. T-API-06: 자동 계산 트리거 API
7. T-API-07: 일정 관리 API
8. T-API-08: 취소 규정 관리 API
9. T-API-09: 포함/불포함 항목 관리 API
10. T-API-10: 문서 출력 API
11. T-API-11: 에러 처리 미들웨어

각 task에는 다음이 포함되어 있습니다:
- PRD/TRD 참조 문서
- 배경 및 목표
- 상세한 작업 내용 및 코드 예시
- 실행 절차
- 검증 방법
- 단위 테스트
- 의존성

다음은 **Phase 3: 자동 계산 로직 task 개선 (T-CALC-01 ~ T-CALC-06, 6개)**입니다.

---

## Phase 3: 자동 계산 로직 TASK

### T-CALC-01 기간 계산 로직

**참조 문서:**

- PRD Section 7.1: 기간 계산 규칙 (박수, 일수)
- PRD Section 7.6: manual 플래그와 재계산 규칙
- TRD Section 5.4.1: 기간 계산 알고리즘

**목표**: 출발일과 도착일을 기준으로 박수(nights)와 일수(days)를 자동 계산하는 함수를 구현합니다. manual 플래그를 고려하여 선택적 재계산을 지원합니다.

**배경:**

PRD Section 7.1에 따르면, 박수와 일수는 다음 공식으로 계산됩니다:
- **박수 (nights)**: `end_date - start_date` (일 단위)
- **일수 (days)**: `nights + 1`

예: 3월 15일 출발 ~ 3월 20일 도착 → 5박 6일

단, `nights_manual` 또는 `days_manual` 플래그가 TRUE인 경우 해당 필드는 재계산하지 않습니다.

**작업 내용:**

1. **기간 계산 함수 구현**

   `backend/services/calculation.py` 파일에 `calculate_period()` 함수를 구현하세요.

   **함수 시그니처:**
   ```python
   def calculate_period(group: Group) -> Dict[str, Any]:
       """
       기간 계산 (박수, 일수)

       Args:
           group: Group 객체

       Returns:
           {
               'nights': int,
               'days': int,
               'nights_changed': bool,
               'days_changed': bool
           }

       Note:
           - nights_manual == TRUE인 경우 nights 재계산 생략
           - days_manual == TRUE인 경우 days 재계산 생략
       """
   ```

   **구현 코드:**
   ```python
   from datetime import date, timedelta
   from typing import Dict, Any
   from models import Group

   def calculate_period(group: Group) -> Dict[str, Any]:
       """기간 계산 (박수, 일수)"""
       result = {
           'nights': group.nights,
           'days': group.days,
           'nights_changed': False,
           'days_changed': False
       }

       # 1. 박수 계산 (manual 플래그 확인)
       if not group.nights_manual:
           calculated_nights = (group.end_date - group.start_date).days

           if calculated_nights != group.nights:
               result['nights'] = calculated_nights
               result['nights_changed'] = True
               group.nights = calculated_nights

       # 2. 일수 계산 (manual 플래그 확인)
       if not group.days_manual:
           calculated_days = group.nights + 1

           if calculated_days != group.days:
               result['days'] = calculated_days
               result['days_changed'] = True
               group.days = calculated_days

       return result
   ```

2. **검증 로직 추가**

   출발일과 도착일의 논리적 오류를 검증하세요:
   ```python
   def validate_dates(start_date: date, end_date: date) -> None:
       """날짜 검증"""
       if end_date <= start_date:
           raise ValueError(f'도착일({end_date})은 출발일({start_date})보다 이후여야 합니다')

       # 최대 기간 제한 (예: 365일)
       if (end_date - start_date).days > 365:
           raise ValueError('여행 기간은 최대 365일을 초과할 수 없습니다')
   ```

3. **단위 테스트 작성**

   ```python
   # tests/test_calculation.py
   import pytest
   from datetime import date
   from services.calculation import calculate_period, validate_dates
   from models import Group

   def test_calculate_period_auto_mode():
       # Given: 자동 계산 모드 (manual 플래그 FALSE)
       group = Group(
           start_date=date(2025, 3, 15),
           end_date=date(2025, 3, 20),
           nights=0,  # 초기값
           days=0,    # 초기값
           nights_manual=False,
           days_manual=False
       )

       # When: 기간 계산
       result = calculate_period(group)

       # Then: 박수 5, 일수 6으로 계산됨
       assert result['nights'] == 5
       assert result['days'] == 6
       assert result['nights_changed'] == True
       assert result['days_changed'] == True
       assert group.nights == 5
       assert group.days == 6

   def test_calculate_period_manual_mode():
       # Given: 수동 수정 모드 (manual 플래그 TRUE)
       group = Group(
           start_date=date(2025, 3, 15),
           end_date=date(2025, 3, 20),
           nights=10,  # 수동으로 설정된 값 (실제는 5박)
           days=11,    # 수동으로 설정된 값 (실제는 6일)
           nights_manual=True,
           days_manual=True
       )

       # When: 기간 계산
       result = calculate_period(group)

       # Then: 수동 값 유지 (재계산 안 함)
       assert result['nights'] == 10
       assert result['days'] == 11
       assert result['nights_changed'] == False
       assert result['days_changed'] == False
       assert group.nights == 10
       assert group.days == 11

   def test_calculate_period_partial_manual():
       # Given: nights는 수동, days는 자동
       group = Group(
           start_date=date(2025, 3, 15),
           end_date=date(2025, 3, 20),
           nights=10,  # 수동으로 설정 (실제는 5박)
           days=0,
           nights_manual=True,
           days_manual=False
       )

       # When: 기간 계산
       result = calculate_period(group)

       # Then: nights는 유지, days는 nights 기준으로 계산
       assert result['nights'] == 10  # 수동 값 유지
       assert result['days'] == 11    # 10 + 1
       assert result['nights_changed'] == False
       assert result['days_changed'] == True

   def test_validate_dates_invalid():
       # When/Then: 도착일이 출발일보다 이전
       with pytest.raises(ValueError, match="도착일은 출발일보다 이후여야 합니다"):
           validate_dates(
               start_date=date(2025, 3, 20),
               end_date=date(2025, 3, 15)
           )

   def test_validate_dates_same_day():
       # When/Then: 출발일과 도착일이 동일
       with pytest.raises(ValueError, match="도착일은 출발일보다 이후여야 합니다"):
           validate_dates(
               start_date=date(2025, 3, 15),
               end_date=date(2025, 3, 15)
           )

   def test_validate_dates_too_long():
       # When/Then: 365일 초과
       with pytest.raises(ValueError, match="최대 365일을 초과할 수 없습니다"):
           validate_dates(
               start_date=date(2025, 1, 1),
               end_date=date(2026, 1, 2)  # 366일
           )
   ```

**실행 절차:**

1. `backend/services/calculation.py` 파일 생성 (없는 경우)
2. `calculate_period()` 함수 구현
3. `validate_dates()` 함수 구현
4. `tests/test_calculation.py` 파일에 단위 테스트 작성
5. 테스트 실행:
   ```bash
   pytest tests/test_calculation.py::test_calculate_period_auto_mode -v
   pytest tests/test_calculation.py::test_calculate_period_manual_mode -v
   pytest tests/test_calculation.py::test_validate_dates_invalid -v
   ```

**중요 사항:**

- **manual 플래그 우선**: manual == TRUE인 필드는 절대 재계산하지 않음
- **날짜 검증**: 출발일 < 도착일 조건 필수
- **일수 계산**: 항상 `nights + 1` (박수가 수동 설정된 경우에도 동일)
- **변경 감지**: 실제로 값이 변경된 경우에만 `*_changed = True`

**검증 방법:**

1. 단위 테스트 실행:
   ```bash
   pytest tests/test_calculation.py -v
   ```

2. 통합 테스트 (API를 통한 검증):
   ```python
   # 1. 단체 생성 (자동 계산)
   response = client.post("/api/groups", json={
       "name": "테스트 단체",
       "start_date": "2025-03-15",
       "end_date": "2025-03-20",
       "pax": 20,
       "price_per_pax": 1500000,
       "deposit": 10000000
   })
   assert response.json()["nights"] == 5
   assert response.json()["days"] == 6

   # 2. 도착일 변경 (자동 재계산 확인)
   group_id = response.json()["id"]
   response = client.put(f"/api/groups/{group_id}", json={
       "end_date": "2025-03-25"
   })
   assert response.json()["nights"] == 10  # 자동 재계산
   assert response.json()["days"] == 11    # 자동 재계산
   ```

**산출물:**

- `backend/services/calculation.py`: calculate_period(), validate_dates() 함수
- `tests/test_calculation.py`: 단위 테스트

**의존성:**

- **선행 task**: T-DB-01 (groups 테이블, manual 플래그 컬럼)
- **후행 task**: T-API-04 (단체 수정 API에서 호출), T-CALC-06 (통합 재계산에서 호출)

---

### T-CALC-02 금액 계산 로직

**참조 문서:**

- PRD Section 7.2: 금액 계산 규칙 (총액, 잔액)
- PRD Section 7.6: manual 플래그와 재계산 규칙
- PRD Section 12.1: 계약금 검증 규칙
- TRD Section 5.4.2: 금액 계산 알고리즘

**목표**: 인원수와 1인당 요금을 기준으로 총액(total_price)과 잔액(balance)을 자동 계산하는 함수를 구현합니다. 계약금 초과 검증을 포함합니다.

**배경:**

PRD Section 7.2에 따르면, 금액은 다음 공식으로 계산됩니다:
- **총액 (total_price)**: `pax × price_per_pax`
- **잔액 (balance)**: `total_price - deposit`

예: 20명 × 1,500,000원 = 30,000,000원 (총액), 계약금 10,000,000원 차감 → 잔액 20,000,000원

**중요 검증**: 계약금은 총액을 초과할 수 없습니다 (`deposit <= total_price`).

**작업 내용:**

1. **금액 계산 함수 구현**

   **함수 시그니처:**
   ```python
   def calculate_price(group: Group) -> Dict[str, Any]:
       """
       금액 계산 (총액, 잔액)

       Args:
           group: Group 객체

       Returns:
           {
               'total_price': Decimal,
               'balance': Decimal,
               'total_price_changed': bool,
               'balance_changed': bool
           }

       Raises:
           ValueError: 계약금이 총액을 초과하는 경우
       """
   ```

   **구현 코드:**
   ```python
   from decimal import Decimal
   from typing import Dict, Any
   from models import Group

   def calculate_price(group: Group) -> Dict[str, Any]:
       """금액 계산 (총액, 잔액)"""
       result = {
           'total_price': group.total_price,
           'balance': group.balance,
           'total_price_changed': False,
           'balance_changed': False
       }

       # 1. 총액 계산 (manual 플래그 확인)
       if not group.total_price_manual:
           calculated_total = Decimal(str(group.pax)) * group.price_per_pax

           if calculated_total != group.total_price:
               result['total_price'] = calculated_total
               result['total_price_changed'] = True
               group.total_price = calculated_total

       # 2. 계약금 검증
       if group.deposit > group.total_price:
           raise ValueError(
               f'계약금({group.deposit:,})은 총액({group.total_price:,})을 초과할 수 없습니다'
           )

       # 3. 잔액 계산 (manual 플래그 확인)
       if not group.balance_manual:
           calculated_balance = group.total_price - group.deposit

           if calculated_balance != group.balance:
               result['balance'] = calculated_balance
               result['balance_changed'] = True
               group.balance = calculated_balance

       return result
   ```

2. **계약금 검증 함수**

   ```python
   def validate_deposit(deposit: Decimal, total_price: Decimal) -> None:
       """계약금 검증"""
       if deposit < 0:
           raise ValueError(f'계약금({deposit})은 0 이상이어야 합니다')

       if deposit > total_price:
           raise ValueError(
               f'계약금({deposit:,})은 총액({total_price:,})을 초과할 수 없습니다'
           )

       # 계약금 비율 경고 (예: 총액의 80% 초과 시)
       if total_price > 0 and (deposit / total_price) > Decimal('0.8'):
           import warnings
           warnings.warn(
               f'계약금({deposit:,})이 총액({total_price:,})의 80%를 초과합니다',
               UserWarning
           )
   ```

3. **단위 테스트 작성**

   ```python
   # tests/test_calculation.py
   import pytest
   from decimal import Decimal
   from services.calculation import calculate_price, validate_deposit
   from models import Group

   def test_calculate_price_auto_mode():
       # Given: 자동 계산 모드
       group = Group(
           pax=20,
           price_per_pax=Decimal('1500000'),
           deposit=Decimal('10000000'),
           total_price=Decimal('0'),
           balance=Decimal('0'),
           total_price_manual=False,
           balance_manual=False
       )

       # When: 금액 계산
       result = calculate_price(group)

       # Then: 총액 30,000,000, 잔액 20,000,000
       assert result['total_price'] == Decimal('30000000')
       assert result['balance'] == Decimal('20000000')
       assert result['total_price_changed'] == True
       assert result['balance_changed'] == True

   def test_calculate_price_manual_mode():
       # Given: 수동 수정 모드
       group = Group(
           pax=20,
           price_per_pax=Decimal('1500000'),
           deposit=Decimal('10000000'),
           total_price=Decimal('35000000'),  # 수동 설정 (실제는 30,000,000)
           balance=Decimal('25000000'),      # 수동 설정
           total_price_manual=True,
           balance_manual=True
       )

       # When: 금액 계산
       result = calculate_price(group)

       # Then: 수동 값 유지
       assert result['total_price'] == Decimal('35000000')
       assert result['balance'] == Decimal('25000000')
       assert result['total_price_changed'] == False
       assert result['balance_changed'] == False

   def test_calculate_price_deposit_exceeds_total():
       # Given: 계약금이 총액을 초과
       group = Group(
           pax=20,
           price_per_pax=Decimal('1500000'),
           deposit=Decimal('40000000'),  # 총액(30,000,000)보다 큼
           total_price=Decimal('30000000'),
           balance=Decimal('0'),
           total_price_manual=False,
           balance_manual=False
       )

       # When/Then: ValueError 발생
       with pytest.raises(ValueError, match="계약금.*총액을 초과할 수 없습니다"):
           calculate_price(group)

   def test_validate_deposit_negative():
       # When/Then: 음수 계약금
       with pytest.raises(ValueError, match="계약금.*0 이상이어야 합니다"):
           validate_deposit(Decimal('-1000000'), Decimal('30000000'))

   def test_validate_deposit_exceeds():
       # When/Then: 계약금 > 총액
       with pytest.raises(ValueError, match="계약금.*총액을 초과할 수 없습니다"):
           validate_deposit(Decimal('40000000'), Decimal('30000000'))

   def test_validate_deposit_warning():
       # Given: 계약금이 총액의 90%
       # When: 검증
       with pytest.warns(UserWarning, match="80%를 초과합니다"):
           validate_deposit(Decimal('27000000'), Decimal('30000000'))
   ```

**실행 절차:**

1. `backend/services/calculation.py`에 함수 추가
2. 단위 테스트 작성 및 실행
3. API 통합 (T-API-03, T-API-04에서 호출)

**중요 사항:**

- **Decimal 타입 사용**: 금액 계산은 반드시 Decimal 사용 (부동소수점 오차 방지)
- **계약금 검증 필수**: deposit > total_price인 경우 즉시 에러
- **검증 시점**: 단체 생성, 수정, 재계산 시 모두 검증
- **잔액 음수 가능**: 계약금 < 총액인 경우 잔액은 항상 양수이지만, 로직상 음수 허용

**검증 방법:**

1. 단위 테스트 실행:
   ```bash
   pytest tests/test_calculation.py::test_calculate_price_auto_mode -v
   pytest tests/test_calculation.py::test_calculate_price_deposit_exceeds_total -v
   ```

2. API 통합 테스트:
   ```bash
   # 계약금 초과 시도
   curl -X POST http://localhost:8000/api/groups \
     -H "Authorization: Bearer $TOKEN" \
     -d '{
       "name": "테스트",
       "start_date": "2025-03-15",
       "end_date": "2025-03-20",
       "pax": 20,
       "price_per_pax": 1500000,
       "deposit": 40000000
     }'
   # 예상: 400 Bad Request
   ```

**산출물:**

- `backend/services/calculation.py`: calculate_price(), validate_deposit() 함수
- `tests/test_calculation.py`: 단위 테스트 추가

**의존성:**

- **선행 task**: T-DB-01 (groups 테이블), T-CALC-01 (기간 계산)
- **후행 task**: T-API-03 (단체 생성 시 호출), T-API-04 (단체 수정 시 호출)

---

### T-CALC-03 잔액 완납일 계산 로직

**참조 문서:**

- PRD Section 7.3: 잔액 완납일 계산 규칙
- PRD Section 7.6: manual 플래그와 재계산 규칙
- TRD Section 5.4.3: 잔액 완납일 알고리즘

**목표**: 출발일을 기준으로 잔액 완납일을 자동 계산하는 함수를 구현합니다. 기본적으로 출발 7일 전이며, 설정으로 변경 가능합니다.

**배경:**

PRD Section 7.3에 따르면, 잔액 완납일은 다음 공식으로 계산됩니다:
- **잔액 완납일 (balance_due_date)**: `start_date - N일` (N은 설정값, 기본 7일)

예: 출발일 3월 15일, N=7 → 잔액 완납일 3월 8일

**특수 케이스**: 계산된 잔액 완납일이 과거인 경우 경고를 표시합니다.

**작업 내용:**

1. **잔액 완납일 계산 함수 구현**

   **함수 시그니처:**
   ```python
   def calculate_balance_due_date(
       group: Group,
       days_before: int = 7
   ) -> Dict[str, Any]:
       """
       잔액 완납일 계산

       Args:
           group: Group 객체
           days_before: 출발 N일 전 (기본 7일)

       Returns:
           {
               'balance_due_date': date,
               'balance_due_date_changed': bool,
               'is_past_due': bool,  # 과거 날짜 여부
               'days_until_due': int  # 오늘부터 완납일까지 남은 일수
           }
       """
   ```

   **구현 코드:**
   ```python
   from datetime import date, timedelta
   from typing import Dict, Any
   from models import Group

   def calculate_balance_due_date(
       group: Group,
       days_before: int = 7
   ) -> Dict[str, Any]:
       """잔액 완납일 계산"""
       result = {
           'balance_due_date': group.balance_due_date,
           'balance_due_date_changed': False,
           'is_past_due': False,
           'days_until_due': 0
       }

       # 1. 잔액 완납일 계산 (manual 플래그 확인)
       if not group.balance_due_date_manual:
           calculated_due_date = group.start_date - timedelta(days=days_before)

           if calculated_due_date != group.balance_due_date:
               result['balance_due_date'] = calculated_due_date
               result['balance_due_date_changed'] = True
               group.balance_due_date = calculated_due_date

       # 2. 과거 날짜 확인
       today = date.today()
       if group.balance_due_date < today:
           result['is_past_due'] = True
           result['days_until_due'] = (group.balance_due_date - today).days  # 음수
       else:
           result['days_until_due'] = (group.balance_due_date - today).days

       return result
   ```

2. **설정값 관리**

   잔액 완납일 기준(N일)을 시스템 설정으로 관리:
   ```python
   # backend/config.py
   class Settings:
       BALANCE_DUE_DAYS_BEFORE: int = 7  # 기본값: 출발 7일 전

       @classmethod
       def get_balance_due_days(cls) -> int:
           """잔액 완납일 기준 일수 반환"""
           # 환경변수 또는 DB 설정에서 로드 가능
           import os
           return int(os.getenv('BALANCE_DUE_DAYS_BEFORE', cls.BALANCE_DUE_DAYS_BEFORE))
   ```

3. **단위 테스트 작성**

   ```python
   # tests/test_calculation.py
   from datetime import date, timedelta
   from services.calculation import calculate_balance_due_date
   from models import Group

   def test_calculate_balance_due_date_auto():
       # Given: 출발일 2025-03-15
       group = Group(
           start_date=date(2025, 3, 15),
           balance_due_date=None,
           balance_due_date_manual=False
       )

       # When: 잔액 완납일 계산 (7일 전)
       result = calculate_balance_due_date(group, days_before=7)

       # Then: 2025-03-08
       assert result['balance_due_date'] == date(2025, 3, 8)
       assert result['balance_due_date_changed'] == True

   def test_calculate_balance_due_date_manual():
       # Given: 수동 설정된 완납일
       group = Group(
           start_date=date(2025, 3, 15),
           balance_due_date=date(2025, 3, 1),  # 수동으로 설정
           balance_due_date_manual=True
       )

       # When: 재계산 시도
       result = calculate_balance_due_date(group, days_before=7)

       # Then: 수동 값 유지
       assert result['balance_due_date'] == date(2025, 3, 1)
       assert result['balance_due_date_changed'] == False

   def test_calculate_balance_due_date_past_due(freezer):
       # Given: 오늘 2025-03-10, 완납일 2025-03-08 (과거)
       freezer.move_to('2025-03-10')

       group = Group(
           start_date=date(2025, 3, 15),
           balance_due_date=date(2025, 3, 8),
           balance_due_date_manual=False
       )

       # When: 완납일 확인
       result = calculate_balance_due_date(group, days_before=7)

       # Then: 과거 날짜 플래그
       assert result['is_past_due'] == True
       assert result['days_until_due'] == -2  # 2일 전

   def test_calculate_balance_due_date_future(freezer):
       # Given: 오늘 2025-03-01, 완납일 2025-03-08 (미래)
       freezer.move_to('2025-03-01')

       group = Group(
           start_date=date(2025, 3, 15),
           balance_due_date=date(2025, 3, 8),
           balance_due_date_manual=False
       )

       # When: 완납일 확인
       result = calculate_balance_due_date(group, days_before=7)

       # Then: 미래 날짜
       assert result['is_past_due'] == False
       assert result['days_until_due'] == 7  # 7일 남음

   def test_calculate_balance_due_date_custom_days():
       # Given: 출발일 2025-03-15
       group = Group(
           start_date=date(2025, 3, 15),
           balance_due_date=None,
           balance_due_date_manual=False
       )

       # When: 완납일 계산 (14일 전)
       result = calculate_balance_due_date(group, days_before=14)

       # Then: 2025-03-01
       assert result['balance_due_date'] == date(2025, 3, 1)
   ```

**실행 절차:**

1. `backend/services/calculation.py`에 함수 추가
2. `backend/config.py`에 설정 추가
3. 단위 테스트 작성 (pytest-freezegun 사용하여 날짜 고정)
4. API 통합

**중요 사항:**

- **설정 가능한 기준일**: 기본 7일이지만 시스템 설정으로 변경 가능
- **과거 날짜 경고**: UI에서 과거 날짜인 경우 빨간색 표시
- **manual 플래그 존중**: 수동 설정된 경우 재계산 안 함
- **출발일 변경 시 재계산**: start_date 변경 시 자동 재계산

**검증 방법:**

1. 단위 테스트 실행:
   ```bash
   pytest tests/test_calculation.py::test_calculate_balance_due_date_auto -v
   pytest tests/test_calculation.py::test_calculate_balance_due_date_past_due -v
   ```

2. API 통합 테스트:
   ```python
   # 단체 생성 시 자동 계산
   response = client.post("/api/groups", json={
       "name": "테스트",
       "start_date": "2025-03-15",
       "end_date": "2025-03-20",
       ...
   })
   assert response.json()["balance_due_date"] == "2025-03-08"  # 7일 전
   ```

**산출물:**

- `backend/services/calculation.py`: calculate_balance_due_date() 함수
- `backend/config.py`: 설정값 관리
- `tests/test_calculation.py`: 단위 테스트 추가

**의존성:**

- **선행 task**: T-DB-01 (groups.balance_due_date 컬럼)
- **후행 task**: T-API-04 (출발일 변경 시 재계산), T-UI-02 (완납일 표시)

---

### T-CALC-04 취소 규정 날짜 계산 로직

**참조 문서:**

- PRD Section 7.4: 취소 규정 날짜 계산 규칙 및 예시
- PRD Section 6.2.3: group_cancel_rules 테이블 스키마 정의
- TRD Section 5.4.4: 취소 규정 날짜 계산 공식 및 의사코드

**목표:**

출발일을 기준으로 취소 규정의 날짜를 자동으로 계산하는 로직을 구현합니다. 출발일이 변경될 때 모든 취소 규정의 `cancel_date`가 자동으로 재계산되어야 합니다.

**배경:**

PRD Section 7.4에 따르면, 취소 규정의 날짜는 출발일을 기준으로 자동 계산됩니다. 예를 들어 "출발 30일 전"이라는 규정이 있고 출발일이 2025-03-15라면, 취소 규정 날짜는 2025-02-13이 됩니다. 출발일이 변경되면 모든 취소 규정의 날짜를 자동으로 재계산하여 일관성을 유지해야 합니다.

**작업 내용:**

1. **취소 규정 날짜 계산 함수 구현**

   `backend/services/calculation.py` 파일에 `calculate_cancel_rules()` 함수를 구현하세요.

   함수 시그니처:
   ```python
   def calculate_cancel_rules(
       group_id: UUID,
       start_date: date
   ) -> Dict[str, Any]:
       """
       출발일 기준으로 모든 취소 규정 날짜 계산

       Args:
           group_id: 단체 ID
           start_date: 출발일

       Returns:
           Dict with keys:
           - updated_rules: 업데이트된 취소 규정 목록
           - total_count: 전체 취소 규정 개수
           - updated_count: 실제 업데이트된 개수 (manual=FALSE인 것만)
           - skipped_count: 수동 수정으로 인해 재계산 생략된 개수
       """
   ```

   **계산 공식:**
   ```
   cancel_date = start_date - days_before
   ```

   예시:
   - 출발일이 2025-03-15이고 days_before가 30이면 → 2025-02-13
   - 출발일이 2025-03-15이고 days_before가 7이면 → 2025-03-08

2. **취소 규정 정렬 로직**

   취소 규정은 `days_before` 기준 **내림차순**으로 정렬하세요. 즉, 가장 늦은 날짜(days_before가 작은 것)부터 표시합니다.

   예시 정렬:
   - Day 1: 출발 7일 전 (2025-03-08) - 위약금 50%
   - Day 2: 출발 15일 전 (2025-02-28) - 위약금 30%
   - Day 3: 출발 30일 전 (2025-02-13) - 위약금 10%

3. **수동 수정 플래그 처리**

   `cancel_date_manual`이 TRUE인 취소 규정은 재계산하지 않고 건너뜁니다.

**실행 절차:**

1. `backend/services/calculation.py` 파일을 열어 새 함수 추가
2. 필요한 모듈 import:
   ```python
   from datetime import date, timedelta
   from typing import Dict, Any, List
   from uuid import UUID
   from models import CancelRule
   from database import db_session
   ```

3. TRD Section 5.4.4를 참조하여 함수 구현:
   ```python
   def calculate_cancel_rules(
       group_id: UUID,
       start_date: date
   ) -> Dict[str, Any]:
       """출발일 기준으로 모든 취소 규정 날짜 계산"""

       # 1. 해당 단체의 모든 취소 규정 조회 (days_before 내림차순)
       cancel_rules = db_session.query(CancelRule)\
           .filter_by(group_id=group_id)\
           .order_by(CancelRule.days_before.desc())\
           .all()

       result = {
           'updated_rules': [],
           'total_count': len(cancel_rules),
           'updated_count': 0,
           'skipped_count': 0
       }

       # 2. 각 취소 규정에 대해 날짜 계산
       for rule in cancel_rules:
           # 수동 수정된 경우 재계산 생략
           if rule.cancel_date_manual:
               result['skipped_count'] += 1
               continue

           # 새 날짜 계산
           calculated_date = start_date - timedelta(days=rule.days_before)

           # 변경 여부 확인
           if rule.cancel_date != calculated_date:
               rule.cancel_date = calculated_date
               result['updated_count'] += 1

           result['updated_rules'].append(rule)

       # 3. 일괄 업데이트
       if result['updated_count'] > 0:
           db_session.bulk_save_objects(result['updated_rules'])
           db_session.commit()

       return result
   ```

4. 날짜 검증 함수 추가 (선택사항):
   ```python
   def validate_cancel_rule_dates(
       group_id: UUID,
       start_date: date
   ) -> List[str]:
       """
       취소 규정 날짜가 유효한지 검증

       Returns:
           경고 메시지 목록 (빈 리스트면 모두 정상)
       """
       warnings = []

       cancel_rules = db_session.query(CancelRule)\
           .filter_by(group_id=group_id)\
           .all()

       today = date.today()

       for rule in cancel_rules:
           # 취소 규정 날짜가 이미 지났는지 확인
           if rule.cancel_date < today:
               warnings.append(
                   f"취소 규정 '{rule.description}'의 날짜({rule.cancel_date})가 "
                   f"이미 지났습니다. 출발일을 확인해주세요."
               )

           # days_before가 음수인지 확인
           if rule.days_before < 0:
               warnings.append(
                   f"취소 규정 '{rule.description}'의 days_before({rule.days_before})는 "
                   f"0 이상이어야 합니다."
               )

       return warnings
   ```

5. 단위 테스트 작성 (`tests/test_calculation.py`):
   ```python
   import pytest
   from datetime import date
   from services.calculation import calculate_cancel_rules, validate_cancel_rule_dates
   from tests.fixtures import create_test_group, create_test_cancel_rule

   def test_calculate_cancel_rules():
       """취소 규정 날짜 계산 테스트"""
       # Given: 출발일 2025-03-15인 단체와 3개 취소 규정
       group = create_test_group(start_date=date(2025, 3, 15))

       rule1 = create_test_cancel_rule(
           group.id, days_before=30, penalty_rate=10
       )
       rule2 = create_test_cancel_rule(
           group.id, days_before=15, penalty_rate=30
       )
       rule3 = create_test_cancel_rule(
           group.id, days_before=7, penalty_rate=50
       )

       # When: 취소 규정 날짜 계산
       result = calculate_cancel_rules(group.id, group.start_date)

       # Then: 모든 취소 규정 날짜가 계산됨
       assert result['total_count'] == 3
       assert result['updated_count'] == 3
       assert result['skipped_count'] == 0

       # 날짜 확인
       rules = sorted(result['updated_rules'], key=lambda r: r.days_before, reverse=True)
       assert rules[0].cancel_date == date(2025, 2, 13)  # 30일 전
       assert rules[1].cancel_date == date(2025, 2, 28)  # 15일 전
       assert rules[2].cancel_date == date(2025, 3, 8)   # 7일 전

   def test_calculate_cancel_rules_with_manual_flag():
       """수동 수정된 취소 규정은 재계산 생략"""
       # Given: 취소 규정 중 하나가 수동 수정됨
       group = create_test_group(start_date=date(2025, 3, 15))

       rule1 = create_test_cancel_rule(
           group.id, days_before=30, penalty_rate=10,
           cancel_date_manual=True  # 수동 수정
       )
       rule2 = create_test_cancel_rule(
           group.id, days_before=7, penalty_rate=50
       )

       # When: 출발일을 2025-04-01로 변경
       result = calculate_cancel_rules(group.id, date(2025, 4, 1))

       # Then: 수동 수정된 규정은 재계산 생략
       assert result['total_count'] == 2
       assert result['updated_count'] == 1  # rule2만 업데이트
       assert result['skipped_count'] == 1  # rule1은 생략

   def test_validate_cancel_rule_dates_past_date():
       """과거 날짜 경고 테스트"""
       # Given: 취소 규정 날짜가 이미 지난 경우
       group = create_test_group(start_date=date(2025, 1, 1))  # 과거 날짜
       create_test_cancel_rule(group.id, days_before=7, penalty_rate=50)

       # When: 검증
       warnings = validate_cancel_rule_dates(group.id, group.start_date)

       # Then: 경고 메시지 발생
       assert len(warnings) > 0
       assert "이미 지났습니다" in warnings[0]
   ```

6. 통합 테스트 (API 연동):
   ```python
   def test_api_update_start_date_recalculates_cancel_rules():
       """API로 출발일 변경 시 취소 규정 날짜 자동 재계산"""
       # Given: 단체와 취소 규정 생성
       group = create_test_group(start_date=date(2025, 3, 15))
       create_test_cancel_rule(group.id, days_before=30, penalty_rate=10)

       # When: 출발일을 2025-04-01로 변경
       response = client.put(f"/api/groups/{group.id}", json={
           "start_date": "2025-04-01"
       })

       # Then: 취소 규정 날짜도 자동 재계산됨
       assert response.status_code == 200

       rules = client.get(f"/api/groups/{group.id}/cancel-rules").json()
       assert rules[0]['cancel_date'] == "2025-03-02"  # 4/1 - 30일
   ```

**중요 사항:**

- **정렬 순서**: 취소 규정은 `days_before` 기준 **내림차순** 정렬 (가장 늦은 날짜부터)
- **수동 수정 플래그**: `cancel_date_manual`이 TRUE인 규정은 재계산하지 않음
- **재계산 조건**: `start_date` 변경 시에만 실행
- **과거 날짜 경고**: 취소 규정 날짜가 이미 지난 경우 사용자에게 경고 표시
- **days_before 검증**: DB 레벨 CHECK 제약조건으로 `days_before >= 0` 보장

**검증 방법:**

1. 단위 테스트 실행:
   ```bash
   pytest tests/test_calculation.py::test_calculate_cancel_rules -v
   pytest tests/test_calculation.py::test_calculate_cancel_rules_with_manual_flag -v
   pytest tests/test_calculation.py::test_validate_cancel_rule_dates_past_date -v
   ```

2. 통합 테스트: 출발일 변경 시나리오
   - 단체 생성 및 취소 규정 추가
   - 취소 규정 중 하나를 수동으로 수정
   - 출발일 변경
   - 수동 수정되지 않은 취소 규정만 재계산되었는지 확인

3. 실제 데이터로 테스트:
   ```python
   # 취소 규정 날짜 계산 테스트
   group = get_group_by_name("테스트 단체")
   print(f"출발일: {group.start_date}")

   result = calculate_cancel_rules(group.id, group.start_date)
   print(f"전체: {result['total_count']}, 업데이트: {result['updated_count']}, 생략: {result['skipped_count']}")

   for rule in result['updated_rules']:
       print(f"- {rule.days_before}일 전: {rule.cancel_date} (위약금 {rule.penalty_rate}%)")

   # 검증
   warnings = validate_cancel_rule_dates(group.id, group.start_date)
   if warnings:
       for w in warnings:
           print(f"경고: {w}")
   ```

**산출물:**

- `backend/services/calculation.py`: calculate_cancel_rules(), validate_cancel_rule_dates() 함수
- `tests/test_calculation.py`: 단위 테스트 코드 (3개 테스트 케이스)

**의존성:**

- **선행 task**: T-DB-01 (group_cancel_rules 테이블), T-DB-02 (cancel_date_manual 플래그)
- **후행 task**: T-CALC-06 (통합 재계산에서 이 함수 호출), T-API-08 (취소 규정 CRUD API)

---

### T-CALC-05 일정 날짜 자동 재배치 로직

**참조 문서:**

- PRD Section 7.5: 일정 날짜 자동 재배치 규칙 및 예시
- PRD Section 6.2.2: group_itinerary 테이블 스키마 정의
- TRD Section 5.3.1: 재배치 알고리즘 의사코드
- TRD Section 5.3.2: 일정 추가/삭제 처리 로직
- TRD Section 5.4.5: 일정 날짜 계산 공식

**목표:**

출발일이 변경될 때 모든 일정의 날짜를 자동으로 재계산하는 로직을 구현합니다. **이는 다른 자동 계산 필드와 달리 수동 수정 여부와 관계없이 항상 재계산됩니다.**

**배경:**

PRD Section 7.5에 따르면, 출발일이 변경되면 해당 단체의 모든 일정 날짜가 자동으로 재계산되어야 합니다. 이는 **수동으로 수정된 일정도 포함**합니다.

**특수 규칙:**
- 다른 자동 계산 필드(nights, total_price 등)와 달리, 일정 날짜는 **manual 플래그와 관계없이 항상 재계산**됩니다
- 이는 출발일 변경 시 일정 날짜 불일치를 완전히 방지하기 위한 설계입니다
- 단, `itinerary_date_manual` 플래그는 유지하여 "이 일정이 과거에 수동 수정되었음"을 사용자에게 알릴 수 있습니다

**작업 내용:**

1. **일정 날짜 재계산 함수 구현**

   `backend/services/calculation.py` 파일에 `recalculate_itinerary_dates()` 함수를 구현하세요.

   함수 시그니처:
   ```python
   def recalculate_itinerary_dates(
       group_id: UUID,
       new_start_date: date
   ) -> Dict[str, Any]:
       """
       출발일 변경 시 모든 일정 날짜를 자동 재계산

       Args:
           group_id: 단체 ID
           new_start_date: 새로운 출발일

       Returns:
           Dict with keys:
           - updated_itineraries: 업데이트된 일정 목록
           - total_count: 전체 일정 개수
           - manual_modified_count: 수동 수정되었던 일정 개수 (알림용)
           - changes: 변경 상세 목록 [{day_no, old_date, new_date}, ...]

       Note:
           수동 수정 여부와 관계없이 모든 일정 날짜를 재계산합니다.
           단, itinerary_date_manual 플래그는 유지합니다.
       """
   ```

   **계산 공식:**
   ```
   itinerary_date = start_date + (day_no - 1)
   ```

   예시:
   - 출발일이 2025-01-15이고 day_no가 1이면 → 2025-01-15
   - 출발일이 2025-01-15이고 day_no가 3이면 → 2025-01-17

2. **일정 추가 로직 구현**

   `backend/services/itinerary.py` 파일에 `add_itinerary()` 함수를 구현하세요.

   - 새 일정 추가 시 `day_no`를 자동으로 부여합니다
   - `day_no = max(existing_day_no) + 1`
   - 출발일 기준으로 `itinerary_date` 자동 계산

3. **일정 삭제 로직 구현**

   `backend/services/itinerary.py` 파일에 `delete_itinerary()` 함수를 구현하세요.

   - 일정 삭제 시 남은 일정의 `day_no`는 **재정렬하지 않음**
   - 의도적인 빈 번호 허용 (예: Day 1, Day 2, Day 4, Day 5 - Day 3 삭제됨)

4. **day_no 중복 검증**

   DB 레벨에서 `UNIQUE (group_id, day_no)` 제약조건으로 중복 방지

**실행 절차:**

1. `backend/services/calculation.py` 파일을 열어 함수 추가
2. 필요한 모듈 import:
   ```python
   from datetime import date, timedelta
   from typing import Dict, Any, List
   from uuid import UUID
   from models import Itinerary
   from database import db_session
   ```

3. TRD Section 5.3.1의 의사코드를 참조하여 함수 구현:
   ```python
   def recalculate_itinerary_dates(
       group_id: UUID,
       new_start_date: date
   ) -> Dict[str, Any]:
       """출발일 변경 시 모든 일정 날짜를 자동 재계산"""

       # 1. 해당 단체의 모든 일정을 day_no 순서로 조회
       itineraries = db_session.query(Itinerary)\
           .filter_by(group_id=group_id)\
           .order_by(Itinerary.day_no)\
           .all()

       result = {
           'updated_itineraries': [],
           'total_count': len(itineraries),
           'manual_modified_count': 0,
           'changes': []
       }

       # 2. 각 일정에 대해 새 날짜 계산
       for itinerary in itineraries:
           # day_no 기준으로 새 날짜 계산
           new_date = new_start_date + timedelta(days=itinerary.day_no - 1)

           # 수동 수정된 일정 카운트 (알림용)
           if itinerary.itinerary_date_manual:
               result['manual_modified_count'] += 1

           # 변경 사항 기록
           if itinerary.itinerary_date != new_date:
               result['changes'].append({
                   'day_no': itinerary.day_no,
                   'old_date': itinerary.itinerary_date,
                   'new_date': new_date
               })

           # 날짜 업데이트 (manual 플래그는 유지)
           itinerary.itinerary_date = new_date
           result['updated_itineraries'].append(itinerary)

       # 3. 일괄 업데이트
       if result['changes']:
           db_session.bulk_save_objects(result['updated_itineraries'])
           db_session.commit()

       return result
   ```

4. 일정 추가 함수 구현 (`backend/services/itinerary.py`):
   ```python
   def add_itinerary(
       group_id: UUID,
       itinerary_data: Dict[str, Any]
   ) -> Itinerary:
       """
       일정 추가 시 day_no 자동 부여

       Args:
           group_id: 단체 ID
           itinerary_data: 일정 데이터 (day_no 제외)

       Returns:
           생성된 일정 객체
       """
       # 1. 해당 단체의 최대 day_no 조회
       max_day_no = db_session.query(
           db.func.max(Itinerary.day_no)
       ).filter_by(group_id=group_id).scalar()

       new_day_no = (max_day_no or 0) + 1

       # 2. 출발일 기준 날짜 자동 계산
       group = db_session.query(Group).filter_by(id=group_id).first()
       if not group:
           raise ValueError(f"Group {group_id} not found")

       itinerary_date = group.start_date + timedelta(days=new_day_no - 1)

       # 3. 일정 생성
       itinerary = Itinerary(
           group_id=group_id,
           day_no=new_day_no,
           itinerary_date=itinerary_date,
           itinerary_date_manual=False,
           **itinerary_data
       )

       db_session.add(itinerary)
       db_session.commit()
       db_session.refresh(itinerary)

       return itinerary
   ```

5. 일정 삭제 함수 구현 (`backend/services/itinerary.py`):
   ```python
   def delete_itinerary(itinerary_id: UUID) -> None:
       """
       일정 삭제 (day_no 재정렬하지 않음)

       Args:
           itinerary_id: 삭제할 일정 ID

       Note:
           남은 일정의 day_no는 재정렬하지 않습니다.
           의도적인 빈 번호를 허용합니다.
       """
       itinerary = db_session.query(Itinerary).filter_by(id=itinerary_id).first()
       if not itinerary:
           raise ValueError(f"Itinerary {itinerary_id} not found")

       db_session.delete(itinerary)
       db_session.commit()

       # day_no 재정렬은 하지 않음 (의도적인 빈 번호 허용)
   ```

6. 날짜 검증 함수 추가:
   ```python
   def validate_itinerary_dates(
       group_id: UUID,
       start_date: date,
       end_date: date
   ) -> List[str]:
       """
       일정 날짜가 여행 기간 내에 있는지 검증

       Returns:
           경고 메시지 목록
       """
       warnings = []

       itineraries = db_session.query(Itinerary)\
           .filter_by(group_id=group_id)\
           .all()

       for itinerary in itineraries:
           # 출발일 이전
           if itinerary.itinerary_date < start_date:
               warnings.append(
                   f"Day {itinerary.day_no}의 일정 날짜({itinerary.itinerary_date})가 "
                   f"출발일({start_date})보다 이전입니다."
               )

           # 도착일 이후
           if itinerary.itinerary_date > end_date:
               warnings.append(
                   f"Day {itinerary.day_no}의 일정 날짜({itinerary.itinerary_date})가 "
                   f"도착일({end_date})보다 이후입니다."
               )

       return warnings
   ```

7. 단위 테스트 작성 (`tests/test_calculation.py`):
   ```python
   import pytest
   from datetime import date
   from services.calculation import recalculate_itinerary_dates, validate_itinerary_dates
   from services.itinerary import add_itinerary, delete_itinerary
   from tests.fixtures import create_test_group, create_test_itinerary

   def test_recalculate_itinerary_dates():
       """일정 날짜 재계산 테스트"""
       # Given: 출발일 2025-01-15인 단체와 3개 일정
       group = create_test_group(start_date=date(2025, 1, 15))

       itinerary1 = create_test_itinerary(
           group.id, day_no=1, itinerary_date=date(2025, 1, 15)
       )
       itinerary2 = create_test_itinerary(
           group.id, day_no=2, itinerary_date=date(2025, 1, 16)
       )
       itinerary3 = create_test_itinerary(
           group.id, day_no=3, itinerary_date=date(2025, 1, 17)
       )

       # When: 출발일을 2025-01-20으로 변경
       result = recalculate_itinerary_dates(group.id, date(2025, 1, 20))

       # Then: 모든 일정 날짜가 재계산됨
       assert result['total_count'] == 3
       assert len(result['changes']) == 3
       assert result['manual_modified_count'] == 0

       # 날짜 확인
       itineraries = sorted(result['updated_itineraries'], key=lambda i: i.day_no)
       assert itineraries[0].itinerary_date == date(2025, 1, 20)  # Day 1
       assert itineraries[1].itinerary_date == date(2025, 1, 21)  # Day 2
       assert itineraries[2].itinerary_date == date(2025, 1, 22)  # Day 3

   def test_recalculate_itinerary_dates_ignores_manual_flag():
       """수동 수정된 일정도 재계산됨 (manual 플래그 무시)"""
       # Given: 일정 중 하나가 수동 수정됨
       group = create_test_group(start_date=date(2025, 1, 15))

       itinerary1 = create_test_itinerary(
           group.id, day_no=1, itinerary_date=date(2025, 1, 15),
           itinerary_date_manual=True  # 수동 수정
       )
       itinerary2 = create_test_itinerary(
           group.id, day_no=2, itinerary_date=date(2025, 1, 16)
       )

       # When: 출발일을 2025-02-01로 변경
       result = recalculate_itinerary_dates(group.id, date(2025, 2, 1))

       # Then: 수동 수정된 일정도 재계산됨 (manual 플래그는 유지)
       assert result['total_count'] == 2
       assert result['manual_modified_count'] == 1  # 알림용
       assert len(result['changes']) == 2  # 모두 변경됨

       # manual 플래그는 유지됨
       updated_itinerary1 = next(i for i in result['updated_itineraries'] if i.day_no == 1)
       assert updated_itinerary1.itinerary_date == date(2025, 2, 1)
       assert updated_itinerary1.itinerary_date_manual is True  # 플래그 유지

   def test_add_itinerary_auto_day_no():
       """일정 추가 시 day_no 자동 부여"""
       # Given: 기존 일정 2개
       group = create_test_group(start_date=date(2025, 1, 15))
       create_test_itinerary(group.id, day_no=1)
       create_test_itinerary(group.id, day_no=2)

       # When: 새 일정 추가
       new_itinerary = add_itinerary(group.id, {
           'description': 'Day 3 일정'
       })

       # Then: day_no가 자동으로 3으로 설정됨
       assert new_itinerary.day_no == 3
       assert new_itinerary.itinerary_date == date(2025, 1, 17)  # Day 3

   def test_delete_itinerary_no_reordering():
       """일정 삭제 시 day_no 재정렬하지 않음"""
       # Given: 일정 4개
       group = create_test_group(start_date=date(2025, 1, 15))
       itinerary1 = create_test_itinerary(group.id, day_no=1)
       itinerary2 = create_test_itinerary(group.id, day_no=2)
       itinerary3 = create_test_itinerary(group.id, day_no=3)
       itinerary4 = create_test_itinerary(group.id, day_no=4)

       # When: Day 2 삭제
       delete_itinerary(itinerary2.id)

       # Then: 남은 일정의 day_no는 그대로 (1, 3, 4)
       remaining = db_session.query(Itinerary)\
           .filter_by(group_id=group.id)\
           .order_by(Itinerary.day_no)\
           .all()

       assert len(remaining) == 3
       assert [i.day_no for i in remaining] == [1, 3, 4]  # 2번 빠짐

   def test_validate_itinerary_dates_out_of_range():
       """일정 날짜가 여행 기간을 벗어난 경우 경고"""
       # Given: 출발일/도착일을 벗어난 일정
       group = create_test_group(
           start_date=date(2025, 1, 15),
           end_date=date(2025, 1, 20)
       )

       # 출발일 이전
       create_test_itinerary(
           group.id, day_no=1, itinerary_date=date(2025, 1, 10)
       )

       # 도착일 이후
       create_test_itinerary(
           group.id, day_no=2, itinerary_date=date(2025, 1, 25)
       )

       # When: 검증
       warnings = validate_itinerary_dates(
           group.id, group.start_date, group.end_date
       )

       # Then: 2개의 경고 발생
       assert len(warnings) == 2
       assert "출발일" in warnings[0] and "이전" in warnings[0]
       assert "도착일" in warnings[1] and "이후" in warnings[1]
   ```

8. 통합 테스트 (API 연동):
   ```python
   def test_api_update_start_date_recalculates_itineraries():
       """API로 출발일 변경 시 일정 날짜 자동 재계산"""
       # Given: 단체와 일정 생성
       group = create_test_group(start_date=date(2025, 1, 15))
       create_test_itinerary(group.id, day_no=1)
       create_test_itinerary(group.id, day_no=2)

       # When: 출발일을 2025-02-01로 변경
       response = client.put(f"/api/groups/{group.id}", json={
           "start_date": "2025-02-01"
       })

       # Then: 일정 날짜도 자동 재계산됨
       assert response.status_code == 200

       itineraries = client.get(f"/api/groups/{group.id}/itineraries").json()
       assert itineraries[0]['itinerary_date'] == "2025-02-01"  # Day 1
       assert itineraries[1]['itinerary_date'] == "2025-02-02"  # Day 2
   ```

**중요 사항:**

- **다른 자동 계산 필드와 다르게, 일정 날짜는 manual 플래그와 관계없이 항상 재계산됩니다**
- `itinerary_date_manual` 플래그는 삭제하지 말고 유지하세요 (사용자 알림용)
- day_no는 재정렬하지 않습니다 (일정 삭제 시 빈 번호 허용)
- day_no 중복 방지: DB 레벨 UNIQUE 제약조건 (`UNIQUE (group_id, day_no)`)
- 일괄 업데이트는 `bulk_save_objects()`를 사용하여 성능을 최적화하세요
- 수동 수정된 일정이 재계산되면 사용자에게 알림을 표시하세요

**검증 방법:**

1. 단위 테스트 실행:
   ```bash
   pytest tests/test_calculation.py::test_recalculate_itinerary_dates -v
   pytest tests/test_calculation.py::test_recalculate_itinerary_dates_ignores_manual_flag -v
   pytest tests/test_calculation.py::test_add_itinerary_auto_day_no -v
   pytest tests/test_calculation.py::test_delete_itinerary_no_reordering -v
   pytest tests/test_calculation.py::test_validate_itinerary_dates_out_of_range -v
   ```

2. 통합 테스트: 출발일 변경 시나리오
   - 단체 생성 및 일정 추가
   - 일정 중 하나를 수동으로 수정 (manual 플래그 TRUE)
   - 출발일 변경
   - 모든 일정 날짜가 재계산되었는지 확인
   - manual 플래그가 유지되었는지 확인

3. 실제 데이터로 테스트:
   ```python
   # 일정 날짜 재계산 테스트
   group = get_group_by_name("테스트 단체")
   print(f"변경 전 일정:")
   for i in get_itineraries(group.id):
       print(f"  Day {i.day_no}: {i.itinerary_date} (manual: {i.itinerary_date_manual})")

   # 출발일 변경
   group.start_date = date(2025, 2, 1)
   result = recalculate_itinerary_dates(group.id, group.start_date)

   print(f"\n변경 후 일정:")
   for i in result['updated_itineraries']:
       print(f"  Day {i.day_no}: {i.itinerary_date} (manual: {i.itinerary_date_manual})")

   if result['manual_modified_count'] > 0:
       print(f"\n⚠️  {result['manual_modified_count']}개의 수동 수정된 일정이 재계산되었습니다.")

   # 검증
   warnings = validate_itinerary_dates(group.id, group.start_date, group.end_date)
   if warnings:
       for w in warnings:
           print(f"경고: {w}")
   ```

**산출물:**

- `backend/services/calculation.py`: recalculate_itinerary_dates(), validate_itinerary_dates() 함수
- `backend/services/itinerary.py`: add_itinerary(), delete_itinerary() 함수
- `tests/test_calculation.py`: 단위 테스트 코드 (5개 테스트 케이스)

**의존성:**

- **선행 task**: T-DB-01 (group_itinerary 테이블), T-DB-02 (itinerary_date_manual 플래그)
- **후행 task**: T-CALC-06 (통합 재계산에서 이 함수 호출), T-API-07 (일정 CRUD API)

---

### T-CALC-06 통합 재계산 로직

**참조 문서:**

- PRD Section 7: 자동 계산 로직 전체 규칙
- TRD Section 5.2: 통합 재계산 로직 의사코드
- TRD Section 5.4: 계산 공식 상세

**목표:**

변경된 필드에 따라 필요한 계산만 선택적으로 실행하는 통합 재계산 함수를 구현합니다. 이 함수는 모든 자동 계산 로직을 오케스트레이션하여 일관성 있게 관리합니다.

**배경:**

PRD Section 7에 정의된 모든 자동 계산 로직을 하나의 통합 함수로 관리하여, API에서 단체 정보 업데이트 시 일관성 있게 재계산을 수행할 수 있도록 합니다. 변경된 필드를 분석하여 필요한 계산만 실행함으로써 불필요한 연산을 방지하고 성능을 최적화합니다.

**작업 내용:**

1. **통합 재계산 함수 구현**

   `backend/services/calculation.py` 파일에 `recalculate_group()` 함수를 구현하세요.

   함수 시그니처:
   ```python
   def recalculate_group(
       group_id: UUID,
       changed_fields: List[str]
   ) -> Dict[str, Any]:
       """
       변경된 필드에 따라 필요한 계산만 선택적으로 실행

       Args:
           group_id: 단체 ID
           changed_fields: 변경된 필드 목록
                          예: ['start_date', 'pax']

       Returns:
           Dict with keys:
           - recalculated_fields: 재계산된 필드 목록
           - period_result: 기간 계산 결과 (if applicable)
           - price_result: 금액 계산 결과 (if applicable)
           - balance_due_date_result: 완납일 계산 결과 (if applicable)
           - cancel_rules_result: 취소 규정 계산 결과 (if applicable)
           - itinerary_result: 일정 재배치 결과 (if applicable)
           - warnings: 경고 메시지 목록

       Raises:
           ValidationError: 확정 상태인 경우 재계산 불가
       """
   ```

2. **상태 확인 로직**

   확정(confirmed) 상태인 단체는 재계산할 수 없습니다. ValidationError를 발생시킵니다.

3. **변경 필드별 재계산 매핑**

   | 변경된 필드 | 실행할 계산 |
   |------------|------------|
   | start_date, end_date | 기간 계산 (nights, days) |
   | pax, price_per_pax, deposit | 금액 계산 (total_price, balance) |
   | start_date | 잔액 완납일 계산 |
   | start_date | 취소 규정 날짜 계산 |
   | start_date | 일정 날짜 재배치 |

4. **수동 수정 플래그 보호**

   각 계산 함수는 내부적으로 manual 플래그를 확인합니다. 통합 함수는 이를 신뢰합니다.

5. **검증 실행**

   모든 재계산 후 `validate_group_data()` 함수를 실행하여 데이터 일관성을 확인합니다.

**실행 절차:**

1. `backend/services/calculation.py` 파일을 열어 함수 추가
2. 필요한 모듈 import:
   ```python
   from datetime import date
   from typing import Dict, Any, List
   from uuid import UUID
   from models import Group
   from database import db_session
   from exceptions import ValidationError
   from .validation import validate_group_data
   ```

3. TRD Section 5.2를 참조하여 함수 구현:
   ```python
   def recalculate_group(
       group_id: UUID,
       changed_fields: List[str]
   ) -> Dict[str, Any]:
       """변경된 필드에 따라 필요한 계산만 선택적으로 실행"""

       # 1. 단체 조회
       group = db_session.query(Group).filter_by(id=group_id).first()
       if not group:
           raise ValueError(f"Group {group_id} not found")

       # 2. 상태 확인 (확정 상태면 재계산 불가)
       if group.status == 'confirmed':
           raise ValidationError("확정된 계약은 재계산할 수 없습니다")

       result = {
           'recalculated_fields': [],
           'warnings': []
       }

       # 3. 기간 계산 (박/일)
       if 'start_date' in changed_fields or 'end_date' in changed_fields:
           period_result = calculate_period(group)
           result['period_result'] = period_result

           if period_result['nights_changed']:
               result['recalculated_fields'].append('nights')
           if period_result['days_changed']:
               result['recalculated_fields'].append('days')

       # 4. 금액 계산 (총액/잔액)
       if 'pax' in changed_fields or 'price_per_pax' in changed_fields or 'deposit' in changed_fields:
           price_result = calculate_price(group)
           result['price_result'] = price_result

           if price_result['total_price_changed']:
               result['recalculated_fields'].append('total_price')
           if price_result['balance_changed']:
               result['recalculated_fields'].append('balance')

       # 5. 잔액 완납일 계산
       if 'start_date' in changed_fields:
           balance_due_result = calculate_balance_due_date(group)
           result['balance_due_date_result'] = balance_due_result

           if balance_due_result['balance_due_date_changed']:
               result['recalculated_fields'].append('balance_due_date')

           # 과거 날짜 경고
           if balance_due_result['is_past_due']:
               result['warnings'].append(
                   f"잔액 완납일({balance_due_result['balance_due_date']})이 "
                   f"이미 지났습니다. ({balance_due_result['days_until_due']}일 경과)"
               )

       # 6. 취소 규정 날짜 계산
       if 'start_date' in changed_fields:
           cancel_rules_result = calculate_cancel_rules(group_id, group.start_date)
           result['cancel_rules_result'] = cancel_rules_result

           if cancel_rules_result['updated_count'] > 0:
               result['recalculated_fields'].append('cancel_rules')

           # 수동 수정 생략 알림
           if cancel_rules_result['skipped_count'] > 0:
               result['warnings'].append(
                   f"{cancel_rules_result['skipped_count']}개의 취소 규정은 "
                   f"수동 수정되어 재계산되지 않았습니다."
               )

       # 7. 일정 날짜 재배치
       if 'start_date' in changed_fields:
           itinerary_result = recalculate_itinerary_dates(group_id, group.start_date)
           result['itinerary_result'] = itinerary_result

           if itinerary_result['changes']:
               result['recalculated_fields'].append('itineraries')

           # 수동 수정된 일정 알림
           if itinerary_result['manual_modified_count'] > 0:
               result['warnings'].append(
                   f"출발일 변경으로 인해 {itinerary_result['manual_modified_count']}개의 "
                   f"수동 수정된 일정 날짜가 재계산되었습니다."
               )

       # 8. 검증
       try:
           validation_warnings = validate_group_data(group)
           if validation_warnings:
               result['warnings'].extend(validation_warnings)
       except ValidationError as e:
           # 검증 실패 시 롤백
           db_session.rollback()
           raise e

       # 9. 저장
       db_session.add(group)
       db_session.commit()
       db_session.refresh(group)

       return result
   ```

4. 검증 함수 구현 (`backend/services/validation.py`):
   ```python
   from typing import List
   from models import Group
   from decimal import Decimal

   def validate_group_data(group: Group) -> List[str]:
       """
       단체 데이터 검증

       Returns:
           경고 메시지 목록 (빈 리스트면 모두 정상)

       Raises:
           ValidationError: 치명적인 오류 발생 시
       """
       warnings = []

       # 1. 날짜 검증
       if group.end_date <= group.start_date:
           raise ValidationError(
               f"도착일({group.end_date})은 출발일({group.start_date})보다 이후여야 합니다"
           )

       # 2. 기간 검증
       if group.nights < 0:
           raise ValidationError(f"박수는 0 이상이어야 합니다 (현재: {group.nights})")

       if group.days <= 0:
           raise ValidationError(f"일수는 1 이상이어야 합니다 (현재: {group.days})")

       # 3. 인원 검증
       if group.pax <= 0:
           raise ValidationError(f"인원수는 1 이상이어야 합니다 (현재: {group.pax})")

       # 4. 금액 검증
       if group.price_per_pax < Decimal('0'):
           raise ValidationError(f"1인당 요금은 0 이상이어야 합니다")

       if group.total_price < Decimal('0'):
           raise ValidationError(f"총액은 0 이상이어야 합니다")

       if group.deposit < Decimal('0'):
           raise ValidationError(f"계약금은 0 이상이어야 합니다")

       if group.deposit > group.total_price:
           raise ValidationError(
               f"계약금({group.deposit:,})은 총액({group.total_price:,})을 초과할 수 없습니다"
           )

       if group.balance < Decimal('0'):
           warnings.append(f"잔액이 음수입니다: {group.balance:,}")

       # 5. 상태 검증
       valid_statuses = ['estimate', 'contract', 'confirmed']
       if group.status not in valid_statuses:
           raise ValidationError(
               f"유효하지 않은 상태입니다: {group.status} "
               f"(허용값: {', '.join(valid_statuses)})"
           )

       return warnings
   ```

5. 단위 테스트 작성 (`tests/test_calculation.py`):
   ```python
   import pytest
   from datetime import date
   from services.calculation import recalculate_group
   from exceptions import ValidationError
   from tests.fixtures import create_test_group

   def test_recalculate_group_start_date_change():
       """출발일 변경 시 모든 관련 계산 실행"""
       # Given: 단체, 취소 규정, 일정 생성
       group = create_test_group(start_date=date(2025, 3, 15))
       create_test_cancel_rule(group.id, days_before=30)
       create_test_itinerary(group.id, day_no=1)

       # When: 출발일 변경
       group.start_date = date(2025, 4, 1)
       result = recalculate_group(group.id, ['start_date'])

       # Then: 관련 계산 모두 실행됨
       assert 'period_result' in result
       assert 'balance_due_date_result' in result
       assert 'cancel_rules_result' in result
       assert 'itinerary_result' in result

       assert 'nights' in result['recalculated_fields']
       assert 'balance_due_date' in result['recalculated_fields']
       assert 'cancel_rules' in result['recalculated_fields']
       assert 'itineraries' in result['recalculated_fields']

   def test_recalculate_group_pax_change():
       """인원 변경 시 금액 계산만 실행"""
       # Given: 단체 생성
       group = create_test_group(pax=20, price_per_pax=Decimal('1500000'))

       # When: 인원 변경
       group.pax = 25
       result = recalculate_group(group.id, ['pax'])

       # Then: 금액 계산만 실행됨
       assert 'price_result' in result
       assert 'period_result' not in result
       assert 'cancel_rules_result' not in result

       assert 'total_price' in result['recalculated_fields']
       assert 'balance' in result['recalculated_fields']

   def test_recalculate_group_confirmed_status_error():
       """확정 상태에서는 재계산 불가"""
       # Given: 확정 상태인 단체
       group = create_test_group(status='confirmed')

       # When & Then: ValidationError 발생
       with pytest.raises(ValidationError, match="확정된 계약은 재계산할 수 없습니다"):
           recalculate_group(group.id, ['pax'])

   def test_recalculate_group_validation_error():
       """검증 실패 시 롤백"""
       # Given: 단체 생성
       group = create_test_group(pax=20, total_price=Decimal('30000000'))

       # When: 계약금을 총액보다 크게 설정 (검증 실패)
       group.deposit = Decimal('40000000')

       # Then: ValidationError 발생, 변경 사항 롤백됨
       with pytest.raises(ValidationError, match="계약금.*총액을 초과"):
           recalculate_group(group.id, ['deposit'])

       # 롤백 확인
       db_session.refresh(group)
       assert group.deposit != Decimal('40000000')

   def test_recalculate_group_warnings():
       """경고 메시지 확인"""
       # Given: 과거 출발일로 단체 생성
       group = create_test_group(start_date=date(2020, 1, 1))
       create_test_cancel_rule(
           group.id, days_before=7, cancel_date_manual=True
       )
       create_test_itinerary(
           group.id, day_no=1, itinerary_date_manual=True
       )

       # When: 재계산
       result = recalculate_group(group.id, ['start_date'])

       # Then: 경고 메시지 발생
       assert len(result['warnings']) > 0
       assert any("완납일" in w and "지났습니다" in w for w in result['warnings'])
       assert any("취소 규정" in w and "수동 수정" in w for w in result['warnings'])
       assert any("일정" in w and "수동 수정" in w for w in result['warnings'])
   ```

6. 통합 테스트 (API 연동):
   ```python
   def test_api_update_triggers_recalculation():
       """API로 단체 업데이트 시 자동 재계산"""
       # Given: 단체 생성
       group = create_test_group(
           start_date=date(2025, 3, 15),
           pax=20,
           price_per_pax=Decimal('1500000')
       )

       # When: 출발일과 인원 동시 변경
       response = client.put(f"/api/groups/{group.id}", json={
           "start_date": "2025-04-01",
           "pax": 25
       })

       # Then: 모든 관련 필드 재계산됨
       assert response.status_code == 200
       data = response.json()

       # 기간 재계산
       assert 'nights' in data['recalculated_fields']

       # 금액 재계산
       assert 'total_price' in data['recalculated_fields']
       assert data['group']['total_price'] == '37500000.00'  # 25 * 1,500,000

       # 날짜 관련 재계산
       assert 'balance_due_date' in data['recalculated_fields']
       assert 'cancel_rules' in data['recalculated_fields']
       assert 'itineraries' in data['recalculated_fields']
   ```

**중요 사항:**

- **상태 확인**: 확정(confirmed) 상태에서는 재계산 불가 (ValidationError 발생)
- **선택적 실행**: 변경된 필드에 따라 필요한 계산만 실행
- **수동 플래그 보호**: 각 계산 함수가 내부적으로 manual 플래그 확인
- **검증 실행**: 모든 재계산 후 validate_group_data() 실행
- **트랜잭션**: 검증 실패 시 자동 롤백
- **경고 수집**: 모든 계산 과정에서 발생한 경고를 수집하여 반환
- **일관성**: API 업데이트 시 항상 이 함수를 통해 재계산

**검증 방법:**

1. 단위 테스트 실행:
   ```bash
   pytest tests/test_calculation.py::test_recalculate_group_start_date_change -v
   pytest tests/test_calculation.py::test_recalculate_group_pax_change -v
   pytest tests/test_calculation.py::test_recalculate_group_confirmed_status_error -v
   pytest tests/test_calculation.py::test_recalculate_group_validation_error -v
   pytest tests/test_calculation.py::test_recalculate_group_warnings -v
   ```

2. 통합 테스트: API 업데이트 시나리오
   - 단체 생성
   - 출발일, 인원, 계약금 등 여러 필드 동시 변경
   - 자동 재계산 결과 확인
   - 경고 메시지 확인

3. 실제 데이터로 테스트:
   ```python
   # 통합 재계산 테스트
   group = get_group_by_name("테스트 단체")

   print("변경 전:")
   print(f"  출발일: {group.start_date}")
   print(f"  인원: {group.pax}")
   print(f"  총액: {group.total_price:,}")

   # 변경
   group.start_date = date(2025, 5, 1)
   group.pax = 30

   # 재계산
   result = recalculate_group(group.id, ['start_date', 'pax'])

   print("\n변경 후:")
   print(f"  출발일: {group.start_date}")
   print(f"  인원: {group.pax}")
   print(f"  총액: {group.total_price:,}")

   print(f"\n재계산된 필드: {', '.join(result['recalculated_fields'])}")

   if result['warnings']:
       print("\n경고:")
       for w in result['warnings']:
           print(f"  - {w}")
   ```

**산출물:**

- `backend/services/calculation.py`: recalculate_group() 함수
- `backend/services/validation.py`: validate_group_data() 함수
- `backend/exceptions.py`: ValidationError 예외 클래스
- `tests/test_calculation.py`: 단위 테스트 코드 (5개 테스트 케이스)
- `tests/test_api_integration.py`: 통합 테스트 코드

**의존성:**

- **선행 task**:
  - T-CALC-01 (기간 계산)
  - T-CALC-02 (금액 계산)
  - T-CALC-03 (완납일 계산)
  - T-CALC-04 (취소 규정 계산)
  - T-CALC-05 (일정 재배치)
- **후행 task**:
  - T-API-04 (단체 업데이트 API에서 이 함수 호출)
  - T-API-06 (재계산 전용 API 엔드포인트)
  - T-STATE-01 (상태 전환 시 재계산 제어)

---

## Phase 4: 프론트엔드 UI TASK 개선 (T-UI-01 ~ T-UI-08, 8개)

다음은 **Phase 4: 프론트엔드 UI task 개선 (T-UI-01 ~ T-UI-08, 8개)**입니다.

---

### T-UI-01 단체 선택 화면

**참조 문서:**

- PRD Section 5: 핵심 사용자 시나리오 (단체 선택 프로세스)
- PRD Section 8.1: 단체 선택 화면 요구사항
- PRD Section 10: 상태별 제어 규칙 (상태 표시)
- TRD Section 2.1: 시스템 아키텍처 (Frontend ↔ Backend API)
- TRD Section 4.1.1: 단체 목록 조회 API 명세

**목표:**

단체 목록을 조회하고 검색/필터링할 수 있는 UI를 구현합니다. 사용자가 단체를 선택하면 상세 화면으로 이동합니다.

**배경:**

PRD Section 5에 따르면, 사용자는 먼저 단체 목록 화면에서 기존 단체를 선택하거나 새로운 단체를 생성합니다. 이 화면은 시스템의 진입점이며, 사용자가 원하는 단체를 빠르게 찾을 수 있도록 검색 및 필터링 기능을 제공해야 합니다.

**작업 내용:**

1. **단체 목록 테이블 구현**

   다음 컬럼을 포함한 테이블을 표시하세요:
   - 단체명
   - 출발일
   - 도착일
   - 인원수
   - 상태 (견적/계약/확정)
   - 최종 수정일

2. **상태별 색상 표시**

   PRD Section 10에 정의된 상태별 시각적 구분:
   - **견적 (estimate)**: 회색 또는 파란색 배지
   - **계약 (contract)**: 주황색 배지
   - **확정 (confirmed)**: 녹색 배지

3. **검색 및 필터링 기능**

   - **단체명 실시간 검색**: 입력 시 즉시 필터링 (debounce 300ms)
   - **날짜 범위 필터**: 출발일 기준 (시작일 ~ 종료일)
   - **상태 필터**: 드롭다운 또는 체크박스 (견적/계약/확정)

4. **페이징 처리**

   - 페이지당 20개 항목 표시
   - 이전/다음 버튼
   - 페이지 번호 표시
   - 전체 개수 표시

5. **단체 선택 및 이동**

   - 테이블 행 클릭 시 상세 화면으로 이동
   - "신규 단체 생성" 버튼 제공

**실행 절차:**

1. HTML 구조 작성 (`frontend/pages/group_list.html`):
   ```html
   <!DOCTYPE html>
   <html lang="ko">
   <head>
       <meta charset="UTF-8">
       <title>단체 관리 - 목록</title>
       <link rel="stylesheet" href="/static/css/styles.css">
   </head>
   <body>
       <div class="container">
           <h1>단체 목록</h1>

           <!-- 검색 및 필터 영역 -->
           <div class="search-filters">
               <input type="text" id="searchName" placeholder="단체명 검색..." />

               <input type="date" id="filterStartDateFrom" placeholder="출발일 시작" />
               <input type="date" id="filterStartDateTo" placeholder="출발일 종료" />

               <select id="filterStatus">
                   <option value="">전체 상태</option>
                   <option value="estimate">견적</option>
                   <option value="contract">계약</option>
                   <option value="confirmed">확정</option>
               </select>

               <button id="btnSearch">검색</button>
               <button id="btnReset">초기화</button>
           </div>

           <!-- 신규 생성 버튼 -->
           <button id="btnCreateNew" class="btn-primary">신규 단체 생성</button>

           <!-- 단체 목록 테이블 -->
           <table id="groupTable">
               <thead>
                   <tr>
                       <th>단체명</th>
                       <th>출발일</th>
                       <th>도착일</th>
                       <th>인원수</th>
                       <th>상태</th>
                       <th>최종 수정일</th>
                   </tr>
               </thead>
               <tbody id="groupTableBody">
                   <!-- 동적으로 채워짐 -->
               </tbody>
           </table>

           <!-- 페이징 -->
           <div class="pagination" id="pagination">
               <!-- 동적으로 채워짐 -->
           </div>
       </div>

       <script src="/static/js/group_list.js"></script>
   </body>
   </html>
   ```

2. CSS 스타일 작성 (`frontend/static/css/styles.css`):
   ```css
   /* 상태 배지 스타일 */
   .badge {
       padding: 4px 8px;
       border-radius: 4px;
       font-size: 12px;
       font-weight: bold;
   }

   .badge-estimate {
       background-color: #6c757d;
       color: white;
   }

   .badge-contract {
       background-color: #fd7e14;
       color: white;
   }

   .badge-confirmed {
       background-color: #28a745;
       color: white;
   }

   /* 테이블 스타일 */
   table {
       width: 100%;
       border-collapse: collapse;
       margin-top: 20px;
   }

   table th, table td {
       border: 1px solid #ddd;
       padding: 12px;
       text-align: left;
   }

   table th {
       background-color: #f8f9fa;
   }

   table tbody tr:hover {
       background-color: #f1f3f5;
       cursor: pointer;
   }

   /* 검색 필터 영역 */
   .search-filters {
       display: flex;
       gap: 10px;
       margin-bottom: 20px;
   }

   .search-filters input,
   .search-filters select {
       padding: 8px;
       border: 1px solid #ddd;
       border-radius: 4px;
   }

   /* 페이징 */
   .pagination {
       display: flex;
       gap: 5px;
       margin-top: 20px;
       justify-content: center;
   }

   .pagination button {
       padding: 8px 12px;
       border: 1px solid #ddd;
       background-color: white;
       cursor: pointer;
   }

   .pagination button.active {
       background-color: #007bff;
       color: white;
   }

   .pagination button:disabled {
       cursor: not-allowed;
       opacity: 0.5;
   }
   ```

3. JavaScript 로직 구현 (`frontend/static/js/group_list.js`):
   ```javascript
   // 상태 관리
   let currentPage = 1;
   let currentFilters = {
       name: '',
       status: '',
       startDateFrom: '',
       startDateTo: ''
   };

   // API 기본 URL
   const API_BASE_URL = '/api';

   // 페이지 로드 시 실행
   document.addEventListener('DOMContentLoaded', () => {
       loadGroups();
       setupEventListeners();
   });

   // 이벤트 리스너 설정
   function setupEventListeners() {
       // 검색 버튼
       document.getElementById('btnSearch').addEventListener('click', () => {
           currentPage = 1;
           updateFilters();
           loadGroups();
       });

       // 초기화 버튼
       document.getElementById('btnReset').addEventListener('click', () => {
           document.getElementById('searchName').value = '';
           document.getElementById('filterStartDateFrom').value = '';
           document.getElementById('filterStartDateTo').value = '';
           document.getElementById('filterStatus').value = '';
           currentPage = 1;
           currentFilters = { name: '', status: '', startDateFrom: '', startDateTo: '' };
           loadGroups();
       });

       // 신규 생성 버튼
       document.getElementById('btnCreateNew').addEventListener('click', () => {
           window.location.href = '/groups/new';
       });

       // 실시간 검색 (debounce)
       let debounceTimer;
       document.getElementById('searchName').addEventListener('input', (e) => {
           clearTimeout(debounceTimer);
           debounceTimer = setTimeout(() => {
               currentPage = 1;
               updateFilters();
               loadGroups();
           }, 300);
       });
   }

   // 필터 업데이트
   function updateFilters() {
       currentFilters = {
           name: document.getElementById('searchName').value,
           status: document.getElementById('filterStatus').value,
           startDateFrom: document.getElementById('filterStartDateFrom').value,
           startDateTo: document.getElementById('filterStartDateTo').value
       };
   }

   // 단체 목록 조회
   async function loadGroups() {
       try {
           // 쿼리 파라미터 구성
           const params = new URLSearchParams({
               page: currentPage,
               limit: 20
           });

           if (currentFilters.name) params.append('name', currentFilters.name);
           if (currentFilters.status) params.append('status', currentFilters.status);
           if (currentFilters.startDateFrom) params.append('start_date_from', currentFilters.startDateFrom);
           if (currentFilters.startDateTo) params.append('start_date_to', currentFilters.startDateTo);

           // API 호출
           const response = await fetch(`${API_BASE_URL}/groups?${params}`);
           if (!response.ok) throw new Error('API 호출 실패');

           const data = await response.json();

           // 테이블 렌더링
           renderTable(data.data);

           // 페이징 렌더링
           renderPagination(data.page, data.total, data.limit);

       } catch (error) {
           console.error('단체 목록 조회 오류:', error);
           alert('단체 목록을 불러올 수 없습니다.');
       }
   }

   // 테이블 렌더링
   function renderTable(groups) {
       const tbody = document.getElementById('groupTableBody');
       tbody.innerHTML = '';

       if (groups.length === 0) {
           tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">조회된 단체가 없습니다.</td></tr>';
           return;
       }

       groups.forEach(group => {
           const row = document.createElement('tr');
           row.innerHTML = `
               <td>${escapeHtml(group.name)}</td>
               <td>${formatDate(group.start_date)}</td>
               <td>${formatDate(group.end_date)}</td>
               <td>${group.pax}명</td>
               <td>${renderStatusBadge(group.status)}</td>
               <td>${formatDateTime(group.updated_at)}</td>
           `;

           // 행 클릭 시 상세 페이지로 이동
           row.addEventListener('click', () => {
               window.location.href = `/groups/${group.id}`;
           });

           tbody.appendChild(row);
       });
   }

   // 상태 배지 렌더링
   function renderStatusBadge(status) {
       const statusMap = {
           'estimate': { label: '견적', class: 'badge-estimate' },
           'contract': { label: '계약', class: 'badge-contract' },
           'confirmed': { label: '확정', class: 'badge-confirmed' }
       };

       const statusInfo = statusMap[status] || { label: status, class: '' };
       return `<span class="badge ${statusInfo.class}">${statusInfo.label}</span>`;
   }

   // 페이징 렌더링
   function renderPagination(currentPage, totalItems, limit) {
       const totalPages = Math.ceil(totalItems / limit);
       const paginationDiv = document.getElementById('pagination');
       paginationDiv.innerHTML = '';

       // 이전 버튼
       const prevBtn = document.createElement('button');
       prevBtn.textContent = '이전';
       prevBtn.disabled = currentPage === 1;
       prevBtn.addEventListener('click', () => {
           if (currentPage > 1) {
               currentPage--;
               loadGroups();
           }
       });
       paginationDiv.appendChild(prevBtn);

       // 페이지 번호 (최대 5개 표시)
       const startPage = Math.max(1, currentPage - 2);
       const endPage = Math.min(totalPages, startPage + 4);

       for (let i = startPage; i <= endPage; i++) {
           const pageBtn = document.createElement('button');
           pageBtn.textContent = i;
           if (i === currentPage) pageBtn.classList.add('active');
           pageBtn.addEventListener('click', () => {
               currentPage = i;
               loadGroups();
           });
           paginationDiv.appendChild(pageBtn);
       }

       // 다음 버튼
       const nextBtn = document.createElement('button');
       nextBtn.textContent = '다음';
       nextBtn.disabled = currentPage === totalPages;
       nextBtn.addEventListener('click', () => {
           if (currentPage < totalPages) {
               currentPage++;
               loadGroups();
           }
       });
       paginationDiv.appendChild(nextBtn);

       // 전체 개수 표시
       const totalInfo = document.createElement('span');
       totalInfo.style.marginLeft = '20px';
       totalInfo.textContent = `전체 ${totalItems}개`;
       paginationDiv.appendChild(totalInfo);
   }

   // 유틸리티 함수
   function formatDate(dateString) {
       if (!dateString) return '';
       const date = new Date(dateString);
       return date.toLocaleDateString('ko-KR');
   }

   function formatDateTime(dateTimeString) {
       if (!dateTimeString) return '';
       const date = new Date(dateTimeString);
       return date.toLocaleString('ko-KR');
   }

   function escapeHtml(text) {
       const div = document.createElement('div');
       div.textContent = text;
       return div.innerHTML;
   }
   ```

4. React를 사용하는 경우 (`frontend/src/components/GroupList.jsx`):
   ```jsx
   import React, { useState, useEffect } from 'react';
   import { useNavigate } from 'react-router-dom';

   function GroupList() {
       const navigate = useNavigate();
       const [groups, setGroups] = useState([]);
       const [filters, setFilters] = useState({
           name: '',
           status: '',
           startDateFrom: '',
           startDateTo: ''
       });
       const [page, setPage] = useState(1);
       const [totalItems, setTotalItems] = useState(0);
       const limit = 20;

       useEffect(() => {
           loadGroups();
       }, [page, filters]);

       const loadGroups = async () => {
           try {
               const params = new URLSearchParams({
                   page,
                   limit,
                   ...filters
               });

               const response = await fetch(`/api/groups?${params}`);
               const data = await response.json();

               setGroups(data.data);
               setTotalItems(data.total);
           } catch (error) {
               console.error('Error loading groups:', error);
           }
       };

       const handleSearch = () => {
           setPage(1);
           loadGroups();
       };

       const handleRowClick = (groupId) => {
           navigate(`/groups/${groupId}`);
       };

       return (
           <div className="container">
               <h1>단체 목록</h1>

               {/* 검색 필터 */}
               <div className="search-filters">
                   <input
                       type="text"
                       placeholder="단체명 검색..."
                       value={filters.name}
                       onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                   />
                   {/* 나머지 필터 */}
                   <button onClick={handleSearch}>검색</button>
               </div>

               {/* 테이블 */}
               <table>
                   <thead>
                       <tr>
                           <th>단체명</th>
                           <th>출발일</th>
                           <th>도착일</th>
                           <th>인원수</th>
                           <th>상태</th>
                           <th>최종 수정일</th>
                       </tr>
                   </thead>
                   <tbody>
                       {groups.map(group => (
                           <tr key={group.id} onClick={() => handleRowClick(group.id)}>
                               <td>{group.name}</td>
                               <td>{new Date(group.start_date).toLocaleDateString()}</td>
                               <td>{new Date(group.end_date).toLocaleDateString()}</td>
                               <td>{group.pax}명</td>
                               <td><StatusBadge status={group.status} /></td>
                               <td>{new Date(group.updated_at).toLocaleString()}</td>
                           </tr>
                       ))}
                   </tbody>
               </table>

               {/* 페이징 */}
               <Pagination
                   currentPage={page}
                   totalItems={totalItems}
                   limit={limit}
                   onPageChange={setPage}
               />
           </div>
       );
   }

   export default GroupList;
   ```

**중요 사항:**

- **실시간 검색 성능**: Debounce를 사용하여 API 호출 횟수 최소화 (300ms)
- **XSS 방지**: 사용자 입력을 렌더링할 때 HTML 이스케이프 처리
- **접근성**: 테이블에 적절한 `<thead>`, `<tbody>` 사용
- **모바일 대응**: 반응형 디자인 고려 (선택사항)
- **에러 처리**: API 실패 시 사용자에게 알림

**검증 방법:**

1. 단위 테스트:
   - 검색 필터가 정상적으로 작동하는지 확인
   - 페이징이 올바르게 동작하는지 확인
   - 상태 배지가 올바른 색상으로 표시되는지 확인

2. 통합 테스트:
   - 백엔드 API와 연동하여 실제 데이터 조회
   - 다양한 필터 조합 테스트
   - 페이지 이동 테스트

3. 사용성 테스트:
   - 단체명 검색 (debounce 확인)
   - 날짜 범위 필터
   - 상태 필터
   - 페이징 이동
   - 단체 선택 시 상세 페이지 이동

**산출물:**

- `frontend/pages/group_list.html`: 단체 선택 화면 HTML
- `frontend/static/css/styles.css`: CSS 스타일
- `frontend/static/js/group_list.js`: JavaScript 로직
- `frontend/src/components/GroupList.jsx`: React 컴포넌트 (선택사항)

**의존성:**

- **선행 task**: T-API-01 (단체 목록 조회 API)
- **후행 task**: T-UI-02 (단체 입력 화면으로 이동)

---

### T-UI-02 단체 입력 화면

**참조 문서:**

- PRD Section 5: 핵심 사용자 시나리오 (단체 정보 입력 프로세스)
- PRD Section 7: 자동 계산 로직 전체 (실시간 표시 요구사항)
- PRD Section 8.2: 입력 화면 요구사항 (자동값/수동값 구분)
- PRD Section 12: 예외 처리 및 데이터 검증 규칙
- TRD Section 4.1.3: 단체 생성 API
- TRD Section 4.1.4: 단체 수정 API

**목표:**

단체 정보를 입력하고 수정할 수 있는 UI를 구현합니다. 자동 계산 결과를 실시간으로 표시하고, 수동 수정 기능을 제공합니다.

**배경:**

PRD Section 8.2에 따르면, 입력 화면에서는 자동 계산값과 수동 수정값을 시각적으로 구분해야 합니다. 사용자가 자동 계산값을 수동으로 수정할 수 있으며, 이 경우 수동 수정 플래그가 설정됩니다.

**작업 내용:**

1. **기본 정보 입력 폼 구현**

   다음 필드를 포함한 폼을 작성하세요:
   - 단체명 (필수)
   - 출발일 (필수, 날짜 선택기)
   - 도착일 (필수, 날짜 선택기)
   - 인원수 (필수, 숫자)
   - 1인당 요금 (필수, 숫자)
   - 계약금 (필수, 숫자)

2. **실시간 자동 계산 결과 표시**

   다음 필드는 자동으로 계산되어 표시됩니다:
   - **박수** (nights): `end_date - start_date`
   - **일수** (days): `nights + 1`
   - **총액** (total_price): `pax × price_per_pax`
   - **잔액** (balance): `total_price - deposit`
   - **잔액 완납일** (balance_due_date): `start_date - 7일`

3. **자동값/수동값 시각적 구분**

   - **자동 계산값**: 파란색 배경 또는 자동 계산 아이콘 표시
   - **수동 수정값**: 노란색 배경 또는 경고 아이콘 표시
   - 툴팁으로 "자동 계산됨" 또는 "수동 수정됨" 표시

4. **수동 수정 기능**

   - 자동 계산값을 클릭하면 수동 수정 모드로 전환
   - 수정 사유 입력 필드 표시 (선택사항)
   - "자동 계산으로 되돌리기" 버튼 제공

5. **검증 및 에러 표시**

   PRD Section 12의 규칙을 적용:
   - 필수 필드 검증
   - 날짜 형식 검증
   - **출발일 < 도착일** 검증
   - **계약금 <= 총액** 검증
   - 음수 값 검증
   - 에러 메시지를 필드 아래에 빨간색으로 표시

**실행 절차:**

1. HTML 구조 작성 (`frontend/pages/group_form.html`):
   ```html
   <!DOCTYPE html>
   <html lang="ko">
   <head>
       <meta charset="UTF-8">
       <title>단체 정보 입력</title>
       <link rel="stylesheet" href="/static/css/styles.css">
   </head>
   <body>
       <div class="container">
           <h1 id="pageTitle">단체 정보 입력</h1>

           <form id="groupForm">
               <!-- 기본 정보 -->
               <div class="form-section">
                   <h2>기본 정보</h2>

                   <div class="form-group">
                       <label for="name">단체명 <span class="required">*</span></label>
                       <input type="text" id="name" name="name" required />
                       <div class="error-message" id="error-name"></div>
                   </div>

                   <div class="form-row">
                       <div class="form-group">
                           <label for="start_date">출발일 <span class="required">*</span></label>
                           <input type="date" id="start_date" name="start_date" required />
                           <div class="error-message" id="error-start_date"></div>
                       </div>

                       <div class="form-group">
                           <label for="end_date">도착일 <span class="required">*</span></label>
                           <input type="date" id="end_date" name="end_date" required />
                           <div class="error-message" id="error-end_date"></div>
                       </div>
                   </div>

                   <div class="form-row">
                       <div class="form-group">
                           <label for="pax">인원수 <span class="required">*</span></label>
                           <input type="number" id="pax" name="pax" min="1" required />
                           <div class="error-message" id="error-pax"></div>
                       </div>

                       <div class="form-group">
                           <label for="price_per_pax">1인당 요금 <span class="required">*</span></label>
                           <input type="number" id="price_per_pax" name="price_per_pax" min="0" step="1000" required />
                           <div class="error-message" id="error-price_per_pax"></div>
                       </div>
                   </div>

                   <div class="form-group">
                       <label for="deposit">계약금 <span class="required">*</span></label>
                       <input type="number" id="deposit" name="deposit" min="0" step="1000" required />
                       <div class="error-message" id="error-deposit"></div>
                   </div>
               </div>

               <!-- 자동 계산 결과 -->
               <div class="form-section">
                   <h2>자동 계산 결과</h2>

                   <div class="form-row">
                       <div class="form-group">
                           <label>박수</label>
                           <div class="calculated-field" id="nights-container">
                               <input type="number" id="nights" name="nights" readonly class="auto-calculated" />
                               <button type="button" class="btn-edit" id="btn-edit-nights" title="수동 수정">✏️</button>
                               <button type="button" class="btn-reset" id="btn-reset-nights" style="display:none;" title="자동 계산으로 되돌리기">↺</button>
                           </div>
                           <small class="field-status" id="status-nights">자동 계산됨</small>
                       </div>

                       <div class="form-group">
                           <label>일수</label>
                           <div class="calculated-field" id="days-container">
                               <input type="number" id="days" name="days" readonly class="auto-calculated" />
                               <button type="button" class="btn-edit" id="btn-edit-days">✏️</button>
                               <button type="button" class="btn-reset" id="btn-reset-days" style="display:none;">↺</button>
                           </div>
                           <small class="field-status" id="status-days">자동 계산됨</small>
                       </div>
                   </div>

                   <div class="form-group">
                       <label>총액</label>
                       <div class="calculated-field" id="total_price-container">
                           <input type="number" id="total_price" name="total_price" readonly class="auto-calculated" />
                           <button type="button" class="btn-edit" id="btn-edit-total_price">✏️</button>
                           <button type="button" class="btn-reset" id="btn-reset-total_price" style="display:none;">↺</button>
                       </div>
                       <small class="field-status" id="status-total_price">자동 계산됨</small>
                   </div>

                   <div class="form-group">
                       <label>잔액</label>
                       <div class="calculated-field" id="balance-container">
                           <input type="number" id="balance" name="balance" readonly class="auto-calculated" />
                           <button type="button" class="btn-edit" id="btn-edit-balance">✏️</button>
                           <button type="button" class="btn-reset" id="btn-reset-balance" style="display:none;">↺</button>
                       </div>
                       <small class="field-status" id="status-balance">자동 계산됨</small>
                   </div>

                   <div class="form-group">
                       <label>잔액 완납일</label>
                       <div class="calculated-field" id="balance_due_date-container">
                           <input type="date" id="balance_due_date" name="balance_due_date" readonly class="auto-calculated" />
                           <button type="button" class="btn-edit" id="btn-edit-balance_due_date">✏️</button>
                           <button type="button" class="btn-reset" id="btn-reset-balance_due_date" style="display:none;">↺</button>
                       </div>
                       <small class="field-status" id="status-balance_due_date">자동 계산됨</small>
                   </div>
               </div>

               <!-- 제출 버튼 -->
               <div class="form-actions">
                   <button type="submit" class="btn-primary">저장</button>
                   <button type="button" class="btn-secondary" id="btnCancel">취소</button>
               </div>
           </form>
       </div>

       <script src="/static/js/group_form.js"></script>
   </body>
   </html>
   ```

2. CSS 스타일 추가:
   ```css
   /* 자동 계산 필드 스타일 */
   .calculated-field {
       display: flex;
       gap: 5px;
       align-items: center;
   }

   .auto-calculated {
       background-color: #e7f3ff;
       border: 1px solid #0066cc;
   }

   .manual-edited {
       background-color: #fff3cd;
       border: 1px solid #ffc107;
   }

   .field-status {
       color: #666;
       font-size: 12px;
   }

   .field-status.auto {
       color: #0066cc;
   }

   .field-status.manual {
       color: #ffc107;
   }

   /* 버튼 스타일 */
   .btn-edit, .btn-reset {
       background: none;
       border: none;
       cursor: pointer;
       font-size: 16px;
   }

   .btn-edit:hover, .btn-reset:hover {
       transform: scale(1.2);
   }

   /* 에러 메시지 */
   .error-message {
       color: #dc3545;
       font-size: 12px;
       margin-top: 4px;
       min-height: 18px;
   }

   /* 필수 필드 표시 */
   .required {
       color: #dc3545;
   }

   /* 폼 레이아웃 */
   .form-section {
       margin-bottom: 30px;
       padding: 20px;
       border: 1px solid #ddd;
       border-radius: 4px;
   }

   .form-row {
       display: flex;
       gap: 20px;
   }

   .form-group {
       flex: 1;
       margin-bottom: 15px;
   }

   .form-group label {
       display: block;
       margin-bottom: 5px;
       font-weight: bold;
   }

   .form-group input,
   .form-group select {
       width: 100%;
       padding: 8px;
       border: 1px solid #ddd;
       border-radius: 4px;
   }

   .form-actions {
       display: flex;
       gap: 10px;
       margin-top: 30px;
   }
   ```

3. JavaScript 로직 구현 (매우 긴 코드이므로 주요 부분만):
   ```javascript
   // 상태 관리
   let groupData = {
       // 기본 필드
       name: '',
       start_date: '',
       end_date: '',
       pax: 0,
       price_per_pax: 0,
       deposit: 0,

       // 자동 계산 필드
       nights: 0,
       days: 0,
       total_price: 0,
       balance: 0,
       balance_due_date: '',

       // Manual 플래그
       nights_manual: false,
       days_manual: false,
       total_price_manual: false,
       balance_manual: false,
       balance_due_date_manual: false
   };

   // 페이지 로드 시
   document.addEventListener('DOMContentLoaded', () => {
       const groupId = getGroupIdFromUrl();

       if (groupId) {
           // 수정 모드
           document.getElementById('pageTitle').textContent = '단체 정보 수정';
           loadGroupData(groupId);
       } else {
           // 신규 생성 모드
           setupAutoCalculation();
       }

       setupEventListeners();
   });

   // 이벤트 리스너 설정
   function setupEventListeners() {
       // 폼 제출
       document.getElementById('groupForm').addEventListener('submit', handleSubmit);

       // 취소 버튼
       document.getElementById('btnCancel').addEventListener('click', () => {
           if (confirm('변경 사항이 저장되지 않습니다. 취소하시겠습니까?')) {
               window.location.href = '/groups';
           }
       });

       // 자동 계산 트리거 필드
       const autoCalcFields = ['start_date', 'end_date', 'pax', 'price_per_pax', 'deposit'];
       autoCalcFields.forEach(field => {
           document.getElementById(field).addEventListener('input', () => {
               updateGroupData();
               performAutoCalculation();
           });
       });

       // 수동 수정 버튼
       setupManualEditButtons();
   }

   // 수동 수정 버튼 설정
   function setupManualEditButtons() {
       const editableFields = ['nights', 'days', 'total_price', 'balance', 'balance_due_date'];

       editableFields.forEach(field => {
           // 수정 버튼
           document.getElementById(`btn-edit-${field}`).addEventListener('click', () => {
               enableManualEdit(field);
           });

           // 되돌리기 버튼
           document.getElementById(`btn-reset-${field}`).addEventListener('click', () => {
               resetToAutoCalculation(field);
           });
       });
   }

   // 수동 수정 활성화
   function enableManualEdit(field) {
       const input = document.getElementById(field);
       input.readOnly = false;
       input.classList.remove('auto-calculated');
       input.classList.add('manual-edited');

       document.getElementById(`btn-edit-${field}`).style.display = 'none';
       document.getElementById(`btn-reset-${field}`).style.display = 'inline-block';

       const status = document.getElementById(`status-${field}`);
       status.textContent = '수동 수정됨';
       status.classList.remove('auto');
       status.classList.add('manual');

       groupData[`${field}_manual`] = true;

       input.focus();
   }

   // 자동 계산으로 되돌리기
   function resetToAutoCalculation(field) {
       const input = document.getElementById(field);
       input.readOnly = true;
       input.classList.remove('manual-edited');
       input.classList.add('auto-calculated');

       document.getElementById(`btn-edit-${field}`).style.display = 'inline-block';
       document.getElementById(`btn-reset-${field}`).style.display = 'none';

       const status = document.getElementById(`status-${field}`);
       status.textContent = '자동 계산됨';
       status.classList.remove('manual');
       status.classList.add('auto');

       groupData[`${field}_manual`] = false;

       performAutoCalculation();
   }

   // 자동 계산 수행
   function performAutoCalculation() {
       const startDate = new Date(groupData.start_date);
       const endDate = new Date(groupData.end_date);

       // 박수 계산
       if (!groupData.nights_manual && startDate && endDate) {
           const nights = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
           groupData.nights = nights >= 0 ? nights : 0;
           document.getElementById('nights').value = groupData.nights;
       }

       // 일수 계산
       if (!groupData.days_manual) {
           groupData.days = groupData.nights + 1;
           document.getElementById('days').value = groupData.days;
       }

       // 총액 계산
       if (!groupData.total_price_manual) {
           groupData.total_price = groupData.pax * groupData.price_per_pax;
           document.getElementById('total_price').value = groupData.total_price;
       }

       // 잔액 계산
       if (!groupData.balance_manual) {
           groupData.balance = groupData.total_price - groupData.deposit;
           document.getElementById('balance').value = groupData.balance;
       }

       // 잔액 완납일 계산
       if (!groupData.balance_due_date_manual && startDate) {
           const dueDate = new Date(startDate);
           dueDate.setDate(dueDate.getDate() - 7);
           groupData.balance_due_date = dueDate.toISOString().split('T')[0];
           document.getElementById('balance_due_date').value = groupData.balance_due_date;
       }

       // 검증 수행
       validateForm();
   }

   // 폼 검증
   function validateForm() {
       let isValid = true;
       clearErrors();

       // 필수 필드 검증
       const requiredFields = ['name', 'start_date', 'end_date', 'pax', 'price_per_pax', 'deposit'];
       requiredFields.forEach(field => {
           if (!groupData[field]) {
               showError(field, '필수 항목입니다');
               isValid = false;
           }
       });

       // 날짜 검증
       if (groupData.start_date && groupData.end_date) {
           const startDate = new Date(groupData.start_date);
           const endDate = new Date(groupData.end_date);

           if (endDate <= startDate) {
               showError('end_date', '도착일은 출발일보다 이후여야 합니다');
               isValid = false;
           }

           // 과거 날짜 경고
           const today = new Date();
           if (startDate < today) {
               showError('start_date', '출발일이 과거입니다. 계속하시겠습니까?', 'warning');
           }
       }

       // 금액 검증
       if (groupData.deposit > groupData.total_price) {
           showError('deposit', '계약금은 총액을 초과할 수 없습니다');
           isValid = false;
       }

       // 음수 검증
       const nonNegativeFields = ['pax', 'price_per_pax', 'deposit', 'total_price'];
       nonNegativeFields.forEach(field => {
           if (groupData[field] < 0) {
               showError(field, `${field}은(는) 0 이상이어야 합니다`);
               isValid = false;
           }
       });

       // 잔액 음수 경고
       if (groupData.balance < 0) {
           showError('balance', '잔액이 음수입니다', 'warning');
       }

       return isValid;
   }

   // 에러 표시
   function showError(field, message, type = 'error') {
       const errorDiv = document.getElementById(`error-${field}`);
       if (errorDiv) {
           errorDiv.textContent = message;
           errorDiv.style.color = type === 'warning' ? '#ffc107' : '#dc3545';
       }
   }

   // 에러 초기화
   function clearErrors() {
       const errorDivs = document.querySelectorAll('.error-message');
       errorDivs.forEach(div => div.textContent = '');
   }

   // 폼 제출
   async function handleSubmit(e) {
       e.preventDefault();

       updateGroupData();

       if (!validateForm()) {
           alert('입력값을 확인해주세요');
           return;
       }

       try {
           const groupId = getGroupIdFromUrl();
           const method = groupId ? 'PUT' : 'POST';
           const url = groupId ? `/api/groups/${groupId}` : '/api/groups';

           const response = await fetch(url, {
               method,
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify(groupData)
           });

           if (!response.ok) {
               const errorData = await response.json();
               throw new Error(errorData.detail || '저장 실패');
           }

           const result = await response.json();

           alert('저장되었습니다');
           window.location.href = `/groups/${result.id}`;

       } catch (error) {
           console.error('저장 오류:', error);
           alert(`저장 실패: ${error.message}`);
       }
   }

   // groupData 업데이트
   function updateGroupData() {
       const formData = new FormData(document.getElementById('groupForm'));
       for (let [key, value] of formData.entries()) {
           if (key.endsWith('_manual')) continue;
           groupData[key] = value;
       }
   }

   // URL에서 group ID 추출
   function getGroupIdFromUrl() {
       const path = window.location.pathname;
       const match = path.match(/\/groups\/([a-f0-9-]+)/);
       return match ? match[1] : null;
   }

   // 단체 데이터 로드 (수정 모드)
   async function loadGroupData(groupId) {
       try {
           const response = await fetch(`/api/groups/${groupId}`);
           if (!response.ok) throw new Error('데이터 로드 실패');

           const data = await response.json();
           groupData = data;

           // 폼 필드 채우기
           Object.keys(groupData).forEach(key => {
               const input = document.getElementById(key);
               if (input) {
                   input.value = groupData[key] || '';

                   // Manual 플래그에 따라 스타일 변경
                   if (key.endsWith('_manual')) return;

                   const manualFlag = groupData[`${key}_manual`];
                   if (manualFlag === true) {
                       enableManualEdit(key);
                   }
               }
           });

       } catch (error) {
           console.error('데이터 로드 오류:', error);
           alert('데이터를 불러올 수 없습니다');
       }
   }
   ```

**중요 사항:**

- **실시간 계산**: 필드 변경 시 즉시 자동 계산 수행
- **Manual 플래그 관리**: 수동 수정 시 `{field}_manual = TRUE` 설정
- **검증 규칙**: PRD Section 12의 모든 규칙 적용
- **사용자 경험**: 자동값/수동값 시각적 구분 명확히
- **에러 처리**: 명확한 에러 메시지 표시

**검증 방법:**

1. 자동 계산 테스트:
   - 출발일/도착일 변경 시 박수/일수 자동 계산
   - 인원수/1인당 요금 변경 시 총액 자동 계산
   - 계약금 변경 시 잔액 자동 계산

2. 수동 수정 테스트:
   - 자동 계산값 수동 수정
   - 되돌리기 버튼으로 자동 계산 복원
   - Manual 플래그 저장 확인

3. 검증 테스트:
   - 필수 필드 누락
   - 출발일 > 도착일
   - 계약금 > 총액
   - 음수 값 입력

**산출물:**

- `frontend/pages/group_form.html`: 단체 입력 화면
- `frontend/static/js/group_form.js`: JavaScript 로직
- CSS 스타일 추가

**의존성:**

- **선행 task**: T-API-03 (단체 생성 API), T-API-04 (단체 수정 API), T-CALC-06 (통합 재계산)
- **후행 task**: T-UI-03 (일정 관리 화면)

---

### T-UI-03 일정 관리 화면

**참조 문서:**

- PRD Section 5: 핵심 사용자 시나리오 (일정 입력 프로세스)
- PRD Section 7.5: 일정 날짜 자동 재배치 규칙
- PRD Section 6.2.2: group_itinerary 테이블 스키마
- TRD Section 5.3.1: 재배치 알고리즘
- TRD Section 5.3.2: 일정 추가/삭제 처리

**목표:**

일정을 추가, 수정, 삭제할 수 있는 UI를 구현합니다. 출발일 변경 시 날짜 자동 업데이트 알림을 표시합니다.

**배경:**

PRD Section 7.5에 따르면, 출발일이 변경되면 모든 일정의 날짜가 자동으로 재계산됩니다. 수동으로 수정된 일정도 재계산되므로 사용자에게 알림을 표시해야 합니다.

**작업 내용:**

1. **일정 목록 표시**
   - 일차 (day_no)
   - 날짜 (itinerary_date)
   - 지역, 교통편, 시간, 일정, 식사, 숙박

2. **일정 추가 기능**
   - day_no 자동 부여 (max + 1)
   - 날짜 자동 계산 (start_date + day_no - 1)
   - 모든 필드 입력 폼

3. **일정 수정 기능**
   - 날짜 수동 수정 시 `itinerary_date_manual = TRUE` 설정
   - 수동 수정된 일정 시각적 표시 (노란색 배경)

4. **일정 삭제 기능**
   - 확인 다이얼로그
   - day_no 재정렬하지 않음 (빈 번호 허용)

5. **출발일 변경 알림**
   - "출발일 변경으로 인해 N개의 일정 날짜가 변경되었습니다" 알림
   - 수동 수정된 일정 개수 별도 표시

**실행 절차:**

1. HTML 구조 (`frontend/pages/group_itinerary.html`):
   ```html
   <div class="itinerary-section">
       <h2>일정 관리</h2>

       <button id="btnAddItinerary" class="btn-primary">일정 추가</button>

       <table id="itineraryTable">
           <thead>
               <tr>
                   <th>일차</th>
                   <th>날짜</th>
                   <th>지역</th>
                   <th>교통편</th>
                   <th>시간</th>
                   <th>일정</th>
                   <th>식사</th>
                   <th>숙박</th>
                   <th>작업</th>
               </tr>
           </thead>
           <tbody id="itineraryTableBody">
               <!-- 동적으로 채워짐 -->
           </tbody>
       </table>
   </div>

   <!-- 일정 추가/수정 모달 -->
   <div id="itineraryModal" class="modal" style="display:none;">
       <div class="modal-content">
           <h3 id="modalTitle">일정 추가</h3>
           <form id="itineraryForm">
               <input type="hidden" id="itinerary_id" />

               <div class="form-group">
                   <label>일차</label>
                   <input type="number" id="day_no" readonly />
                   <small>자동 부여됨</small>
               </div>

               <div class="form-group">
                   <label>날짜</label>
                   <input type="date" id="itinerary_date" />
                   <button type="button" id="btnEditDate">수동 수정</button>
                   <small class="field-status" id="status-itinerary_date">자동 계산됨</small>
               </div>

               <div class="form-group">
                   <label>지역</label>
                   <input type="text" id="region" />
               </div>

               <div class="form-group">
                   <label>일정</label>
                   <textarea id="description" rows="4"></textarea>
               </div>

               <!-- 나머지 필드들 -->

               <div class="modal-actions">
                   <button type="submit" class="btn-primary">저장</button>
                   <button type="button" class="btn-secondary" id="btnCloseModal">취소</button>
               </div>
           </form>
       </div>
   </div>
   ```

2. JavaScript 핵심 로직:
   ```javascript
   // 일정 목록 조회
   async function loadItineraries(groupId) {
       const response = await fetch(`/api/groups/${groupId}/itineraries`);
       const itineraries = await response.json();

       renderItineraryTable(itineraries);
   }

   // 일정 추가
   async function addItinerary(groupId, itineraryData) {
       const response = await fetch(`/api/groups/${groupId}/itineraries`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(itineraryData)
       });

       if (!response.ok) throw new Error('일정 추가 실패');

       const newItinerary = await response.json();
       showNotification('일정이 추가되었습니다', 'success');
       loadItineraries(groupId);
   }

   // 일정 수정
   async function updateItinerary(groupId, itineraryId, itineraryData) {
       const response = await fetch(`/api/groups/${groupId}/itineraries/${itineraryId}`, {
           method: 'PUT',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(itineraryData)
       });

       if (!response.ok) throw new Error('일정 수정 실패');

       showNotification('일정이 수정되었습니다', 'success');
       loadItineraries(groupId);
   }

   // 일정 삭제
   async function deleteItinerary(groupId, itineraryId) {
       if (!confirm('이 일정을 삭제하시겠습니까?')) return;

       const response = await fetch(`/api/groups/${groupId}/itineraries/${itineraryId}`, {
           method: 'DELETE'
       });

       if (!response.ok) throw new Error('일정 삭제 실패');

       showNotification('일정이 삭제되었습니다', 'success');
       loadItineraries(groupId);
   }

   // 날짜 수동 수정
   function enableDateEdit() {
       const dateInput = document.getElementById('itinerary_date');
       dateInput.readOnly = false;
       dateInput.classList.add('manual-edited');

       const status = document.getElementById('status-itinerary_date');
       status.textContent = '수동 수정됨';
       status.classList.add('manual');

       // itinerary_date_manual 플래그 설정
       currentItinerary.itinerary_date_manual = true;
   }

   // 테이블 렌더링
   function renderItineraryTable(itineraries) {
       const tbody = document.getElementById('itineraryTableBody');
       tbody.innerHTML = '';

       itineraries.forEach(itinerary => {
           const row = document.createElement('tr');

           // 수동 수정된 일정 하이라이트
           if (itinerary.itinerary_date_manual) {
               row.classList.add('manual-edited-row');
           }

           row.innerHTML = `
               <td>Day ${itinerary.day_no}</td>
               <td>
                   ${formatDate(itinerary.itinerary_date)}
                   ${itinerary.itinerary_date_manual ? '<span class="badge-warning">수동</span>' : ''}
               </td>
               <td>${itinerary.region || ''}</td>
               <td>${itinerary.transportation || ''}</td>
               <td>${itinerary.time || ''}</td>
               <td>${itinerary.description || ''}</td>
               <td>${itinerary.meal || ''}</td>
               <td>${itinerary.accommodation || ''}</td>
               <td>
                   <button onclick="editItinerary('${itinerary.id}')">수정</button>
                   <button onclick="deleteItinerary('${groupId}', '${itinerary.id}')">삭제</button>
               </td>
           `;

           tbody.appendChild(row);
       });
   }
   ```

**중요 사항:**

- **day_no 자동 부여**: 새 일정 추가 시 서버에서 자동 계산
- **날짜 자동 계산**: start_date + (day_no - 1)
- **수동 수정 플래그**: 날짜를 수동으로 수정하면 `itinerary_date_manual = TRUE`
- **삭제 시 재정렬 안함**: day_no 빈 번호 허용
- **출발일 변경 알림**: 백엔드에서 재계산 결과 반환 시 표시

**검증 방법:**

1. 일정 추가 테스트
2. 일정 수정 테스트 (날짜 수동 수정 포함)
3. 일정 삭제 테스트
4. 출발일 변경 후 일정 날짜 재계산 확인

**산출물:**

- `frontend/pages/group_itinerary.html`
- `frontend/static/js/itinerary.js`
- CSS 스타일 추가

**의존성:**

- **선행 task**: T-API-07 (일정 CRUD API), T-CALC-05 (일정 재배치 로직)
- **후행 task**: T-UI-04 (취소 규정 관리)

---

### T-UI-04 취소 규정 관리 화면

**참조 문서:**

- PRD Section 7.4: 취소 규정 날짜 계산
- PRD Section 6.2.3: group_cancel_rules 테이블 스키마
- TRD Section 5.4.4: 취소 규정 날짜 계산 공식

**목표:**

취소 규정을 추가, 수정, 삭제할 수 있는 UI를 구현합니다. 출발일 변경 시 취소 기준일이 자동으로 업데이트됩니다.

**배경:**

PRD Section 7.4에 따르면, 취소 규정의 날짜는 출발일을 기준으로 자동 계산됩니다. 예: "출발 30일 전" → start_date - 30일.

**작업 내용:**

1. **취소 규정 목록 표시**
   - 출발일 기준 며칠 전 (days_before)
   - 취소 기준일 (cancel_date)
   - 위약금 비율 (penalty_rate)
   - 설명 (description)

2. **취소 규정 추가/수정**
   - days_before 입력 → cancel_date 자동 계산
   - penalty_rate 입력 (0~100%)
   - description 입력

3. **날짜 자동 계산 표시**
   - cancel_date = start_date - days_before
   - 수동 수정 가능 (`cancel_date_manual` 플래그)

4. **정렬**
   - days_before 내림차순 (가장 늦은 날짜부터)

**실행 절차:**

1. HTML 구조:
   ```html
   <div class="cancel-rules-section">
       <h2>취소 규정</h2>

       <button id="btnAddCancelRule" class="btn-primary">취소 규정 추가</button>

       <table id="cancelRulesTable">
           <thead>
               <tr>
                   <th>출발 며칠 전</th>
                   <th>취소 기준일</th>
                   <th>위약금 비율</th>
                   <th>설명</th>
                   <th>작업</th>
               </tr>
           </thead>
           <tbody id="cancelRulesTableBody">
               <!-- 동적으로 채워짐 -->
           </tbody>
       </table>
   </div>

   <!-- 취소 규정 모달 -->
   <div id="cancelRuleModal" class="modal" style="display:none;">
       <div class="modal-content">
           <h3>취소 규정 추가</h3>
           <form id="cancelRuleForm">
               <div class="form-group">
                   <label>출발 며칠 전</label>
                   <input type="number" id="days_before" min="0" required />
                   <small>예: 30 (출발 30일 전)</small>
               </div>

               <div class="form-group">
                   <label>취소 기준일</label>
                   <input type="date" id="cancel_date" readonly class="auto-calculated" />
                   <button type="button" id="btnEditCancelDate">수동 수정</button>
                   <small id="status-cancel_date">자동 계산됨</small>
               </div>

               <div class="form-group">
                   <label>위약금 비율 (%)</label>
                   <input type="number" id="penalty_rate" min="0" max="100" required />
               </div>

               <div class="form-group">
                   <label>설명</label>
                   <textarea id="description" rows="3"></textarea>
               </div>

               <div class="modal-actions">
                   <button type="submit" class="btn-primary">저장</button>
                   <button type="button" class="btn-secondary">취소</button>
               </div>
           </form>
       </div>
   </div>
   ```

2. JavaScript 핵심 로직:
   ```javascript
   // days_before 변경 시 cancel_date 자동 계산
   document.getElementById('days_before').addEventListener('input', (e) => {
       const daysBefore = parseInt(e.target.value);
       if (!daysBefore || !groupData.start_date) return;

       if (!cancelRuleData.cancel_date_manual) {
           const startDate = new Date(groupData.start_date);
           const cancelDate = new Date(startDate);
           cancelDate.setDate(cancelDate.getDate() - daysBefore);

           document.getElementById('cancel_date').value =
               cancelDate.toISOString().split('T')[0];
       }
   });

   // 취소 규정 추가
   async function addCancelRule(groupId, ruleData) {
       const response = await fetch(`/api/groups/${groupId}/cancel-rules`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(ruleData)
       });

       if (!response.ok) throw new Error('취소 규정 추가 실패');

       showNotification('취소 규정이 추가되었습니다', 'success');
       loadCancelRules(groupId);
   }

   // 테이블 렌더링 (days_before 내림차순 정렬)
   function renderCancelRulesTable(rules) {
       // 정렬: days_before 내림차순
       rules.sort((a, b) => b.days_before - a.days_before);

       const tbody = document.getElementById('cancelRulesTableBody');
       tbody.innerHTML = '';

       rules.forEach(rule => {
           const row = document.createElement('tr');
           row.innerHTML = `
               <td>${rule.days_before}일 전</td>
               <td>
                   ${formatDate(rule.cancel_date)}
                   ${rule.cancel_date_manual ? '<span class="badge-warning">수동</span>' : ''}
               </td>
               <td>${rule.penalty_rate}%</td>
               <td>${rule.description || ''}</td>
               <td>
                   <button onclick="editCancelRule('${rule.id}')">수정</button>
                   <button onclick="deleteCancelRule('${groupId}', '${rule.id}')">삭제</button>
               </td>
           `;
           tbody.appendChild(row);
       });
   }
   ```

**중요 사항:**

- **자동 계산**: cancel_date = start_date - days_before
- **정렬**: days_before 내림차순 (가장 늦은 날짜부터)
- **수동 수정**: cancel_date_manual 플래그 지원
- **검증**: penalty_rate는 0~100 사이

**검증 방법:**

1. 취소 규정 추가 테스트
2. days_before 변경 시 cancel_date 자동 계산 확인
3. 출발일 변경 시 모든 취소 규정 날짜 재계산 확인

**산출물:**

- `frontend/pages/group_cancel_rules.html`
- `frontend/static/js/cancel_rules.js`

**의존성:**

- **선행 task**: T-API-08 (취소 규정 CRUD API), T-CALC-04 (취소 규정 날짜 계산)
- **후행 task**: T-UI-05 (포함/불포함 항목 관리)

---

### T-UI-05 포함/불포함 항목 관리 화면

**참조 문서:**

- PRD Section 6.2.4: group_includes 테이블 스키마
- TRD Section 4.1.5: 포함/불포함 항목 API

**목표:**

포함 및 불포함 항목을 추가, 수정, 삭제하고 표시 순서를 조정할 수 있는 UI를 구현합니다.

**배경:**

견적서와 계약서에 포함/불포함 항목을 표시하기 위해 사용자가 항목을 관리할 수 있어야 합니다. 표시 순서(display_order)를 조정하여 문서에 나타나는 순서를 제어합니다.

**작업 내용:**

1. **포함 항목 섹션**
   - item_type = 'include'인 항목 표시
   - 추가/수정/삭제 기능

2. **불포함 항목 섹션**
   - item_type = 'exclude'인 항목 표시
   - 추가/수정/삭제 기능

3. **표시 순서 조정**
   - 위로/아래로 이동 버튼
   - 또는 드래그 앤 드롭 (선택사항)

**실행 절차:**

1. HTML 구조:
   ```html
   <div class="includes-section">
       <h2>포함/불포함 항목</h2>

       <div class="includes-container">
           <div class="include-section">
               <h3>포함 항목</h3>
               <button id="btnAddInclude" class="btn-primary">추가</button>
               <ul id="includeList" class="sortable-list">
                   <!-- 동적으로 채워짐 -->
               </ul>
           </div>

           <div class="exclude-section">
               <h3>불포함 항목</h3>
               <button id="btnAddExclude" class="btn-primary">추가</button>
               <ul id="excludeList" class="sortable-list">
                   <!-- 동적으로 채워짐 -->
               </ul>
           </div>
       </div>
   </div>

   <!-- 항목 모달 -->
   <div id="includeModal" class="modal" style="display:none;">
       <div class="modal-content">
           <h3>항목 추가</h3>
           <form id="includeForm">
               <input type="hidden" id="item_type" />

               <div class="form-group">
                   <label>내용</label>
                   <textarea id="content" rows="3" required></textarea>
               </div>

               <div class="modal-actions">
                   <button type="submit" class="btn-primary">저장</button>
                   <button type="button" class="btn-secondary">취소</button>
               </div>
           </form>
       </div>
   </div>
   ```

2. JavaScript 핵심 로직:
   ```javascript
   // 항목 목록 렌더링
   function renderIncludesList(includes) {
       const includeItems = includes.filter(item => item.item_type === 'include')
           .sort((a, b) => a.display_order - b.display_order);
       const excludeItems = includes.filter(item => item.item_type === 'exclude')
           .sort((a, b) => a.display_order - b.display_order);

       renderList('includeList', includeItems);
       renderList('excludeList', excludeItems);
   }

   function renderList(listId, items) {
       const list = document.getElementById(listId);
       list.innerHTML = '';

       items.forEach((item, index) => {
           const li = document.createElement('li');
           li.dataset.id = item.id;
           li.innerHTML = `
               <span class="item-content">${item.content}</span>
               <div class="item-actions">
                   ${index > 0 ? '<button onclick="moveUp(\\'${item.id}\\')">↑</button>' : ''}
                   ${index < items.length - 1 ? '<button onclick="moveDown(\\'${item.id}\\')">↓</button>' : ''}
                   <button onclick="editInclude('${item.id}')">수정</button>
                   <button onclick="deleteInclude('${groupId}', '${item.id}')">삭제</button>
               </div>
           `;
           list.appendChild(li);
       });
   }

   // 순서 변경
   async function moveUp(itemId) {
       await updateDisplayOrder(itemId, 'up');
       loadIncludes(groupId);
   }

   async function moveDown(itemId) {
       await updateDisplayOrder(itemId, 'down');
       loadIncludes(groupId);
   }

   async function updateDisplayOrder(itemId, direction) {
       const response = await fetch(`/api/groups/${groupId}/includes/${itemId}/reorder`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ direction })
       });

       if (!response.ok) throw new Error('순서 변경 실패');
   }

   // 드래그 앤 드롭 (선택사항)
   function setupDragAndDrop() {
       const lists = document.querySelectorAll('.sortable-list');

       lists.forEach(list => {
           list.addEventListener('dragstart', handleDragStart);
           list.addEventListener('dragover', handleDragOver);
           list.addEventListener('drop', handleDrop);
       });
   }
   ```

**중요 사항:**

- **표시 순서**: display_order로 정렬
- **순서 조정**: 위/아래 버튼 또는 드래그 앤 드롭
- **타입 구분**: item_type = 'include' / 'exclude'

**검증 방법:**

1. 포함 항목 추가/수정/삭제
2. 불포함 항목 추가/수정/삭제
3. 순서 변경 기능 테스트

**산출물:**

- `frontend/pages/group_includes.html`
- `frontend/static/js/includes.js`

**의존성:**

- **선행 task**: T-API-09 (포함/불포함 항목 CRUD API)
- **후행 task**: T-UI-06 (문서 출력)

---

### T-UI-06 문서 출력 버튼 영역

**참조 문서:**

- PRD Section 9: 문서 출력 요구사항
- PRD Section 8.3: 출력 화면
- TRD Section 6: 문서 출력 기술 설계

**목표:**

PDF 문서를 생성하고 다운로드할 수 있는 UI를 구현합니다. PDF 생성 진행 상태를 표시하고 문서 이력을 조회할 수 있습니다.

**배경:**

PRD Section 9에 따르면, 견적서, 계약서, 일정표, 통합 PDF를 출력할 수 있어야 합니다. 문서 생성 시 이력을 기록하고 이전 버전을 다운로드할 수 있어야 합니다.

**작업 내용:**

1. **출력 버튼 그룹**
   - 견적서 PDF 출력
   - 계약서 PDF 출력
   - 일정표 PDF 출력
   - 통합 PDF 출력 (3종 결합)

2. **PDF 생성 진행 상태**
   - 로딩 스피너
   - "PDF 생성 중..." 메시지
   - 진행률 표시 (선택사항)

3. **PDF 생성 완료**
   - 다운로드 링크 제공
   - "PDF가 생성되었습니다" 알림

4. **에러 처리**
   - PDF 생성 실패 시 에러 메시지
   - 재시도 버튼

5. **문서 이력**
   - 이전 버전 목록
   - 버전별 다운로드

**실행 절차:**

1. HTML 구조:
   ```html
   <div class="document-output-section">
       <h2>문서 출력</h2>

       <div class="output-buttons">
           <button id="btnGenerateEstimate" class="btn-output">
               <span class="icon">📄</span>
               견적서 PDF
           </button>

           <button id="btnGenerateContract" class="btn-output">
               <span class="icon">📋</span>
               계약서 PDF
           </button>

           <button id="btnGenerateItinerary" class="btn-output">
               <span class="icon">🗓️</span>
               일정표 PDF
           </button>

           <button id="btnGenerateBundle" class="btn-output btn-primary">
               <span class="icon">📦</span>
               통합 PDF (3종)
           </button>
       </div>

       <!-- 진행 상태 -->
       <div id="pdfProgress" class="pdf-progress" style="display:none;">
           <div class="spinner"></div>
           <p id="progressMessage">PDF 생성 중...</p>
       </div>

       <!-- 문서 이력 -->
       <div class="document-history">
           <h3>문서 이력</h3>
           <table id="documentHistoryTable">
               <thead>
                   <tr>
                       <th>문서 종류</th>
                       <th>버전</th>
                       <th>생성일</th>
                       <th>다운로드</th>
                   </tr>
               </thead>
               <tbody id="documentHistoryBody">
                   <!-- 동적으로 채워짐 -->
               </tbody>
           </table>
       </div>
   </div>
   ```

2. JavaScript 핵심 로직:
   ```javascript
   // PDF 생성
   async function generatePDF(groupId, documentType) {
       try {
           // 진행 상태 표시
           showProgress(`${documentType} PDF 생성 중...`);

           const response = await fetch(`/api/groups/${groupId}/documents/generate`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ document_type: documentType })
           });

           if (!response.ok) {
               const error = await response.json();
               throw new Error(error.detail || 'PDF 생성 실패');
           }

           const result = await response.json();

           // 진행 상태 숨김
           hideProgress();

           // 다운로드 링크 제공
           showDownloadLink(result.file_path, result.file_name);

           // 문서 이력 새로고침
           loadDocumentHistory(groupId);

           showNotification('PDF가 생성되었습니다', 'success');

       } catch (error) {
           hideProgress();
           showNotification(`PDF 생성 실패: ${error.message}`, 'error');
           showRetryButton(documentType);
       }
   }

   // 진행 상태 표시
   function showProgress(message) {
       const progressDiv = document.getElementById('pdfProgress');
       const messageP = document.getElementById('progressMessage');

       messageP.textContent = message;
       progressDiv.style.display = 'flex';

       // 모든 출력 버튼 비활성화
       document.querySelectorAll('.btn-output').forEach(btn => {
           btn.disabled = true;
       });
   }

   function hideProgress() {
       document.getElementById('pdfProgress').style.display = 'none';

       // 모든 출력 버튼 활성화
       document.querySelectorAll('.btn-output').forEach(btn => {
           btn.disabled = false;
       });
   }

   // 다운로드 링크 표시
   function showDownloadLink(filePath, fileName) {
       const link = document.createElement('a');
       link.href = filePath;
       link.download = fileName;
       link.textContent = `${fileName} 다운로드`;
       link.className = 'download-link';

       // 모달 또는 알림으로 표시
       showModal('PDF 생성 완료', link);
   }

   // 문서 이력 조회
   async function loadDocumentHistory(groupId) {
       const response = await fetch(`/api/groups/${groupId}/documents`);
       const documents = await response.json();

       renderDocumentHistory(documents);
   }

   function renderDocumentHistory(documents) {
       const tbody = document.getElementById('documentHistoryBody');
       tbody.innerHTML = '';

       // 최신순 정렬
       documents.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

       documents.forEach(doc => {
           const row = document.createElement('tr');
           row.innerHTML = `
               <td>${getDocumentTypeName(doc.document_type)}</td>
               <td>v${doc.version}</td>
               <td>${formatDateTime(doc.created_at)}</td>
               <td>
                   <a href="${doc.file_path}" download="${doc.file_name}">
                       <button class="btn-small">다운로드</button>
                   </a>
               </td>
           `;
           tbody.appendChild(row);
       });
   }

   function getDocumentTypeName(type) {
       const typeMap = {
           'estimate': '견적서',
           'contract': '계약서',
           'itinerary': '일정표',
           'bundle': '통합 PDF'
       };
       return typeMap[type] || type;
   }

   // 이벤트 리스너
   document.getElementById('btnGenerateEstimate').addEventListener('click', () => {
       generatePDF(groupId, 'estimate');
   });

   document.getElementById('btnGenerateContract').addEventListener('click', () => {
       generatePDF(groupId, 'contract');
   });

   document.getElementById('btnGenerateItinerary').addEventListener('click', () => {
       generatePDF(groupId, 'itinerary');
   });

   document.getElementById('btnGenerateBundle').addEventListener('click', () => {
       generatePDF(groupId, 'bundle');
   });
   ```

3. CSS 스타일:
   ```css
   .output-buttons {
       display: grid;
       grid-template-columns: repeat(2, 1fr);
       gap: 15px;
       margin-bottom: 30px;
   }

   .btn-output {
       padding: 20px;
       font-size: 16px;
       display: flex;
       align-items: center;
       gap: 10px;
   }

   .btn-output .icon {
       font-size: 24px;
   }

   .pdf-progress {
       display: flex;
       align-items: center;
       gap: 15px;
       padding: 20px;
       background-color: #f8f9fa;
       border-radius: 4px;
       margin-bottom: 20px;
   }

   .spinner {
       width: 30px;
       height: 30px;
       border: 3px solid #f3f3f3;
       border-top: 3px solid #3498db;
       border-radius: 50%;
       animation: spin 1s linear infinite;
   }

   @keyframes spin {
       0% { transform: rotate(0deg); }
       100% { transform: rotate(360deg); }
   }
   ```

**중요 사항:**

- **비동기 처리**: PDF 생성은 시간이 걸리므로 진행 상태 표시
- **에러 처리**: 생성 실패 시 명확한 에러 메시지와 재시도 기능
- **버전 관리**: 문서 이력에서 이전 버전 다운로드 가능
- **파일 이름**: 의미 있는 파일명 (예: `견적서_하노이골프단_v1.pdf`)

**검증 방법:**

1. 각 문서 타입별 PDF 생성 테스트
2. 진행 상태 표시 확인
3. 다운로드 기능 확인
4. 문서 이력 조회 및 이전 버전 다운로드

**산출물:**

- `frontend/pages/group_documents.html`
- `frontend/static/js/documents.js`
- CSS 스타일 추가

**의존성:**

- **선행 task**: T-API-10 (문서 생성 API), T-TPL-01~05 (HTML 템플릿), T-PDF-01~05 (PDF 생성)
- **후행 task**: T-UI-07 (상태 변경)

---

### T-UI-07 상태 변경 UI

**참조 문서:**

- PRD Section 10: 상태별 제어 규칙
- TRD Section 4.1.7: 상태 변경 API

**목표:**

단체의 상태를 변경하고 상태별로 UI를 제어하는 기능을 구현합니다.

**배경:**

PRD Section 10에 따르면, 단체 상태는 견적 → 계약 → 확정 순서로 변경됩니다. 확정 상태에서는 자동 계산이 잠금되고 수정이 제한됩니다.

**작업 내용:**

1. **상태 표시**
   - 현재 상태 배지 (견적/계약/확정)
   - 상태별 색상 구분

2. **상태 변경 버튼**
   - 견적 → 계약 버튼
   - 계약 → 확정 버튼 (관리자만 표시)
   - 확인 다이얼로그

3. **상태별 UI 제어**
   - **견적**: 전체 수정 가능
   - **계약**: 자동 계산 활성
   - **확정**: 수정 불가, 자동 계산 비활성화

**실행 절차:**

1. HTML 구조:
   ```html
   <div class="status-section">
       <div class="status-display">
           <h3>현재 상태</h3>
           <span id="currentStatus" class="badge badge-estimate">견적</span>
       </div>

       <div class="status-actions">
           <button id="btnChangeToContract" class="btn-status" style="display:none;">
               계약으로 변경
           </button>

           <button id="btnChangeToConfirmed" class="btn-status btn-danger" style="display:none;">
               확정 (수정 불가)
           </button>
       </div>

       <div class="status-info">
           <p id="statusInfoText"></p>
       </div>
   </div>
   ```

2. JavaScript 핵심 로직:
   ```javascript
   // 상태에 따라 UI 업데이트
   function updateUIByStatus(status) {
       const currentStatusBadge = document.getElementById('currentStatus');
       const btnChangeToContract = document.getElementById('btnChangeToContract');
       const btnChangeToConfirmed = document.getElementById('btnChangeToConfirmed');
       const statusInfoText = document.getElementById('statusInfoText');

       // 배지 업데이트
       currentStatusBadge.className = `badge badge-${status}`;
       currentStatusBadge.textContent = getStatusLabel(status);

       // 버튼 표시/숨김
       if (status === 'estimate') {
           btnChangeToContract.style.display = 'inline-block';
           btnChangeToConfirmed.style.display = 'none';
           statusInfoText.textContent = '전체 수정이 가능합니다.';

           // 모든 입력 필드 활성화
           enableAllInputs();

       } else if (status === 'contract') {
           btnChangeToContract.style.display = 'none';

           // 관리자인 경우에만 확정 버튼 표시
           if (isAdmin()) {
               btnChangeToConfirmed.style.display = 'inline-block';
           }

           statusInfoText.textContent = '자동 계산이 활성화되어 있습니다.';
           enableAllInputs();

       } else if (status === 'confirmed') {
           btnChangeToContract.style.display = 'none';
           btnChangeToConfirmed.style.display = 'none';
           statusInfoText.textContent = '확정된 계약은 수정할 수 없습니다. 자동 계산이 잠금되었습니다.';

           // 모든 입력 필드 비활성화
           disableAllInputs();

           // 재계산 버튼 비활성화
           document.getElementById('btnRecalculate')?.setAttribute('disabled', 'true');
       }
   }

   // 상태 변경
   async function changeStatus(groupId, newStatus) {
       const confirmMessages = {
           'contract': '계약 상태로 변경하시겠습니까?',
           'confirmed': '확정하시겠습니까? 확정 후에는 수정할 수 없습니다.'
       };

       if (!confirm(confirmMessages[newStatus])) return;

       try {
           const response = await fetch(`/api/groups/${groupId}/status`, {
               method: 'PUT',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ status: newStatus })
           });

           if (!response.ok) {
               const error = await response.json();
               throw new Error(error.detail || '상태 변경 실패');
           }

           const result = await response.json();

           showNotification(`상태가 ${getStatusLabel(newStatus)}(으)로 변경되었습니다`, 'success');

           // UI 업데이트
           updateUIByStatus(newStatus);

           // 페이지 새로고침 (선택사항)
           // location.reload();

       } catch (error) {
           showNotification(`상태 변경 실패: ${error.message}`, 'error');
       }
   }

   // 입력 필드 활성화/비활성화
   function disableAllInputs() {
       document.querySelectorAll('input, textarea, select, button').forEach(el => {
           // 읽기 전용 버튼은 제외 (예: 목록으로 돌아가기)
           if (!el.classList.contains('read-only-allowed')) {
               el.disabled = true;
           }
       });
   }

   function enableAllInputs() {
       document.querySelectorAll('input, textarea, select, button').forEach(el => {
           el.disabled = false;
       });
   }

   // 상태 라벨
   function getStatusLabel(status) {
       const labels = {
           'estimate': '견적',
           'contract': '계약',
           'confirmed': '확정'
       };
       return labels[status] || status;
   }

   // 권한 확인 (관리자 여부)
   function isAdmin() {
       // 실제 구현: JWT 토큰 또는 세션에서 role 확인
       return currentUser.role === 'admin';
   }

   // 이벤트 리스너
   document.getElementById('btnChangeToContract')?.addEventListener('click', () => {
       changeStatus(groupId, 'contract');
   });

   document.getElementById('btnChangeToConfirmed')?.addEventListener('click', () => {
       changeStatus(groupId, 'confirmed');
   });
   ```

**중요 사항:**

- **상태 전환 규칙**: 견적 → 계약 → 확정 (역방향 불가)
- **확정 상태**: 모든 수정 불가, 자동 계산 비활성화
- **권한 제어**: 확정은 관리자만 가능
- **확인 다이얼로그**: 상태 변경 전 사용자 확인

**검증 방법:**

1. 견적 → 계약 상태 변경 테스트
2. 계약 → 확정 상태 변경 테스트
3. 확정 상태에서 수정 불가 확인
4. 관리자 권한 확인

**산출물:**

- `frontend/static/js/status_control.js`
- CSS 스타일 추가

**의존성:**

- **선행 task**: T-API-05 (상태 변경 API), T-STATE-01 (상태별 제어 로직)
- **후행 task**: T-UI-08 (알림 시스템)

---

### T-UI-08 사용자 알림 시스템

**참조 문서:**

- PRD Section 12: 예외 처리 및 데이터 검증 규칙
- PRD Section 7: 자동 계산 로직 (알림 표시 요구사항)

**목표:**

성공, 경고, 오류 메시지를 사용자에게 표시하는 토스트 알림 시스템을 구현합니다.

**배경:**

사용자에게 작업 결과, 경고, 오류를 명확하게 전달하기 위해 일관된 알림 시스템이 필요합니다. 자동 계산 완료, 수동 수정 감지, 데이터 불일치 등 다양한 상황에서 알림을 표시합니다.

**작업 내용:**

1. **토스트 알림 컴포넌트**
   - 성공 메시지 (녹색)
   - 경고 메시지 (노란색)
   - 오류 메시지 (빨간색)
   - 정보 메시지 (파란색)

2. **알림 표시 시나리오**
   - 자동 계산 완료
   - 수동 수정 감지
   - 출발일 변경으로 인한 일정 재배치
   - 데이터 저장 성공/실패
   - 검증 오류

3. **알림 자동 닫힘**
   - 3~5초 후 자동으로 사라짐
   - 수동으로 닫기 버튼 제공

**실행 절차:**

1. HTML 구조:
   ```html
   <!-- 알림 컨테이너 (페이지 상단 또는 우측 상단) -->
   <div id="notificationContainer" class="notification-container">
       <!-- 동적으로 알림이 추가됨 -->
   </div>
   ```

2. CSS 스타일:
   ```css
   .notification-container {
       position: fixed;
       top: 20px;
       right: 20px;
       z-index: 9999;
       display: flex;
       flex-direction: column;
       gap: 10px;
   }

   .notification {
       min-width: 300px;
       padding: 15px 20px;
       border-radius: 4px;
       box-shadow: 0 4px 6px rgba(0,0,0,0.1);
       display: flex;
       align-items: center;
       justify-content: space-between;
       animation: slideIn 0.3s ease-out;
   }

   @keyframes slideIn {
       from {
           transform: translateX(400px);
           opacity: 0;
       }
       to {
           transform: translateX(0);
           opacity: 1;
       }
   }

   .notification.success {
       background-color: #28a745;
       color: white;
   }

   .notification.warning {
       background-color: #ffc107;
       color: #000;
   }

   .notification.error {
       background-color: #dc3545;
       color: white;
   }

   .notification.info {
       background-color: #17a2b8;
       color: white;
   }

   .notification-message {
       flex: 1;
   }

   .notification-close {
       background: none;
       border: none;
       color: inherit;
       font-size: 20px;
       cursor: pointer;
       margin-left: 10px;
   }
   ```

3. JavaScript 핵심 로직:
   ```javascript
   // 알림 표시 함수
   function showNotification(message, type = 'info', duration = 5000) {
       const container = document.getElementById('notificationContainer');

       // 알림 요소 생성
       const notification = document.createElement('div');
       notification.className = `notification ${type}`;

       // 아이콘 선택
       const icons = {
           success: '✓',
           warning: '⚠',
           error: '✕',
           info: 'ℹ'
       };

       notification.innerHTML = `
           <span class="notification-icon">${icons[type]}</span>
           <span class="notification-message">${message}</span>
           <button class="notification-close" onclick="closeNotification(this)">×</button>
       `;

       // 컨테이너에 추가
       container.appendChild(notification);

       // 자동으로 닫기
       if (duration > 0) {
           setTimeout(() => {
               closeNotification(notification);
           }, duration);
       }

       return notification;
   }

   // 알림 닫기
   function closeNotification(element) {
       const notification = element.classList ? element : element.parentElement;

       notification.style.animation = 'slideOut 0.3s ease-out';

       setTimeout(() => {
           notification.remove();
       }, 300);
   }

   // 슬라이드 아웃 애니메이션 추가
   const style = document.createElement('style');
   style.textContent = `
       @keyframes slideOut {
           from {
               transform: translateX(0);
               opacity: 1;
           }
           to {
               transform: translateX(400px);
               opacity: 0;
           }
       }
   `;
   document.head.appendChild(style);

   // 사용 예시

   // 성공 알림
   function onSaveSuccess() {
       showNotification('저장되었습니다', 'success');
   }

   // 경고 알림
   function onManualEdit() {
       showNotification('자동 계산값을 수동으로 수정했습니다', 'warning');
   }

   // 오류 알림
   function onSaveError(error) {
       showNotification(`저장 실패: ${error.message}`, 'error', 10000);
   }

   // 자동 계산 완료 알림
   function onRecalculated(result) {
       const changedFields = result.recalculated_fields.join(', ');
       showNotification(`자동 계산 완료: ${changedFields}`, 'info');
   }

   // 일정 재배치 알림
   function onItineraryDateChanged(count, manualCount) {
       let message = `출발일 변경으로 인해 ${count}개의 일정 날짜가 변경되었습니다`;
       if (manualCount > 0) {
           message += ` (수동 수정 ${manualCount}개 포함)`;
       }
       showNotification(message, 'warning', 7000);
   }

   // 검증 오류 알림
   function onValidationError(errors) {
       errors.forEach(error => {
           showNotification(error, 'error');
       });
   }

   // 다중 알림 표시 (여러 경고를 한 번에)
   function showMultipleNotifications(messages, type = 'warning') {
       messages.forEach((message, index) => {
           setTimeout(() => {
               showNotification(message, type);
           }, index * 200); // 200ms 간격으로 표시
       });
   }
   ```

4. 전역적으로 사용 가능하도록 설정:
   ```javascript
   // 전역 객체로 export
   window.Notification = {
       success: (msg, duration) => showNotification(msg, 'success', duration),
       warning: (msg, duration) => showNotification(msg, 'warning', duration),
       error: (msg, duration) => showNotification(msg, 'error', duration),
       info: (msg, duration) => showNotification(msg, 'info', duration)
   };

   // 사용 예시
   // Notification.success('저장되었습니다');
   // Notification.error('오류가 발생했습니다');
   ```

**중요 사항:**

- **자동 닫힘**: 기본 5초, 오류는 10초
- **위치**: 우측 상단 고정
- **애니메이션**: 슬라이드 인/아웃
- **다중 알림**: 여러 알림이 동시에 표시 가능
- **접근성**: 스크린 리더 지원 (선택사항)

**검증 방법:**

1. 각 타입별 알림 표시 테스트
2. 자동 닫힘 확인
3. 수동 닫기 버튼 확인
4. 다중 알림 표시 확인

**산출물:**

- `frontend/static/js/notification.js`
- CSS 스타일 추가

**의존성:**

- **선행 task**: 없음 (독립적인 컴포넌트)
- **후행 task**: 모든 UI task에서 사용

---

## Phase 4 완료

Phase 4의 모든 프론트엔드 UI task (T-UI-01 ~ T-UI-08, 8개)가 완료되었습니다.

**완료된 task:**
1. T-UI-01: 단체 선택 화면
2. T-UI-02: 단체 입력 화면
3. T-UI-03: 일정 관리 화면
4. T-UI-04: 취소 규정 관리 화면
5. T-UI-05: 포함/불포함 항목 관리 화면
6. T-UI-06: 문서 출력 버튼 영역
7. T-UI-07: 상태 변경 UI
8. T-UI-08: 사용자 알림 시스템

---

# Phase 5: HTML 템플릿 (T-TPL-01 ~ T-TPL-05)

이 Phase에서는 견적서, 일정표, 계약서, 통합 PDF를 위한 HTML 템플릿과 헬퍼 함수를 작성합니다.

**주요 목표:**
1. Jinja2 템플릿 엔진을 사용한 HTML 문서 템플릿 작성
2. 한글 출력 및 인쇄 최적화 스타일 적용
3. A4 용지 크기에 맞는 레이아웃 설계
4. 템플릿 헬퍼 함수 구현 (날짜/금액 포맷)
5. WeasyPrint PDF 변환을 위한 CSS 스타일 작성

---

## T-TPL-01 견적서 템플릿 작성

**참조 문서:**
- PRD Section 9: 문서 출력 요구사항 (견적서, 계약서, 일정표, 통합 PDF)
- PRD Section 9.2: 기술 방식 (HTML + Template Engine, HTML → PDF 변환)
- TRD Section 6.1: HTML 템플릿 구조 (파일 위치 및 파일명)
- TRD Section 6.2: 템플릿 엔진 (Jinja2) 사용 방법 및 헬퍼 함수
- TRD Section 6.3: 변수 매핑 원칙 (DB 컬럼명 = HTML 변수명, 날짜/금액 포맷)
- TRD Section 6.5: PDF 변환 설정 (WeasyPrint, 한글 폰트, CSS 스타일)

**목표:**

여행 견적서를 출력하기 위한 HTML 템플릿을 Jinja2 템플릿 엔진을 사용하여 작성합니다. 이 템플릿은 단체 기본 정보, 요금 정보, 포함/불포함 항목, 취소 규정을 포함하며, A4 용지 크기에 최적화된 레이아웃으로 인쇄 및 PDF 변환에 적합하도록 설계됩니다.

**배경:**

PRD Section 9에 따르면, 여행사 인트라넷 시스템은 견적서, 계약서, 일정표, 통합 PDF 4가지 문서를 출력할 수 있어야 합니다. 이 중 견적서는 고객에게 여행 상품의 요금과 조건을 제안하는 첫 번째 문서로, 단체 기본 정보, 요금 정보, 포함/불포함 항목, 취소 규정을 포함해야 합니다.

TRD Section 6.2에서 정의된 Jinja2 템플릿 엔진을 사용하여 HTML 템플릿을 작성하고, TRD Section 6.5에서 정의된 WeasyPrint 설정을 고려하여 한글 폰트와 A4 용지 크기에 최적화된 스타일을 적용합니다.

**작업 내용:**

1. **견적서 HTML 템플릿 파일 생성**

   `templates/documents/estimate.html` 파일을 생성하세요. 이 파일은 Jinja2 템플릿 문법을 사용하여 견적서를 동적으로 생성합니다.

   **템플릿 구조:**

   - **헤더 섹션**: 문서 제목 "여행 견적서"
   - **단체 기본 정보 섹션**:
     - 단체명 (group.name)
     - 출발일 (group.start_date) - 형식: YYYY년 MM월 DD일
     - 도착일 (group.end_date) - 형식: YYYY년 MM월 DD일
     - 여행 기간 (group.nights박 group.days일)
     - 인원수 (group.pax명)
   - **요금 정보 섹션**:
     - 1인당 요금 (group.price_per_pax) - 형식: 1,000,000원
     - 총액 (group.total_price) - 형식: 1,000,000원
     - 계약금 (group.deposit) - 형식: 1,000,000원
     - 잔액 (group.balance) - 형식: 1,000,000원
     - 잔액 완납일 (group.balance_due_date) - 형식: YYYY년 MM월 DD일
   - **포함 항목 섹션**:
     - group.includes에서 item_type='include'인 항목만 필터링
     - display_order 순서대로 표시
     - 각 항목의 description 출력
   - **불포함 항목 섹션**:
     - group.includes에서 item_type='exclude'인 항목만 필터링
     - display_order 순서대로 표시
     - 각 항목의 description 출력
   - **취소 규정 섹션**:
     - group.cancel_rules를 days_before 기준 내림차순으로 정렬
     - 각 규정별로 날짜 (cancel_date)와 위약금 (penalty_rate%) 표시
   - **푸터 섹션**:
     - 발행일시 (generated_at) - 형식: YYYY년 MM월 DD일
     - 여행사 정보 (회사명, 주소, 전화번호)

2. **CSS 스타일 작성**

   `templates/documents/estimate.html` 내부에 `<style>` 태그를 사용하여 인쇄 및 PDF 변환에 최적화된 스타일을 작성하세요.

   **스타일 요구사항:**

   - **페이지 설정**:
     ```css
     @page {
         size: A4;
         margin: 2cm;
     }
     ```
   - **한글 폰트 설정** (TRD Section 6.5 참조):
     ```css
     body {
         font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif;
         font-size: 12pt;
         line-height: 1.6;
         color: #333;
     }
     ```
   - **테이블 스타일**:
     - border-collapse: collapse
     - 테두리: 1px solid #ddd
     - th: 배경색 #f2f2f2, 굵은 글씨
     - td: padding 8px, 텍스트 정렬 left
   - **제목 스타일**:
     - h1: 중앙 정렬, font-size 24pt, margin-bottom 20px
     - h2: font-size 16pt, margin-top 20px, margin-bottom 10px
   - **인쇄 최적화**:
     - 불필요한 배경색 제거
     - 페이지 브레이크 방지 (섹션 내에서)
     - 테이블 행 페이지 브레이크 방지

3. **Jinja2 변수 및 필터 사용**

   템플릿 내에서 다음과 같은 Jinja2 문법을 사용하세요:

   **변수 출력:**
   ```jinja2
   <h1>여행 견적서</h1>
   <h2>{{ group.name }}</h2>
   ```

   **날짜 포맷 (헬퍼 함수 사용):**
   ```jinja2
   <p>출발일: {{ format_date(group.start_date) }}</p>
   <p>도착일: {{ format_date(group.end_date) }}</p>
   ```

   **금액 포맷 (헬퍼 함수 사용):**
   ```jinja2
   <p>1인당 요금: {{ format_currency(group.price_per_pax) }}</p>
   <p>총액: {{ format_currency(group.total_price) }}</p>
   ```

   **조건문 (포함 항목이 있을 때만 섹션 표시):**
   ```jinja2
   {% if includes %}
   <h2>포함 항목</h2>
   <ul>
   {% for item in includes %}
       <li>{{ item.description }}</li>
   {% endfor %}
   </ul>
   {% endif %}
   ```

   **반복문 (취소 규정 테이블):**
   ```jinja2
   <table>
       <thead>
           <tr>
               <th>취소 날짜</th>
               <th>위약금</th>
           </tr>
       </thead>
       <tbody>
       {% for rule in cancel_rules %}
           <tr>
               <td>{{ format_date(rule.cancel_date) }} (출발 {{ rule.days_before }}일 전)</td>
               <td>{{ rule.penalty_rate }}%</td>
           </tr>
       {% endfor %}
       </tbody>
   </table>
   ```

**실행 절차:**

1. `templates/documents/` 디렉토리를 생성하세요:
   ```bash
   mkdir -p templates/documents
   ```

2. `templates/documents/estimate.html` 파일을 생성하세요

3. HTML 기본 구조를 작성하세요:
   ```html
   <!DOCTYPE html>
   <html lang="ko">
   <head>
       <meta charset="UTF-8">
       <title>여행 견적서 - {{ group.name }}</title>
       <style>
           /* CSS 스타일 여기에 작성 */
       </style>
   </head>
   <body>
       <!-- 템플릿 내용 여기에 작성 -->
   </body>
   </html>
   ```

4. CSS 스타일을 `<style>` 태그 내부에 작성하세요 (TRD Section 6.5 참조)

5. 견적서 내용을 섹션별로 작성하세요:
   ```html
   <body>
       <h1>여행 견적서</h1>

       <!-- 단체 기본 정보 -->
       <section class="group-info">
           <h2>{{ group.name }}</h2>
           <table>
               <tr>
                   <th>출발일</th>
                   <td>{{ format_date(group.start_date) }}</td>
               </tr>
               <tr>
                   <th>도착일</th>
                   <td>{{ format_date(group.end_date) }}</td>
               </tr>
               <tr>
                   <th>여행 기간</th>
                   <td>{{ group.nights }}박 {{ group.days }}일</td>
               </tr>
               <tr>
                   <th>인원수</th>
                   <td>{{ group.pax }}명</td>
               </tr>
           </table>
       </section>

       <!-- 요금 정보 -->
       <section class="price-info">
           <h2>요금 정보</h2>
           <table>
               <tr>
                   <th>1인당 요금</th>
                   <td>{{ format_currency(group.price_per_pax) }}</td>
               </tr>
               <tr>
                   <th>총액</th>
                   <td>{{ format_currency(group.total_price) }}</td>
               </tr>
               <tr>
                   <th>계약금</th>
                   <td>{{ format_currency(group.deposit) }}</td>
               </tr>
               <tr>
                   <th>잔액</th>
                   <td>{{ format_currency(group.balance) }}</td>
               </tr>
               <tr>
                   <th>잔액 완납일</th>
                   <td>{{ format_date(group.balance_due_date) }}</td>
               </tr>
           </table>
       </section>

       <!-- 포함 항목 -->
       {% set includes_items = includes | selectattr('item_type', 'equalto', 'include') | sort(attribute='display_order') | list %}
       {% if includes_items %}
       <section class="includes">
           <h2>포함 항목</h2>
           <ul>
           {% for item in includes_items %}
               <li>{{ item.description }}</li>
           {% endfor %}
           </ul>
       </section>
       {% endif %}

       <!-- 불포함 항목 -->
       {% set excludes_items = includes | selectattr('item_type', 'equalto', 'exclude') | sort(attribute='display_order') | list %}
       {% if excludes_items %}
       <section class="excludes">
           <h2>불포함 항목</h2>
           <ul>
           {% for item in excludes_items %}
               <li>{{ item.description }}</li>
           {% endfor %}
           </ul>
       </section>
       {% endif %}

       <!-- 취소 규정 -->
       {% if cancel_rules %}
       <section class="cancel-rules">
           <h2>취소 규정</h2>
           <table>
               <thead>
                   <tr>
                       <th>취소 날짜</th>
                       <th>위약금</th>
                   </tr>
               </thead>
               <tbody>
               {% for rule in cancel_rules | sort(attribute='days_before', reverse=true) %}
                   <tr>
                       <td>{{ format_date(rule.cancel_date) }} (출발 {{ rule.days_before }}일 전)</td>
                       <td>{{ rule.penalty_rate }}%</td>
                   </tr>
               {% endfor %}
               </tbody>
           </table>
       </section>
       {% endif %}

       <!-- 푸터 -->
       <footer>
           <p>발행일: {{ generated_at }}</p>
           <p>[여행사 정보]</p>
       </footer>
   </body>
   ```

6. 템플릿 렌더링 테스트 코드 작성 (`backend/services/template_service.py`):
   ```python
   from jinja2 import Environment, FileSystemLoader

   def test_estimate_template():
       env = Environment(loader=FileSystemLoader('templates/documents'))
       template = env.get_template('estimate.html')

       # 테스트 데이터
       test_group = {
           'name': '하노이 골프단 1기',
           'start_date': date(2025, 1, 15),
           'end_date': date(2025, 1, 20),
           'nights': 5,
           'days': 6,
           'pax': 20,
           'price_per_pax': 1500000,
           'total_price': 30000000,
           'deposit': 10000000,
           'balance': 20000000,
           'balance_due_date': date(2025, 1, 8)
       }

       html_output = template.render(
           group=test_group,
           includes=[],
           cancel_rules=[],
           generated_at='2025년 1월 1일',
           format_date=lambda d: d.strftime('%Y년 %m월 %d일'),
           format_currency=lambda a: f"{a:,}원"
       )

       print(html_output)
   ```

7. 브라우저에서 렌더링 결과 확인:
   - 생성된 HTML을 브라우저에서 열어 레이아웃 확인
   - 인쇄 미리보기로 A4 용지 크기 확인
   - 모든 섹션이 올바르게 표시되는지 확인

**중요 사항:**

- **변수 매핑**: TRD Section 6.3에 따라 DB 컬럼명을 그대로 사용하세요 (group.start_date, group.total_price 등)
- **한글 폰트**: WeasyPrint PDF 변환 시 한글이 깨지지 않도록 Noto Sans KR 또는 Malgun Gothic 폰트를 사용하세요
- **헬퍼 함수**: format_date(), format_currency() 함수는 T-TPL-05에서 구현하며, 템플릿에서는 함수를 호출하기만 하세요
- **자동 계산 결과만 출력**: manual 플래그는 템플릿에 표시하지 마세요. 최종 계산 결과만 출력하세요
- **NULL 값 처리**: Jinja2의 기본 필터를 사용하여 NULL 값을 안전하게 처리하세요 (`{{ group.balance_due_date | default('미정') }}`)

**검증 방법:**

1. 템플릿 렌더링 테스트:
   ```bash
   python backend/services/template_service.py
   ```

2. 브라우저 렌더링 확인:
   - 생성된 HTML 파일을 Chrome/Edge에서 열기
   - 인쇄 미리보기 (Ctrl+P) 실행
   - A4 용지 크기에 맞는지 확인
   - 페이지 브레이크가 올바르게 적용되는지 확인

3. 실제 데이터 테스트:
   - 데이터베이스에서 실제 단체 데이터 조회
   - 템플릿 렌더링 후 HTML 출력
   - 모든 필드가 올바르게 표시되는지 확인

4. 누락 데이터 처리 확인:
   - 포함 항목이 없는 경우 섹션이 표시되지 않는지 확인
   - 취소 규정이 없는 경우 섹션이 표시되지 않는지 확인
   - NULL 값이 "미정" 또는 빈 문자열로 표시되는지 확인

**산출물:**

- `templates/documents/estimate.html`: 견적서 템플릿 파일
- `backend/services/template_service.py`: 템플릿 렌더링 테스트 코드 (선택사항)

**의존성:**

- **선행 task**: 없음 (독립적으로 작성 가능)
- **후행 task**:
  - T-TPL-05 (템플릿 헬퍼 함수 - format_date, format_currency 구현 필요)
  - T-PDF-01 (PDF 변환 모듈 - 이 템플릿을 PDF로 변환)

---
## T-TPL-02 일정표 템플릿 작성

**참조 문서:**
- PRD Section 9: 문서 출력 요구사항 (일정표)
- PRD Section 7.5: 일정 날짜 자동 재배치 규칙
- TRD Section 6.1: HTML 템플릿 구조 (itinerary.html)
- TRD Section 6.2: 템플릿 엔진 (Jinja2) 사용
- TRD Section 6.3: 변수 매핑 원칙

**목표:**

여행 일정표를 출력하기 위한 HTML 템플릿을 작성합니다. 일정표는 일차별로 날짜, 지역, 교통편, 시간, 일정 내용, 식사, 숙박 정보를 포함하는 테이블 형식으로 표시되며, day_no 순서대로 정렬됩니다.

**배경:**

일정표는 여행 일정을 고객에게 상세히 안내하는 문서입니다. PRD Section 7.5에서 정의된 일정 날짜 자동 재배치 로직에 따라 계산된 itinerary_date를 표시하며, 각 일차별로 지역, 교통편, 시간, 일정 내용, 식사, 숙박 정보를 포함합니다.

일정표는 day_no 순서대로 정렬되어 표시되며, 일정 삭제 시 day_no 재정렬을 하지 않으므로 빈 번호가 있을 수 있습니다. 이 경우 실제 존재하는 일정만 표시합니다.

**작업 내용:**

1. **일정표 HTML 템플릿 파일 생성**

   `templates/documents/itinerary.html` 파일을 생성하세요.

   **템플릿 구조:**

   - **헤더 섹션**: 문서 제목 "여행 일정표"
   - **단체 기본 정보 섹션**:
     - 단체명 (group.name)
     - 여행 기간 (group.start_date ~ group.end_date, group.nights박 group.days일)
     - 인원수 (group.pax명)
   - **일정 테이블 섹션**:
     - 컬럼: 일차, 날짜, 지역, 교통편, 시간, 일정, 식사, 숙박
     - itineraries를 day_no 순서대로 정렬
     - 각 일정의 모든 정보 표시
   - **푸터 섹션**:
     - 발행일시 (generated_at)
     - 여행사 정보

2. **CSS 스타일 작성**

   일정표는 테이블이 중심이므로 테이블 스타일에 집중하세요.

   **스타일 요구사항:**

   - **페이지 설정**: A4 landscape (가로 방향), margin 1.5cm
   - **테이블 스타일**:
     - 가로 폭 100%
     - 테두리: 1px solid #333
     - 헤더 배경색: #4CAF50 (녹색)
     - 헤더 텍스트: 흰색, 굵은 글씨
     - 셀 padding: 10px
     - 텍스트 정렬: 중앙 (일차, 날짜), 좌측 (나머지)
   - **페이지 브레이크 처리**:
     - 테이블 행이 페이지 경계에서 잘리지 않도록 설정
     ```css
     tr {
         page-break-inside: avoid;
     }
     ```

3. **실행 절차:**

   - `templates/documents/itinerary.html` 파일 생성
   - A4 landscape 레이아웃 적용
   - day_no 기준 정렬된 일정 테이블 작성
   - 빈 일정 처리 (일정이 없는 경우 메시지 표시)

**중요 사항:**

- **가로 방향 레이아웃**: 일정표는 컬럼이 많으므로 A4 landscape를 사용하세요
- **day_no 정렬**: Jinja2의 sort 필터 사용 (`itineraries | sort(attribute='day_no')`)
- **빈 값 처리**: default 필터 사용하여 NULL 값을 '-'로 표시
- **페이지 브레이크**: `page-break-inside: avoid` 설정

**산출물:**

- `templates/documents/itinerary.html`: 일정표 템플릿 파일

**의존성:**

- **선행 task**: 없음
- **후행 task**: T-TPL-05 (헬퍼 함수), T-PDF-01 (PDF 변환)

---

## T-TPL-03 계약서 템플릿 작성

**참조 문서:**
- PRD Section 9: 문서 출력 요구사항 (계약서)
- PRD Section 10: 상태별 제어 규칙 (계약 상태)
- TRD Section 6.1: HTML 템플릿 구조 (contract.html)
- TRD Section 6.2: 템플릿 엔진 (Jinja2) 사용

**목표:**

여행 계약서를 출력하기 위한 HTML 템플릿을 작성합니다. 계약서는 견적서와 유사하지만 추가로 계약 조건 및 약관을 포함하며, 법적 효력을 갖는 공식 문서입니다.

**배경:**

계약서는 여행사와 고객 간의 법적 계약을 나타내는 문서로, 견적서의 모든 내용에 더해 계약 조건 및 약관을 포함해야 합니다. PRD Section 10에서 정의된 상태별 제어 규칙에 따라, '계약' 상태 이상의 단체만 계약서를 출력할 수 있습니다.

**작업 내용:**

1. **계약서 HTML 템플릿 파일 생성**

   `templates/documents/contract.html` 파일을 생성하세요.

   **템플릿 구조:**

   - **헤더 섹션**: 문서 제목 "여행 계약서"
   - **계약 정보 섹션**: 계약 번호, 계약 날짜
   - **단체 기본 정보 섹션** (견적서와 동일)
   - **요금 정보 섹션** (견적서와 동일)
   - **포함/불포함 항목 섹션** (견적서와 동일)
   - **취소 규정 섹션** (견적서와 동일)
   - **계약 조건 및 약관 섹션** (신규):
     - 표준 여행 약관
     - 취소 및 환불 정책
     - 책임 및 면책 조항
   - **서명 섹션**: 여행사 서명란, 고객 서명란
   - **푸터 섹션**

2. **CSS 스타일 작성**

   **추가 스타일:**

   - **서명 섹션 스타일**: 여행사와 고객 서명란을 좌우로 배치
   - **약관 섹션 스타일**: 배경색 #f9f9f9, 테두리, 작은 폰트 크기

3. **실행 절차:**

   - `templates/documents/contract.html` 파일 생성
   - estimate.html을 기반으로 작성
   - 계약 조건 및 약관 섹션 추가
   - 서명 섹션 추가

**중요 사항:**

- **견적서와의 차이**: 계약서는 견적서 + 약관 + 서명란
- **법적 효력**: 정확한 정보 표시 필수
- **서명란 공간**: 수기 서명을 위한 충분한 공간 확보

**산출물:**

- `templates/documents/contract.html`: 계약서 템플릿 파일

**의존성:**

- **선행 task**: T-TPL-01 (견적서 템플릿 기반)
- **후행 task**: T-TPL-04 (통합 템플릿에서 사용), T-TPL-05, T-PDF-01

---

## T-TPL-04 통합 템플릿 작성

**참조 문서:**
- PRD Section 9: 문서 출력 요구사항 (통합 PDF)
- TRD Section 6.1: HTML 템플릿 구조 (bundle.html)
- TRD Section 6.6: 통합 PDF 생성 로직

**목표:**

견적서, 계약서, 일정표 3개 문서를 하나의 PDF로 결합하는 통합 템플릿을 작성합니다. 각 문서는 별도 페이지로 분리되며, 페이지 번호가 연속적으로 표시됩니다.

**배경:**

고객에게 전달할 때 견적서, 계약서, 일정표를 개별 파일로 제공하는 것보다 하나의 통합 PDF로 제공하는 것이 편리합니다. PRD Section 9에서 정의된 통합 PDF 요구사항에 따라, 3개 문서를 페이지 브레이크로 구분하여 하나의 PDF로 생성합니다.

**작업 내용:**

1. **통합 템플릿 HTML 파일 생성**

   `templates/documents/bundle.html` 파일을 생성하세요.

   **템플릿 구조:**

   - **표지 페이지** (선택사항): 단체명, 문서 제목, 발행일
   - **견적서 페이지**: estimate.html 내용 포함
   - **페이지 브레이크**
   - **계약서 페이지**: contract.html 내용 포함
   - **페이지 브레이크**
   - **일정표 페이지**: itinerary.html 내용 포함

2. **페이지 브레이크 CSS 작성**

   ```css
   .page-break {
       page-break-after: always;
   }

   .page-break:last-of-type {
       page-break-after: auto;
   }
   ```

3. **페이지 번호 설정**

   ```css
   @page {
       @bottom-center {
           content: "Page " counter(page) " of " counter(pages);
       }
   }
   ```

4. **실행 절차:**

   - `templates/documents/bundle.html` 파일 생성
   - 3개 문서를 페이지 브레이크로 구분하여 결합
   - 페이지 번호 설정

**중요 사항:**

- **Include 주의**: 중복된 HTML 태그 방지
- **스타일 통합**: 모든 스타일을 bundle.html에 통합
- **페이지 브레이크**: 마지막 섹션에는 적용하지 않음

**산출물:**

- `templates/documents/bundle.html`: 통합 템플릿 파일

**의존성:**

- **선행 task**: T-TPL-01, T-TPL-02, T-TPL-03
- **후행 task**: T-TPL-05, T-PDF-01, T-PDF-04

---

## T-TPL-05 템플릿 헬퍼 함수

**참조 문서:**
- TRD Section 6.2: 템플릿 엔진 (Jinja2) 사용 및 헬퍼 함수 등록
- TRD Section 6.3: 변수 매핑 원칙 (날짜 형식, 금액 형식)
- PRD Section 9: 문서 출력 요구사항

**목표:**

Jinja2 템플릿에서 사용할 헬퍼 함수를 구현합니다. 날짜를 "YYYY년 MM월 DD일" 형식으로 포맷하는 함수와 금액을 "1,000,000원" 형식으로 포맷하는 함수를 작성하고, Jinja2 템플릿 환경에 등록합니다.

**배경:**

TRD Section 6.3에서 정의된 날짜 형식 "YYYY년 MM월 DD일"과 금액 형식 "1,000,000원"을 템플릿에서 일관되게 사용하기 위해 헬퍼 함수가 필요합니다.

**작업 내용:**

1. **템플릿 서비스 파일 생성**

   `backend/services/template_service.py` 파일을 생성하세요.

2. **날짜 포맷 헬퍼 함수 구현**

   ```python
   from datetime import date
   from typing import Optional

   def format_date(date_value: Optional[date]) -> str:
       """날짜를 'YYYY년 MM월 DD일' 형식으로 포맷"""
       if date_value is None:
           return ""

       try:
           return date_value.strftime('%Y년 %m월 %d일')
       except (AttributeError, ValueError):
           return str(date_value)
   ```

3. **금액 포맷 헬퍼 함수 구현**

   ```python
   from decimal import Decimal
   from typing import Union

   def format_currency(amount: Optional[Union[int, float, Decimal]]) -> str:
       """금액을 '1,000,000원' 형식으로 포맷"""
       if amount is None:
           return ""

       try:
           if isinstance(amount, (float, Decimal)):
               if amount == int(amount):
                   return f"{int(amount):,}원"
               else:
                   return f"{amount:,.2f}원"
           else:
               return f"{int(amount):,}원"
       except (ValueError, TypeError):
           return str(amount)
   ```

4. **Jinja2 템플릿 환경 설정**

   ```python
   from jinja2 import Environment, FileSystemLoader

   template_env = Environment(
       loader=FileSystemLoader('templates/documents'),
       autoescape=True
   )

   template_env.globals['format_date'] = format_date
   template_env.globals['format_currency'] = format_currency
   ```

5. **템플릿 렌더링 함수 구현**

   ```python
   def render_template(template_name: str, group: Group) -> str:
       template = template_env.get_template(template_name)

       context = {
           'group': group,
           'itineraries': sorted(group.itineraries, key=lambda x: x.day_no),
           'cancel_rules': sorted(group.cancel_rules, key=lambda x: x.days_before, reverse=True),
           'includes': sorted(group.includes, key=lambda x: x.display_order),
           'generated_at': format_date(datetime.now().date())
       }

       return template.render(**context)
   ```

6. **단위 테스트 작성**

   `tests/test_template_service.py`에 헬퍼 함수 테스트 작성

**중요 사항:**

- **None 값 처리**: 빈 문자열 반환
- **타입 안정성**: 잘못된 타입은 문자열로 변환
- **Decimal 타입 지원**: 금액은 Decimal 타입 지원
- **전역 등록**: template_env.globals에 등록

**검증 방법:**

1. 단위 테스트 실행: `pytest tests/test_template_service.py -v`
2. 템플릿 렌더링 테스트
3. 날짜/금액 포맷 확인

**산출물:**

- `backend/services/template_service.py`: 템플릿 서비스 및 헬퍼 함수
- `tests/test_template_service.py`: 단위 테스트

**의존성:**

- **선행 task**: 없음
- **후행 task**: T-TPL-01~04 (모든 템플릿에서 사용), T-PDF-01, T-PDF-04

---

## Phase 5 완료

Phase 5의 모든 HTML 템플릿 task (T-TPL-01 ~ T-TPL-05, 5개)가 완료되었습니다.

**완료된 task:**
1. T-TPL-01: 견적서 템플릿 작성
2. T-TPL-02: 일정표 템플릿 작성
3. T-TPL-03: 계약서 템플릿 작성
4. T-TPL-04: 통합 템플릿 작성
5. T-TPL-05: 템플릿 헬퍼 함수

**주요 산출물:**
- `templates/documents/estimate.html`: 견적서 템플릿
- `templates/documents/itinerary.html`: 일정표 템플릿
- `templates/documents/contract.html`: 계약서 템플릿
- `templates/documents/bundle.html`: 통합 템플릿
- `backend/services/template_service.py`: 템플릿 서비스 및 헬퍼 함수

**다음 단계:**
Phase 6: PDF 출력 task 개선 (T-PDF-01 ~ T-PDF-05, 5개)

---

# Phase 6: PDF 출력 (T-PDF-01 ~ T-PDF-05)

이 Phase에서는 HTML 템플릿을 PDF로 변환하는 모듈과 파일 관리 시스템을 구현합니다.

**주요 목표:**
1. WeasyPrint를 사용한 HTML to PDF 변환 모듈 구현
2. 파일명 생성 및 버전 관리 로직 구현
3. 문서 이력 기록 시스템 구현
4. PDF 생성 전체 흐름 통합
5. PDF 다운로드 API 구현

---

## T-PDF-01 PDF 변환 모듈 구현

**참조 문서:**
- PRD Section 9: 문서 출력 요구사항 (HTML → PDF 변환)
- PRD Section 11: 비기능 요구사항 (성능, 안정성)
- TRD Section 6.5: PDF 변환 설정 (WeasyPrint, 한글 폰트, CSS 스타일)
- TRD Section 9.3: PDF 생성 실패 처리 (재시도 로직, 한글 폰트 처리)

**목표:**

HTML 템플릿을 PDF 파일로 변환하는 모듈을 WeasyPrint 라이브러리를 사용하여 구현합니다. 한글 폰트를 지원하며, A4 용지 크기와 적절한 마진, 스타일을 적용하여 인쇄 품질의 PDF를 생성합니다.

**배경:**

PRD Section 9에서 정의된 문서 출력 요구사항에 따라, 견적서, 계약서, 일정표, 통합 PDF를 생성하기 위해 HTML을 PDF로 변환하는 기능이 필요합니다. Python 생태계에서 가장 널리 사용되는 WeasyPrint 라이브러리를 사용하여 한글을 지원하는 고품질 PDF를 생성합니다.

TRD Section 6.5에서 정의된 WeasyPrint 설정을 기반으로, Noto Sans KR 폰트를 사용하여 한글 깨짐 문제를 방지하고, CSS를 통해 페이지 크기, 마진, 테이블 스타일 등을 설정합니다.

**작업 내용:**

1. **WeasyPrint 라이브러리 설치**

   프로젝트에 WeasyPrint와 관련 의존성을 설치하세요.

   ```bash
   pip install weasyprint
   ```

   **의존성 패키지:**
   - `weasyprint`: HTML to PDF 변환 라이브러리
   - `cffi`: C 라이브러리 인터페이스 (WeasyPrint 의존성)
   - `Pillow`: 이미지 처리 (선택사항)

2. **한글 폰트 파일 준비**

   Noto Sans KR 폰트 파일을 다운로드하여 프로젝트에 추가하세요.

   **폰트 파일 위치:**
   - `static/fonts/NotoSansKR-Regular.woff2`: 일반 폰트
   - `static/fonts/NotoSansKR-Bold.woff2`: 굵은 폰트

   **폰트 다운로드 방법:**
   1. Google Fonts에서 Noto Sans KR 다운로드: https://fonts.google.com/noto/specimen/Noto+Sans+KR
   2. WOFF2 형식으로 변환 (온라인 변환 도구 사용 가능)
   3. `static/fonts/` 디렉토리에 저장

3. **PDF 변환 모듈 파일 생성**

   `backend/services/pdf_service.py` 파일을 생성하세요.

4. **HTML to PDF 변환 함수 구현**

   **함수 시그니처:**
   ```python
   def convert_html_to_pdf(
       html_content: str,
       output_path: str,
       css_string: Optional[str] = None
   ) -> str:
       """
       HTML 문자열을 PDF 파일로 변환

       Args:
           html_content: HTML 문자열
           output_path: PDF 파일 저장 경로 (절대 경로)
           css_string: 추가 CSS 스타일 (선택사항)

       Returns:
           생성된 PDF 파일 경로

       Raises:
           PDFGenerationError: PDF 생성 실패 시
       """
   ```

   **구현:**
   ```python
   import os
   from weasyprint import HTML, CSS
   from typing import Optional
   import logging

   logger = logging.getLogger(__name__)

   class PDFGenerationError(Exception):
       """PDF 생성 오류"""
       pass

   def convert_html_to_pdf(
       html_content: str,
       output_path: str,
       css_string: Optional[str] = None
   ) -> str:
       """HTML을 PDF로 변환"""

       try:
           # 출력 디렉토리 생성
           output_dir = os.path.dirname(output_path)
           if output_dir and not os.path.exists(output_dir):
               os.makedirs(output_dir, exist_ok=True)
               logger.info(f"Created output directory: {output_dir}")

           # HTML 객체 생성
           html = HTML(string=html_content, base_url=os.getcwd())

           # CSS 스타일 준비
           stylesheets = []
           if css_string:
               stylesheets.append(CSS(string=css_string))

           # 기본 CSS 스타일 (한글 폰트 포함)
           default_css = get_default_css()
           stylesheets.append(CSS(string=default_css))

           # PDF 생성
           logger.info(f"Generating PDF: {output_path}")
           html.write_pdf(output_path, stylesheets=stylesheets)
           logger.info(f"PDF generated successfully: {output_path}")

           # 파일 크기 확인
           file_size = os.path.getsize(output_path)
           logger.info(f"PDF file size: {file_size} bytes")

           return output_path

       except Exception as e:
           logger.error(f"PDF generation failed: {str(e)}", exc_info=True)
           raise PDFGenerationError(f"PDF 생성 중 오류가 발생했습니다: {str(e)}")
   ```

5. **기본 CSS 스타일 함수 구현**

   ```python
   def get_default_css() -> str:
       """기본 CSS 스타일 반환 (한글 폰트 포함)"""

       return """
       @page {
           size: A4;
           margin: 2cm;
       }

       @font-face {
           font-family: 'Noto Sans KR';
           src: url('static/fonts/NotoSansKR-Regular.woff2') format('woff2');
           font-weight: normal;
           font-style: normal;
       }

       @font-face {
           font-family: 'Noto Sans KR';
           src: url('static/fonts/NotoSansKR-Bold.woff2') format('woff2');
           font-weight: bold;
           font-style: normal;
       }

       body {
           font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif;
           font-size: 12pt;
           line-height: 1.6;
           color: #333;
       }

       h1, h2, h3 {
           font-weight: bold;
       }

       table {
           width: 100%;
           border-collapse: collapse;
           margin: 10px 0;
       }

       table th, table td {
           border: 1px solid #ddd;
           padding: 8px;
           text-align: left;
       }

       table th {
           background-color: #f2f2f2;
           font-weight: bold;
       }

       .page-break {
           page-break-after: always;
       }

       tr {
           page-break-inside: avoid;
       }
       """
   ```

6. **재시도 로직 추가 (선택사항)**

   TRD Section 9.3에서 정의된 재시도 로직을 추가하세요.

   ```python
   from tenacity import retry, stop_after_attempt, wait_exponential

   @retry(
       stop=stop_after_attempt(3),
       wait=wait_exponential(multiplier=1, min=2, max=10)
   )
   def convert_html_to_pdf_with_retry(
       html_content: str,
       output_path: str,
       css_string: Optional[str] = None
   ) -> str:
       """재시도 로직이 포함된 PDF 변환"""
       return convert_html_to_pdf(html_content, output_path, css_string)
   ```

**실행 절차:**

1. WeasyPrint 설치:
   ```bash
   pip install weasyprint tenacity
   ```

2. 폰트 디렉토리 생성 및 폰트 파일 추가:
   ```bash
   mkdir -p static/fonts
   # Noto Sans KR 폰트 파일을 static/fonts/에 복사
   ```

3. `backend/services/pdf_service.py` 파일 생성

4. PDF 변환 함수 구현 (위의 코드 참조)

5. 단위 테스트 작성 (`tests/test_pdf_service.py`):
   ```python
   import pytest
   import os
   from backend.services.pdf_service import convert_html_to_pdf, PDFGenerationError

   def test_convert_simple_html_to_pdf(tmp_path):
       """간단한 HTML을 PDF로 변환 테스트"""
       html_content = """
       <!DOCTYPE html>
       <html>
       <head><meta charset="UTF-8"></head>
       <body>
           <h1>테스트 문서</h1>
           <p>한글이 올바르게 표시되는지 확인합니다.</p>
       </body>
       </html>
       """

       output_path = tmp_path / "test.pdf"
       result_path = convert_html_to_pdf(html_content, str(output_path))

       assert os.path.exists(result_path)
       assert os.path.getsize(result_path) > 0

   def test_convert_with_table(tmp_path):
       """테이블이 포함된 HTML을 PDF로 변환"""
       html_content = """
       <!DOCTYPE html>
       <html>
       <head><meta charset="UTF-8"></head>
       <body>
           <table>
               <thead>
                   <tr><th>항목</th><th>값</th></tr>
               </thead>
               <tbody>
                   <tr><td>단체명</td><td>하노이 골프단</td></tr>
                   <tr><td>인원</td><td>20명</td></tr>
               </tbody>
           </table>
       </body>
       </html>
       """

       output_path = tmp_path / "table_test.pdf"
       result_path = convert_html_to_pdf(html_content, str(output_path))

       assert os.path.exists(result_path)

   def test_invalid_html_raises_error(tmp_path):
       """잘못된 HTML 처리 확인"""
       # 매우 잘못된 HTML은 WeasyPrint가 자동으로 수정하므로
       # 디렉토리 권한 문제로 테스트
       output_path = "/invalid/path/test.pdf"

       with pytest.raises(PDFGenerationError):
           convert_html_to_pdf("<html></html>", output_path)
   ```

6. 테스트 실행:
   ```bash
   pytest tests/test_pdf_service.py -v
   ```

7. 실제 템플릿으로 PDF 생성 테스트:
   ```python
   from backend.services.template_service import render_template
   from backend.services.pdf_service import convert_html_to_pdf
   from models import Group

   # 실제 데이터 조회
   group = db.session.query(Group).first()

   # HTML 렌더링
   html_content = render_template('estimate.html', group)

   # PDF 생성
   output_path = 'test_estimate.pdf'
   convert_html_to_pdf(html_content, output_path)

   print(f"PDF generated: {output_path}")
   ```

**중요 사항:**

- **한글 폰트 경로**: `@font-face`의 `src: url()` 경로는 실제 폰트 파일 위치와 일치해야 합니다
- **base_url 설정**: `HTML(string=html_content, base_url=os.getcwd())`를 사용하여 상대 경로 리소스를 올바르게 로드하세요
- **디렉토리 권한**: PDF 파일을 저장할 디렉토리에 쓰기 권한이 있는지 확인하세요
- **에러 처리**: PDF 생성 실패 시 명확한 에러 메시지와 함께 예외를 발생시키세요
- **로깅**: 모든 PDF 생성 과정을 로그로 기록하여 디버깅을 용이하게 하세요

**검증 방법:**

1. 단위 테스트 실행:
   ```bash
   pytest tests/test_pdf_service.py -v
   ```

2. 한글 폰트 확인:
   - 생성된 PDF를 PDF 뷰어로 열기
   - 한글이 깨지지 않고 올바르게 표시되는지 확인
   - 굵은 글씨가 제대로 렌더링되는지 확인

3. 페이지 설정 확인:
   - A4 용지 크기 확인
   - 마진 2cm 확인
   - 페이지 브레이크가 올바르게 적용되는지 확인

4. 성능 테스트:
   - 다양한 크기의 HTML을 PDF로 변환
   - 변환 시간 측정 (일반적으로 1-3초 이내)
   - 메모리 사용량 확인

**산출물:**

- `backend/services/pdf_service.py`: PDF 변환 모듈 코드
- `static/fonts/NotoSansKR-Regular.woff2`: 한글 일반 폰트
- `static/fonts/NotoSansKR-Bold.woff2`: 한글 굵은 폰트
- `tests/test_pdf_service.py`: 단위 테스트 코드

**의존성:**

- **선행 task**: T-TPL-01~05 (HTML 템플릿 필요)
- **후행 task**: T-PDF-04 (PDF 생성 통합 함수에서 이 모듈 사용)

---

## T-PDF-02 파일명 생성 로직

**참조 문서:**
- PRD Section 9.3: 문서 이력 (버전 관리 필수)
- TRD Section 7.1: 버전 관리 로직 (get_next_version, generate_filename)
- TRD Section 7.4: 파일명 규칙 (견적서, 계약서, 일정표, 통합)

**목표:**

문서 종류별로 일관된 파일명 규칙을 적용하여 PDF 파일명을 생성하는 로직을 구현합니다. 파일명에는 문서 종류, 단체명, 버전 번호, 생성 날짜가 포함되며, Windows/Linux 파일 시스템에서 사용 불가능한 특수문자를 자동으로 제거합니다.

**배경:**

PRD Section 9.3에서 정의된 문서 이력 요구사항에 따라, PDF 파일은 버전 관리가 필수입니다. 동일한 문서를 여러 번 생성할 수 있으며, 각 생성마다 버전 번호가 자동으로 증가합니다.

TRD Section 7.4에서 정의된 파일명 규칙:
- 견적서: `견적서_{단체명}_v{version}_{YYYYMMDD}.pdf`
- 계약서: `계약서_{단체명}_v{version}_{YYYYMMDD}.pdf`
- 일정표: `일정표_{단체명}_v{version}_{YYYYMMDD}.pdf`
- 통합: `통합_{단체명}_v{version}_{YYYYMMDD}.pdf`

예: `견적서_하노이골프단_v1_20250101.pdf`

**작업 내용:**

1. **버전 번호 조회 함수 구현**

   `backend/services/pdf_service.py`에 버전 번호 조회 함수를 추가하세요.

   **함수 시그니처:**
   ```python
   def get_next_version(group_id: UUID, document_type: str) -> int:
       """
       다음 버전 번호 조회

       Args:
           group_id: 단체 ID
           document_type: 문서 종류 ('estimate', 'contract', 'itinerary', 'bundle')

       Returns:
           다음 버전 번호 (1부터 시작)
       """
   ```

   **구현:**
   ```python
   from uuid import UUID
   from sqlalchemy import desc
   from models import Document
   from database import db_session

   def get_next_version(group_id: UUID, document_type: str) -> int:
       """다음 버전 번호 조회"""

       # 해당 단체의 해당 문서 타입 중 가장 최근 문서 조회
       last_doc = db_session.query(Document)\
           .filter_by(group_id=group_id, document_type=document_type)\
           .order_by(desc(Document.version))\
           .first()

       if last_doc:
           return last_doc.version + 1

       # 첫 번째 문서인 경우
       return 1
   ```

2. **파일명 안전화 함수 구현**

   Windows와 Linux에서 사용할 수 없는 특수문자를 제거하는 함수를 구현하세요.

   **함수 시그니처:**
   ```python
   def sanitize_filename(filename: str) -> str:
       """
       파일명에 사용할 수 없는 문자 제거

       Args:
           filename: 원본 파일명

       Returns:
           안전한 파일명 (특수문자가 '_'로 대체됨)
       """
   ```

   **구현:**
   ```python
   import re

   def sanitize_filename(filename: str) -> str:
       """파일명에 사용할 수 없는 문자 제거"""

       # Windows에서 사용 불가능한 문자: < > : " / \ | ? *
       # 추가로 공백도 '_'로 변경
       invalid_chars = r'[<>:"/\\|?*\s]'

       # 특수문자를 '_'로 대체
       safe_filename = re.sub(invalid_chars, '_', filename)

       # 연속된 '_'를 하나로 축소
       safe_filename = re.sub(r'_+', '_', safe_filename)

       # 앞뒤 '_' 제거
       safe_filename = safe_filename.strip('_')

       # 파일명이 너무 긴 경우 잘라냄 (최대 200자)
       if len(safe_filename) > 200:
           safe_filename = safe_filename[:200]

       return safe_filename
   ```

3. **파일명 생성 함수 구현**

   **함수 시그니처:**
   ```python
   def generate_filename(
       group_name: str,
       document_type: str,
       version: int,
       date_str: Optional[str] = None
   ) -> str:
       """
       파일명 생성

       Args:
           group_name: 단체명
           document_type: 문서 종류
           version: 버전 번호
           date_str: 날짜 문자열 (YYYYMMDD), None이면 오늘 날짜 사용

       Returns:
           생성된 파일명 (예: 견적서_하노이골프단_v1_20250101.pdf)
       """
   ```

   **구현:**
   ```python
   from datetime import datetime
   from typing import Optional

   def generate_filename(
       group_name: str,
       document_type: str,
       version: int,
       date_str: Optional[str] = None
   ) -> str:
       """파일명 생성 규칙에 따라 파일명 생성"""

       # 문서 종류별 한글 이름 매핑
       doc_type_map = {
           'estimate': '견적서',
           'contract': '계약서',
           'itinerary': '일정표',
           'bundle': '통합'
       }

       doc_name = doc_type_map.get(document_type, '문서')

       # 날짜 문자열 생성 (YYYYMMDD)
       if date_str is None:
           date_str = datetime.now().strftime('%Y%m%d')

       # 단체명 안전화
       safe_group_name = sanitize_filename(group_name)

       # 파일명 조합
       filename = f"{doc_name}_{safe_group_name}_v{version}_{date_str}.pdf"

       return filename
   ```

4. **전체 경로 생성 함수 구현 (선택사항)**

   파일명뿐만 아니라 전체 파일 경로를 생성하는 함수도 추가할 수 있습니다.

   ```python
   import os

   def generate_file_path(
       group_id: UUID,
       document_type: str,
       group_name: str,
       version: int,
       base_dir: str = 'documents'
   ) -> str:
       """전체 파일 경로 생성"""

       # 파일명 생성
       filename = generate_filename(group_name, document_type, version)

       # 연도/월별 디렉토리 구조 (선택사항)
       # 예: documents/2025/01/견적서_하노이골프단_v1_20250101.pdf
       now = datetime.now()
       year_dir = now.strftime('%Y')
       month_dir = now.strftime('%m')

       # 전체 경로 조합
       file_path = os.path.join(base_dir, year_dir, month_dir, filename)

       return file_path
   ```

**실행 절차:**

1. `backend/services/pdf_service.py`에 함수 추가

2. 단위 테스트 작성 (`tests/test_pdf_service.py`):
   ```python
   from backend.services.pdf_service import (
       sanitize_filename,
       generate_filename,
       get_next_version
   )
   from uuid import uuid4

   def test_sanitize_filename():
       """파일명 안전화 테스트"""
       assert sanitize_filename('하노이 골프단') == '하노이_골프단'
       assert sanitize_filename('test<>:"/\\|?*file') == 'test_file'
       assert sanitize_filename('  test  ') == 'test'
       assert sanitize_filename('multiple___underscores') == 'multiple_underscores'

   def test_generate_filename():
       """파일명 생성 테스트"""
       filename = generate_filename(
           group_name='하노이 골프단',
           document_type='estimate',
           version=1,
           date_str='20250101'
       )
       assert filename == '견적서_하노이_골프단_v1_20250101.pdf'

   def test_generate_filename_with_special_chars():
       """특수문자가 포함된 단체명 테스트"""
       filename = generate_filename(
           group_name='Test<Group>:2025',
           document_type='contract',
           version=2,
           date_str='20250115'
       )
       assert filename == '계약서_Test_Group_2025_v2_20250115.pdf'

   def test_get_next_version_first_document(db_session):
       """첫 번째 문서인 경우 버전 1 반환"""
       group_id = uuid4()
       version = get_next_version(group_id, 'estimate')
       assert version == 1

   def test_get_next_version_increments(db_session):
       """기존 문서가 있는 경우 버전 증가"""
       group_id = uuid4()

       # 첫 번째 문서 생성
       doc1 = Document(
           group_id=group_id,
           document_type='estimate',
           version=1,
           file_name='test_v1.pdf',
           file_path='/path/test_v1.pdf'
       )
       db_session.add(doc1)
       db_session.commit()

       # 다음 버전 조회
       next_version = get_next_version(group_id, 'estimate')
       assert next_version == 2
   ```

3. 테스트 실행:
   ```bash
   pytest tests/test_pdf_service.py::test_sanitize_filename -v
   pytest tests/test_pdf_service.py::test_generate_filename -v
   ```

4. 통합 테스트:
   ```python
   from models import Group

   group = Group(id=uuid4(), name='하노이 골프단 1기')
   version = get_next_version(group.id, 'estimate')
   filename = generate_filename(group.name, 'estimate', version)

   print(f"Generated filename: {filename}")
   # 출력: 견적서_하노이_골프단_1기_v1_20250122.pdf
   ```

**중요 사항:**

- **버전 번호는 1부터 시작**: 첫 번째 문서는 v1, 두 번째는 v2
- **문서 타입별로 독립적인 버전**: 견적서 v1과 계약서 v1은 별개
- **특수문자 처리**: 단체명에 특수문자가 있어도 안전하게 처리
- **파일명 길이 제한**: 너무 긴 파일명은 200자로 제한
- **날짜 형식**: YYYYMMDD 형식 사용 (예: 20250101)

**검증 방법:**

1. 단위 테스트 실행
2. 다양한 단체명으로 파일명 생성 테스트
3. 특수문자가 포함된 단체명 처리 확인
4. 버전 번호 자동 증가 확인

**산출물:**

- `backend/services/pdf_service.py`에 함수 추가:
  - `get_next_version()`
  - `sanitize_filename()`
  - `generate_filename()`
  - `generate_file_path()` (선택사항)
- `tests/test_pdf_service.py`: 단위 테스트 코드

**의존성:**

- **선행 task**: T-DB-01 (Document 테이블 필요)
- **후행 task**: T-PDF-03 (문서 이력 기록 시 파일명 생성 사용), T-PDF-04

---

## T-PDF-03 문서 이력 기록 로직

**참조 문서:**
- PRD Section 9.3: 문서 이력 (출력 시 documents 테이블 기록, 버전 관리 필수)
- PRD Section 6.2.5: documents 테이블 스키마
- TRD Section 7.2: 문서 이력 저장 (save_document 함수)

**목표:**

PDF 파일 생성 시 documents 테이블에 이력을 기록하는 로직을 구현합니다. 기록 내용에는 group_id, document_type, version, file_path, file_name, file_size, 생성자 정보가 포함됩니다.

**배경:**

PRD Section 9.3에 따르면, PDF 문서를 생성할 때마다 documents 테이블에 이력을 기록해야 합니다. 이를 통해:
1. 어떤 단체의 어떤 문서를 언제 누가 생성했는지 추적 가능
2. 버전 관리: 동일한 문서를 여러 번 생성해도 모든 버전 보관
3. 파일 경로와 크기 정보 저장
4. 감사 추적 (audit trail) 가능

PRD Section 6.2.5에서 정의된 documents 테이블 스키마:
- id (UUID, PK)
- group_id (UUID, FK to groups)
- document_type (VARCHAR)
- version (INTEGER)
- file_name (VARCHAR)
- file_path (VARCHAR)
- file_size (BIGINT)
- generated_at (TIMESTAMP)
- generated_by (VARCHAR)

**작업 내용:**

1. **문서 이력 저장 함수 구현**

   `backend/services/pdf_service.py`에 문서 이력 저장 함수를 추가하세요.

   **함수 시그니처:**
   ```python
   def save_document(
       group_id: UUID,
       document_type: str,
       file_path: str,
       file_name: str,
       generated_by: Optional[str] = None
   ) -> Document:
       """
       문서 이력 저장

       Args:
           group_id: 단체 ID
           document_type: 문서 종류
           file_path: 파일 경로
           file_name: 파일명
           generated_by: 생성자 (선택사항, None이면 시스템 사용자)

       Returns:
           생성된 Document 객체

       Raises:
           ValueError: group_id가 존재하지 않는 경우
       """
   ```

   **구현:**
   ```python
   from datetime import datetime
   from uuid import UUID, uuid4
   from typing import Optional
   import os
   from models import Document, Group
   from database import db_session
   import logging

   logger = logging.getLogger(__name__)

   def save_document(
       group_id: UUID,
       document_type: str,
       file_path: str,
       file_name: str,
       generated_by: Optional[str] = None
   ) -> Document:
       """문서 이력 저장"""

       # 1. group_id 유효성 검증
       group = db_session.query(Group).filter_by(id=group_id).first()
       if not group:
           raise ValueError(f"Group not found: {group_id}")

       # 2. 버전 번호 조회
       version = get_next_version(group_id, document_type)

       # 3. 파일 크기 계산
       try:
           file_size = os.path.getsize(file_path)
       except OSError as e:
           logger.warning(f"Cannot get file size for {file_path}: {e}")
           file_size = 0

       # 4. 생성자 정보 설정
       if generated_by is None:
           # 현재 로그인한 사용자 정보 가져오기 (실제 구현에서는 세션에서 가져옴)
           # generated_by = get_current_user()
           generated_by = 'system'  # 기본값

       # 5. Document 객체 생성
       document = Document(
           id=uuid4(),
           group_id=group_id,
           document_type=document_type,
           version=version,
           file_name=file_name,
           file_path=file_path,
           file_size=file_size,
           generated_at=datetime.now(),
           generated_by=generated_by
       )

       # 6. 데이터베이스에 저장
       try:
           db_session.add(document)
           db_session.commit()
           logger.info(
               f"Document saved: group_id={group_id}, "
               f"type={document_type}, version={version}, "
               f"file={file_name}, size={file_size}"
           )
       except Exception as e:
           db_session.rollback()
           logger.error(f"Failed to save document: {e}", exc_info=True)
           raise

       return document
   ```

2. **문서 이력 조회 함수 구현**

   특정 단체의 문서 이력을 조회하는 함수도 추가하세요.

   **구현:**
   ```python
   from typing import List

   def get_documents_by_group(
       group_id: UUID,
       document_type: Optional[str] = None
   ) -> List[Document]:
       """
       단체별 문서 이력 조회

       Args:
           group_id: 단체 ID
           document_type: 문서 종류 (선택사항, None이면 전체 조회)

       Returns:
           Document 객체 리스트 (생성일 기준 내림차순)
       """
       query = db_session.query(Document)\
           .filter_by(group_id=group_id)\
           .order_by(desc(Document.generated_at))

       if document_type:
           query = query.filter_by(document_type=document_type)

       return query.all()

   def get_latest_document(
       group_id: UUID,
       document_type: str
   ) -> Optional[Document]:
       """
       최신 문서 조회

       Args:
           group_id: 단체 ID
           document_type: 문서 종류

       Returns:
           가장 최근 생성된 Document 객체 또는 None
       """
       return db_session.query(Document)\
           .filter_by(group_id=group_id, document_type=document_type)\
           .order_by(desc(Document.generated_at))\
           .first()
   ```

3. **문서 삭제 함수 구현 (선택사항)**

   ```python
   def delete_document(document_id: UUID, delete_file: bool = True) -> bool:
       """
       문서 이력 및 파일 삭제

       Args:
           document_id: 문서 ID
           delete_file: 실제 파일도 삭제할지 여부

       Returns:
           삭제 성공 여부
       """
       document = db_session.query(Document).filter_by(id=document_id).first()

       if not document:
           logger.warning(f"Document not found: {document_id}")
           return False

       # 실제 파일 삭제
       if delete_file and os.path.exists(document.file_path):
           try:
               os.remove(document.file_path)
               logger.info(f"File deleted: {document.file_path}")
           except OSError as e:
               logger.error(f"Failed to delete file: {e}")

       # DB 레코드 삭제
       try:
           db_session.delete(document)
           db_session.commit()
           logger.info(f"Document deleted: {document_id}")
           return True
       except Exception as e:
           db_session.rollback()
           logger.error(f"Failed to delete document: {e}")
           return False
   ```

**실행 절차:**

1. `backend/services/pdf_service.py`에 함수 추가

2. 단위 테스트 작성 (`tests/test_pdf_service.py`):
   ```python
   from backend.services.pdf_service import (
       save_document,
       get_documents_by_group,
       get_latest_document
   )
   from models import Group, Document
   from uuid import uuid4
   import os

   def test_save_document(db_session, tmp_path):
       """문서 이력 저장 테스트"""
       # 테스트용 그룹 생성
       group = Group(
           id=uuid4(),
           name='테스트 단체',
           start_date=date(2025, 1, 15),
           end_date=date(2025, 1, 20)
       )
       db_session.add(group)
       db_session.commit()

       # 임시 파일 생성
       test_file = tmp_path / "test.pdf"
       test_file.write_text("test content")

       # 문서 이력 저장
       document = save_document(
           group_id=group.id,
           document_type='estimate',
           file_path=str(test_file),
           file_name='견적서_테스트단체_v1_20250101.pdf',
           generated_by='test_user'
       )

       assert document.id is not None
       assert document.group_id == group.id
       assert document.document_type == 'estimate'
       assert document.version == 1
       assert document.file_size > 0
       assert document.generated_by == 'test_user'

   def test_get_documents_by_group(db_session):
       """단체별 문서 조회 테스트"""
       group = Group(id=uuid4(), name='테스트 단체')
       db_session.add(group)
       db_session.commit()

       # 여러 문서 생성
       for i in range(3):
           doc = Document(
               id=uuid4(),
               group_id=group.id,
               document_type='estimate',
               version=i+1,
               file_name=f'test_v{i+1}.pdf',
               file_path=f'/path/test_v{i+1}.pdf',
               generated_by='test_user'
           )
           db_session.add(doc)
       db_session.commit()

       # 조회
       documents = get_documents_by_group(group.id)
       assert len(documents) == 3

   def test_get_latest_document(db_session):
       """최신 문서 조회 테스트"""
       group = Group(id=uuid4(), name='테스트 단체')
       db_session.add(group)
       db_session.commit()

       # 문서 생성
       doc1 = Document(
           id=uuid4(), group_id=group.id, document_type='estimate',
           version=1, file_name='test_v1.pdf', file_path='/path/v1.pdf'
       )
       doc2 = Document(
           id=uuid4(), group_id=group.id, document_type='estimate',
           version=2, file_name='test_v2.pdf', file_path='/path/v2.pdf'
       )
       db_session.add_all([doc1, doc2])
       db_session.commit()

       # 최신 문서 조회
       latest = get_latest_document(group.id, 'estimate')
       assert latest.version == 2
   ```

3. 테스트 실행:
   ```bash
   pytest tests/test_pdf_service.py::test_save_document -v
   ```

4. 통합 테스트:
   ```python
   from models import Group

   # 실제 단체 조회
   group = db_session.query(Group).first()

   # PDF 생성 (가정)
   pdf_path = '/documents/2025/01/견적서_하노이골프단_v1_20250101.pdf'
   pdf_name = '견적서_하노이골프단_v1_20250101.pdf'

   # 문서 이력 저장
   document = save_document(
       group_id=group.id,
       document_type='estimate',
       file_path=pdf_path,
       file_name=pdf_name,
       generated_by='admin'
   )

   print(f"Document saved: {document.id}, version: {document.version}")
   ```

**중요 사항:**

- **트랜잭션 처리**: 저장 실패 시 자동으로 롤백
- **파일 크기 계산**: `os.path.getsize()`로 실제 파일 크기 측정
- **버전 자동 증가**: `get_next_version()` 호출하여 자동 증가
- **생성자 정보**: 실제 구현에서는 로그인한 사용자 정보 사용
- **에러 처리**: group_id 유효성 검증 필수

**검증 방법:**

1. 단위 테스트 실행
2. 문서 저장 후 DB 확인:
   ```sql
   SELECT * FROM documents WHERE group_id = '...';
   ```
3. 버전 자동 증가 확인
4. 파일 크기가 올바르게 기록되는지 확인

**산출물:**

- `backend/services/pdf_service.py`에 함수 추가:
  - `save_document()`
  - `get_documents_by_group()`
  - `get_latest_document()`
  - `delete_document()` (선택사항)
- `tests/test_pdf_service.py`: 단위 테스트 코드

**의존성:**

- **선행 task**: T-DB-01 (Document 테이블), T-PDF-02 (버전 관리 함수)
- **후행 task**: T-PDF-04 (통합 함수에서 사용)

---

## T-PDF-04 PDF 생성 통합 함수

**참조 문서:**
- PRD Section 9: 문서 출력 요구사항 (전체 흐름)
- TRD Section 6.4: PDF 생성 흐름 (generate_pdf 함수)
- TRD Section 6.6: 통합 PDF 생성 (generate_bundle_pdf 함수)
- TRD Section 9.3: PDF 생성 실패 처리 (재시도 로직)

**목표:**

데이터 조회부터 PDF 생성, 파일 저장, 문서 이력 기록까지 전체 흐름을 하나의 함수로 통합하여 구현합니다. 견적서, 계약서, 일정표, 통합 PDF 4가지 문서 타입을 모두 지원하며, 에러 처리와 재시도 로직을 포함합니다.

**배경:**

PRD Section 9에서 정의된 문서 출력 요구사항을 충족하기 위해, 프론트엔드에서 간단히 호출할 수 있는 통합 함수가 필요합니다. 이 함수는:
1. 데이터베이스에서 단체 및 관련 데이터 조회
2. HTML 템플릿 렌더링
3. PDF 변환
4. 파일 저장
5. 문서 이력 기록
6. 로그 기록

모든 단계를 하나의 트랜잭션으로 처리하며, 실패 시 재시도 로직을 적용합니다.

**작업 내용:**

1. **PDF 생성 통합 함수 구현**

   `backend/services/pdf_service.py`에 통합 함수를 추가하세요.

   **함수 시그니처:**
   ```python
   def generate_pdf(
       group_id: UUID,
       document_type: str,
       generated_by: Optional[str] = None,
       base_dir: str = 'documents'
   ) -> dict:
       """
       PDF 생성 전체 흐름

       Args:
           group_id: 단체 ID
           document_type: 문서 종류 ('estimate', 'contract', 'itinerary', 'bundle')
           generated_by: 생성자 (선택사항)
           base_dir: PDF 저장 기본 디렉토리

       Returns:
           생성된 문서 정보 딕셔너리:
           {
               'document_id': UUID,
               'file_path': str,
               'file_name': str,
               'version': int,
               'file_size': int
           }

       Raises:
           ValueError: group_id가 존재하지 않거나 document_type이 유효하지 않은 경우
           PDFGenerationError: PDF 생성 실패 시
       """
   ```

   **구현:**
   ```python
   from typing import Dict, Optional
   from uuid import UUID
   import logging
   from models import Group
   from database import db_session
   from backend.services.template_service import render_template

   logger = logging.getLogger(__name__)

   VALID_DOCUMENT_TYPES = ['estimate', 'contract', 'itinerary', 'bundle']

   def generate_pdf(
       group_id: UUID,
       document_type: str,
       generated_by: Optional[str] = None,
       base_dir: str = 'documents'
   ) -> Dict:
       """PDF 생성 전체 흐름"""

       logger.info(f"Starting PDF generation: group_id={group_id}, type={document_type}")

       # 1. document_type 검증
       if document_type not in VALID_DOCUMENT_TYPES:
           raise ValueError(
               f"Invalid document_type: {document_type}. "
               f"Must be one of {VALID_DOCUMENT_TYPES}"
           )

       # 2. 데이터 조회 (단체 + 관련 데이터)
       group = get_group_with_relations(group_id)
       if not group:
           raise ValueError(f"Group not found: {group_id}")

       logger.info(f"Group loaded: {group.name}")

       # 3. 파일명 및 경로 생성
       version = get_next_version(group_id, document_type)
       file_name = generate_filename(group.name, document_type, version)
       file_path = generate_file_path(
           group_id, document_type, group.name, version, base_dir
       )

       logger.info(f"File will be saved to: {file_path}")

       try:
           # 4. HTML 템플릿 렌더링
           template_map = {
               'estimate': 'estimate.html',
               'contract': 'contract.html',
               'itinerary': 'itinerary.html',
               'bundle': 'bundle.html'
           }

           template_name = template_map[document_type]
           html_content = render_template(template_name, group)

           logger.info(f"HTML template rendered: {template_name}")

           # 5. PDF 변환
           convert_html_to_pdf(html_content, file_path)

           logger.info(f"PDF converted successfully")

           # 6. 파일 크기 확인
           file_size = os.path.getsize(file_path)

           # 7. 문서 이력 기록
           document = save_document(
               group_id=group_id,
               document_type=document_type,
               file_path=file_path,
               file_name=file_name,
               generated_by=generated_by
           )

           logger.info(
               f"PDF generation completed: document_id={document.id}, "
               f"version={version}, size={file_size}"
           )

           # 8. 결과 반환
           return {
               'document_id': str(document.id),
               'file_path': file_path,
               'file_name': file_name,
               'version': version,
               'file_size': file_size
           }

       except Exception as e:
           logger.error(f"PDF generation failed: {e}", exc_info=True)

           # 실패 시 생성된 파일 삭제 (있다면)
           if os.path.exists(file_path):
               try:
                   os.remove(file_path)
                   logger.info(f"Cleaned up failed PDF file: {file_path}")
               except:
                   pass

           raise PDFGenerationError(f"PDF 생성 중 오류가 발생했습니다: {str(e)}")

   def get_group_with_relations(group_id: UUID) -> Optional[Group]:
       """단체 및 관련 데이터 조회 (eager loading)"""
       from sqlalchemy.orm import joinedload

       group = db_session.query(Group)\
           .options(
               joinedload(Group.itineraries),
               joinedload(Group.cancel_rules),
               joinedload(Group.includes)
           )\
           .filter_by(id=group_id)\
           .first()

       return group
   ```

2. **재시도 로직 추가**

   TRD Section 9.3에서 정의된 재시도 로직을 추가하세요.

   ```python
   from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

   @retry(
       retry=retry_if_exception_type(PDFGenerationError),
       stop=stop_after_attempt(3),
       wait=wait_exponential(multiplier=1, min=2, max=10)
   )
   def generate_pdf_with_retry(
       group_id: UUID,
       document_type: str,
       generated_by: Optional[str] = None
   ) -> Dict:
       """재시도 로직이 포함된 PDF 생성"""
       return generate_pdf(group_id, document_type, generated_by)
   ```

3. **통합 PDF 생성 함수 구현**

   ```python
   def generate_bundle_pdf(
       group_id: UUID,
       generated_by: Optional[str] = None
   ) -> Dict:
       """
       통합 PDF 생성 (견적서 + 계약서 + 일정표)

       Args:
           group_id: 단체 ID
           generated_by: 생성자

       Returns:
           생성된 문서 정보 딕셔너리
       """
       logger.info(f"Starting bundle PDF generation: group_id={group_id}")

       # bundle 타입으로 generate_pdf 호출
       # bundle.html 템플릿에서 3개 문서를 모두 포함
       return generate_pdf(group_id, 'bundle', generated_by)
   ```

**실행 절차:**

1. `backend/services/pdf_service.py`에 함수 추가

2. 통합 테스트 작성 (`tests/test_pdf_integration.py`):
   ```python
   from backend.services.pdf_service import generate_pdf, generate_bundle_pdf
   from models import Group
   import os

   def test_generate_estimate_pdf(db_session):
       """견적서 PDF 생성 통합 테스트"""
       # 테스트용 그룹 생성
       group = create_test_group_with_relations(db_session)

       # PDF 생성
       result = generate_pdf(
           group_id=group.id,
           document_type='estimate',
           generated_by='test_user'
       )

       # 검증
       assert 'document_id' in result
       assert 'file_path' in result
       assert 'version' in result
       assert result['version'] == 1

       # 파일 존재 확인
       assert os.path.exists(result['file_path'])
       assert os.path.getsize(result['file_path']) > 0

   def test_generate_bundle_pdf(db_session):
       """통합 PDF 생성 테스트"""
       group = create_test_group_with_relations(db_session)

       result = generate_bundle_pdf(
           group_id=group.id,
           generated_by='test_user'
       )

       assert result['file_name'].startswith('통합_')
       assert os.path.exists(result['file_path'])

   def test_generate_pdf_invalid_type(db_session):
       """잘못된 document_type 처리"""
       group = create_test_group_with_relations(db_session)

       with pytest.raises(ValueError):
           generate_pdf(group.id, 'invalid_type')
   ```

3. 테스트 실행:
   ```bash
   pytest tests/test_pdf_integration.py -v
   ```

4. 실제 사용 예시:
   ```python
   from backend.services.pdf_service import generate_pdf
   from uuid import UUID

   # 견적서 생성
   result = generate_pdf(
       group_id=UUID('...'),
       document_type='estimate',
       generated_by='admin'
   )

   print(f"PDF generated: {result['file_name']}")
   print(f"Version: {result['version']}")
   print(f"File size: {result['file_size']} bytes")
   print(f"Download URL: /api/documents/{result['document_id']}/download")
   ```

**중요 사항:**

- **Eager Loading**: `joinedload`를 사용하여 N+1 쿼리 문제 방지
- **트랜잭션**: 모든 단계를 하나의 트랜잭션으로 처리
- **에러 처리**: 실패 시 생성된 파일 정리
- **로깅**: 모든 단계를 로그로 기록
- **재시도**: tenacity 라이브러리를 사용한 자동 재시도

**검증 방법:**

1. 통합 테스트 실행
2. 4가지 문서 타입 모두 생성 확인
3. DB에 문서 이력 기록 확인
4. 실제 파일 생성 확인
5. 재시도 로직 테스트 (네트워크 오류 시뮬레이션)

**산출물:**

- `backend/services/pdf_service.py`에 함수 추가:
  - `generate_pdf()`
  - `generate_pdf_with_retry()`
  - `generate_bundle_pdf()`
  - `get_group_with_relations()`
- `tests/test_pdf_integration.py`: 통합 테스트 코드

**의존성:**

- **선행 task**: T-PDF-01, T-PDF-02, T-PDF-03, T-TPL-05
- **후행 task**: T-PDF-05 (API에서 이 함수 호출)

---

## T-PDF-05 PDF 다운로드 API

**참조 문서:**
- PRD Section 9: 문서 출력 요구사항 (다운로드 기능)
- TRD Section 4: API 설계 (FastAPI 엔드포인트)
- TRD Section 7.3: 버전 조회 API

**목표:**

생성된 PDF 파일을 다운로드할 수 있는 REST API 엔드포인트를 구현합니다. 파일 존재 여부를 확인하고, 적절한 HTTP 헤더와 함께 파일 스트림을 반환합니다.

**배경:**

PRD Section 9에 따르면, 사용자는 생성된 PDF 문서를 다운로드할 수 있어야 합니다. FastAPI의 `FileResponse`를 사용하여 PDF 파일을 스트리밍 방식으로 전송하며, Content-Type과 Content-Disposition 헤더를 설정하여 브라우저가 파일을 올바르게 처리하도록 합니다.

**작업 내용:**

1. **PDF 다운로드 API 엔드포인트 구현**

   `backend/routers/documents.py` 파일을 생성하거나 수정하세요.

   **엔드포인트:**
   ```
   GET /api/documents/{document_id}/download
   ```

   **구현:**
   ```python
   from fastapi import APIRouter, HTTPException, Path
   from fastapi.responses import FileResponse
   from uuid import UUID
   import os
   import logging
   from models import Document
   from database import db_session

   router = APIRouter(prefix="/api/documents", tags=["documents"])
   logger = logging.getLogger(__name__)

   @router.get("/{document_id}/download", response_class=FileResponse)
   async def download_document(
       document_id: UUID = Path(..., description="문서 ID")
   ):
       """
       PDF 문서 다운로드

       Args:
           document_id: 문서 ID

       Returns:
           PDF 파일 스트림

       Raises:
           404: 문서를 찾을 수 없음
           404: 파일이 존재하지 않음
       """
       logger.info(f"Download request: document_id={document_id}")

       # 1. 문서 이력 조회
       document = db_session.query(Document).filter_by(id=document_id).first()

       if not document:
           logger.warning(f"Document not found: {document_id}")
           raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다")

       # 2. 파일 존재 여부 확인
       if not os.path.exists(document.file_path):
           logger.error(f"File not found: {document.file_path}")
           raise HTTPException(
               status_code=404,
               detail=f"파일을 찾을 수 없습니다: {document.file_name}"
           )

       # 3. 파일 다운로드
       logger.info(f"Sending file: {document.file_name}")

       return FileResponse(
           path=document.file_path,
           filename=document.file_name,
           media_type='application/pdf',
           headers={
               'Content-Disposition': f'attachment; filename="{document.file_name}"'
           }
       )
   ```

2. **문서 목록 조회 API 추가**

   ```python
   from typing import List, Optional
   from pydantic import BaseModel
   from datetime import datetime

   class DocumentResponse(BaseModel):
       id: str
       group_id: str
       document_type: str
       version: int
       file_name: str
       file_size: int
       generated_at: datetime
       generated_by: str

       class Config:
           from_attributes = True

   @router.get("/", response_model=List[DocumentResponse])
   async def list_documents(
       group_id: Optional[UUID] = None,
       document_type: Optional[str] = None
   ):
       """
       문서 목록 조회

       Args:
           group_id: 단체 ID (선택사항)
           document_type: 문서 종류 (선택사항)

       Returns:
           문서 목록
       """
       query = db_session.query(Document)

       if group_id:
           query = query.filter_by(group_id=group_id)

       if document_type:
           query = query.filter_by(document_type=document_type)

       documents = query.order_by(desc(Document.generated_at)).all()

       return [
           DocumentResponse(
               id=str(doc.id),
               group_id=str(doc.group_id),
               document_type=doc.document_type,
               version=doc.version,
               file_name=doc.file_name,
               file_size=doc.file_size,
               generated_at=doc.generated_at,
               generated_by=doc.generated_by
           )
           for doc in documents
       ]
   ```

3. **PDF 생성 API 추가**

   ```python
   from pydantic import BaseModel
   from backend.services.pdf_service import generate_pdf

   class GeneratePDFRequest(BaseModel):
       document_type: str

   class GeneratePDFResponse(BaseModel):
       document_id: str
       file_name: str
       version: int
       file_size: int
       download_url: str

   @router.post("/generate", response_model=GeneratePDFResponse)
   async def generate_document(
       group_id: UUID,
       request: GeneratePDFRequest,
       current_user: str = 'admin'  # 실제로는 인증에서 가져옴
   ):
       """
       PDF 문서 생성

       Args:
           group_id: 단체 ID
           request: 생성 요청 (document_type 포함)
           current_user: 현재 사용자

       Returns:
           생성된 문서 정보
       """
       logger.info(
           f"Generate PDF request: group_id={group_id}, "
           f"type={request.document_type}, user={current_user}"
       )

       try:
           result = generate_pdf(
               group_id=group_id,
               document_type=request.document_type,
               generated_by=current_user
           )

           return GeneratePDFResponse(
               document_id=result['document_id'],
               file_name=result['file_name'],
               version=result['version'],
               file_size=result['file_size'],
               download_url=f"/api/documents/{result['document_id']}/download"
           )

       except ValueError as e:
           raise HTTPException(status_code=400, detail=str(e))
       except PDFGenerationError as e:
           raise HTTPException(status_code=500, detail=str(e))
   ```

4. **라우터 등록**

   `backend/main.py`에 라우터를 등록하세요.

   ```python
   from fastapi import FastAPI
   from backend.routers import documents

   app = FastAPI()

   app.include_router(documents.router)
   ```

**실행 절차:**

1. `backend/routers/documents.py` 파일 생성

2. API 엔드포인트 구현

3. 라우터 등록

4. API 테스트 (`tests/test_documents_api.py`):
   ```python
   from fastapi.testclient import TestClient
   from backend.main import app
   from models import Group, Document
   import os

   client = TestClient(app)

   def test_download_document(db_session, tmp_path):
       """문서 다운로드 API 테스트"""
       # 테스트 데이터 생성
       group = create_test_group(db_session)

       # 임시 PDF 파일 생성
       test_file = tmp_path / "test.pdf"
       test_file.write_bytes(b"PDF content")

       document = Document(
           id=uuid4(),
           group_id=group.id,
           document_type='estimate',
           version=1,
           file_name='test.pdf',
           file_path=str(test_file),
           file_size=len(b"PDF content")
       )
       db_session.add(document)
       db_session.commit()

       # API 호출
       response = client.get(f"/api/documents/{document.id}/download")

       assert response.status_code == 200
       assert response.headers['content-type'] == 'application/pdf'
       assert 'attachment' in response.headers['content-disposition']

   def test_download_nonexistent_document():
       """존재하지 않는 문서 다운로드 시도"""
       response = client.get(f"/api/documents/{uuid4()}/download")
       assert response.status_code == 404

   def test_generate_pdf_api(db_session):
       """PDF 생성 API 테스트"""
       group = create_test_group_with_relations(db_session)

       response = client.post(
           "/api/documents/generate",
           params={'group_id': str(group.id)},
           json={'document_type': 'estimate'}
       )

       assert response.status_code == 200
       data = response.json()
       assert 'document_id' in data
       assert 'download_url' in data
       assert data['version'] == 1
   ```

5. API 서버 실행:
   ```bash
   uvicorn backend.main:app --reload
   ```

6. Swagger UI에서 테스트:
   - http://localhost:8000/docs
   - POST `/api/documents/generate` 테스트
   - GET `/api/documents/{document_id}/download` 테스트

**중요 사항:**

- **FileResponse 사용**: 대용량 파일도 효율적으로 스트리밍
- **Content-Disposition**: `attachment`로 설정하여 브라우저가 다운로드하도록 강제
- **파일 존재 확인**: 404 에러 반환 전에 파일 존재 여부 확인
- **보안**: 실제 구현에서는 인증/권한 확인 필요
- **에러 처리**: 명확한 에러 메시지 반환

**검증 방법:**

1. API 테스트 실행:
   ```bash
   pytest tests/test_documents_api.py -v
   ```

2. Swagger UI에서 수동 테스트

3. curl 명령으로 테스트:
   ```bash
   # PDF 생성
   curl -X POST "http://localhost:8000/api/documents/generate?group_id=..." \
        -H "Content-Type: application/json" \
        -d '{"document_type": "estimate"}'

   # PDF 다운로드
   curl -O "http://localhost:8000/api/documents/{document_id}/download"
   ```

4. 브라우저에서 직접 다운로드 테스트

**산출물:**

- `backend/routers/documents.py`: 문서 관련 API 라우터
- `tests/test_documents_api.py`: API 테스트 코드

**의존성:**

- **선행 task**: T-PDF-04 (generate_pdf 함수 필요)
- **후행 task**: T-UI-06 (프론트엔드에서 이 API 호출)

---

## Phase 6 완료

Phase 6의 모든 PDF 출력 task (T-PDF-01 ~ T-PDF-05, 5개)가 완료되었습니다.

**완료된 task:**
1. T-PDF-01: PDF 변환 모듈 구현 (WeasyPrint, 한글 폰트 지원)
2. T-PDF-02: 파일명 생성 로직 (버전 관리, 특수문자 처리)
3. T-PDF-03: 문서 이력 기록 로직 (documents 테이블)
4. T-PDF-04: PDF 생성 통합 함수 (전체 흐름 통합)
5. T-PDF-05: PDF 다운로드 API (FastAPI 엔드포인트)

**주요 산출물:**
- `backend/services/pdf_service.py`: PDF 변환 및 관리 서비스
- `backend/routers/documents.py`: 문서 관련 API 라우터
- `static/fonts/`: 한글 폰트 파일
- `tests/test_pdf_service.py`: PDF 서비스 단위 테스트
- `tests/test_pdf_integration.py`: PDF 생성 통합 테스트
- `tests/test_documents_api.py`: API 테스트

**다음 단계:**
Phase 7: 상태별 제어 task 개선 (T-STATE-01 ~ T-STATE-03, 3개)

---

## Phase 7: 상태별 제어 TASK

### T-STATE-01 확정 상태 잠금 로직

**참조 문서:**
- PRD Section 10: 상태별 제어 규칙 (견적/계약/확정 상태별 허용 행위)
- PRD Section 12.3.2: 상태 변경 제한 예외 처리
- TRD Section 4.6.2: HTTP 상태 코드 (403 Forbidden - 권한 없음)
- TRD Section 9.2.2: 수동 수정값 보호 로직 (확정 상태 재계산 차단)

**목표**:
확정 상태(confirmed)일 때 모든 자동 계산 및 데이터 수정을 차단하여 계약 내용의 불변성을 보장합니다.

**배경:**
PRD Section 10에 따르면, 상태가 '확정'이 되면 자동 계산이 잠금(locked)되어야 합니다. 이는 확정된 계약서의 내용이 실수로 변경되는 것을 방지하기 위한 핵심 비즈니스 규칙입니다. 확정 상태에서는:
- 자동 계산 로직이 실행되지 않음
- 데이터 수정 API 요청이 차단됨
- 재계산 API 호출이 거부됨
- 프론트엔드 UI에서 입력 필드가 비활성화됨

이는 계약서가 확정된 후 고객과의 합의 내용이 유지되도록 보장하는 중요한 안전장치입니다.

**작업 내용:**

1. **백엔드: 상태 확인 미들웨어 구현**

   FastAPI 미들웨어를 구현하여 확정 상태일 때 데이터 수정 요청을 차단하세요.

   `backend/middleware/state_control.py` 파일을 생성하고 다음 미들웨어를 구현하세요:

   - **확정 상태 검증 미들웨어**: PUT, POST, DELETE 요청이 확정 상태의 단체를 수정하려 할 때 403 Forbidden 반환
   - **재계산 API 차단**: `/api/groups/{group_id}/recalculate` 엔드포인트에 대한 확정 상태 요청 차단
   - **에러 메시지**: "확정된 계약은 수정할 수 없습니다. 관리자에게 문의하세요."

   **미들웨어 동작 방식:**
   - 요청이 들어오면 group_id를 추출합니다 (URL 파라미터 또는 요청 본문)
   - 데이터베이스에서 해당 단체의 status를 조회합니다
   - status가 'confirmed'이고 메서드가 PUT, POST, DELETE인 경우:
     - 403 Forbidden 응답을 반환합니다
     - 에러 메시지를 포함합니다
   - 그 외의 경우 요청을 정상적으로 처리합니다

2. **백엔드: 자동 계산 로직에 상태 검증 추가**

   기존 자동 계산 함수들에 상태 검증을 추가하세요. TRD Section 9.2.2의 로직을 참조하여:

   - `recalculate_group()` 함수: 함수 시작 시 상태 확인
   - `recalculate_itinerary_dates()` 함수: 확정 상태면 조기 반환
   - `recalculate_cancel_rule_dates()` 함수: 확정 상태면 조기 반환

   **검증 로직:**
   ```python
   if group.status == 'confirmed':
       logger.info(f"자동 계산 생략: 단체 {group.id}는 확정 상태입니다")
       return False  # 재계산하지 않음
   ```

3. **프론트엔드: 확정 상태 UI 제어**

   확정 상태일 때 사용자가 데이터를 수정할 수 없도록 UI를 비활성화하세요.

   **구현 내용:**
   - 모든 입력 필드에 `disabled` 속성 추가
   - 수정/삭제 버튼 숨김 또는 비활성화
   - 재계산 버튼 비활성화
   - 확정 상태임을 나타내는 배지(badge) 표시
   - 상태 변경 드롭다운에서 '확정'을 선택한 경우 확인 다이얼로그 표시

   **시각적 피드백:**
   - 입력 필드 배경색을 회색으로 변경
   - 커서를 `not-allowed`로 변경
   - 화면 상단에 "이 계약은 확정 상태입니다. 수정할 수 없습니다." 알림 표시

**실행 절차:**

**1단계: 상태 확인 미들웨어 구현**

`backend/middleware/state_control.py` 파일을 생성하세요:

```python
"""
상태별 제어 미들웨어
확정 상태의 단체에 대한 수정을 차단합니다
"""
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable
import logging
from uuid import UUID
from models import Group
from database import db_session

logger = logging.getLogger(__name__)

class StateControlMiddleware(BaseHTTPMiddleware):
    """
    확정 상태 잠금 미들웨어

    확정 상태(confirmed)의 단체에 대한 PUT, POST, DELETE 요청을 차단합니다.
    """

    # 확정 상태 수정 차단 대상 경로
    PROTECTED_PATHS = [
        "/api/groups/{group_id}",
        "/api/groups/{group_id}/itinerary",
        "/api/groups/{group_id}/cancel-rules",
        "/api/groups/{group_id}/includes",
        "/api/groups/{group_id}/recalculate"
    ]

    # 차단할 HTTP 메서드
    PROTECTED_METHODS = ["PUT", "POST", "DELETE", "PATCH"]

    async def dispatch(self, request: Request, call_next: Callable):
        """요청 처리 전 상태 검증"""

        # 수정 요청인지 확인
        if request.method not in self.PROTECTED_METHODS:
            return await call_next(request)

        # group_id 추출
        group_id = self._extract_group_id(request)
        if not group_id:
            # group_id가 없으면 (예: 새 단체 생성) 정상 처리
            return await call_next(request)

        # 단체 상태 확인
        try:
            group = db_session.query(Group).filter_by(id=group_id).first()
            if not group:
                # 단체가 없으면 404는 다음 핸들러에서 처리
                return await call_next(request)

            # 확정 상태 확인
            if group.status == 'confirmed':
                logger.warning(
                    f"확정 상태 수정 시도 차단: group_id={group_id}, "
                    f"method={request.method}, path={request.url.path}"
                )
                return JSONResponse(
                    status_code=403,
                    content={
                        "error": "Forbidden",
                        "message": "확정된 계약은 수정할 수 없습니다. 관리자에게 문의하세요.",
                        "details": {
                            "group_id": str(group_id),
                            "group_name": group.name,
                            "status": "confirmed"
                        }
                    }
                )

            # 확정 상태가 아니면 정상 처리
            return await call_next(request)

        except Exception as e:
            logger.error(f"상태 확인 중 오류: {e}", exc_info=True)
            # 오류 발생 시 정상 처리 (다음 핸들러에서 처리)
            return await call_next(request)

    def _extract_group_id(self, request: Request) -> UUID | None:
        """URL 경로에서 group_id 추출"""
        try:
            # URL 경로에서 group_id 추출
            path_parts = request.url.path.split('/')
            if 'groups' in path_parts:
                idx = path_parts.index('groups')
                if idx + 1 < len(path_parts):
                    group_id_str = path_parts[idx + 1]
                    return UUID(group_id_str)

            # 요청 본문에서 group_id 추출 (필요시)
            # 이 부분은 비동기 처리가 필요하므로 생략
            return None

        except (ValueError, IndexError):
            return None


def is_group_confirmed(group_id: UUID) -> bool:
    """
    단체가 확정 상태인지 확인

    Args:
        group_id: 단체 ID

    Returns:
        True if confirmed, False otherwise
    """
    group = db_session.query(Group).filter_by(id=group_id).first()
    return group and group.status == 'confirmed'


def check_confirmed_and_raise(group_id: UUID):
    """
    확정 상태 확인 및 예외 발생

    API 핸들러 내부에서 직접 사용할 수 있는 헬퍼 함수

    Args:
        group_id: 단체 ID

    Raises:
        HTTPException: 확정 상태인 경우 403 Forbidden
    """
    if is_group_confirmed(group_id):
        group = db_session.query(Group).filter_by(id=group_id).first()
        raise HTTPException(
            status_code=403,
            detail={
                "error": "Forbidden",
                "message": "확정된 계약은 수정할 수 없습니다. 관리자에게 문의하세요.",
                "details": {
                    "group_id": str(group_id),
                    "group_name": group.name if group else "Unknown",
                    "status": "confirmed"
                }
            }
        )
```

**2단계: 미들웨어 등록**

`backend/main.py`에 미들웨어를 등록하세요:

```python
from fastapi import FastAPI
from middleware.state_control import StateControlMiddleware

app = FastAPI()

# 상태 제어 미들웨어 등록
app.add_middleware(StateControlMiddleware)

# ... 나머지 라우터 등록
```

**3단계: 자동 계산 함수에 상태 검증 추가**

`backend/services/calculation.py`의 기존 함수들을 수정하세요:

```python
def recalculate_group(group_id: UUID) -> bool:
    """
    단체 정보 재계산

    확정 상태인 경우 재계산하지 않습니다.
    """
    group = db_session.query(Group).filter_by(id=group_id).first()
    if not group:
        raise ValueError(f"Group not found: {group_id}")

    # 확정 상태 확인
    if group.status == 'confirmed':
        logger.info(f"자동 계산 생략: 단체 {group.id} ({group.name})는 확정 상태입니다")
        return False  # 재계산하지 않음

    # 기존 재계산 로직 실행
    recalculate_nights(group)
    recalculate_days(group)
    recalculate_total_price(group)
    recalculate_balance(group)
    recalculate_balance_due_date(group)

    db_session.commit()
    logger.info(f"자동 계산 완료: 단체 {group.id} ({group.name})")
    return True


def recalculate_itinerary_dates(group_id: UUID, new_start_date: date) -> List[Itinerary]:
    """
    일정 날짜 재계산

    확정 상태인 경우 재계산하지 않습니다.
    """
    group = db_session.query(Group).filter_by(id=group_id).first()
    if not group:
        raise ValueError(f"Group not found: {group_id}")

    # 확정 상태 확인
    if group.status == 'confirmed':
        logger.info(f"일정 재배치 생략: 단체 {group.id} ({group.name})는 확정 상태입니다")
        return []

    # 기존 재계산 로직 실행
    itineraries = db_session.query(Itinerary)\
        .filter_by(group_id=group_id)\
        .order_by(Itinerary.day_no)\
        .all()

    for itinerary in itineraries:
        new_date = new_start_date + timedelta(days=itinerary.day_no - 1)
        itinerary.itinerary_date = new_date

    db_session.commit()
    return itineraries
```

**4단계: 프론트엔드 확정 상태 UI 제어**

`frontend/js/group-detail.js`에 상태별 UI 제어 로직을 추가하세요:

```javascript
/**
 * 확정 상태 UI 제어
 * @param {string} status - 단체 상태 (estimate, contract, confirmed)
 */
function applyStateControl(status) {
    const isConfirmed = status === 'confirmed';

    if (isConfirmed) {
        // 1. 모든 입력 필드 비활성화
        document.querySelectorAll('input, textarea, select').forEach(element => {
            element.disabled = true;
            element.style.backgroundColor = '#f5f5f5';
            element.style.cursor = 'not-allowed';
        });

        // 2. 수정/삭제 버튼 숨김
        const editButtons = document.querySelectorAll('.btn-edit, .btn-delete, .btn-save');
        editButtons.forEach(btn => {
            btn.style.display = 'none';
        });

        // 3. 재계산 버튼 비활성화
        const recalcBtn = document.getElementById('btn-recalculate');
        if (recalcBtn) {
            recalcBtn.disabled = true;
            recalcBtn.classList.add('btn-disabled');
            recalcBtn.title = '확정 상태에서는 재계산할 수 없습니다';
        }

        // 4. 확정 상태 배지 표시
        showConfirmedBadge();

        // 5. 알림 메시지 표시
        showInfoNotification(
            '이 계약은 확정 상태입니다. 수정할 수 없습니다.',
            { persist: true }
        );

        // 6. 일정 추가/삭제 버튼 숨김
        document.querySelectorAll('.btn-add-itinerary, .btn-delete-itinerary').forEach(btn => {
            btn.style.display = 'none';
        });

    } else {
        // 확정 상태가 아니면 정상 활성화
        document.querySelectorAll('input, textarea, select').forEach(element => {
            element.disabled = false;
            element.style.backgroundColor = '';
            element.style.cursor = '';
        });
    }
}

/**
 * 확정 상태 배지 표시
 */
function showConfirmedBadge() {
    const header = document.querySelector('.group-header');
    if (!header) return;

    // 기존 배지 제거
    const existingBadge = header.querySelector('.confirmed-badge');
    if (existingBadge) {
        existingBadge.remove();
    }

    // 새 배지 추가
    const badge = document.createElement('span');
    badge.className = 'confirmed-badge';
    badge.innerHTML = '🔒 확정됨';
    badge.style.cssText = `
        display: inline-block;
        background-color: #28a745;
        color: white;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: bold;
        margin-left: 10px;
    `;
    header.appendChild(badge);
}

/**
 * 상태 변경 전 확인 다이얼로그
 */
function onStatusChange(newStatus) {
    if (newStatus === 'confirmed') {
        const confirmed = confirm(
            '확정 상태로 변경하시겠습니까?\n\n' +
            '확정 후에는 모든 데이터가 잠금 처리되어 수정할 수 없습니다.\n' +
            '신중하게 결정해주세요.'
        );

        if (!confirmed) {
            // 취소하면 이전 상태로 복원
            document.getElementById('status-select').value = currentStatus;
            return;
        }
    }

    // 상태 변경 API 호출
    updateGroupStatus(groupId, newStatus);
}

/**
 * API 오류 처리 (403 Forbidden)
 */
async function handleApiResponse(response) {
    if (response.status === 403) {
        const data = await response.json();
        showErrorNotification(
            data.message || '확정된 계약은 수정할 수 없습니다.'
        );
        return null;
    }

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
}

// 페이지 로드 시 상태 제어 적용
document.addEventListener('DOMContentLoaded', () => {
    const status = getCurrentGroupStatus();
    applyStateControl(status);

    // 상태 변경 이벤트 리스너
    const statusSelect = document.getElementById('status-select');
    if (statusSelect) {
        statusSelect.addEventListener('change', (e) => {
            onStatusChange(e.target.value);
        });
    }
});
```

**5단계: CSS 스타일 추가**

`frontend/css/group-detail.css`에 확정 상태 스타일을 추가하세요:

```css
/* 확정 상태 입력 필드 스타일 */
input:disabled,
textarea:disabled,
select:disabled {
    background-color: #f5f5f5 !important;
    cursor: not-allowed !important;
    opacity: 0.7;
}

/* 확정 상태 배지 */
.confirmed-badge {
    display: inline-block;
    background-color: #28a745;
    color: white;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: bold;
    margin-left: 10px;
}

/* 비활성화된 버튼 */
.btn-disabled {
    opacity: 0.5;
    cursor: not-allowed !important;
    pointer-events: none;
}

/* 확정 상태 알림 */
.confirmed-notification {
    background-color: #fff3cd;
    border-left: 4px solid #ffc107;
    padding: 12px 16px;
    margin-bottom: 16px;
    border-radius: 4px;
}

.confirmed-notification::before {
    content: '🔒 ';
    font-size: 16px;
}
```

**중요 사항:**
- **확정 상태 변경은 신중하게**: 확정 상태로 변경하면 되돌릴 수 없으므로 관리자 권한이 필요합니다 (T-STATE-03에서 구현)
- **미들웨어 순서**: StateControlMiddleware는 인증 미들웨어 이후에 등록해야 합니다
- **GET 요청은 허용**: 확정 상태에서도 데이터 조회는 가능해야 합니다
- **일정 날짜는 예외**: 다른 자동 계산 필드와 달리 일정 날짜도 확정 상태에서는 재계산되지 않습니다 (기존과 다른 동작)
- **에러 메시지 일관성**: 모든 403 응답은 동일한 포맷으로 에러 메시지를 반환해야 합니다
- **로그 기록**: 확정 상태 수정 시도는 모두 로그로 기록하여 감사 추적이 가능하도록 합니다

**검증 방법:**

1. **단위 테스트** (`tests/test_state_control.py`):
```python
import pytest
from fastapi.testclient import TestClient
from main import app
from models import Group
from database import db_session

client = TestClient(app)

def test_confirmed_group_cannot_be_modified():
    """확정 상태 단체는 수정할 수 없음"""
    # Given: 확정 상태 단체
    group = create_test_group(status='confirmed')

    # When: 단체 정보 수정 시도
    response = client.put(f"/api/groups/{group.id}", json={
        "name": "수정된 단체명",
        "pax": 25
    })

    # Then: 403 Forbidden 응답
    assert response.status_code == 403
    assert "확정된 계약은 수정할 수 없습니다" in response.json()["message"]


def test_confirmed_group_recalculation_blocked():
    """확정 상태 단체는 재계산할 수 없음"""
    # Given: 확정 상태 단체
    group = create_test_group(status='confirmed')

    # When: 재계산 API 호출
    response = client.post(f"/api/groups/{group.id}/recalculate")

    # Then: 403 Forbidden 응답
    assert response.status_code == 403


def test_estimate_group_can_be_modified():
    """견적 상태 단체는 수정 가능"""
    # Given: 견적 상태 단체
    group = create_test_group(status='estimate')

    # When: 단체 정보 수정
    response = client.put(f"/api/groups/{group.id}", json={
        "name": "수정된 단체명",
        "pax": 25
    })

    # Then: 200 OK 응답
    assert response.status_code == 200


def test_confirmed_group_auto_calculation_skipped():
    """확정 상태 단체는 자동 계산 생략"""
    # Given: 확정 상태 단체
    group = create_test_group(status='confirmed', pax=20, price_per_pax=1000000)
    original_total = group.total_price

    # When: 재계산 함수 호출
    result = recalculate_group(group.id)

    # Then: 재계산 실행 안 됨
    assert result == False

    # 값이 변경되지 않음
    group = db_session.query(Group).filter_by(id=group.id).first()
    assert group.total_price == original_total
```

2. **통합 테스트**:
   - 견적 상태로 단체 생성
   - 계약 상태로 변경
   - 확정 상태로 변경
   - 수정 시도 → 403 응답 확인
   - 재계산 시도 → 403 응답 확인
   - GET 요청 → 200 응답 확인 (조회는 가능)

3. **프론트엔드 테스트**:
   - 확정 상태 단체 페이지 열기
   - 모든 입력 필드가 비활성화되었는지 확인
   - 수정/삭제 버튼이 숨겨졌는지 확인
   - 확정 배지가 표시되는지 확인
   - 재계산 버튼이 비활성화되었는지 확인

4. **수동 테스트 시나리오**:
   ```
   1. 단체 생성 (견적 상태)
   2. 데이터 입력 및 저장 → 성공
   3. 계약 상태로 변경
   4. 데이터 수정 → 성공
   5. 확정 상태로 변경 → 확인 다이얼로그 표시
   6. 확정 승인
   7. 데이터 수정 시도 → 403 에러, 알림 표시
   8. 입력 필드 클릭 → 비활성화 상태, 커서 변경 없음
   9. 재계산 버튼 클릭 → 비활성화, 툴팁 표시
   10. 데이터 조회 → 정상 동작
   ```

**산출물:**
- `backend/middleware/state_control.py`: 상태 확인 미들웨어 및 헬퍼 함수
- `backend/services/calculation.py` (수정): 자동 계산 함수에 상태 검증 추가
- `frontend/js/group-detail.js` (수정): 확정 상태 UI 제어 로직
- `frontend/css/group-detail.css` (수정): 확정 상태 스타일
- `tests/test_state_control.py`: 단위 테스트
- `tests/test_state_control_integration.py`: 통합 테스트

**의존성:**
- **선행 task**:
  - T-DB-01 (groups 테이블의 status 컬럼 필요)
  - T-API-02, T-API-03 (단체 수정 API 필요)
  - T-CALC-06 (recalculate_group 함수 필요)
- **후행 task**:
  - T-STATE-02 (상태 전환 검증 로직)
  - T-STATE-03 (권한 제어 - 관리자만 확정 상태 변경 가능)

---

### T-STATE-02 상태 전환 검증 로직

**참조 문서:**
- PRD Section 10: 상태별 제어 규칙 (견적 → 계약 → 확정 순서)
- PRD Section 12.2.3: 비즈니스 규칙 검증 (상태 전환 규칙)
- TRD Section 4.6.2: HTTP 상태 코드 (400 Bad Request - 잘못된 상태 전환)

**목표**:
상태 전환 규칙을 검증하여 견적 → 계약 → 확정 순서만 허용하고, 역전환 및 단계 건너뛰기를 방지합니다.

**배경:**
PRD Section 10과 12.2.3에 따르면, 단체의 상태는 다음 순서로만 전환될 수 있습니다:
1. **견적 (estimate)** → **계약 (contract)**: 허용
2. **계약 (contract)** → **확정 (confirmed)**: 허용 (관리자만)
3. **견적 (estimate)** → **확정 (confirmed)**: 불가 (중간 단계 필수)
4. **역전환 (확정 → 계약, 계약 → 견적 등)**: 불가

이는 업무 프로세스를 명확하게 정의하고, 계약 절차의 무결성을 보장하기 위한 핵심 비즈니스 규칙입니다.

**잘못된 상태 전환 예시:**
- 견적 → 확정: "계약 단계를 거쳐야 합니다"
- 확정 → 계약: "확정된 계약은 이전 상태로 되돌릴 수 없습니다"
- 확정 → 견적: "확정된 계약은 이전 상태로 되돌릴 수 없습니다"
- 계약 → 견적: "계약 상태에서 견적 상태로 되돌릴 수 없습니다"

**작업 내용:**

1. **상태 전환 검증 함수 구현**

   `backend/services/state_validation.py` 파일을 생성하고 상태 전환 규칙을 검증하는 함수를 구현하세요.

   **검증 규칙:**
   - 현재 상태와 새 상태를 비교하여 유효한 전환인지 확인
   - 허용된 전환 경로를 명시적으로 정의
   - 잘못된 전환 시도 시 구체적인 에러 메시지 반환

   **상태 전환 매트릭스:**
   ```
   From\To   | estimate | contract | confirmed
   ----------|----------|----------|----------
   estimate  |    ✓     |    ✓     |    ✗
   contract  |    ✗     |    ✓     |    ✓
   confirmed |    ✗     |    ✗     |    ✓
   ```

2. **API 엔드포인트에 검증 로직 적용**

   단체 수정 API (`PUT /api/groups/{group_id}`)에서 상태 변경 요청이 있을 때 검증 함수를 호출하세요.

   **검증 절차:**
   1. 요청 데이터에서 새로운 status 확인
   2. 데이터베이스에서 현재 상태 조회
   3. 상태 변경이 있는 경우 validate_state_transition() 호출
   4. 검증 실패 시 400 Bad Request 응답 반환
   5. 검증 성공 시 정상 처리

3. **프론트엔드 상태 전환 UI**

   상태 변경 드롭다운에서 허용되지 않은 상태를 선택할 수 없도록 제어하세요.

   **UI 동작:**
   - 현재 상태에 따라 선택 가능한 상태만 드롭다운에 표시
   - 예: 견적 상태일 때는 "견적", "계약"만 표시 (확정은 숨김)
   - 계약 상태일 때는 "계약", "확정"만 표시 (견적은 숨김)
   - 확정 상태일 때는 "확정"만 표시 (변경 불가)

**실행 절차:**

**1단계: 상태 전환 검증 함수 구현**

`backend/services/state_validation.py` 파일을 생성하세요:

```python
"""
상태 전환 검증 로직
견적 → 계약 → 확정 순서만 허용
"""
from typing import Tuple
import logging

logger = logging.getLogger(__name__)

# 상태 정의
STATUS_ESTIMATE = 'estimate'
STATUS_CONTRACT = 'contract'
STATUS_CONFIRMED = 'confirmed'

# 허용된 상태 전환 매핑
ALLOWED_TRANSITIONS = {
    STATUS_ESTIMATE: [STATUS_ESTIMATE, STATUS_CONTRACT],
    STATUS_CONTRACT: [STATUS_CONTRACT, STATUS_CONFIRMED],
    STATUS_CONFIRMED: [STATUS_CONFIRMED]
}

# 상태 전환 순서 (숫자가 클수록 나중 단계)
STATUS_ORDER = {
    STATUS_ESTIMATE: 1,
    STATUS_CONTRACT: 2,
    STATUS_CONFIRMED: 3
}

# 에러 메시지 정의
ERROR_MESSAGES = {
    'skip_step': '계약 단계를 거쳐야 합니다. 견적에서 바로 확정으로 변경할 수 없습니다.',
    'backward': '이전 상태로 되돌릴 수 없습니다. 상태는 견적 → 계약 → 확정 순서로만 진행됩니다.',
    'invalid_status': '유효하지 않은 상태 값입니다: {status}',
    'same_status': '현재 상태와 동일합니다.',
    'confirmed_locked': '확정된 계약은 상태를 변경할 수 없습니다.'
}


def validate_state_transition(
    current_status: str,
    new_status: str
) -> Tuple[bool, str]:
    """
    상태 전환 유효성 검증

    Args:
        current_status: 현재 상태
        new_status: 새로운 상태

    Returns:
        Tuple[bool, str]: (유효성 여부, 에러 메시지)
        - (True, ""): 유효한 전환
        - (False, "에러 메시지"): 유효하지 않은 전환
    """
    # 1. 상태 값 유효성 검증
    if current_status not in STATUS_ORDER:
        return False, ERROR_MESSAGES['invalid_status'].format(status=current_status)

    if new_status not in STATUS_ORDER:
        return False, ERROR_MESSAGES['invalid_status'].format(status=new_status)

    # 2. 동일 상태 확인 (경고는 하지 않고 허용)
    if current_status == new_status:
        logger.info(f"상태 변경 없음: {current_status}")
        return True, ""

    # 3. 허용된 전환인지 확인
    if new_status not in ALLOWED_TRANSITIONS[current_status]:
        # 역전환인지 단계 건너뛰기인지 구분
        current_order = STATUS_ORDER[current_status]
        new_order = STATUS_ORDER[new_status]

        if new_order < current_order:
            # 역전환 (예: 계약 → 견적, 확정 → 계약)
            return False, ERROR_MESSAGES['backward']
        else:
            # 단계 건너뛰기 (예: 견적 → 확정)
            return False, ERROR_MESSAGES['skip_step']

    # 4. 유효한 전환
    logger.info(f"유효한 상태 전환: {current_status} → {new_status}")
    return True, ""


def can_transition_to(current_status: str, target_status: str) -> bool:
    """
    특정 상태로 전환 가능한지 확인 (간단한 버전)

    Args:
        current_status: 현재 상태
        target_status: 목표 상태

    Returns:
        True if transition is allowed, False otherwise
    """
    is_valid, _ = validate_state_transition(current_status, target_status)
    return is_valid


def get_allowed_next_statuses(current_status: str) -> list[str]:
    """
    현재 상태에서 전환 가능한 상태 목록 반환

    Args:
        current_status: 현재 상태

    Returns:
        전환 가능한 상태 목록
    """
    if current_status not in ALLOWED_TRANSITIONS:
        return []

    # 현재 상태는 제외하고 반환
    allowed = ALLOWED_TRANSITIONS[current_status].copy()
    if current_status in allowed:
        allowed.remove(current_status)

    return allowed


class StateTransitionError(Exception):
    """상태 전환 오류 예외"""
    pass


def validate_state_transition_or_raise(
    current_status: str,
    new_status: str
):
    """
    상태 전환 검증 및 예외 발생

    API 핸들러에서 사용하기 편한 버전

    Args:
        current_status: 현재 상태
        new_status: 새로운 상태

    Raises:
        StateTransitionError: 유효하지 않은 상태 전환인 경우
    """
    is_valid, error_message = validate_state_transition(current_status, new_status)

    if not is_valid:
        logger.warning(
            f"상태 전환 실패: {current_status} → {new_status}, "
            f"사유: {error_message}"
        )
        raise StateTransitionError(error_message)
```

**2단계: API 엔드포인트에 검증 로직 적용**

`backend/routers/groups.py`의 단체 수정 API를 수정하세요:

```python
from fastapi import APIRouter, HTTPException, Path
from services.state_validation import (
    validate_state_transition,
    StateTransitionError
)

router = APIRouter()

@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: UUID = Path(..., description="단체 ID"),
    group_data: GroupUpdate = Body(..., description="수정할 단체 정보")
):
    """
    단체 정보 수정

    상태 변경 시 전환 규칙을 검증합니다.
    """
    # 1. 기존 단체 조회
    group = db_session.query(Group).filter_by(id=group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="단체를 찾을 수 없습니다")

    # 2. 상태 변경 검증
    if group_data.status and group_data.status != group.status:
        is_valid, error_message = validate_state_transition(
            current_status=group.status,
            new_status=group_data.status
        )

        if not is_valid:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Invalid State Transition",
                    "message": error_message,
                    "details": {
                        "current_status": group.status,
                        "requested_status": group_data.status
                    }
                }
            )

        logger.info(
            f"상태 전환: group_id={group_id}, "
            f"{group.status} → {group_data.status}"
        )

    # 3. 데이터 업데이트
    for field, value in group_data.dict(exclude_unset=True).items():
        setattr(group, field, value)

    db_session.commit()
    db_session.refresh(group)

    return group
```

**3단계: 프론트엔드 상태 드롭다운 동적 제어**

`frontend/js/group-detail.js`에 상태 드롭다운 제어 로직을 추가하세요:

```javascript
/**
 * 상태 전환 규칙 정의
 */
const STATE_TRANSITIONS = {
    'estimate': ['estimate', 'contract'],
    'contract': ['contract', 'confirmed'],
    'confirmed': ['confirmed']
};

const STATE_LABELS = {
    'estimate': '견적',
    'contract': '계약',
    'confirmed': '확정'
};

/**
 * 현재 상태에 따라 상태 드롭다운 옵션 필터링
 * @param {string} currentStatus - 현재 상태
 */
function updateStatusDropdown(currentStatus) {
    const statusSelect = document.getElementById('status-select');
    if (!statusSelect) return;

    // 허용된 상태 목록 가져오기
    const allowedStatuses = STATE_TRANSITIONS[currentStatus] || [];

    // 기존 옵션 제거
    statusSelect.innerHTML = '';

    // 허용된 상태만 옵션으로 추가
    allowedStatuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = STATE_LABELS[status];
        option.selected = (status === currentStatus);
        statusSelect.appendChild(option);
    });

    // 확정 상태면 드롭다운 비활성화
    if (currentStatus === 'confirmed') {
        statusSelect.disabled = true;
        statusSelect.title = '확정된 계약은 상태를 변경할 수 없습니다';
    } else {
        statusSelect.disabled = false;
        statusSelect.title = '';
    }
}

/**
 * 상태 변경 처리
 * @param {UUID} groupId - 단체 ID
 * @param {string} newStatus - 새로운 상태
 */
async function updateGroupStatus(groupId, newStatus) {
    try {
        const response = await fetch(`/api/groups/${groupId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.status === 400) {
            // 상태 전환 검증 실패
            const data = await response.json();
            showErrorNotification(
                data.detail.message || '유효하지 않은 상태 전환입니다'
            );

            // 드롭다운을 이전 상태로 복원
            const statusSelect = document.getElementById('status-select');
            statusSelect.value = currentStatus;
            return;
        }

        if (response.status === 403) {
            // 권한 없음 (확정 상태로 변경 시도)
            const data = await response.json();
            showErrorNotification(
                data.detail.message || '권한이 없습니다'
            );

            // 드롭다운을 이전 상태로 복원
            const statusSelect = document.getElementById('status-select');
            statusSelect.value = currentStatus;
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const updatedGroup = await response.json();

        // 성공 알림
        showSuccessNotification(`상태가 '${STATE_LABELS[newStatus]}'(으)로 변경되었습니다`);

        // 현재 상태 업데이트
        currentStatus = newStatus;

        // UI 업데이트
        updateStatusDropdown(newStatus);
        applyStateControl(newStatus);  // T-STATE-01의 함수

        // 페이지 새로고침 (선택사항)
        // location.reload();

    } catch (error) {
        console.error('상태 변경 오류:', error);
        showErrorNotification('상태 변경 중 오류가 발생했습니다');

        // 드롭다운을 이전 상태로 복원
        const statusSelect = document.getElementById('status-select');
        statusSelect.value = currentStatus;
    }
}

/**
 * 상태 변경 전 확인 다이얼로그 (T-STATE-01에서 확장)
 */
function onStatusChange(newStatus) {
    // 동일 상태면 무시
    if (newStatus === currentStatus) {
        return;
    }

    // 확정 상태로 변경 시 특별 확인
    if (newStatus === 'confirmed') {
        const confirmed = confirm(
            '⚠️ 확정 상태로 변경하시겠습니까?\n\n' +
            '확정 후에는:\n' +
            '• 모든 데이터가 잠금 처리됩니다\n' +
            '• 자동 계산이 비활성화됩니다\n' +
            '• 이전 상태로 되돌릴 수 없습니다\n\n' +
            '신중하게 결정해주세요.'
        );

        if (!confirmed) {
            // 취소하면 이전 상태로 복원
            document.getElementById('status-select').value = currentStatus;
            return;
        }
    }

    // 상태 변경 API 호출
    updateGroupStatus(groupId, newStatus);
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    const status = getCurrentGroupStatus();
    currentStatus = status;  // 전역 변수로 현재 상태 저장

    updateStatusDropdown(status);
    applyStateControl(status);

    // 상태 변경 이벤트 리스너
    const statusSelect = document.getElementById('status-select');
    if (statusSelect) {
        statusSelect.addEventListener('change', (e) => {
            onStatusChange(e.target.value);
        });
    }
});
```

**중요 사항:**
- **중간 단계 생략 불가**: 견적에서 바로 확정으로 변경할 수 없습니다. 반드시 계약 단계를 거쳐야 합니다
- **역전환 불가**: 확정 → 계약, 계약 → 견적 등 이전 상태로 되돌릴 수 없습니다
- **확정 상태 잠금**: 확정 상태에서는 다른 상태로 변경할 수 없습니다 (T-STATE-01과 연계)
- **프론트엔드 사전 검증**: 백엔드 검증 전에 프론트엔드에서도 불가능한 전환을 UI로 차단합니다
- **명확한 에러 메시지**: 잘못된 전환 시도 시 사용자가 이해할 수 있는 구체적인 메시지를 제공합니다

**검증 방법:**

1. **단위 테스트** (`tests/test_state_validation.py`):
```python
import pytest
from services.state_validation import (
    validate_state_transition,
    can_transition_to,
    get_allowed_next_statuses,
    StateTransitionError,
    validate_state_transition_or_raise
)

def test_estimate_to_contract_allowed():
    """견적 → 계약: 허용"""
    is_valid, error = validate_state_transition('estimate', 'contract')
    assert is_valid == True
    assert error == ""


def test_contract_to_confirmed_allowed():
    """계약 → 확정: 허용"""
    is_valid, error = validate_state_transition('contract', 'confirmed')
    assert is_valid == True
    assert error == ""


def test_estimate_to_confirmed_blocked():
    """견적 → 확정: 차단 (단계 건너뛰기)"""
    is_valid, error = validate_state_transition('estimate', 'confirmed')
    assert is_valid == False
    assert "계약 단계를 거쳐야 합니다" in error


def test_confirmed_to_contract_blocked():
    """확정 → 계약: 차단 (역전환)"""
    is_valid, error = validate_state_transition('confirmed', 'contract')
    assert is_valid == False
    assert "이전 상태로 되돌릴 수 없습니다" in error


def test_contract_to_estimate_blocked():
    """계약 → 견적: 차단 (역전환)"""
    is_valid, error = validate_state_transition('contract', 'estimate')
    assert is_valid == False
    assert "이전 상태로 되돌릴 수 없습니다" in error


def test_same_status_allowed():
    """동일 상태: 허용"""
    is_valid, error = validate_state_transition('estimate', 'estimate')
    assert is_valid == True


def test_get_allowed_next_statuses_from_estimate():
    """견적 상태에서 전환 가능한 상태: [계약]"""
    allowed = get_allowed_next_statuses('estimate')
    assert allowed == ['contract']


def test_get_allowed_next_statuses_from_contract():
    """계약 상태에서 전환 가능한 상태: [확정]"""
    allowed = get_allowed_next_statuses('contract')
    assert allowed == ['confirmed']


def test_get_allowed_next_statuses_from_confirmed():
    """확정 상태에서 전환 가능한 상태: []"""
    allowed = get_allowed_next_statuses('confirmed')
    assert allowed == []


def test_validate_state_transition_or_raise_success():
    """예외 발생 함수 - 성공 케이스"""
    # 예외 발생하지 않음
    validate_state_transition_or_raise('estimate', 'contract')


def test_validate_state_transition_or_raise_failure():
    """예외 발생 함수 - 실패 케이스"""
    with pytest.raises(StateTransitionError) as exc_info:
        validate_state_transition_or_raise('estimate', 'confirmed')

    assert "계약 단계를 거쳐야 합니다" in str(exc_info.value)
```

2. **API 통합 테스트** (`tests/test_state_transition_api.py`):
```python
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_api_estimate_to_confirmed_blocked():
    """API: 견적 → 확정 변경 차단"""
    # Given: 견적 상태 단체
    group = create_test_group(status='estimate')

    # When: 확정 상태로 변경 시도
    response = client.put(f"/api/groups/{group.id}", json={
        "status": "confirmed"
    })

    # Then: 400 Bad Request
    assert response.status_code == 400
    data = response.json()
    assert "계약 단계를 거쳐야 합니다" in data["detail"]["message"]


def test_api_status_transition_sequence():
    """API: 정상적인 상태 전환 시퀀스"""
    # 1. 견적 상태 단체 생성
    group = create_test_group(status='estimate')
    assert group.status == 'estimate'

    # 2. 견적 → 계약
    response = client.put(f"/api/groups/{group.id}", json={
        "status": "contract"
    })
    assert response.status_code == 200
    assert response.json()["status"] == "contract"

    # 3. 계약 → 확정
    response = client.put(f"/api/groups/{group.id}", json={
        "status": "confirmed"
    })
    assert response.status_code == 200
    assert response.json()["status"] == "confirmed"

    # 4. 확정 → 계약 (역전환 시도 - 실패해야 함)
    response = client.put(f"/api/groups/{group.id}", json={
        "status": "contract"
    })
    assert response.status_code == 400
```

3. **수동 테스트 시나리오**:
   ```
   1. 단체 생성 (견적 상태)
   2. 상태 드롭다운 확인 → "견적", "계약"만 표시
   3. 계약 상태로 변경 → 성공
   4. 상태 드롭다운 확인 → "계약", "확정"만 표시
   5. 견적 상태로 변경 시도 → 옵션 없음 (UI 차단)
   6. 확정 상태로 변경 → 확인 다이얼로그, 성공
   7. 상태 드롭다운 확인 → "확정"만 표시, 비활성화
   8. 다른 상태로 변경 시도 → 불가능

   9. 새 단체 생성 (견적 상태)
   10. API로 직접 확정 상태 변경 시도 (Postman 등)
   11. 400 에러 응답 확인
   12. 에러 메시지 확인: "계약 단계를 거쳐야 합니다"
   ```

**산출물:**
- `backend/services/state_validation.py`: 상태 전환 검증 로직
- `backend/routers/groups.py` (수정): API에 상태 전환 검증 추가
- `frontend/js/group-detail.js` (수정): 상태 드롭다운 동적 제어
- `tests/test_state_validation.py`: 단위 테스트
- `tests/test_state_transition_api.py`: API 통합 테스트

**의존성:**
- **선행 task**:
  - T-DB-01 (groups 테이블의 status 컬럼 필요)
  - T-API-03 (단체 수정 API 필요)
- **후행 task**:
  - T-STATE-03 (권한 제어 - 관리자만 확정 상태 변경)
  - T-LOG-02, T-LOG-03 (상태 전환 로그 기록)

---

### T-STATE-03 권한 제어 시스템

**참조 문서:**
- PRD Section 10: 상태별 제어 규칙 (관리자만 확정 변경 가능)
- TRD Section 10: 보안 및 권한 (내부 사용자 인증, 관리자 권한)
- TRD Section 4.6.2: HTTP 상태 코드 (403 Forbidden - 권한 없음)

**목표**:
역할 기반 권한 제어(RBAC)를 구현하여 관리자만 확정 상태로 변경하고 문서를 삭제할 수 있도록 제한합니다.

**배경:**
PRD Section 10과 TRD Section 10에 따르면, 다음과 같은 권한 제어가 필요합니다:
- **관리자만 상태를 '확정'으로 변경 가능**: 확정은 중요한 의사결정이므로 관리자 권한 필요
- **관리자만 문서 삭제 가능**: 문서 이력은 감사 추적을 위해 보존되어야 하므로 관리자만 삭제 가능
- **내부 사용자 인증 필수**: 모든 API 접근에 인증 필요

**사용자 역할:**
1. **실무자 (user)**:
   - 단체 생성, 수정 (견적 ↔ 계약 상태만)
   - 데이터 입력 및 수정
   - 문서 생성 및 다운로드
   - 문서 삭제 불가

2. **관리자 (admin)**:
   - 실무자의 모든 권한
   - 상태를 '확정'으로 변경 가능
   - 문서 삭제 가능
   - 감사 로그 조회 가능

**작업 내용:**

1. **사용자 모델 및 역할 정의**

   `backend/models.py`에 사용자 모델과 역할을 정의하세요.

   **User 모델 컬럼:**
   - `id`: UUID, PRIMARY KEY
   - `username`: VARCHAR, UNIQUE, 사용자 이름
   - `email`: VARCHAR, UNIQUE, 이메일
   - `hashed_password`: VARCHAR, 해시된 비밀번호
   - `role`: VARCHAR, 역할 ('user' 또는 'admin')
   - `is_active`: BOOLEAN, 활성 상태
   - `created_at`: TIMESTAMP, 생성 일시

2. **JWT 인증 구현**

   FastAPI의 OAuth2PasswordBearer를 사용하여 JWT 기반 인증을 구현하세요.

   **인증 흐름:**
   1. 사용자 로그인 → username/password 검증
   2. JWT 토큰 발급 (role 정보 포함)
   3. 이후 요청 시 Authorization 헤더에 토큰 포함
   4. 미들웨어에서 토큰 검증 및 사용자 정보 추출
   5. 권한 확인 후 요청 처리

3. **권한 검증 미들웨어 및 데코레이터**

   `backend/middleware/auth.py`에 권한 검증 로직을 구현하세요.

   **기능:**
   - `require_auth`: 인증된 사용자만 접근 가능
   - `require_admin`: 관리자만 접근 가능
   - 토큰 검증 및 사용자 역할 확인

4. **상태 '확정' 변경 권한 제한**

   단체 수정 API에서 상태를 'confirmed'로 변경하려 할 때 관리자 권한을 확인하세요.

   **검증 로직:**
   - 요청 사용자의 role이 'admin'인지 확인
   - 'user' 역할이 'confirmed'로 변경 시도 시 403 Forbidden 응답

5. **문서 삭제 API 권한 제한**

   `DELETE /api/documents/{document_id}` 엔드포인트에 관리자 권한을 요구하세요.

6. **프론트엔드 역할 기반 UI 표시**

   사용자 역할에 따라 UI 요소를 조건부로 표시하세요.

   **예시:**
   - 관리자: '확정' 상태 선택 가능, 문서 삭제 버튼 표시
   - 실무자: '확정' 상태 선택 불가, 문서 삭제 버튼 숨김

**실행 절차:**

**1단계: 사용자 모델 정의**

`backend/models.py`에 User 모델을 추가하세요:

```python
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from uuid import uuid4
from database import Base

class User(Base):
    """사용자 모델"""
    __tablename__ = 'users'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default='user')  # 'user' or 'admin'
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<User(username='{self.username}', role='{self.role}')>"

    def is_admin(self) -> bool:
        """관리자 여부 확인"""
        return self.role == 'admin'
```

**2단계: JWT 인증 구현**

`backend/services/auth.py` 파일을 생성하세요:

```python
"""
JWT 기반 인증 서비스
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from models import User
from database import db_session

# JWT 설정
SECRET_KEY = "your-secret-key-here"  # 실제 환경에서는 환경 변수로 관리
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8시간

# 비밀번호 해싱
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 스킴
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """비밀번호 검증"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """비밀번호 해싱"""
    return pwd_context.hash(password)


def authenticate_user(username: str, password: str) -> Optional[User]:
    """
    사용자 인증

    Args:
        username: 사용자 이름
        password: 비밀번호

    Returns:
        User 객체 또는 None
    """
    user = db_session.query(User).filter_by(username=username).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    JWT 액세스 토큰 생성

    Args:
        data: 토큰에 포함할 데이터 (sub, role 등)
        expires_delta: 만료 시간

    Returns:
        JWT 토큰 문자열
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    현재 사용자 가져오기 (토큰 검증)

    Args:
        token: JWT 토큰

    Returns:
        User 객체

    Raises:
        HTTPException: 인증 실패 시 401
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="인증 정보가 유효하지 않습니다",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db_session.query(User).filter_by(username=username).first()
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="사용자 계정이 비활성화되었습니다"
        )

    return user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    현재 사용자가 관리자인지 확인

    Args:
        current_user: 현재 로그인한 사용자

    Returns:
        User 객체 (관리자인 경우)

    Raises:
        HTTPException: 관리자가 아닌 경우 403
    """
    if not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 권한이 필요합니다"
        )
    return current_user


def require_role(required_role: str):
    """
    특정 역할을 요구하는 데코레이터

    Args:
        required_role: 필요한 역할 ('user' 또는 'admin')

    Returns:
        데코레이터 함수
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if required_role == 'admin' and not current_user.is_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="관리자 권한이 필요합니다"
            )
        return current_user

    return role_checker
```

**3단계: 로그인 API 구현**

`backend/routers/auth.py` 파일을 생성하세요:

```python
"""
인증 API
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from services.auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from models import User
from datetime import timedelta

router = APIRouter()

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str


class UserInfo(BaseModel):
    username: str
    email: str
    role: str
    is_active: bool


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    로그인 및 JWT 토큰 발급

    Args:
        form_data: username, password

    Returns:
        JWT 액세스 토큰
    """
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="사용자 이름 또는 비밀번호가 올바르지 않습니다",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username
    }


@router.get("/me", response_model=UserInfo)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    현재 로그인한 사용자 정보 조회
    """
    return {
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active
    }
```

**4단계: 단체 수정 API에 권한 검증 추가**

`backend/routers/groups.py`를 수정하세요:

```python
from fastapi import APIRouter, Depends, HTTPException
from services.auth import get_current_user, get_current_admin_user
from models import User, Group

router = APIRouter()

@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: UUID,
    group_data: GroupUpdate,
    current_user: User = Depends(get_current_user)  # 인증 필수
):
    """
    단체 정보 수정

    상태를 '확정'으로 변경하려면 관리자 권한이 필요합니다.
    """
    # 1. 기존 단체 조회
    group = db_session.query(Group).filter_by(id=group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="단체를 찾을 수 없습니다")

    # 2. 상태 변경 권한 확인
    if group_data.status == 'confirmed' and group.status != 'confirmed':
        # 확정 상태로 변경 시도
        if not current_user.is_admin():
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "Forbidden",
                    "message": "관리자만 확정 상태로 변경할 수 있습니다",
                    "details": {
                        "current_role": current_user.role,
                        "required_role": "admin"
                    }
                }
            )

    # 3. 상태 전환 검증 (T-STATE-02)
    if group_data.status and group_data.status != group.status:
        is_valid, error_message = validate_state_transition(
            current_status=group.status,
            new_status=group_data.status
        )

        if not is_valid:
            raise HTTPException(status_code=400, detail=error_message)

    # 4. 데이터 업데이트
    for field, value in group_data.dict(exclude_unset=True).items():
        setattr(group, field, value)

    db_session.commit()
    db_session.refresh(group)

    logger.info(
        f"단체 수정: group_id={group_id}, user={current_user.username}, "
        f"role={current_user.role}"
    )

    return group
```

**5단계: 문서 삭제 API에 관리자 권한 요구**

`backend/routers/documents.py`를 수정하세요:

```python
from fastapi import APIRouter, Depends, HTTPException
from services.auth import get_current_admin_user
from models import User, Document

router = APIRouter()

@router.delete("/{document_id}")
async def delete_document(
    document_id: UUID,
    current_user: User = Depends(get_current_admin_user)  # 관리자만 허용
):
    """
    문서 삭제

    관리자 권한 필요
    """
    document = db_session.query(Document).filter_by(id=document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다")

    # 파일 삭제
    if os.path.exists(document.file_path):
        os.remove(document.file_path)

    # DB 레코드 삭제
    db_session.delete(document)
    db_session.commit()

    logger.info(
        f"문서 삭제: document_id={document_id}, file_name={document.file_name}, "
        f"deleted_by={current_user.username}"
    )

    return {"message": "문서가 삭제되었습니다", "document_id": str(document_id)}
```

**6단계: 프론트엔드 역할 기반 UI**

`frontend/js/auth.js` 파일을 생성하세요:

```javascript
/**
 * 인증 및 권한 관리
 */

let currentUser = null;

/**
 * 로그인
 */
async function login(username, password) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
        });

        if (!response.ok) {
            throw new Error('로그인 실패');
        }

        const data = await response.json();

        // 토큰 저장
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user_role', data.role);
        localStorage.setItem('username', data.username);

        currentUser = {
            username: data.username,
            role: data.role
        };

        return data;

    } catch (error) {
        console.error('로그인 오류:', error);
        throw error;
    }
}

/**
 * 로그아웃
 */
function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('username');
    currentUser = null;
    window.location.href = '/login.html';
}

/**
 * 현재 사용자 역할 가져오기
 */
function getCurrentUserRole() {
    return localStorage.getItem('user_role') || 'user';
}

/**
 * 관리자 여부 확인
 */
function isAdmin() {
    return getCurrentUserRole() === 'admin';
}

/**
 * Authorization 헤더 가져오기
 */
function getAuthHeader() {
    const token = localStorage.getItem('access_token');
    return token ? `Bearer ${token}` : '';
}

/**
 * 역할 기반 UI 표시
 */
function applyRoleBasedUI() {
    const role = getCurrentUserRole();

    if (role !== 'admin') {
        // 실무자인 경우

        // 1. 문서 삭제 버튼 숨김
        document.querySelectorAll('.btn-delete-document').forEach(btn => {
            btn.style.display = 'none';
        });

        // 2. 상태 드롭다운에서 '확정' 옵션 제거
        const statusSelect = document.getElementById('status-select');
        if (statusSelect) {
            const confirmedOption = statusSelect.querySelector('option[value="confirmed"]');
            if (confirmedOption) {
                confirmedOption.remove();
            }
        }

        // 3. 관리자 전용 메뉴 숨김
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'none';
        });
    }
}

/**
 * API 요청 (인증 토큰 포함)
 */
async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('access_token');

    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        // 401 Unauthorized - 토큰 만료 또는 유효하지 않음
        if (response.status === 401) {
            logout();
            return;
        }

        return response;

    } catch (error) {
        console.error('API 요청 오류:', error);
        throw error;
    }
}

// 페이지 로드 시 역할 기반 UI 적용
document.addEventListener('DOMContentLoaded', () => {
    applyRoleBasedUI();

    // 사용자 정보 표시
    const username = localStorage.getItem('username');
    const role = getCurrentUserRole();
    if (username) {
        const userInfo = document.getElementById('user-info');
        if (userInfo) {
            userInfo.textContent = `${username} (${role === 'admin' ? '관리자' : '실무자'})`;
        }
    }
});
```

**중요 사항:**
- **JWT 토큰 보안**: SECRET_KEY는 환경 변수로 관리하고, 절대 코드에 하드코딩하지 마세요
- **토큰 만료 시간**: 8시간으로 설정했지만, 보안 정책에 따라 조정 가능합니다
- **비밀번호 해싱**: bcrypt를 사용하여 안전하게 저장합니다
- **HTTPS 사용**: 프로덕션 환경에서는 반드시 HTTPS를 사용하여 토큰을 보호해야 합니다
- **프론트엔드 검증은 보조적**: 프론트엔드 UI 제어는 사용자 편의를 위한 것이며, 실제 권한 검증은 반드시 백엔드에서 수행해야 합니다

**검증 방법:**

1. **단위 테스트** (`tests/test_auth.py`):
```python
import pytest
from fastapi.testclient import TestClient
from main import app
from services.auth import get_password_hash, create_access_token
from models import User

client = TestClient(app)

def test_login_success():
    """로그인 성공"""
    # Given: 사용자 생성
    user = create_test_user(username='testuser', password='password123', role='user')

    # When: 로그인
    response = client.post('/api/auth/login', data={
        'username': 'testuser',
        'password': 'password123'
    })

    # Then: 토큰 발급
    assert response.status_code == 200
    data = response.json()
    assert 'access_token' in data
    assert data['token_type'] == 'bearer'
    assert data['role'] == 'user'


def test_user_cannot_change_to_confirmed():
    """실무자는 확정 상태로 변경 불가"""
    # Given: 실무자 계정
    user = create_test_user(username='user1', password='pass', role='user')
    token = create_access_token(data={"sub": user.username, "role": user.role})

    # Given: 계약 상태 단체
    group = create_test_group(status='contract')

    # When: 확정 상태로 변경 시도
    response = client.put(
        f'/api/groups/{group.id}',
        json={'status': 'confirmed'},
        headers={'Authorization': f'Bearer {token}'}
    )

    # Then: 403 Forbidden
    assert response.status_code == 403
    assert "관리자만 확정 상태로 변경할 수 있습니다" in response.json()['detail']['message']


def test_admin_can_change_to_confirmed():
    """관리자는 확정 상태로 변경 가능"""
    # Given: 관리자 계정
    admin = create_test_user(username='admin1', password='pass', role='admin')
    token = create_access_token(data={"sub": admin.username, "role": admin.role})

    # Given: 계약 상태 단체
    group = create_test_group(status='contract')

    # When: 확정 상태로 변경
    response = client.put(
        f'/api/groups/{group.id}',
        json={'status': 'confirmed'},
        headers={'Authorization': f'Bearer {token}'}
    )

    # Then: 200 OK
    assert response.status_code == 200
    assert response.json()['status'] == 'confirmed'


def test_user_cannot_delete_document():
    """실무자는 문서 삭제 불가"""
    # Given: 실무자 계정
    user = create_test_user(username='user1', password='pass', role='user')
    token = create_access_token(data={"sub": user.username, "role": user.role})

    # Given: 문서
    document = create_test_document()

    # When: 문서 삭제 시도
    response = client.delete(
        f'/api/documents/{document.id}',
        headers={'Authorization': f'Bearer {token}'}
    )

    # Then: 403 Forbidden
    assert response.status_code == 403


def test_admin_can_delete_document():
    """관리자는 문서 삭제 가능"""
    # Given: 관리자 계정
    admin = create_test_user(username='admin1', password='pass', role='admin')
    token = create_access_token(data={"sub": admin.username, "role": admin.role})

    # Given: 문서
    document = create_test_document()

    # When: 문서 삭제
    response = client.delete(
        f'/api/documents/{document.id}',
        headers={'Authorization': f'Bearer {token}'}
    )

    # Then: 200 OK
    assert response.status_code == 200
```

2. **수동 테스트 시나리오**:
   ```
   [실무자 계정 테스트]
   1. 실무자 계정으로 로그인
   2. 단체 생성 (견적 상태) → 성공
   3. 계약 상태로 변경 → 성공
   4. 상태 드롭다운 확인 → '확정' 옵션 없음
   5. API로 직접 확정 상태 변경 시도 (Postman) → 403 응답
   6. 문서 생성 → 성공
   7. 문서 삭제 버튼 확인 → 버튼 없음
   8. API로 직접 문서 삭제 시도 (Postman) → 403 응답

   [관리자 계정 테스트]
   1. 관리자 계정으로 로그인
   2. 단체 생성 (견적 상태) → 성공
   3. 계약 상태로 변경 → 성공
   4. 확정 상태로 변경 → 성공
   5. 상태 드롭다운 확인 → '확정' 옵션 표시됨
   6. 문서 삭제 버튼 확인 → 버튼 표시됨
   7. 문서 삭제 → 성공
   ```

**산출물:**
- `backend/models.py` (수정): User 모델 추가
- `backend/services/auth.py`: JWT 인증 서비스
- `backend/routers/auth.py`: 로그인 API
- `backend/routers/groups.py` (수정): 권한 검증 추가
- `backend/routers/documents.py` (수정): 문서 삭제 권한 제한
- `frontend/js/auth.js`: 프론트엔드 인증 및 역할 기반 UI
- `frontend/login.html`: 로그인 페이지
- `database/migrations/002_create_users_table.sql`: User 테이블 DDL
- `tests/test_auth.py`: 인증 및 권한 단위 테스트

**의존성:**
- **선행 task**:
  - T-DB-01 (데이터베이스 스키마 필요)
  - T-STATE-01, T-STATE-02 (상태 제어 로직 필요)
  - T-PDF-05 (문서 삭제 API 필요)
- **후행 task**:
  - T-LOG-01 ~ T-LOG-05 (권한 기반 로그 기록)
  - T-UI-01 ~ T-UI-08 (모든 UI에 인증 적용)

---

## Phase 7 완료

Phase 7의 모든 상태별 제어 task (T-STATE-01 ~ T-STATE-03, 3개)가 완료되었습니다.

**완료된 task:**
1. T-STATE-01: 확정 상태 잠금 로직 (상태 확인 미들웨어, 자동 계산 차단, UI 비활성화)
2. T-STATE-02: 상태 전환 검증 로직 (견적 → 계약 → 확정 순서 강제, 역전환 차단)
3. T-STATE-03: 권한 제어 시스템 (JWT 인증, 역할 기반 권한, 관리자 전용 기능)

**주요 산출물:**
- `backend/middleware/state_control.py`: 확정 상태 잠금 미들웨어
- `backend/services/state_validation.py`: 상태 전환 검증 로직
- `backend/services/auth.py`: JWT 인증 서비스
- `backend/routers/auth.py`: 로그인 API
- `backend/models.py`: User 모델
- `frontend/js/group-detail.js`: 상태별 UI 제어
- `frontend/js/auth.js`: 인증 및 권한 관리
- 단위 테스트 및 통합 테스트

**다음 단계:**
Phase 8: 로그 및 감사 task 개선 (T-LOG-01 ~ T-LOG-05, 5개)

---

## Phase 8: 로그 및 감사 TASK

### T-LOG-01 로깅 시스템 구축

**참조 문서:**
- PRD Section 11: 비기능 요구사항 (데이터 수정 로그 보관)
- TRD Section 11.1: 로그 레벨 정의 및 로거 설정
- TRD Section 11.5: 감사 로그 테이블 설계

**목표**:
Python logging 모듈을 기반으로 애플리케이션 전체의 로깅 시스템을 구축하고, 감사 추적을 위한 audit_logs 테이블을 생성합니다.

**배경:**
PRD Section 11에 따르면, 데이터 수정 로그를 보관해야 합니다. 이는 다음과 같은 목적을 달성하기 위함입니다:
- **감사 추적**: 누가, 언제, 무엇을, 어떻게 변경했는지 추적
- **디버깅**: 문제 발생 시 원인 분석 및 추적
- **규정 준수**: 내부 인트라넷 시스템의 데이터 변경 이력 보관
- **보안**: 비정상적인 접근 및 수정 시도 감지

**로깅 구조:**
1. **애플리케이션 로그**: 파일 및 콘솔로 출력 (Python logging 모듈)
2. **감사 로그**: 데이터베이스 테이블에 영구 저장 (audit_logs 테이블)

**작업 내용:**

1. **로거 설정 구현**

   `backend/config/logging_config.py` 파일을 생성하고 로깅 설정을 구현하세요.

   **로그 레벨:**
   - DEBUG: 상세한 디버깅 정보 (개발 환경)
   - INFO: 일반적인 정보 메시지 (프로덕션 기본값)
   - WARNING: 경고 메시지 (잠재적 문제)
   - ERROR: 에러 메시지 (기능 실패)
   - CRITICAL: 심각한 에러 (시스템 중단)

   **핸들러:**
   - 파일 핸들러: `/var/log/travel_agency/app.log` (INFO 이상)
   - 콘솔 핸들러: 표준 출력 (DEBUG 이상, 개발 환경용)
   - 로테이션: 파일 크기 10MB, 최대 10개 백업 파일

   **로그 포맷:**
   ```
   %(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s
   ```

2. **감사 로그 테이블 생성**

   `database/schema.sql`에 audit_logs 테이블 DDL을 추가하세요.

   **컬럼:**
   - `id`: UUID, PRIMARY KEY
   - `action`: VARCHAR(50), 작업 유형 (AUTO_CALCULATE, MANUAL_MODIFY, DOCUMENT_GENERATE, STATE_CHANGE 등)
   - `entity_type`: VARCHAR(50), 엔티티 유형 (group, document, itinerary 등)
   - `entity_id`: UUID, 엔티티 ID
   - `field_name`: VARCHAR(100), 수정된 필드명
   - `old_value`: TEXT, 이전 값
   - `new_value`: TEXT, 새 값
   - `reason`: TEXT, 수정 사유 (수동 수정인 경우)
   - `metadata`: JSONB, 추가 메타데이터
   - `user_id`: VARCHAR(100), 사용자 ID
   - `ip_address`: VARCHAR(45), IP 주소
   - `created_at`: TIMESTAMP, 생성 일시

   **인덱스:**
   - `idx_audit_logs_entity`: (entity_type, entity_id) - 엔티티별 로그 조회
   - `idx_audit_logs_user`: (user_id) - 사용자별 로그 조회
   - `idx_audit_logs_action`: (action) - 작업 유형별 조회
   - `idx_audit_logs_created_at`: (created_at) - 날짜 범위 조회

3. **AuditLog 모델 정의**

   `backend/models.py`에 AuditLog 모델을 추가하세요.

**실행 절차:**

**1단계: 로깅 설정 구현**

`backend/config/logging_config.py` 파일을 생성하세요:

```python
"""
로깅 설정
애플리케이션 전체의 로깅을 구성합니다
"""
import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path

# 로그 디렉토리 설정
LOG_DIR = os.getenv('LOG_DIR', '/var/log/travel_agency')
Path(LOG_DIR).mkdir(parents=True, exist_ok=True)

# 로그 레벨 설정
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')

# 로그 포맷 정의
LOG_FORMAT = (
    '%(asctime)s - %(name)s - %(levelname)s - '
    '[%(filename)s:%(lineno)d] - %(message)s'
)

DATE_FORMAT = '%Y-%m-%d %H:%M:%S'


def setup_logging(
    log_level: str = LOG_LEVEL,
    log_dir: str = LOG_DIR,
    log_to_console: bool = True
):
    """
    로깅 시스템 설정

    Args:
        log_level: 로그 레벨 (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_dir: 로그 파일 디렉토리
        log_to_console: 콘솔 출력 여부

    Returns:
        logger: 설정된 로거 객체
    """
    # 루트 로거 설정
    logger = logging.getLogger('travel_agency')
    logger.setLevel(getattr(logging, log_level.upper()))

    # 기존 핸들러 제거 (중복 방지)
    logger.handlers.clear()

    # 포맷터 설정
    formatter = logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT)

    # 파일 핸들러 (로테이션)
    log_file = os.path.join(log_dir, 'app.log')
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=10,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # 에러 전용 파일 핸들러
    error_log_file = os.path.join(log_dir, 'error.log')
    error_file_handler = RotatingFileHandler(
        error_log_file,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=10,
        encoding='utf-8'
    )
    error_file_handler.setLevel(logging.ERROR)
    error_file_handler.setFormatter(formatter)
    logger.addHandler(error_file_handler)

    # 콘솔 핸들러 (개발 환경)
    if log_to_console:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.DEBUG)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

    logger.info(f"로깅 시스템 초기화 완료: level={log_level}, dir={log_dir}")

    return logger


# 기본 로거 생성
logger = setup_logging()


def get_logger(name: str = None) -> logging.Logger:
    """
    로거 가져오기

    Args:
        name: 로거 이름 (기본값: 'travel_agency')

    Returns:
        logger 객체
    """
    if name:
        return logging.getLogger(f'travel_agency.{name}')
    return logging.getLogger('travel_agency')
```

**2단계: 감사 로그 테이블 생성**

`database/schema.sql`에 audit_logs 테이블 DDL을 추가하세요:

```sql
-- 감사 로그 테이블
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 인덱스 생성
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 설명 추가
COMMENT ON TABLE audit_logs IS '감사 로그 테이블: 모든 데이터 변경 이력을 추적';
COMMENT ON COLUMN audit_logs.action IS '작업 유형: AUTO_CALCULATE, MANUAL_MODIFY, DOCUMENT_GENERATE, STATE_CHANGE 등';
COMMENT ON COLUMN audit_logs.entity_type IS '엔티티 유형: group, document, itinerary 등';
COMMENT ON COLUMN audit_logs.entity_id IS '변경된 엔티티의 ID';
COMMENT ON COLUMN audit_logs.field_name IS '수정된 필드명 (해당되는 경우)';
COMMENT ON COLUMN audit_logs.old_value IS '변경 전 값 (문자열 형태)';
COMMENT ON COLUMN audit_logs.new_value IS '변경 후 값 (문자열 형태)';
COMMENT ON COLUMN audit_logs.reason IS '수정 사유 (수동 수정인 경우)';
COMMENT ON COLUMN audit_logs.metadata IS '추가 메타데이터 (JSON 형태)';
COMMENT ON COLUMN audit_logs.user_id IS '작업을 수행한 사용자 ID';
COMMENT ON COLUMN audit_logs.ip_address IS '클라이언트 IP 주소';
COMMENT ON COLUMN audit_logs.created_at IS '로그 생성 일시';
```

**3단계: AuditLog 모델 정의**

`backend/models.py`에 AuditLog 모델을 추가하세요:

```python
from sqlalchemy import Column, String, Text, DateTime, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
from uuid import uuid4
from database import Base

class AuditLog(Base):
    """감사 로그 모델"""
    __tablename__ = 'audit_logs'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    action = Column(String(50), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    field_name = Column(String(100))
    old_value = Column(Text)
    new_value = Column(Text)
    reason = Column(Text)
    metadata = Column(JSONB)
    user_id = Column(String(100), nullable=False, index=True)
    ip_address = Column(String(45))
    created_at = Column(TIMESTAMP, default=datetime.utcnow, nullable=False, index=True)

    def __repr__(self):
        return (
            f"<AuditLog(action='{self.action}', "
            f"entity_type='{self.entity_type}', "
            f"entity_id='{self.entity_id}', "
            f"user_id='{self.user_id}')>"
        )
```

**4단계: main.py에 로깅 초기화**

`backend/main.py`에 로깅 초기화를 추가하세요:

```python
from fastapi import FastAPI
from config.logging_config import setup_logging, get_logger

# 로깅 초기화
logger = setup_logging()

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 실행"""
    logger.info("=== 여행사 인트라넷 시스템 시작 ===")
    logger.info(f"환경: {os.getenv('ENV', 'development')}")
    logger.info(f"로그 레벨: {os.getenv('LOG_LEVEL', 'INFO')}")

@app.on_event("shutdown")
async def shutdown_event():
    """애플리케이션 종료 시 실행"""
    logger.info("=== 여행사 인트라넷 시스템 종료 ===")
```

**5단계: 로그 디렉토리 생성 스크립트**

`scripts/setup_logs.sh` 파일을 생성하세요:

```bash
#!/bin/bash

# 로그 디렉토리 생성 스크립트

LOG_DIR="/var/log/travel_agency"

echo "로그 디렉토리 설정 중..."

# 디렉토리 생성
sudo mkdir -p $LOG_DIR

# 권한 설정 (현재 사용자에게 쓰기 권한 부여)
sudo chown -R $USER:$USER $LOG_DIR
sudo chmod -R 755 $LOG_DIR

echo "로그 디렉토리 생성 완료: $LOG_DIR"

# 로그 파일 생성 (초기화)
touch $LOG_DIR/app.log
touch $LOG_DIR/error.log

echo "로그 파일 초기화 완료"
```

**중요 사항:**
- **로그 레벨 관리**: 프로덕션 환경에서는 INFO 레벨 이상만 기록하여 성능 영향 최소화
- **로그 로테이션**: 파일 크기가 10MB를 초과하면 자동으로 백업 파일 생성
- **민감 정보 보호**: 비밀번호, 토큰 등 민감한 정보는 절대 로그에 기록하지 마세요
- **타임존**: 로그 시간은 UTC 기준으로 기록됩니다
- **에러 로그 분리**: 에러 레벨 로그는 별도 파일(error.log)에 기록하여 빠른 문제 파악
- **audit_logs 테이블 정리**: 주기적으로 오래된 로그를 아카이빙하거나 삭제하는 정책 필요

**검증 방법:**

1. **로깅 시스템 테스트** (`tests/test_logging.py`):
```python
import pytest
import logging
import os
from config.logging_config import setup_logging, get_logger

def test_logger_setup():
    """로거가 올바르게 설정되는지 확인"""
    logger = setup_logging(log_level='DEBUG', log_to_console=False)

    assert logger is not None
    assert logger.name == 'travel_agency'
    assert logger.level == logging.DEBUG


def test_log_levels():
    """모든 로그 레벨이 작동하는지 확인"""
    logger = get_logger('test')

    logger.debug("DEBUG 메시지")
    logger.info("INFO 메시지")
    logger.warning("WARNING 메시지")
    logger.error("ERROR 메시지")
    logger.critical("CRITICAL 메시지")


def test_log_file_creation():
    """로그 파일이 생성되는지 확인"""
    log_dir = '/tmp/test_logs'
    logger = setup_logging(log_dir=log_dir)

    logger.info("테스트 로그 메시지")

    # 로그 파일 존재 확인
    assert os.path.exists(os.path.join(log_dir, 'app.log'))

    # 로그 파일 내용 확인
    with open(os.path.join(log_dir, 'app.log'), 'r') as f:
        content = f.read()
        assert '테스트 로그 메시지' in content
```

2. **감사 로그 테이블 테스트** (`tests/test_audit_log_model.py`):
```python
import pytest
from models import AuditLog
from database import db_session
from uuid import uuid4

def test_create_audit_log():
    """감사 로그 생성 테스트"""
    audit_log = AuditLog(
        action='TEST_ACTION',
        entity_type='group',
        entity_id=uuid4(),
        field_name='test_field',
        old_value='old',
        new_value='new',
        user_id='test_user',
        ip_address='127.0.0.1',
        metadata={'key': 'value'}
    )

    db_session.add(audit_log)
    db_session.commit()

    # 조회 확인
    saved_log = db_session.query(AuditLog).filter_by(id=audit_log.id).first()
    assert saved_log is not None
    assert saved_log.action == 'TEST_ACTION'
    assert saved_log.metadata['key'] == 'value'


def test_audit_log_indexes():
    """인덱스가 올바르게 생성되었는지 확인"""
    # SQL로 인덱스 확인
    result = db_session.execute("""
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'audit_logs'
    """)

    indexes = [row[0] for row in result]

    assert 'idx_audit_logs_entity' in indexes
    assert 'idx_audit_logs_user' in indexes
    assert 'idx_audit_logs_action' in indexes
    assert 'idx_audit_logs_created_at' in indexes
```

3. **수동 테스트 시나리오**:
   ```
   1. 애플리케이션 시작
   2. /var/log/travel_agency/app.log 파일 확인
   3. "여행사 인트라넷 시스템 시작" 메시지 확인
   4. API 요청 수행
   5. 로그 파일에 요청 로그 기록 확인
   6. 의도적으로 에러 발생시키기
   7. error.log 파일에 에러 로그 기록 확인
   8. 10MB 이상 로그 생성하여 로테이션 동작 확인
   ```

**산출물:**
- `backend/config/logging_config.py`: 로깅 설정 모듈
- `database/schema.sql` (수정): audit_logs 테이블 DDL
- `backend/models.py` (수정): AuditLog 모델 추가
- `backend/main.py` (수정): 로깅 초기화 추가
- `scripts/setup_logs.sh`: 로그 디렉토리 설정 스크립트
- `tests/test_logging.py`: 로깅 시스템 단위 테스트
- `tests/test_audit_log_model.py`: AuditLog 모델 테스트

**의존성:**
- **선행 task**:
  - T-DB-01 (데이터베이스 연결 필요)
- **후행 task**:
  - T-LOG-02 ~ T-LOG-05 (로깅 시스템 사용)

---

### T-LOG-02 자동 계산 실행 로그

**참조 문서:**
- PRD Section 7: 자동 계산 로직 (박수, 일수, 총액, 잔액, 잔액 완납일)
- TRD Section 11.2: 자동 계산 실행 로그 예시 코드

**목표**:
자동 계산이 실행될 때마다 계산 타입, 이전 값, 새 값을 로그로 기록하여 감사 추적을 가능하게 합니다.

**배경:**
자동 계산은 사용자가 직접 입력하지 않고 시스템이 자동으로 계산하는 값입니다. 이러한 자동 계산 이력을 기록하는 이유는:
- **투명성**: 어떤 값이 어떻게 계산되었는지 추적
- **디버깅**: 잘못된 계산 결과 발생 시 원인 분석
- **감사**: 계산 로직의 정확성 검증
- **수동 수정 판단**: 사용자가 수동으로 수정한 값과 자동 계산 값 비교

**기록 대상:**
- nights (박수) 계산
- days (일수) 계산
- total_price (총액) 계산
- balance (잔액) 계산
- balance_due_date (잔액 완납일) 계산
- itinerary_date (일정 날짜) 재배치
- cancel_rule_dates (취소 규정 날짜) 재계산

**작업 내용:**

1. **자동 계산 로그 함수 구현**

   `backend/services/audit_service.py` 파일을 생성하고 자동 계산 로그 함수를 구현하세요.

   **함수 시그니처:**
   ```python
   def log_auto_calculation(
       entity_type: str,
       entity_id: UUID,
       field_name: str,
       old_value: Any,
       new_value: Any,
       user_id: str,
       ip_address: Optional[str] = None
   ) -> AuditLog
   ```

2. **자동 계산 함수에 로그 추가**

   기존 자동 계산 함수들에 로그 기록 코드를 추가하세요:
   - `recalculate_nights()`
   - `recalculate_days()`
   - `recalculate_total_price()`
   - `recalculate_balance()`
   - `recalculate_balance_due_date()`
   - `recalculate_itinerary_dates()`
   - `recalculate_cancel_rule_dates()`

**실행 절차:**

**1단계: 감사 서비스 구현**

`backend/services/audit_service.py` 파일을 생성하세요:

```python
"""
감사 로그 서비스
자동 계산, 수동 수정, 문서 생성 등의 작업을 로그로 기록합니다
"""
from typing import Any, Optional, Dict
from uuid import UUID
from datetime import datetime
import logging
from models import AuditLog
from database import db_session

logger = logging.getLogger('travel_agency.audit')


def log_auto_calculation(
    entity_type: str,
    entity_id: UUID,
    field_name: str,
    old_value: Any,
    new_value: Any,
    user_id: str,
    ip_address: Optional[str] = None
) -> AuditLog:
    """
    자동 계산 실행 로그 기록

    Args:
        entity_type: 엔티티 유형 (group, itinerary, cancel_rule 등)
        entity_id: 엔티티 ID
        field_name: 계산된 필드명 (nights, total_price 등)
        old_value: 이전 값
        new_value: 새 값
        user_id: 사용자 ID (자동 계산을 트리거한 사용자)
        ip_address: 클라이언트 IP 주소

    Returns:
        생성된 AuditLog 객체
    """
    # 값이 변경되지 않았으면 로그 기록하지 않음
    if old_value == new_value:
        return None

    # 로거로 기록
    logger.info(
        f"자동 계산 실행: entity={entity_type}/{entity_id}, "
        f"field={field_name}, old={old_value}, new={new_value}, "
        f"user={user_id}"
    )

    # 감사 로그 테이블에 기록
    audit_log = AuditLog(
        action='AUTO_CALCULATE',
        entity_type=entity_type,
        entity_id=entity_id,
        field_name=field_name,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        user_id=user_id,
        ip_address=ip_address
    )

    db_session.add(audit_log)
    db_session.commit()

    return audit_log


def log_bulk_auto_calculation(
    entity_type: str,
    entity_id: UUID,
    calculations: Dict[str, tuple],
    user_id: str,
    ip_address: Optional[str] = None
) -> list[AuditLog]:
    """
    여러 자동 계산을 일괄 로그 기록

    Args:
        entity_type: 엔티티 유형
        entity_id: 엔티티 ID
        calculations: {field_name: (old_value, new_value)} 딕셔너리
        user_id: 사용자 ID
        ip_address: 클라이언트 IP 주소

    Returns:
        생성된 AuditLog 객체 리스트

    Example:
        log_bulk_auto_calculation(
            'group',
            group_id,
            {
                'nights': (5, 6),
                'days': (6, 7),
                'total_price': (10000000, 12000000)
            },
            user_id='admin'
        )
    """
    audit_logs = []

    for field_name, (old_value, new_value) in calculations.items():
        # 값이 변경된 경우만 기록
        if old_value != new_value:
            audit_log = AuditLog(
                action='AUTO_CALCULATE',
                entity_type=entity_type,
                entity_id=entity_id,
                field_name=field_name,
                old_value=str(old_value) if old_value is not None else None,
                new_value=str(new_value) if new_value is not None else None,
                user_id=user_id,
                ip_address=ip_address
            )
            audit_logs.append(audit_log)

    if audit_logs:
        db_session.bulk_save_objects(audit_logs)
        db_session.commit()

        logger.info(
            f"자동 계산 일괄 기록: entity={entity_type}/{entity_id}, "
            f"fields={list(calculations.keys())}, user={user_id}, "
            f"count={len(audit_logs)}"
        )

    return audit_logs
```

**2단계: 자동 계산 함수에 로그 추가**

`backend/services/calculation.py`의 기존 함수들을 수정하세요:

```python
from services.audit_service import log_auto_calculation, log_bulk_auto_calculation
from config.logging_config import get_logger

logger = get_logger('calculation')


def recalculate_nights(group: Group, user_id: str, ip_address: str = None):
    """
    박수 재계산

    Args:
        group: Group 객체
        user_id: 사용자 ID
        ip_address: 클라이언트 IP
    """
    # 수동 수정 플래그 확인
    if group.nights_manual:
        logger.debug(f"박수 재계산 생략 (수동 수정됨): group_id={group.id}")
        return

    # 이전 값 저장
    old_value = group.nights

    # 새 값 계산
    new_value = (group.end_date - group.start_date).days

    # 값 업데이트
    group.nights = new_value

    # 로그 기록
    log_auto_calculation(
        entity_type='group',
        entity_id=group.id,
        field_name='nights',
        old_value=old_value,
        new_value=new_value,
        user_id=user_id,
        ip_address=ip_address
    )

    logger.info(f"박수 재계산: group_id={group.id}, {old_value} → {new_value}")


def recalculate_group(group_id: UUID, user_id: str, ip_address: str = None) -> bool:
    """
    단체 정보 전체 재계산 (일괄 로그 기록)

    Args:
        group_id: 단체 ID
        user_id: 사용자 ID
        ip_address: 클라이언트 IP

    Returns:
        재계산 실행 여부
    """
    group = db_session.query(Group).filter_by(id=group_id).first()
    if not group:
        raise ValueError(f"Group not found: {group_id}")

    # 확정 상태 확인
    if group.status == 'confirmed':
        logger.info(f"자동 계산 생략: 단체 {group.id} ({group.name})는 확정 상태입니다")
        return False

    # 계산 전 값 저장
    calculations = {}

    # 박수 재계산
    if not group.nights_manual:
        old_nights = group.nights
        new_nights = (group.end_date - group.start_date).days
        if old_nights != new_nights:
            group.nights = new_nights
            calculations['nights'] = (old_nights, new_nights)

    # 일수 재계산
    if not group.days_manual:
        old_days = group.days
        new_days = group.nights + 1
        if old_days != new_days:
            group.days = new_days
            calculations['days'] = (old_days, new_days)

    # 총액 재계산
    if not group.total_price_manual:
        old_total = group.total_price
        new_total = group.pax * group.price_per_pax
        if old_total != new_total:
            group.total_price = new_total
            calculations['total_price'] = (old_total, new_total)

    # 잔액 재계산
    if not group.balance_manual:
        old_balance = group.balance
        new_balance = group.total_price - group.deposit
        if old_balance != new_balance:
            group.balance = new_balance
            calculations['balance'] = (old_balance, new_balance)

    # 잔액 완납일 재계산
    if not group.balance_due_date_manual:
        old_due_date = group.balance_due_date
        new_due_date = group.start_date - timedelta(days=7)
        if old_due_date != new_due_date:
            group.balance_due_date = new_due_date
            calculations['balance_due_date'] = (old_due_date, new_due_date)

    # 데이터베이스 커밋
    db_session.commit()

    # 일괄 로그 기록
    if calculations:
        log_bulk_auto_calculation(
            entity_type='group',
            entity_id=group.id,
            calculations=calculations,
            user_id=user_id,
            ip_address=ip_address
        )

    logger.info(
        f"자동 계산 완료: group_id={group.id} ({group.name}), "
        f"변경된 필드: {list(calculations.keys())}"
    )

    return True
```

**중요 사항:**
- **값 변경 여부 확인**: old_value와 new_value가 같으면 로그를 기록하지 않습니다
- **일괄 로그 기록**: 여러 필드가 동시에 계산되는 경우 `log_bulk_auto_calculation()` 사용하여 성능 최적화
- **수동 수정 플래그 확인**: manual 플래그가 True인 경우 재계산하지 않으므로 로그도 기록되지 않습니다
- **사용자 정보**: 자동 계산을 트리거한 사용자 정보를 함께 기록합니다
- **IP 주소**: 선택적이지만 보안 감사를 위해 기록하는 것이 좋습니다

**검증 방법:**

1. **단위 테스트** (`tests/test_audit_auto_calculation.py`):
```python
import pytest
from services.audit_service import log_auto_calculation, log_bulk_auto_calculation
from services.calculation import recalculate_group
from models import Group, AuditLog
from database import db_session
from uuid import uuid4

def test_log_auto_calculation():
    """자동 계산 로그 기록 테스트"""
    group_id = uuid4()

    audit_log = log_auto_calculation(
        entity_type='group',
        entity_id=group_id,
        field_name='nights',
        old_value=5,
        new_value=6,
        user_id='test_user',
        ip_address='127.0.0.1'
    )

    assert audit_log is not None
    assert audit_log.action == 'AUTO_CALCULATE'
    assert audit_log.field_name == 'nights'
    assert audit_log.old_value == '5'
    assert audit_log.new_value == '6'


def test_auto_calculation_creates_audit_log():
    """자동 계산 실행 시 감사 로그 생성 확인"""
    # Given: 단체 생성
    group = create_test_group(
        start_date='2025-01-15',
        end_date='2025-01-20',
        pax=20,
        price_per_pax=1000000,
        nights_manual=False
    )

    # 로그 개수 확인 (before)
    log_count_before = db_session.query(AuditLog).count()

    # When: 출발일 변경하여 재계산 트리거
    group.start_date = date(2025, 1, 16)
    recalculate_group(group.id, user_id='test_user')

    # Then: 로그가 생성됨
    log_count_after = db_session.query(AuditLog).count()
    assert log_count_after > log_count_before

    # 로그 내용 확인
    logs = db_session.query(AuditLog)\
        .filter_by(entity_id=group.id, action='AUTO_CALCULATE')\
        .all()

    assert len(logs) > 0

    # nights 로그 확인
    nights_log = next((log for log in logs if log.field_name == 'nights'), None)
    assert nights_log is not None
    assert nights_log.old_value == '5'
    assert nights_log.new_value == '4'


def test_no_log_if_value_unchanged():
    """값이 변경되지 않으면 로그 기록 안 함"""
    group_id = uuid4()

    result = log_auto_calculation(
        entity_type='group',
        entity_id=group_id,
        field_name='nights',
        old_value=5,
        new_value=5,  # 동일한 값
        user_id='test_user'
    )

    assert result is None


def test_bulk_auto_calculation_logging():
    """일괄 자동 계산 로그 테스트"""
    group_id = uuid4()

    calculations = {
        'nights': (5, 6),
        'days': (6, 7),
        'total_price': (10000000, 12000000)
    }

    audit_logs = log_bulk_auto_calculation(
        entity_type='group',
        entity_id=group_id,
        calculations=calculations,
        user_id='test_user'
    )

    assert len(audit_logs) == 3

    # 각 필드별 로그 확인
    field_names = [log.field_name for log in audit_logs]
    assert 'nights' in field_names
    assert 'days' in field_names
    assert 'total_price' in field_names
```

2. **통합 테스트**:
   ```python
   def test_auto_calculation_full_workflow():
       """전체 자동 계산 워크플로우 테스트"""
       # 1. 단체 생성
       group = create_test_group(status='estimate')

       # 2. 출발일 변경
       group.start_date = date(2025, 2, 1)
       group.end_date = date(2025, 2, 5)

       # 3. 재계산 실행
       recalculate_group(group.id, user_id='admin', ip_address='192.168.1.1')

       # 4. 로그 확인
       logs = db_session.query(AuditLog)\
           .filter_by(entity_id=group.id, action='AUTO_CALCULATE')\
           .order_by(AuditLog.created_at)\
           .all()

       # 5. 로그 검증
       assert len(logs) > 0
       for log in logs:
           assert log.user_id == 'admin'
           assert log.ip_address == '192.168.1.1'
           assert log.entity_type == 'group'
   ```

3. **수동 테스트 시나리오**:
   ```
   1. 단체 생성 (견적 상태)
   2. 출발일/도착일 입력
   3. 인원수/1인당 요금 입력
   4. 저장 (자동 계산 실행)
   5. audit_logs 테이블 조회:
      SELECT * FROM audit_logs
      WHERE entity_id = '<group_id>'
      AND action = 'AUTO_CALCULATE'
      ORDER BY created_at DESC;
   6. 각 자동 계산 필드(nights, days, total_price 등)의 로그 확인
   7. old_value, new_value가 올바른지 확인
   ```

**산출물:**
- `backend/services/audit_service.py`: 감사 로그 서비스 (자동 계산 로그 함수)
- `backend/services/calculation.py` (수정): 자동 계산 함수에 로그 추가
- `tests/test_audit_auto_calculation.py`: 자동 계산 로그 단위 테스트

**의존성:**
- **선행 task**:
  - T-LOG-01 (로깅 시스템 및 audit_logs 테이블 필요)
  - T-CALC-01 ~ T-CALC-06 (자동 계산 함수 필요)
  - T-STATE-03 (사용자 정보 필요)
- **후행 task**:
  - T-LOG-05 (감사 로그 조회 API에서 사용)

---

### T-LOG-03 수동 수정 로그

**참조 문서:**
- PRD Section 7: 자동 계산 로직 (수동 수정 플래그)
- TRD Section 11.3: 수동 수정 로그 예시 코드

**목표**:
사용자가 자동 계산 값을 수동으로 수정할 때 수정 사유와 함께 로그를 기록합니다.

**배경:**
자동 계산 값을 사용자가 수동으로 수정하는 경우, 그 이유를 기록하는 것이 중요합니다:
- **투명성**: 왜 자동 계산 값을 변경했는지 명확히 기록
- **감사**: 수동 수정의 타당성 검증
- **추적**: 문제 발생 시 수동 수정 이력 추적
- **책임**: 누가 수정했는지 명확히 기록

**수동 수정 판단 기준:**
- 기존에 자동 계산된 값이 있음
- 사용자가 해당 필드를 직접 수정함
- 수정 후 `{field_name}_manual` 플래그가 TRUE로 설정됨

**기록 대상:**
- nights (박수) 수동 수정
- days (일수) 수동 수정
- total_price (총액) 수동 수정
- balance (잔액) 수동 수정
- balance_due_date (잔액 완납일) 수동 수정
- itinerary_date (일정 날짜) 수동 수정
- cancel_rule dates (취소 규정 날짜) 수동 수정

**작업 내용:**

1. **수동 수정 로그 함수 구현**

   `backend/services/audit_service.py`에 수동 수정 로그 함수를 추가하세요.

   **함수 시그니처:**
   ```python
   def log_manual_modification(
       entity_type: str,
       entity_id: UUID,
       field_name: str,
       old_value: Any,
       new_value: Any,
       reason: str,
       user_id: str,
       ip_address: Optional[str] = None
   ) -> AuditLog
   ```

2. **API 엔드포인트에 로그 추가**

   단체 수정 API, 일정 수정 API, 취소 규정 수정 API에서 수동 수정 시 로그를 기록하도록 수정하세요.

3. **프론트엔드에서 수정 사유 입력**

   수동 수정 시 사용자에게 수정 사유를 입력받는 UI를 추가하세요.

**실행 절차:**

**1단계: 수동 수정 로그 함수 추가**

`backend/services/audit_service.py`에 함수를 추가하세요:

```python
def log_manual_modification(
    entity_type: str,
    entity_id: UUID,
    field_name: str,
    old_value: Any,
    new_value: Any,
    reason: str,
    user_id: str,
    ip_address: Optional[str] = None
) -> AuditLog:
    """
    수동 수정 로그 기록

    Args:
        entity_type: 엔티티 유형 (group, itinerary, cancel_rule 등)
        entity_id: 엔티티 ID
        field_name: 수정된 필드명
        old_value: 이전 값 (자동 계산 값)
        new_value: 새 값 (사용자가 입력한 값)
        reason: 수정 사유
        user_id: 사용자 ID
        ip_address: 클라이언트 IP 주소

    Returns:
        생성된 AuditLog 객체
    """
    # 값이 변경되지 않았으면 로그 기록하지 않음
    if old_value == new_value:
        logger.warning(f"수동 수정 로그: 값 변경 없음 (field={field_name}, value={old_value})")
        return None

    # 로거로 기록
    logger.info(
        f"수동 수정: entity={entity_type}/{entity_id}, "
        f"field={field_name}, old={old_value}, new={new_value}, "
        f"reason='{reason}', user={user_id}"
    )

    # 감사 로그 테이블에 기록
    audit_log = AuditLog(
        action='MANUAL_MODIFY',
        entity_type=entity_type,
        entity_id=entity_id,
        field_name=field_name,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        reason=reason,
        user_id=user_id,
        ip_address=ip_address
    )

    db_session.add(audit_log)
    db_session.commit()

    return audit_log


def detect_and_log_manual_modifications(
    entity: Any,
    original_data: Dict,
    updated_data: Dict,
    user_id: str,
    ip_address: Optional[str] = None,
    reason: str = "사용자 수정"
) -> list[AuditLog]:
    """
    수정된 필드를 자동 감지하여 로그 기록

    Args:
        entity: 엔티티 객체 (Group, Itinerary 등)
        original_data: 수정 전 데이터 딕셔너리
        updated_data: 수정 후 데이터 딕셔너리
        user_id: 사용자 ID
        ip_address: 클라이언트 IP
        reason: 수정 사유

    Returns:
        생성된 AuditLog 객체 리스트

    Example:
        # API에서 사용
        original_data = {
            'nights': group.nights,
            'total_price': group.total_price
        }

        # 데이터 업데이트
        group.nights = updated_data['nights']
        group.total_price = updated_data['total_price']

        # 수동 수정 감지 및 로그
        detect_and_log_manual_modifications(
            entity=group,
            original_data=original_data,
            updated_data=updated_data,
            user_id=current_user.username,
            ip_address=request.client.host,
            reason=request_data.get('reason', '사용자 수정')
        )
    """
    audit_logs = []
    entity_type = entity.__tablename__
    entity_id = entity.id

    # 자동 계산 필드 목록 (manual 플래그가 있는 필드)
    manual_fields = [
        'nights', 'days', 'total_price', 'balance', 'balance_due_date',
        'itinerary_date'
    ]

    for field_name in manual_fields:
        # 원본 데이터와 업데이트 데이터 비교
        if field_name in original_data and field_name in updated_data:
            old_value = original_data[field_name]
            new_value = updated_data[field_name]

            # 값이 변경되었는지 확인
            if old_value != new_value:
                # manual 플래그 설정
                manual_flag_name = f"{field_name}_manual"
                if hasattr(entity, manual_flag_name):
                    setattr(entity, manual_flag_name, True)

                # 로그 기록
                audit_log = log_manual_modification(
                    entity_type=entity_type,
                    entity_id=entity_id,
                    field_name=field_name,
                    old_value=old_value,
                    new_value=new_value,
                    reason=reason,
                    user_id=user_id,
                    ip_address=ip_address
                )

                if audit_log:
                    audit_logs.append(audit_log)

    return audit_logs
```

**2단계: API 엔드포인트에 로그 추가**

`backend/routers/groups.py`의 단체 수정 API를 수정하세요:

```python
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from services.audit_service import detect_and_log_manual_modifications
from services.auth import get_current_user
from models import User, Group

router = APIRouter()

class GroupUpdateRequest(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    nights: Optional[int] = None
    days: Optional[int] = None
    pax: Optional[int] = None
    price_per_pax: Optional[int] = None
    total_price: Optional[int] = None
    deposit: Optional[int] = None
    balance: Optional[int] = None
    balance_due_date: Optional[date] = None
    status: Optional[str] = None
    reason: Optional[str] = None  # 수정 사유


@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: UUID,
    request_data: GroupUpdateRequest,
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """
    단체 정보 수정

    수동으로 자동 계산 필드를 수정하는 경우 감사 로그에 기록됩니다.
    """
    # 1. 기존 단체 조회
    group = db_session.query(Group).filter_by(id=group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="단체를 찾을 수 없습니다")

    # 2. 원본 데이터 저장 (수동 수정 감지용)
    original_data = {
        'nights': group.nights,
        'days': group.days,
        'total_price': group.total_price,
        'balance': group.balance,
        'balance_due_date': group.balance_due_date
    }

    # 3. 데이터 업데이트
    update_data = request_data.dict(exclude_unset=True, exclude={'reason'})
    for field, value in update_data.items():
        if hasattr(group, field):
            setattr(group, field, value)

    # 4. 수동 수정 감지 및 로그
    updated_data = {
        'nights': group.nights,
        'days': group.days,
        'total_price': group.total_price,
        'balance': group.balance,
        'balance_due_date': group.balance_due_date
    }

    detect_and_log_manual_modifications(
        entity=group,
        original_data=original_data,
        updated_data=updated_data,
        user_id=current_user.username,
        ip_address=request.client.host,
        reason=request_data.reason or "사용자 수정"
    )

    # 5. 자동 계산 실행 (수동 수정되지 않은 필드만)
    from services.calculation import recalculate_group
    recalculate_group(group.id, user_id=current_user.username, ip_address=request.client.host)

    # 6. 저장
    db_session.commit()
    db_session.refresh(group)

    logger.info(
        f"단체 수정 완료: group_id={group_id}, "
        f"user={current_user.username}, fields={list(update_data.keys())}"
    )

    return group
```

**3단계: 프론트엔드 수정 사유 입력 UI**

`frontend/js/group-detail.js`에 수정 사유 입력 기능을 추가하세요:

```javascript
/**
 * 자동 계산 필드 수정 시 사유 입력
 * @param {string} fieldName - 필드명
 * @param {any} oldValue - 이전 값
 * @param {any} newValue - 새 값
 * @returns {string|null} 수정 사유 (취소 시 null)
 */
function promptForModificationReason(fieldName, oldValue, newValue) {
    const fieldLabels = {
        'nights': '박수',
        'days': '일수',
        'total_price': '총액',
        'balance': '잔액',
        'balance_due_date': '잔액 완납일'
    };

    const fieldLabel = fieldLabels[fieldName] || fieldName;

    const message =
        `${fieldLabel}를 수동으로 수정하시겠습니까?\n\n` +
        `이전 값: ${oldValue}\n` +
        `새 값: ${newValue}\n\n` +
        `수정 사유를 입력해주세요:`;

    const reason = prompt(message);

    return reason; // null이면 취소
}

/**
 * 단체 정보 저장 (수정 사유 포함)
 */
async function saveGroup() {
    const groupData = collectGroupFormData();

    // 자동 계산 필드 변경 확인
    const autoCalcFields = ['nights', 'days', 'total_price', 'balance', 'balance_due_date'];
    let modificationReason = null;

    for (const field of autoCalcFields) {
        const oldValue = originalGroupData[field];
        const newValue = groupData[field];

        // 값이 변경되었고, manual 플래그가 false인 경우
        if (oldValue !== newValue && !originalGroupData[`${field}_manual`]) {
            // 수정 사유 입력
            modificationReason = promptForModificationReason(field, oldValue, newValue);

            if (modificationReason === null) {
                // 취소
                showInfoNotification('수정이 취소되었습니다.');
                return;
            }

            break; // 한 번만 입력받음
        }
    }

    // API 호출
    try {
        const response = await authenticatedFetch(`/api/groups/${groupId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...groupData,
                reason: modificationReason
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const updatedGroup = await response.json();

        showSuccessNotification('저장되었습니다.');

        // 원본 데이터 갱신
        originalGroupData = { ...updatedGroup };

    } catch (error) {
        console.error('저장 오류:', error);
        showErrorNotification('저장 중 오류가 발생했습니다.');
    }
}
```

**중요 사항:**
- **수정 사유 필수**: 자동 계산 값을 수동으로 변경할 때는 반드시 사유를 입력해야 합니다
- **manual 플래그 자동 설정**: 수동 수정 시 해당 필드의 `_manual` 플래그가 자동으로 TRUE로 설정됩니다
- **IP 주소 기록**: 보안 감사를 위해 수정을 요청한 클라이언트 IP를 기록합니다
- **사용자 정보**: 누가 수정했는지 명확히 기록합니다

**검증 방법:**

1. **단위 테스트** (`tests/test_audit_manual_modification.py`):
```python
import pytest
from services.audit_service import log_manual_modification
from models import Group, AuditLog
from database import db_session

def test_log_manual_modification():
    """수동 수정 로그 기록 테스트"""
    group = create_test_group(nights=5, nights_manual=False)

    audit_log = log_manual_modification(
        entity_type='group',
        entity_id=group.id,
        field_name='nights',
        old_value=5,
        new_value=6,
        reason='고객 요청으로 1박 추가',
        user_id='admin',
        ip_address='192.168.1.100'
    )

    assert audit_log is not None
    assert audit_log.action == 'MANUAL_MODIFY'
    assert audit_log.reason == '고객 요청으로 1박 추가'
    assert audit_log.ip_address == '192.168.1.100'


def test_manual_modification_sets_flag():
    """수동 수정 시 manual 플래그 설정 확인"""
    group = create_test_group(nights=5, nights_manual=False)

    # API를 통한 수정 (detect_and_log_manual_modifications 호출)
    original_data = {'nights': group.nights}
    updated_data = {'nights': 6}

    detect_and_log_manual_modifications(
        entity=group,
        original_data=original_data,
        updated_data=updated_data,
        user_id='admin',
        reason='테스트'
    )

    # manual 플래그 확인
    assert group.nights_manual == True

    # 로그 확인
    log = db_session.query(AuditLog)\
        .filter_by(entity_id=group.id, field_name='nights', action='MANUAL_MODIFY')\
        .first()

    assert log is not None
    assert log.reason == '테스트'
```

2. **수동 테스트 시나리오**:
   ```
   1. 단체 생성 및 자동 계산
   2. 박수(nights) 필드를 수동으로 6으로 변경
   3. 수정 사유 입력: "고객 요청으로 1박 추가"
   4. 저장
   5. audit_logs 테이블 조회:
      SELECT * FROM audit_logs
      WHERE entity_id = '<group_id>'
      AND field_name = 'nights'
      AND action = 'MANUAL_MODIFY'
      ORDER BY created_at DESC;
   6. reason 필드에 "고객 요청으로 1박 추가" 기록 확인
   7. nights_manual 플래그가 TRUE로 설정되었는지 확인
   8. 이후 재계산 시 nights가 재계산되지 않는지 확인
   ```

**산출물:**
- `backend/services/audit_service.py` (수정): 수동 수정 로그 함수 추가
- `backend/routers/groups.py` (수정): API에 수동 수정 감지 및 로그 추가
- `frontend/js/group-detail.js` (수정): 수정 사유 입력 UI 추가
- `tests/test_audit_manual_modification.py`: 수동 수정 로그 단위 테스트

**의존성:**
- **선행 task**:
  - T-LOG-01 (audit_logs 테이블 필요)
  - T-API-03 (단체 수정 API 필요)
  - T-STATE-03 (사용자 정보 필요)
- **후행 task**:
  - T-LOG-05 (감사 로그 조회 API에서 사용)

---

### T-LOG-04 문서 출력 로그

**참조 문서:**
- PRD Section 9: 문서 출력 요구사항 (견적서, 계약서, 일정표)
- TRD Section 11.4: 문서 출력 로그 예시 코드

**목표**:
PDF 문서 생성 시 문서 타입, 파일 크기, 생성자 정보를 로그로 기록합니다.

**배경:**
문서 출력 이력을 기록하는 것은 다음과 같은 목적을 달성하기 위함입니다:
- **추적성**: 누가, 언제, 어떤 문서를 생성했는지 추적
- **버전 관리**: 동일한 문서의 여러 버전 생성 이력 관리
- **감사**: 문서 출력 빈도 및 패턴 분석
- **문제 해결**: 문서 생성 실패 시 원인 분석

**기록 대상:**
- 견적서 생성
- 계약서 생성
- 일정표 생성
- 통합 문서 생성
- 문서 다운로드 (선택적)

**작업 내용:**

1. **문서 출력 로그 함수 구현**

   `backend/services/audit_service.py`에 문서 출력 로그 함수를 추가하세요.

2. **PDF 생성 함수에 로그 추가**

   `generate_pdf()` 함수에 문서 생성 로그를 추가하세요.

**실행 절차:**

**1단계: 문서 출력 로그 함수 추가**

`backend/services/audit_service.py`에 함수를 추가하세요:

```python
def log_document_generation(
    document_id: UUID,
    group_id: UUID,
    document_type: str,
    file_name: str,
    file_size: int,
    version: int,
    user_id: str,
    ip_address: Optional[str] = None
) -> AuditLog:
    """
    문서 생성 로그 기록

    Args:
        document_id: 문서 ID
        group_id: 단체 ID
        document_type: 문서 타입 (estimate, contract, itinerary, bundle)
        file_name: 파일명
        file_size: 파일 크기 (bytes)
        version: 문서 버전
        user_id: 사용자 ID
        ip_address: 클라이언트 IP 주소

    Returns:
        생성된 AuditLog 객체
    """
    # 로거로 기록
    logger.info(
        f"문서 생성: document_id={document_id}, group_id={group_id}, "
        f"type={document_type}, file_name={file_name}, "
        f"file_size={file_size} bytes, version={version}, user={user_id}"
    )

    # 감사 로그 테이블에 기록
    audit_log = AuditLog(
        action='DOCUMENT_GENERATE',
        entity_type='document',
        entity_id=document_id,
        metadata={
            'group_id': str(group_id),
            'document_type': document_type,
            'file_name': file_name,
            'file_size': file_size,
            'version': version
        },
        user_id=user_id,
        ip_address=ip_address
    )

    db_session.add(audit_log)
    db_session.commit()

    return audit_log


def log_document_download(
    document_id: UUID,
    user_id: str,
    ip_address: Optional[str] = None
) -> AuditLog:
    """
    문서 다운로드 로그 기록

    Args:
        document_id: 문서 ID
        user_id: 사용자 ID
        ip_address: 클라이언트 IP 주소

    Returns:
        생성된 AuditLog 객체
    """
    # 문서 정보 조회
    from models import Document
    document = db_session.query(Document).filter_by(id=document_id).first()

    if not document:
        logger.warning(f"문서 다운로드 로그: 문서를 찾을 수 없음 (document_id={document_id})")
        return None

    # 로거로 기록
    logger.info(
        f"문서 다운로드: document_id={document_id}, "
        f"file_name={document.file_name}, user={user_id}"
    )

    # 감사 로그 테이블에 기록
    audit_log = AuditLog(
        action='DOCUMENT_DOWNLOAD',
        entity_type='document',
        entity_id=document_id,
        metadata={
            'group_id': str(document.group_id),
            'document_type': document.document_type,
            'file_name': document.file_name,
            'version': document.version
        },
        user_id=user_id,
        ip_address=ip_address
    )

    db_session.add(audit_log)
    db_session.commit()

    return audit_log
```

**2단계: PDF 생성 함수에 로그 추가**

`backend/services/pdf_service.py`의 `generate_pdf()` 함수를 수정하세요:

```python
from services.audit_service import log_document_generation
from config.logging_config import get_logger

logger = get_logger('pdf')


def generate_pdf(
    group_id: UUID,
    document_type: str,
    generated_by: Optional[str] = None,
    ip_address: Optional[str] = None,
    base_dir: str = 'documents'
) -> Dict:
    """
    PDF 생성 (로그 기록 포함)
    """
    if document_type not in VALID_DOCUMENT_TYPES:
        raise ValueError(f"Invalid document_type: {document_type}")

    group = get_group_with_relations(group_id)
    if not group:
        raise ValueError(f"Group not found: {group_id}")

    version = get_next_version(group_id, document_type)
    file_name = generate_filename(group.name, document_type, version)
    file_path = generate_file_path(group_id, document_type, group.name, version, base_dir)

    try:
        # HTML 템플릿 렌더링
        template_map = {
            'estimate': 'estimate.html',
            'contract': 'contract.html',
            'itinerary': 'itinerary.html',
            'bundle': 'bundle.html'
        }
        template_name = template_map[document_type]
        html_content = render_template(template_name, group)

        # PDF 변환
        convert_html_to_pdf(html_content, file_path)

        # 파일 크기 확인
        file_size = os.path.getsize(file_path)

        # 문서 이력 저장
        document = save_document(group_id, document_type, file_path, file_name, generated_by)

        # 문서 생성 로그 기록
        log_document_generation(
            document_id=document.id,
            group_id=group_id,
            document_type=document_type,
            file_name=file_name,
            file_size=file_size,
            version=version,
            user_id=generated_by or 'system',
            ip_address=ip_address
        )

        logger.info(
            f"PDF 생성 완료: document_id={document.id}, "
            f"group={group.name}, type={document_type}, size={file_size} bytes"
        )

        return {
            'document_id': str(document.id),
            'file_path': file_path,
            'file_name': file_name,
            'version': version,
            'file_size': file_size
        }

    except Exception as e:
        logger.error(f"PDF 생성 실패: group_id={group_id}, type={document_type}, error={e}")
        if os.path.exists(file_path):
            os.remove(file_path)
        raise PDFGenerationError(f"PDF 생성 중 오류가 발생했습니다: {str(e)}")
```

**3단계: 문서 다운로드 API에 로그 추가**

`backend/routers/documents.py`의 다운로드 API를 수정하세요:

```python
from fastapi import APIRouter, Depends, Request
from fastapi.responses import FileResponse
from services.audit_service import log_document_download
from services.auth import get_current_user
from models import User

router = APIRouter()


@router.get("/{document_id}/download", response_class=FileResponse)
async def download_document(
    document_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """
    문서 다운로드 (로그 기록 포함)
    """
    document = db_session.query(Document).filter_by(id=document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다")

    if not os.path.exists(document.file_path):
        raise HTTPException(
            status_code=404,
            detail=f"파일을 찾을 수 없습니다: {document.file_name}"
        )

    # 다운로드 로그 기록
    log_document_download(
        document_id=document_id,
        user_id=current_user.username,
        ip_address=request.client.host
    )

    logger.info(
        f"문서 다운로드 완료: document_id={document_id}, "
        f"file_name={document.file_name}, user={current_user.username}"
    )

    return FileResponse(
        path=document.file_path,
        filename=document.file_name,
        media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename="{document.file_name}"'}
    )
```

**중요 사항:**
- **metadata 필드 활용**: 문서 관련 추가 정보(group_id, document_type, file_size 등)는 metadata JSONB 필드에 저장합니다
- **다운로드 로그는 선택적**: 문서 다운로드 로그는 선택적으로 기록할 수 있습니다 (감사 요구사항에 따라 결정)
- **파일 크기 기록**: 파일 크기를 기록하여 저장공간 사용량 분석에 활용할 수 있습니다
- **버전 정보**: 동일한 문서의 여러 버전 생성 이력을 추적할 수 있습니다

**검증 방법:**

1. **단위 테스트** (`tests/test_audit_document.py`):
```python
import pytest
from services.audit_service import log_document_generation, log_document_download
from services.pdf_service import generate_pdf
from models import Document, AuditLog
from database import db_session
from uuid import uuid4

def test_log_document_generation():
    """문서 생성 로그 기록 테스트"""
    group_id = uuid4()
    document_id = uuid4()

    audit_log = log_document_generation(
        document_id=document_id,
        group_id=group_id,
        document_type='estimate',
        file_name='견적서_테스트단체_v1_20250101.pdf',
        file_size=1024000,
        version=1,
        user_id='admin',
        ip_address='192.168.1.1'
    )

    assert audit_log is not None
    assert audit_log.action == 'DOCUMENT_GENERATE'
    assert audit_log.entity_type == 'document'
    assert audit_log.metadata['document_type'] == 'estimate'
    assert audit_log.metadata['file_size'] == 1024000


def test_generate_pdf_creates_audit_log():
    """PDF 생성 시 감사 로그 생성 확인"""
    # Given: 단체 생성
    group = create_test_group(name='테스트 단체')

    # 로그 개수 확인 (before)
    log_count_before = db_session.query(AuditLog)\
        .filter_by(action='DOCUMENT_GENERATE')\
        .count()

    # When: PDF 생성
    result = generate_pdf(
        group_id=group.id,
        document_type='estimate',
        generated_by='admin',
        ip_address='127.0.0.1'
    )

    # Then: 로그가 생성됨
    log_count_after = db_session.query(AuditLog)\
        .filter_by(action='DOCUMENT_GENERATE')\
        .count()

    assert log_count_after == log_count_before + 1

    # 로그 내용 확인
    log = db_session.query(AuditLog)\
        .filter_by(
            entity_id=UUID(result['document_id']),
            action='DOCUMENT_GENERATE'
        )\
        .first()

    assert log is not None
    assert log.user_id == 'admin'
    assert log.metadata['document_type'] == 'estimate'
    assert log.metadata['group_id'] == str(group.id)


def test_log_document_download():
    """문서 다운로드 로그 기록 테스트"""
    # Given: 문서 생성
    document = create_test_document()

    # When: 다운로드 로그 기록
    audit_log = log_document_download(
        document_id=document.id,
        user_id='user1',
        ip_address='192.168.1.100'
    )

    # Then: 로그 생성됨
    assert audit_log is not None
    assert audit_log.action == 'DOCUMENT_DOWNLOAD'
    assert audit_log.entity_id == document.id
```

2. **수동 테스트 시나리오**:
   ```
   1. 단체 생성
   2. 견적서 생성 클릭
   3. PDF 생성 완료
   4. audit_logs 테이블 조회:
      SELECT * FROM audit_logs
      WHERE action = 'DOCUMENT_GENERATE'
      ORDER BY created_at DESC
      LIMIT 1;
   5. metadata 필드에 group_id, document_type, file_size, version 정보 확인
   6. 생성된 문서 다운로드
   7. audit_logs 테이블에 DOCUMENT_DOWNLOAD 액션 로그 확인
   ```

**산출물:**
- `backend/services/audit_service.py` (수정): 문서 생성/다운로드 로그 함수 추가
- `backend/services/pdf_service.py` (수정): PDF 생성 함수에 로그 추가
- `backend/routers/documents.py` (수정): 다운로드 API에 로그 추가
- `tests/test_audit_document.py`: 문서 로그 단위 테스트

**의존성:**
- **선행 task**:
  - T-LOG-01 (audit_logs 테이블 필요)
  - T-PDF-04 (PDF 생성 함수 필요)
  - T-PDF-05 (문서 다운로드 API 필요)
  - T-STATE-03 (사용자 정보 필요)
- **후행 task**:
  - T-LOG-05 (감사 로그 조회 API에서 사용)

---

### T-LOG-05 감사 로그 조회 API

**참조 문서:**
- TRD Section 11.6: 로그 조회 API 명세

**목표**:
관리자가 감사 로그를 조회할 수 있는 API를 구현합니다. 필터링, 페이징, 정렬 기능을 제공합니다.

**배경:**
감사 로그를 효과적으로 조회하고 분석하기 위해서는 다음 기능이 필요합니다:
- **필터링**: entity_type, entity_id, action, user_id, 날짜 범위 등으로 필터링
- **페이징**: 대량의 로그 데이터를 효율적으로 조회
- **정렬**: 생성일 기준 내림차순 정렬 (최신 로그가 먼저 표시)
- **검색**: 특정 엔티티의 변경 이력 추적

**사용 사례:**
- 특정 단체의 모든 변경 이력 조회
- 특정 사용자가 수행한 모든 작업 조회
- 특정 기간 동안의 자동 계산 로그 조회
- 수동 수정 이력 및 사유 확인
- 문서 생성 이력 조회

**작업 내용:**

1. **감사 로그 조회 API 구현**

   `backend/routers/audit_logs.py` 파일을 생성하고 조회 API를 구현하세요.

2. **프론트엔드 감사 로그 조회 화면**

   관리자용 감사 로그 조회 화면을 구현하세요.

**실행 절차:**

**1단계: 감사 로그 조회 API 구현**

`backend/routers/audit_logs.py` 파일을 생성하세요:

```python
"""
감사 로그 조회 API
관리자만 접근 가능
"""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from uuid import UUID
from models import AuditLog, User
from database import db_session
from services.auth import get_current_admin_user
import logging

router = APIRouter()
logger = logging.getLogger('travel_agency.audit_logs')


class AuditLogResponse(BaseModel):
    """감사 로그 응답 모델"""
    id: str
    action: str
    entity_type: str
    entity_id: str
    field_name: Optional[str]
    old_value: Optional[str]
    new_value: Optional[str]
    reason: Optional[str]
    metadata: Optional[dict]
    user_id: str
    ip_address: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class AuditLogsListResponse(BaseModel):
    """감사 로그 목록 응답 모델"""
    data: List[AuditLogResponse]
    total: int
    page: int
    limit: int


@router.get("", response_model=AuditLogsListResponse)
async def get_audit_logs(
    entity_type: Optional[str] = Query(None, description="엔티티 타입 필터 (group, document, itinerary 등)"),
    entity_id: Optional[UUID] = Query(None, description="엔티티 ID 필터"),
    action: Optional[str] = Query(None, description="액션 타입 필터 (AUTO_CALCULATE, MANUAL_MODIFY 등)"),
    user_id: Optional[str] = Query(None, description="사용자 ID 필터"),
    start_date: Optional[date] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(50, ge=1, le=100, description="페이지당 항목 수"),
    current_user: User = Depends(get_current_admin_user)
):
    """
    감사 로그 조회 (관리자 전용)

    모든 데이터 변경 이력을 조회할 수 있습니다.
    다양한 필터 옵션과 페이징을 지원합니다.
    """
    # 기본 쿼리
    query = db_session.query(AuditLog)

    # 필터 적용
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)

    if action:
        query = query.filter(AuditLog.action == action)

    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    if start_date:
        query = query.filter(AuditLog.created_at >= start_date)

    if end_date:
        # end_date는 해당 날짜의 23:59:59까지 포함
        from datetime import datetime, timedelta
        end_datetime = datetime.combine(end_date, datetime.max.time())
        query = query.filter(AuditLog.created_at <= end_datetime)

    # 총 개수 조회
    total = query.count()

    # 정렬 (최신순)
    query = query.order_by(AuditLog.created_at.desc())

    # 페이징
    offset = (page - 1) * limit
    audit_logs = query.offset(offset).limit(limit).all()

    # 응답 데이터 변환
    data = []
    for log in audit_logs:
        data.append(AuditLogResponse(
            id=str(log.id),
            action=log.action,
            entity_type=log.entity_type,
            entity_id=str(log.entity_id),
            field_name=log.field_name,
            old_value=log.old_value,
            new_value=log.new_value,
            reason=log.reason,
            metadata=log.metadata,
            user_id=log.user_id,
            ip_address=log.ip_address,
            created_at=log.created_at.isoformat()
        ))

    logger.info(
        f"감사 로그 조회: user={current_user.username}, "
        f"filters=(entity_type={entity_type}, entity_id={entity_id}, "
        f"action={action}, user_id={user_id}), "
        f"result_count={len(data)}, total={total}"
    )

    return AuditLogsListResponse(
        data=data,
        total=total,
        page=page,
        limit=limit
    )


@router.get("/{audit_log_id}", response_model=AuditLogResponse)
async def get_audit_log_by_id(
    audit_log_id: UUID,
    current_user: User = Depends(get_current_admin_user)
):
    """
    특정 감사 로그 상세 조회 (관리자 전용)
    """
    audit_log = db_session.query(AuditLog).filter_by(id=audit_log_id).first()

    if not audit_log:
        raise HTTPException(status_code=404, detail="감사 로그를 찾을 수 없습니다")

    return AuditLogResponse(
        id=str(audit_log.id),
        action=audit_log.action,
        entity_type=audit_log.entity_type,
        entity_id=str(audit_log.entity_id),
        field_name=audit_log.field_name,
        old_value=audit_log.old_value,
        new_value=audit_log.new_value,
        reason=audit_log.reason,
        metadata=audit_log.metadata,
        user_id=audit_log.user_id,
        ip_address=audit_log.ip_address,
        created_at=audit_log.created_at.isoformat()
    )


@router.get("/entity/{entity_type}/{entity_id}", response_model=AuditLogsListResponse)
async def get_entity_audit_logs(
    entity_type: str,
    entity_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_admin_user)
):
    """
    특정 엔티티의 변경 이력 조회 (관리자 전용)

    예: 특정 단체의 모든 변경 이력
    GET /api/audit-logs/entity/group/{group_id}
    """
    # 쿼리 실행
    query = db_session.query(AuditLog)\
        .filter_by(entity_type=entity_type, entity_id=entity_id)\
        .order_by(AuditLog.created_at.desc())

    # 총 개수
    total = query.count()

    # 페이징
    offset = (page - 1) * limit
    audit_logs = query.offset(offset).limit(limit).all()

    # 응답 데이터 변환
    data = [
        AuditLogResponse(
            id=str(log.id),
            action=log.action,
            entity_type=log.entity_type,
            entity_id=str(log.entity_id),
            field_name=log.field_name,
            old_value=log.old_value,
            new_value=log.new_value,
            reason=log.reason,
            metadata=log.metadata,
            user_id=log.user_id,
            ip_address=log.ip_address,
            created_at=log.created_at.isoformat()
        )
        for log in audit_logs
    ]

    return AuditLogsListResponse(
        data=data,
        total=total,
        page=page,
        limit=limit
    )
```

**2단계: main.py에 라우터 등록**

`backend/main.py`에 라우터를 등록하세요:

```python
from routers import audit_logs

app.include_router(
    audit_logs.router,
    prefix="/api/audit-logs",
    tags=["audit-logs"]
)
```

**3단계: 프론트엔드 감사 로그 조회 화면**

`frontend/audit-logs.html` 파일을 생성하세요:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>감사 로그 - 여행사 인트라넷</title>
    <link rel="stylesheet" href="/css/main.css">
    <link rel="stylesheet" href="/css/audit-logs.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>감사 로그</h1>
            <p>모든 데이터 변경 이력을 조회할 수 있습니다 (관리자 전용)</p>
        </header>

        <!-- 필터 -->
        <div class="filter-section">
            <div class="filter-row">
                <label>엔티티 타입:
                    <select id="filter-entity-type">
                        <option value="">전체</option>
                        <option value="group">단체</option>
                        <option value="document">문서</option>
                        <option value="itinerary">일정</option>
                        <option value="cancel_rule">취소 규정</option>
                    </select>
                </label>

                <label>액션:
                    <select id="filter-action">
                        <option value="">전체</option>
                        <option value="AUTO_CALCULATE">자동 계산</option>
                        <option value="MANUAL_MODIFY">수동 수정</option>
                        <option value="DOCUMENT_GENERATE">문서 생성</option>
                        <option value="DOCUMENT_DOWNLOAD">문서 다운로드</option>
                        <option value="STATE_CHANGE">상태 변경</option>
                    </select>
                </label>

                <label>사용자:
                    <input type="text" id="filter-user-id" placeholder="사용자 ID">
                </label>

                <label>시작 날짜:
                    <input type="date" id="filter-start-date">
                </label>

                <label>종료 날짜:
                    <input type="date" id="filter-end-date">
                </label>

                <button id="btn-search" class="btn-primary">검색</button>
                <button id="btn-reset" class="btn-secondary">초기화</button>
            </div>
        </div>

        <!-- 로그 테이블 -->
        <div class="table-container">
            <table id="audit-logs-table">
                <thead>
                    <tr>
                        <th>생성일시</th>
                        <th>액션</th>
                        <th>엔티티</th>
                        <th>필드명</th>
                        <th>이전 값</th>
                        <th>새 값</th>
                        <th>사유</th>
                        <th>사용자</th>
                        <th>IP</th>
                    </tr>
                </thead>
                <tbody id="audit-logs-tbody">
                    <!-- 로그 데이터가 동적으로 추가됩니다 -->
                </tbody>
            </table>
        </div>

        <!-- 페이징 -->
        <div id="pagination" class="pagination"></div>
    </div>

    <script src="/js/auth.js"></script>
    <script src="/js/audit-logs.js"></script>
</body>
</html>
```

`frontend/js/audit-logs.js` 파일을 생성하세요:

```javascript
/**
 * 감사 로그 조회 화면
 */

let currentPage = 1;
const limit = 50;

/**
 * 감사 로그 목록 조회
 */
async function loadAuditLogs(page = 1) {
    try {
        // 필터 값 가져오기
        const entityType = document.getElementById('filter-entity-type').value;
        const action = document.getElementById('filter-action').value;
        const userId = document.getElementById('filter-user-id').value;
        const startDate = document.getElementById('filter-start-date').value;
        const endDate = document.getElementById('filter-end-date').value;

        // 쿼리 파라미터 생성
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', limit);

        if (entityType) params.append('entity_type', entityType);
        if (action) params.append('action', action);
        if (userId) params.append('user_id', userId);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        // API 호출
        const response = await authenticatedFetch(
            `/api/audit-logs?${params.toString()}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // 테이블 업데이트
        renderAuditLogsTable(data.data);

        // 페이징 업데이트
        renderPagination(data.page, data.total, data.limit);

        currentPage = page;

    } catch (error) {
        console.error('감사 로그 조회 오류:', error);
        showErrorNotification('감사 로그 조회 중 오류가 발생했습니다');
    }
}

/**
 * 감사 로그 테이블 렌더링
 */
function renderAuditLogsTable(logs) {
    const tbody = document.getElementById('audit-logs-tbody');
    tbody.innerHTML = '';

    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="no-data">조회된 로그가 없습니다</td></tr>';
        return;
    }

    logs.forEach(log => {
        const tr = document.createElement('tr');
        tr.className = getActionClass(log.action);

        tr.innerHTML = `
            <td>${formatDateTime(log.created_at)}</td>
            <td><span class="action-badge ${log.action.toLowerCase()}">${getActionLabel(log.action)}</span></td>
            <td>${log.entity_type}<br><small>${log.entity_id.substring(0, 8)}...</small></td>
            <td>${log.field_name || '-'}</td>
            <td>${truncate(log.old_value, 30)}</td>
            <td>${truncate(log.new_value, 30)}</td>
            <td>${truncate(log.reason, 50) || '-'}</td>
            <td>${log.user_id}</td>
            <td>${log.ip_address || '-'}</td>
        `;

        tbody.appendChild(tr);
    });
}

/**
 * 액션 타입에 따른 행 클래스
 */
function getActionClass(action) {
    const classMap = {
        'AUTO_CALCULATE': 'action-auto',
        'MANUAL_MODIFY': 'action-manual',
        'DOCUMENT_GENERATE': 'action-document',
        'STATE_CHANGE': 'action-state'
    };
    return classMap[action] || '';
}

/**
 * 액션 라벨 변환
 */
function getActionLabel(action) {
    const labels = {
        'AUTO_CALCULATE': '자동 계산',
        'MANUAL_MODIFY': '수동 수정',
        'DOCUMENT_GENERATE': '문서 생성',
        'DOCUMENT_DOWNLOAD': '문서 다운로드',
        'STATE_CHANGE': '상태 변경'
    };
    return labels[action] || action;
}

/**
 * 텍스트 줄이기
 */
function truncate(text, maxLength) {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * 날짜 시간 포맷
 */
function formatDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('ko-KR');
}

/**
 * 페이징 렌더링
 */
function renderPagination(currentPage, total, limit) {
    const totalPages = Math.ceil(total / limit);
    const paginationDiv = document.getElementById('pagination');

    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }

    let html = '<div class="pagination-controls">';

    // 이전 페이지
    if (currentPage > 1) {
        html += `<button onclick="loadAuditLogs(${currentPage - 1})">이전</button>`;
    }

    // 페이지 번호
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        html += `<button class="${activeClass}" onclick="loadAuditLogs(${i})">${i}</button>`;
    }

    // 다음 페이지
    if (currentPage < totalPages) {
        html += `<button onclick="loadAuditLogs(${currentPage + 1})">다음</button>`;
    }

    html += '</div>';
    html += `<div class="pagination-info">총 ${total}개 (${currentPage} / ${totalPages} 페이지)</div>`;

    paginationDiv.innerHTML = html;
}

// 이벤트 리스너
document.addEventListener('DOMContentLoaded', () => {
    // 관리자 권한 확인
    if (!isAdmin()) {
        alert('관리자만 접근할 수 있습니다');
        window.location.href = '/';
        return;
    }

    // 초기 로드
    loadAuditLogs(1);

    // 검색 버튼
    document.getElementById('btn-search').addEventListener('click', () => {
        loadAuditLogs(1);
    });

    // 초기화 버튼
    document.getElementById('btn-reset').addEventListener('click', () => {
        document.getElementById('filter-entity-type').value = '';
        document.getElementById('filter-action').value = '';
        document.getElementById('filter-user-id').value = '';
        document.getElementById('filter-start-date').value = '';
        document.getElementById('filter-end-date').value = '';
        loadAuditLogs(1);
    });
});
```

**중요 사항:**
- **관리자 전용**: 감사 로그 조회는 관리자만 가능합니다
- **성능 최적화**: 인덱스를 활용하여 빠른 조회가 가능하도록 쿼리를 최적화했습니다
- **날짜 범위 조회**: start_date와 end_date를 사용하여 특정 기간의 로그를 조회할 수 있습니다
- **페이징 필수**: 대량의 로그 데이터를 효율적으로 처리하기 위해 페이징을 구현했습니다

**검증 방법:**

1. **단위 테스트** (`tests/test_audit_logs_api.py`):
```python
import pytest
from fastapi.testclient import TestClient
from main import app
from services.auth import create_access_token

client = TestClient(app)

def test_get_audit_logs_admin():
    """관리자는 감사 로그 조회 가능"""
    # Given: 관리자 계정
    admin_token = create_access_token({"sub": "admin", "role": "admin"})

    # When: 감사 로그 조회
    response = client.get(
        "/api/audit-logs",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    # Then: 200 OK
    assert response.status_code == 200
    data = response.json()
    assert 'data' in data
    assert 'total' in data
    assert 'page' in data


def test_get_audit_logs_user_forbidden():
    """실무자는 감사 로그 조회 불가"""
    # Given: 실무자 계정
    user_token = create_access_token({"sub": "user1", "role": "user"})

    # When: 감사 로그 조회 시도
    response = client.get(
        "/api/audit-logs",
        headers={"Authorization": f"Bearer {user_token}"}
    )

    # Then: 403 Forbidden
    assert response.status_code == 403


def test_get_audit_logs_with_filters():
    """필터링이 올바르게 동작하는지 확인"""
    # Given: 관리자 계정
    admin_token = create_access_token({"sub": "admin", "role": "admin"})

    # When: 필터링 조건으로 조회
    response = client.get(
        "/api/audit-logs?entity_type=group&action=MANUAL_MODIFY",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    # Then: 200 OK, 필터링된 결과
    assert response.status_code == 200
    data = response.json()

    # 모든 로그가 필터 조건에 맞는지 확인
    for log in data['data']:
        assert log['entity_type'] == 'group'
        assert log['action'] == 'MANUAL_MODIFY'
```

2. **수동 테스트 시나리오**:
   ```
   1. 관리자 계정으로 로그인
   2. 감사 로그 메뉴 클릭
   3. 전체 로그 목록 표시 확인
   4. 엔티티 타입 필터: "단체" 선택 → 검색
   5. group 관련 로그만 표시되는지 확인
   6. 액션 필터: "수동 수정" 선택 → 검색
   7. MANUAL_MODIFY 로그만 표시되는지 확인
   8. 날짜 범위 설정 → 검색
   9. 해당 기간의 로그만 표시되는지 확인
   10. 페이징 동작 확인 (다음 페이지, 이전 페이지)
   ```

**산출물:**
- `backend/routers/audit_logs.py`: 감사 로그 조회 API
- `backend/main.py` (수정): 라우터 등록
- `frontend/audit-logs.html`: 감사 로그 조회 화면
- `frontend/js/audit-logs.js`: 감사 로그 조회 로직
- `frontend/css/audit-logs.css`: 감사 로그 화면 스타일
- `tests/test_audit_logs_api.py`: API 단위 테스트

**의존성:**
- **선행 task**:
  - T-LOG-01 (audit_logs 테이블 필요)
  - T-LOG-02, T-LOG-03, T-LOG-04 (로그 데이터 필요)
  - T-STATE-03 (관리자 권한 필요)
- **후행 task**: 없음 (Phase 8의 마지막 task)

---

## Phase 8 완료

Phase 8의 모든 로그 및 감사 task (T-LOG-01 ~ T-LOG-05, 5개)가 완료되었습니다.

**완료된 task:**
1. T-LOG-01: 로깅 시스템 구축 (Python logging, audit_logs 테이블)
2. T-LOG-02: 자동 계산 실행 로그 (자동 계산 이력 추적)
3. T-LOG-03: 수동 수정 로그 (수정 사유 포함)
4. T-LOG-04: 문서 출력 로그 (PDF 생성/다운로드 이력)
5. T-LOG-05: 감사 로그 조회 API (필터링, 페이징, 정렬)

**주요 산출물:**
- `backend/config/logging_config.py`: 로깅 설정
- `database/schema.sql`: audit_logs 테이블 DDL
- `backend/models.py`: AuditLog 모델
- `backend/services/audit_service.py`: 감사 로그 서비스
- `backend/routers/audit_logs.py`: 감사 로그 조회 API
- `frontend/audit-logs.html`: 감사 로그 조회 화면
- 단위 테스트 및 통합 테스트

**다음 단계:**
Phase 9: 데이터 검증 task 개선 (T-VALID-01 ~ T-VALID-04, 4개)

---

## 9. 데이터 검증 및 예외 처리 TASK

### T-VALID-01 필수 필드 검증 로직

**참조 문서:**
- PRD Section 12.2.1: 필수 필드 검증 규칙 정의
- PRD Section 12.4.3: 오류 알림 메시지 정의
- TRD Section 9.1.1: 필수 필드 검증 구현 예시 코드

**목표**:
데이터 저장 시 필수 필드가 모두 입력되었는지 검증하는 로직을 구현합니다. 이는 데이터 무결성을 보장하는 첫 번째 방어선입니다.

**배경:**
PRD Section 12.2.1에 따르면, groups, group_itinerary, group_cancel_rules 등의 테이블에는 반드시 입력되어야 하는 필수 필드들이 정의되어 있습니다. 이러한 필드가 누락되면 시스템이 정상적으로 작동하지 않으므로, 저장 전에 필수 필드 검증이 필요합니다.

**작업 내용:**

1. **필수 필드 정의 딕셔너리 생성**

   각 테이블별로 필수 필드 목록을 정의하세요. PRD Section 12.2.1의 정의를 기반으로 합니다.

   ```python
   REQUIRED_FIELDS = {
       'groups': ['name', 'start_date', 'end_date', 'pax', 'price_per_pax', 'status'],
       'group_itinerary': ['group_id', 'day_no', 'itinerary_date'],
       'group_cancel_rules': ['group_id', 'days_before', 'penalty_rate'],
       'group_includes': ['group_id', 'item'],
       'documents': ['group_id', 'document_type', 'file_name', 'file_path']
   }
   ```

   **주요 필드 설명:**
   - `groups.name`: 단체명 (중복 허용)
   - `groups.start_date`: 출발일 (모든 자동 계산의 기준)
   - `groups.end_date`: 도착일
   - `groups.pax`: 인원수 (1~999명)
   - `groups.price_per_pax`: 1인당 요금
   - `groups.status`: 상태 (estimate/contract/confirmed)
   - `group_itinerary.group_id`: 단체 ID (외래키)
   - `group_itinerary.day_no`: 일차 번호 (1부터 시작)
   - `group_itinerary.itinerary_date`: 일정 날짜

2. **필수 필드 검증 함수 구현**

   `backend/services/validation.py` 파일에 필수 필드 검증 함수를 구현하세요.

   ```python
   from typing import Dict, List, Any

   class ValidationError(Exception):
       """검증 오류 예외 클래스"""
       def __init__(self, message: str, field: str = None):
           self.message = message
           self.field = field
           super().__init__(self.message)

   def validate_required_fields(model_name: str, data: Dict[str, Any]) -> None:
       """
       필수 필드 검증

       Args:
           model_name: 테이블명 (예: 'groups', 'group_itinerary')
           data: 검증할 데이터 딕셔너리

       Raises:
           ValidationError: 필수 필드가 누락된 경우

       Example:
           >>> validate_required_fields('groups', {'name': '하노이골프', 'start_date': '2025-01-15'})
           ValidationError: 필수 필드가 누락되었습니다: end_date, pax, price_per_pax, status
       """
       required = REQUIRED_FIELDS.get(model_name, [])

       # 누락된 필드 찾기 (None 또는 존재하지 않는 필드)
       missing = []
       for field in required:
           if field not in data or data[field] is None or data[field] == '':
               missing.append(field)

       if missing:
           fields_str = ', '.join(missing)
           raise ValidationError(
               f"필수 필드가 누락되었습니다: {fields_str}",
               field=missing[0]  # 첫 번째 누락 필드를 강조
           )
   ```

3. **Pydantic 모델에 필수 필드 적용**

   FastAPI의 Pydantic 스키마에 필수 필드를 명시하세요.

   ```python
   from pydantic import BaseModel, Field
   from typing import Optional
   from datetime import date
   from uuid import UUID

   class GroupCreate(BaseModel):
       """단체 생성 스키마 (필수 필드 정의)"""
       name: str = Field(..., min_length=1, max_length=255, description="단체명")
       start_date: date = Field(..., description="출발일")
       end_date: date = Field(..., description="도착일")
       pax: int = Field(..., gt=0, le=999, description="인원수")
       price_per_pax: float = Field(..., ge=0, description="1인당 요금")
       status: str = Field(..., regex="^(estimate|contract|confirmed)$", description="상태")

       # 선택 필드
       nights: Optional[int] = None
       days: Optional[int] = None
       total_price: Optional[float] = None
       deposit: Optional[float] = None
       balance: Optional[float] = None
       balance_due_date: Optional[date] = None
   ```

4. **API 엔드포인트에서 검증 적용**

   각 생성/수정 API에서 필수 필드 검증을 호출하세요.

   ```python
   @router.post("", response_model=GroupResponse)
   async def create_group(group_data: GroupCreate):
       """단체 생성 API (필수 필드 자동 검증)"""
       try:
           # Pydantic이 자동으로 필수 필드 검증
           # 추가 비즈니스 검증 (후속 task에서 구현)
           validate_group_data(group_data)

           # 데이터 저장
           group = save_group(group_data.dict())
           return group

       except ValidationError as e:
           raise HTTPException(
               status_code=400,
               detail={
                   "error": "ValidationError",
                   "message": e.message,
                   "field": e.field
               }
           )
   ```

**실행 절차:**

1. `backend/services/validation.py` 파일을 생성하세요
2. ValidationError 예외 클래스를 정의하세요:
   - message: 오류 메시지
   - field: 오류가 발생한 필드명 (선택사항)
3. REQUIRED_FIELDS 딕셔너리를 정의하세요 (위의 코드 참조)
4. `validate_required_fields()` 함수를 구현하세요:
   - model_name에 해당하는 필수 필드 목록 가져오기
   - data 딕셔너리를 순회하며 누락된 필드 찾기
   - None, 빈 문자열, 존재하지 않는 키 모두 누락으로 간주
   - 누락된 필드가 있으면 ValidationError 발생
5. Pydantic 스키마에 필수 필드 정의:
   - `backend/schemas/group.py` 파일 생성
   - GroupCreate, GroupUpdate, ItineraryCreate 등의 스키마 정의
   - Field(...) 를 사용하여 필수 필드 명시 (... = required)
   - Field(None) 또는 Optional[T] 를 사용하여 선택 필드 명시
6. API 엔드포인트에 검증 적용:
   - `backend/routers/groups.py`, `backend/routers/itinerary.py` 등 수정
   - Pydantic 스키마를 파라미터로 사용하여 자동 검증
   - ValidationError를 HTTPException으로 변환
7. 단위 테스트 작성 (`tests/test_validation.py`):
   ```python
   def test_validate_required_fields_success():
       """필수 필드가 모두 있는 경우"""
       data = {
           'name': '하노이골프',
           'start_date': date(2025, 1, 15),
           'end_date': date(2025, 1, 20),
           'pax': 20,
           'price_per_pax': 1500000,
           'status': 'estimate'
       }
       # 예외가 발생하지 않아야 함
       validate_required_fields('groups', data)

   def test_validate_required_fields_missing():
       """필수 필드가 누락된 경우"""
       data = {
           'name': '하노이골프',
           'start_date': date(2025, 1, 15)
           # end_date, pax, price_per_pax, status 누락
       }
       with pytest.raises(ValidationError) as exc_info:
           validate_required_fields('groups', data)
       assert 'end_date' in str(exc_info.value)

   def test_validate_required_fields_none_value():
       """필수 필드가 None인 경우"""
       data = {
           'name': '하노이골프',
           'start_date': date(2025, 1, 15),
           'end_date': None,  # None은 누락으로 간주
           'pax': 20,
           'price_per_pax': 1500000,
           'status': 'estimate'
       }
       with pytest.raises(ValidationError) as exc_info:
           validate_required_fields('groups', data)
       assert 'end_date' in str(exc_info.value)
   ```

**중요 사항:**
- **빈 문자열 처리**: `''` (빈 문자열)도 누락으로 간주합니다. `data[field] == ''` 체크 필요
- **None과 누락 구분**: `field not in data`와 `data[field] is None` 모두 체크
- **0과 False 구분**: `pax=0`이나 `manual=False`는 유효한 값입니다. `is None` 체크 사용
- **Pydantic 우선**: FastAPI는 Pydantic 검증을 먼저 수행하므로, 대부분의 필수 필드 검증은 Pydantic으로 처리됩니다
- **에러 메시지 일관성**: PRD Section 12.4.3의 메시지 형식 준수

**검증 방법:**

1. 단위 테스트 실행:
   ```bash
   pytest tests/test_validation.py::test_validate_required_fields_success -v
   pytest tests/test_validation.py::test_validate_required_fields_missing -v
   pytest tests/test_validation.py::test_validate_required_fields_none_value -v
   ```

2. API 테스트 (curl):
   ```bash
   # 필수 필드 누락 테스트
   curl -X POST http://localhost:8000/api/groups \
     -H "Content-Type: application/json" \
     -d '{"name": "하노이골프", "start_date": "2025-01-15"}'

   # 예상 응답: 400 Bad Request
   # {"error": "ValidationError", "message": "필수 필드가 누락되었습니다: end_date, pax, price_per_pax, status", "field": "end_date"}
   ```

3. 프론트엔드 테스트:
   - 단체 생성 폼에서 필수 필드를 비워두고 저장 시도
   - "필수 필드가 누락되었습니다: ..." 메시지 표시 확인
   - 해당 필드에 빨간색 테두리 표시 확인

**산출물:**
- `backend/services/validation.py`: ValidationError 클래스 및 validate_required_fields() 함수
- `backend/schemas/group.py`: GroupCreate, GroupUpdate 스키마
- `backend/schemas/itinerary.py`: ItineraryCreate, ItineraryUpdate 스키마
- `backend/schemas/cancel_rules.py`: CancelRuleCreate, CancelRuleUpdate 스키마
- `tests/test_validation.py`: 필수 필드 검증 단위 테스트

**의존성:**
- 선행 task: T-DB-01 (테이블 스키마 정의 필요), T-API-01~T-API-11 (API 엔드포인트 필요)
- 후행 task: T-VALID-02 (데이터 타입 검증), T-VALID-03 (비즈니스 규칙 검증)

---

### T-VALID-02 데이터 타입 및 형식 검증 로직

**참조 문서:**
- PRD Section 12.2.2: 데이터 타입 및 형식 검증 규칙
- PRD Section 12.4.3: 오류 알림 메시지 (데이터 형식 오류)
- TRD Section 9.1.2: 데이터 타입 및 형식 검증 구현 예시 코드

**목표**:
데이터의 타입과 형식이 올바른지 검증하는 로직을 구현합니다. 날짜 형식, 금액 형식, 인원수 형식, 비율 형식 등을 검증하여 데이터 품질을 보장합니다.

**배경:**
PRD Section 12.2.2에 따르면, 날짜는 YYYY-MM-DD 형식, 금액은 소수점 2자리까지, 인원수는 양의 정수, 비율은 0~100 범위의 숫자만 허용됩니다. 잘못된 형식의 데이터는 계산 오류나 시스템 오류를 발생시킬 수 있으므로, 입력 단계에서 엄격하게 검증해야 합니다.

**작업 내용:**

1. **날짜 형식 검증 함수 구현**

   YYYY-MM-DD 형식의 날짜만 허용하는 검증 함수를 구현하세요.

   ```python
   from datetime import datetime, date
   from typing import Union

   def validate_date_format(date_value: Union[str, date], field_name: str = "날짜") -> date:
       """
       날짜 형식 검증 (YYYY-MM-DD)

       Args:
           date_value: 검증할 날짜 (문자열 또는 date 객체)
           field_name: 필드명 (에러 메시지용)

       Returns:
           date: 파싱된 date 객체

       Raises:
           ValidationError: 날짜 형식이 올바르지 않은 경우

       Example:
           >>> validate_date_format("2025-01-15", "출발일")
           date(2025, 1, 15)

           >>> validate_date_format("2025/01/15", "출발일")
           ValidationError: 출발일의 형식이 올바르지 않습니다. YYYY-MM-DD 형식을 사용해주세요

           >>> validate_date_format("15-01-2025", "출발일")
           ValidationError: 출발일의 형식이 올바르지 않습니다. YYYY-MM-DD 형식을 사용해주세요
       """
       # 이미 date 객체인 경우 그대로 반환
       if isinstance(date_value, date):
           return date_value

       # 문자열인 경우 파싱 시도
       if isinstance(date_value, str):
           try:
               parsed_date = datetime.strptime(date_value, '%Y-%m-%d').date()
               return parsed_date
           except ValueError:
               raise ValidationError(
                   f"{field_name}의 형식이 올바르지 않습니다. YYYY-MM-DD 형식을 사용해주세요",
                   field=field_name
               )

       # 그 외의 타입은 오류
       raise ValidationError(
           f"{field_name}은(는) 날짜 형식이어야 합니다",
           field=field_name
       )
   ```

2. **금액 형식 검증 함수 구현**

   숫자이며 소수점 2자리까지만 허용하는 검증 함수를 구현하세요.

   ```python
   def validate_amount(amount: Union[int, float, str], field_name: str = "금액") -> float:
       """
       금액 검증 (0 이상, 소수점 2자리까지)

       Args:
           amount: 검증할 금액
           field_name: 필드명 (에러 메시지용)

       Returns:
           float: 검증된 금액

       Raises:
           ValidationError: 금액이 0 미만이거나 소수점 2자리를 초과하는 경우

       Example:
           >>> validate_amount(1500000, "1인당 요금")
           1500000.0

           >>> validate_amount(1500000.50, "1인당 요금")
           1500000.5

           >>> validate_amount(1500000.567, "1인당 요금")
           ValidationError: 1인당 요금은(는) 소수점 2자리까지 입력 가능합니다

           >>> validate_amount(-100, "계약금")
           ValidationError: 계약금은(는) 0 이상의 값이어야 합니다
       """
       # 문자열인 경우 숫자로 변환 시도
       if isinstance(amount, str):
           try:
               amount = float(amount)
           except ValueError:
               raise ValidationError(
                   f"{field_name}은(는) 숫자여야 합니다",
                   field=field_name
               )

       # 숫자로 변환
       amount = float(amount)

       # 0 이상 검증
       if amount < 0:
           raise ValidationError(
               f"{field_name}은(는) 0 이상의 값이어야 합니다",
               field=field_name
           )

       # 소수점 2자리 검증
       if round(amount, 2) != amount:
           raise ValidationError(
               f"{field_name}은(는) 소수점 2자리까지 입력 가능합니다",
               field=field_name
           )

       return amount
   ```

3. **인원수 검증 함수 구현**

   양의 정수만 허용하는 검증 함수를 구현하세요.

   ```python
   def validate_pax(pax: Union[int, str], field_name: str = "인원수") -> int:
       """
       인원수 검증 (양의 정수)

       Args:
           pax: 검증할 인원수
           field_name: 필드명 (에러 메시지용)

       Returns:
           int: 검증된 인원수

       Raises:
           ValidationError: 인원수가 양의 정수가 아닌 경우

       Example:
           >>> validate_pax(20, "인원수")
           20

           >>> validate_pax("30", "인원수")
           30

           >>> validate_pax(0, "인원수")
           ValidationError: 인원수은(는) 1 이상의 정수여야 합니다

           >>> validate_pax(20.5, "인원수")
           ValidationError: 인원수은(는) 정수여야 합니다
       """
       # 문자열인 경우 정수로 변환 시도
       if isinstance(pax, str):
           try:
               pax = int(pax)
           except ValueError:
               raise ValidationError(
                   f"{field_name}은(는) 정수여야 합니다",
                   field=field_name
               )

       # float인 경우 정수 여부 확인
       if isinstance(pax, float):
           if pax != int(pax):
               raise ValidationError(
                   f"{field_name}은(는) 정수여야 합니다",
                   field=field_name
               )
           pax = int(pax)

       # 양의 정수 검증
       if pax < 1:
           raise ValidationError(
               f"{field_name}은(는) 1 이상의 정수여야 합니다",
               field=field_name
           )

       return pax
   ```

4. **비율 검증 함수 구현**

   0~100 범위의 숫자만 허용하는 검증 함수를 구현하세요.

   ```python
   def validate_percentage(percentage: Union[int, float, str], field_name: str = "비율") -> float:
       """
       비율 검증 (0~100)

       Args:
           percentage: 검증할 비율
           field_name: 필드명 (에러 메시지용)

       Returns:
           float: 검증된 비율

       Raises:
           ValidationError: 비율이 0~100 범위를 벗어나는 경우

       Example:
           >>> validate_percentage(50, "취소 수수료율")
           50.0

           >>> validate_percentage("75.5", "취소 수수료율")
           75.5

           >>> validate_percentage(101, "취소 수수료율")
           ValidationError: 취소 수수료율은(는) 0~100 사이의 값이어야 합니다

           >>> validate_percentage(-10, "취소 수수료율")
           ValidationError: 취소 수수료율은(는) 0~100 사이의 값이어야 합니다
       """
       # 문자열인 경우 숫자로 변환 시도
       if isinstance(percentage, str):
           try:
               percentage = float(percentage)
           except ValueError:
               raise ValidationError(
                   f"{field_name}은(는) 숫자여야 합니다",
                   field=field_name
               )

       # 숫자로 변환
       percentage = float(percentage)

       # 0~100 범위 검증
       if percentage < 0 or percentage > 100:
           raise ValidationError(
               f"{field_name}은(는) 0~100 사이의 값이어야 합니다",
               field=field_name
           )

       return percentage
   ```

5. **Pydantic 스키마에 형식 검증 적용**

   Pydantic의 validators를 사용하여 형식 검증을 자동화하세요.

   ```python
   from pydantic import BaseModel, Field, validator
   from datetime import date

   class GroupCreate(BaseModel):
       """단체 생성 스키마 (형식 검증 포함)"""
       name: str = Field(..., min_length=1, max_length=255)
       start_date: date  # Pydantic이 자동으로 YYYY-MM-DD 형식 파싱
       end_date: date
       pax: int = Field(..., gt=0, le=999)
       price_per_pax: float = Field(..., ge=0)
       deposit: Optional[float] = Field(None, ge=0)

       @validator('price_per_pax', 'deposit')
       def validate_amount_precision(cls, v, field):
           """금액 소수점 2자리 검증"""
           if v is not None and round(v, 2) != v:
               raise ValueError(f"{field.name}은(는) 소수점 2자리까지 입력 가능합니다")
           return v

       @validator('start_date', 'end_date')
       def validate_date_not_none(cls, v, field):
           """날짜가 None이 아닌지 검증"""
           if v is None:
               raise ValueError(f"{field.name}을(를) 입력해주세요")
           return v

   class CancelRuleCreate(BaseModel):
       """취소 규정 생성 스키마 (비율 검증 포함)"""
       group_id: UUID
       days_before: int = Field(..., ge=0)
       penalty_rate: float = Field(..., ge=0, le=100)

       @validator('penalty_rate')
       def validate_penalty_rate(cls, v):
           """취소 수수료율 검증 (0~100)"""
           if v < 0 or v > 100:
               raise ValueError("취소 수수료율은 0~100 사이의 값이어야 합니다")
           return v
   ```

**실행 절차:**

1. `backend/services/validation.py` 파일을 열거나 T-VALID-01에서 생성한 파일 계속 사용
2. 위의 4개 검증 함수 추가:
   - `validate_date_format()`: 날짜 형식 검증
   - `validate_amount()`: 금액 형식 검증
   - `validate_pax()`: 인원수 검증
   - `validate_percentage()`: 비율 검증
3. 각 함수에 타입 힌트, 독스트링, 예시 추가
4. Pydantic 스키마에 validator 추가:
   - `backend/schemas/group.py`에서 GroupCreate 스키마 수정
   - @validator 데코레이터를 사용하여 커스텀 검증 로직 추가
   - 금액 필드에 소수점 2자리 검증 추가
5. 단위 테스트 작성 (`tests/test_validation.py`에 추가):
   ```python
   # 날짜 형식 검증 테스트
   def test_validate_date_format_success():
       result = validate_date_format("2025-01-15", "출발일")
       assert result == date(2025, 1, 15)

   def test_validate_date_format_invalid():
       with pytest.raises(ValidationError) as exc_info:
           validate_date_format("2025/01/15", "출발일")
       assert "YYYY-MM-DD" in str(exc_info.value)

   # 금액 형식 검증 테스트
   def test_validate_amount_success():
       assert validate_amount(1500000, "요금") == 1500000.0
       assert validate_amount(1500000.50, "요금") == 1500000.50

   def test_validate_amount_negative():
       with pytest.raises(ValidationError):
           validate_amount(-100, "계약금")

   def test_validate_amount_too_many_decimals():
       with pytest.raises(ValidationError) as exc_info:
           validate_amount(1500000.567, "요금")
       assert "소수점 2자리" in str(exc_info.value)

   # 인원수 검증 테스트
   def test_validate_pax_success():
       assert validate_pax(20, "인원수") == 20
       assert validate_pax("30", "인원수") == 30

   def test_validate_pax_zero():
       with pytest.raises(ValidationError):
           validate_pax(0, "인원수")

   def test_validate_pax_float():
       with pytest.raises(ValidationError):
           validate_pax(20.5, "인원수")

   # 비율 검증 테스트
   def test_validate_percentage_success():
       assert validate_percentage(50, "수수료율") == 50.0
       assert validate_percentage(75.5, "수수료율") == 75.5

   def test_validate_percentage_out_of_range():
       with pytest.raises(ValidationError):
           validate_percentage(101, "수수료율")
       with pytest.raises(ValidationError):
           validate_percentage(-10, "수수료율")
   ```

**중요 사항:**
- **Pydantic 우선 사용**: FastAPI는 Pydantic을 통해 자동으로 타입 검증을 수행하므로, 가능한 한 Pydantic validator를 사용하세요
- **날짜 자동 파싱**: Pydantic의 `date` 타입은 "YYYY-MM-DD" 형식을 자동으로 파싱합니다
- **에러 메시지 일관성**: PRD Section 12.4.3의 메시지 형식을 준수하세요
- **Union 타입**: API는 JSON으로 데이터를 받으므로 문자열/숫자 모두 처리할 수 있어야 합니다
- **소수점 비교**: 부동소수점 비교 시 `round(amount, 2) != amount` 사용

**검증 방법:**

1. 단위 테스트 실행:
   ```bash
   pytest tests/test_validation.py::test_validate_date_format_success -v
   pytest tests/test_validation.py::test_validate_amount_success -v
   pytest tests/test_validation.py::test_validate_pax_success -v
   pytest tests/test_validation.py::test_validate_percentage_success -v
   pytest tests/test_validation.py -v  # 전체 테스트
   ```

2. API 테스트 (curl):
   ```bash
   # 날짜 형식 오류 테스트
   curl -X POST http://localhost:8000/api/groups \
     -H "Content-Type: application/json" \
     -d '{
       "name": "하노이골프",
       "start_date": "2025/01/15",
       "end_date": "2025-01-20",
       "pax": 20,
       "price_per_pax": 1500000,
       "status": "estimate"
     }'
   # 예상 응답: 400 Bad Request (날짜 형식 오류)

   # 금액 소수점 오류 테스트
   curl -X POST http://localhost:8000/api/groups \
     -H "Content-Type: application/json" \
     -d '{
       "name": "하노이골프",
       "start_date": "2025-01-15",
       "end_date": "2025-01-20",
       "pax": 20,
       "price_per_pax": 1500000.567,
       "status": "estimate"
     }'
   # 예상 응답: 400 Bad Request (소수점 2자리 초과)

   # 비율 범위 오류 테스트
   curl -X POST http://localhost:8000/api/cancel-rules \
     -H "Content-Type: application/json" \
     -d '{
       "group_id": "...",
       "days_before": 30,
       "penalty_rate": 150
     }'
   # 예상 응답: 400 Bad Request (비율이 100 초과)
   ```

3. 프론트엔드 테스트:
   - 잘못된 날짜 형식 입력 (2025/01/15, 15-01-2025 등)
   - 음수 금액 입력
   - 소수점 3자리 이상 금액 입력 (1500000.567)
   - 비율 101 입력
   - 각각의 경우 적절한 에러 메시지 표시 확인

**산출물:**
- `backend/services/validation.py`: 형식 검증 함수 4개 추가
- `backend/schemas/group.py`: Pydantic validator 추가
- `backend/schemas/cancel_rules.py`: 비율 검증 validator 추가
- `tests/test_validation.py`: 형식 검증 단위 테스트 추가

**의존성:**
- 선행 task: T-VALID-01 (ValidationError 클래스 정의 필요)
- 후행 task: T-VALID-03 (비즈니스 규칙 검증에서 이 함수들을 활용)

---

### T-VALID-03 비즈니스 규칙 검증 로직

**참조 문서:**
- PRD Section 12.1: 자동 계산 예외 케이스 처리 (날짜/금액/일정 관련 예외)
- PRD Section 12.2.3: 비즈니스 규칙 검증 정의
- TRD Section 9.1.3: 비즈니스 규칙 검증 구현 예시 코드

**목표**:
시스템의 비즈니스 규칙을 검증하는 로직을 구현합니다. 출발일 < 도착일, 계약금 <= 총액, 인원수 범위, 여행 기간, 일정 날짜 범위 등의 비즈니스 제약조건을 검증합니다.

**배경:**
PRD Section 12.2.3에 따르면, 데이터가 형식적으로는 올바르더라도 비즈니스 로직 상 허용되지 않는 경우가 있습니다. 예를 들어, 출발일이 도착일보다 늦거나, 계약금이 총액을 초과하는 경우는 시스템 오류를 발생시키므로 저장 전에 검증이 필요합니다.

**작업 내용:**

1. **단체 데이터 비즈니스 규칙 검증 함수**

   `validate_group_data()` 함수를 구현하여 단체 데이터의 비즈니스 규칙을 검증하세요.

   ```python
   from datetime import date, timedelta
   import logging

   logger = logging.getLogger('travel_agency')

   def validate_group_data(group: Group) -> None:
       """
       단체 데이터 비즈니스 규칙 검증

       Args:
           group: 검증할 단체 객체 (Group 모델 또는 Pydantic 스키마)

       Raises:
           ValidationError: 비즈니스 규칙 위반 시

       검증 항목:
           1. 출발일 <= 도착일
           2. 계약금 <= 총액
           3. 인원수 범위 (1~999)
           4. 여행 기간 (최소 1박 2일)
           5. 잔액 완납일 (과거 날짜 경고)
       """
       # 1. 출발일 > 도착일 검증
       if group.end_date <= group.start_date:
           raise ValidationError(
               "도착일은 출발일보다 이후여야 합니다",
               field="end_date"
           )

       # 2. 계약금 > 총액 검증
       if group.deposit and group.total_price:
           if group.deposit > group.total_price:
               raise ValidationError(
                   "계약금은 총액을 초과할 수 없습니다",
                   field="deposit"
               )

       # 3. 인원수 범위 검증 (1~999)
       if group.pax < 1 or group.pax > 999:
           raise ValidationError(
               "인원수는 1명 이상 999명 이하여야 합니다",
               field="pax"
           )

       # 4. 여행 기간 검증 (최소 1박 2일)
       nights = (group.end_date - group.start_date).days
       if nights < 1:
           raise ValidationError(
               "여행 기간은 최소 1박 2일 이상이어야 합니다",
               field="end_date"
           )

       # 5. 잔액 완납일 검증 (과거 날짜 경고)
       if hasattr(group, 'balance_due_date') and group.balance_due_date:
           if group.balance_due_date < date.today():
               logger.warning(
                   f"잔액 완납일이 과거입니다: group_id={group.id if hasattr(group, 'id') else 'new'}, "
                   f"balance_due_date={group.balance_due_date}"
               )
               # 경고만 하고 저장은 허용 (PRD Section 12.1.1 참조)

       # 6. 출발일이 과거인 경우 경고
       if group.start_date < date.today():
           logger.warning(
               f"출발일이 과거입니다: group_id={group.id if hasattr(group, 'id') else 'new'}, "
               f"start_date={group.start_date}"
           )
           # 경고만 하고 저장은 허용
   ```

2. **일정 데이터 비즈니스 규칙 검증 함수**

   `validate_itinerary_data()` 함수를 구현하여 일정 데이터의 비즈니스 규칙을 검증하세요.

   ```python
   def validate_itinerary_data(itinerary: Itinerary, group: Group) -> None:
       """
       일정 데이터 비즈니스 규칙 검증

       Args:
           itinerary: 검증할 일정 객체
           group: 해당 단체 객체

       Raises:
           ValidationError: 비즈니스 규칙 위반 시

       검증 항목:
           1. 일정 날짜 >= 출발일
           2. 일정 날짜 <= 도착일 (경고)
           3. day_no 중복 (DB UNIQUE 제약조건으로 처리)
       """
       # 1. 일정 날짜가 출발일 이전인지 검증
       if itinerary.itinerary_date < group.start_date:
           raise ValidationError(
               "일정 날짜는 출발일 이후여야 합니다",
               field="itinerary_date"
           )

       # 2. 일정 날짜가 도착일 이후인지 경고
       if itinerary.itinerary_date > group.end_date:
           logger.warning(
               f"일정 날짜가 여행 기간을 벗어났습니다: "
               f"group_id={group.id}, day_no={itinerary.day_no}, "
               f"itinerary_date={itinerary.itinerary_date}, "
               f"travel_period={group.start_date} ~ {group.end_date}"
           )
           # 경고만 하고 저장은 허용 (연장 일정 가능)

       # 3. day_no 범위 검증 (1 이상)
       if itinerary.day_no < 1:
           raise ValidationError(
               "일차 번호는 1 이상이어야 합니다",
               field="day_no"
           )

       # day_no 중복은 DB UNIQUE 제약조건으로 처리됨 (group_id, day_no)
   ```

3. **취소 규정 데이터 비즈니스 규칙 검증 함수**

   `validate_cancel_rule_data()` 함수를 구현하여 취소 규정 데이터의 비즈니스 규칙을 검증하세요.

   ```python
   def validate_cancel_rule_data(cancel_rule: CancelRule) -> None:
       """
       취소 규정 데이터 비즈니스 규칙 검증

       Args:
           cancel_rule: 검증할 취소 규정 객체

       Raises:
           ValidationError: 비즈니스 규칙 위반 시

       검증 항목:
           1. days_before >= 0 (출발 당일 포함)
           2. penalty_rate 0~100
       """
       # 1. days_before 범위 검증 (0 이상)
       if cancel_rule.days_before < 0:
           raise ValidationError(
               "출발 전 일수는 0 이상이어야 합니다",
               field="days_before"
           )

       # 2. penalty_rate 범위 검증 (0~100) - 이미 T-VALID-02에서 검증
       # 여기서는 이중 검증
       if cancel_rule.penalty_rate < 0 or cancel_rule.penalty_rate > 100:
           raise ValidationError(
               "취소 수수료율은 0~100 사이의 값이어야 합니다",
               field="penalty_rate"
           )
   ```

4. **복합 비즈니스 규칙 검증 함수**

   여러 엔티티 간의 관계를 검증하는 함수를 구현하세요.

   ```python
   def validate_group_with_relations(group: Group, itineraries: List[Itinerary] = None) -> None:
       """
       단체 및 관련 데이터 종합 검증

       Args:
           group: 단체 객체
           itineraries: 일정 목록 (선택사항)

       Raises:
           ValidationError: 비즈니스 규칙 위반 시

       검증 항목:
           1. 단체 기본 검증
           2. 일정과 단체 기간 일치 검증
           3. 상태별 제약조건 검증
       """
       # 1. 단체 기본 검증
       validate_group_data(group)

       # 2. 일정 검증 (일정이 제공된 경우)
       if itineraries:
           for itinerary in itineraries:
               validate_itinerary_data(itinerary, group)

           # 일정 날짜 범위 종합 검증
           itinerary_dates = [it.itinerary_date for it in itineraries]
           if itinerary_dates:
               min_date = min(itinerary_dates)
               max_date = max(itinerary_dates)

               if min_date < group.start_date:
                   raise ValidationError(
                       f"일정 중 출발일 이전 날짜가 있습니다: {min_date}",
                       field="itinerary_date"
                   )

               if max_date > group.end_date:
                   logger.warning(
                       f"일정 중 도착일 이후 날짜가 있습니다: {max_date} "
                       f"(travel_period: {group.start_date} ~ {group.end_date})"
                   )

       # 3. 상태별 제약조건 검증
       if group.status == 'confirmed':
           # 확정 상태에서는 필수 필드가 모두 채워져야 함
           if not group.deposit or group.deposit == 0:
               raise ValidationError(
                   "확정 상태에서는 계약금이 입력되어야 합니다",
                   field="deposit"
               )

           if not group.balance_due_date:
               raise ValidationError(
                   "확정 상태에서는 잔액 완납일이 입력되어야 합니다",
                   field="balance_due_date"
               )
   ```

5. **Pydantic 스키마에 비즈니스 규칙 검증 적용**

   Pydantic의 root_validator를 사용하여 여러 필드 간의 관계를 검증하세요.

   ```python
   from pydantic import BaseModel, Field, validator, root_validator

   class GroupCreate(BaseModel):
       """단체 생성 스키마 (비즈니스 규칙 검증 포함)"""
       name: str
       start_date: date
       end_date: date
       pax: int = Field(..., gt=0, le=999)
       price_per_pax: float = Field(..., ge=0)
       deposit: Optional[float] = Field(None, ge=0)
       total_price: Optional[float] = Field(None, ge=0)
       status: str

       @root_validator
       def validate_business_rules(cls, values):
           """비즈니스 규칙 종합 검증"""
           start_date = values.get('start_date')
           end_date = values.get('end_date')
           deposit = values.get('deposit')
           total_price = values.get('total_price')

           # 출발일 <= 도착일 검증
           if start_date and end_date and end_date <= start_date:
               raise ValueError("도착일은 출발일보다 이후여야 합니다")

           # 여행 기간 최소 1박 2일
           if start_date and end_date:
               nights = (end_date - start_date).days
               if nights < 1:
                   raise ValueError("여행 기간은 최소 1박 2일 이상이어야 합니다")

           # 계약금 <= 총액
           if deposit and total_price and deposit > total_price:
               raise ValueError("계약금은 총액을 초과할 수 없습니다")

           return values
   ```

**실행 절차:**

1. `backend/services/validation.py` 파일에 위의 검증 함수들 추가
2. 각 검증 함수 구현:
   - `validate_group_data()`: 단체 비즈니스 규칙 검증
   - `validate_itinerary_data()`: 일정 비즈니스 규칙 검증
   - `validate_cancel_rule_data()`: 취소 규정 비즈니스 규칙 검증
   - `validate_group_with_relations()`: 복합 검증
3. Pydantic 스키마에 root_validator 추가:
   - `backend/schemas/group.py`에 @root_validator 데코레이터 사용
   - 여러 필드 간 관계 검증
4. API 엔드포인트에서 검증 호출:
   ```python
   @router.post("", response_model=GroupResponse)
   async def create_group(group_data: GroupCreate):
       """단체 생성 API (비즈니스 규칙 검증 포함)"""
       try:
           # Pydantic이 자동으로 root_validator 실행
           # 추가 검증 (필요 시)
           # validate_group_data(group_data)

           # 데이터 저장
           group = save_group(group_data.dict())
           return group

       except ValidationError as e:
           raise HTTPException(status_code=400, detail={"error": "ValidationError", "message": e.message})
   ```
5. 단위 테스트 작성 (`tests/test_validation.py`에 추가):
   ```python
   # 단체 검증 테스트
   def test_validate_group_data_success():
       group = Group(
           name="하노이골프",
           start_date=date(2025, 1, 15),
           end_date=date(2025, 1, 20),
           pax=20,
           price_per_pax=1500000,
           total_price=30000000,
           deposit=10000000,
           status="estimate"
       )
       validate_group_data(group)  # 예외 없이 통과

   def test_validate_group_data_end_date_before_start():
       group = Group(
           name="하노이골프",
           start_date=date(2025, 1, 20),
           end_date=date(2025, 1, 15),  # 출발일보다 이전
           pax=20,
           price_per_pax=1500000,
           status="estimate"
       )
       with pytest.raises(ValidationError) as exc_info:
           validate_group_data(group)
       assert "도착일은 출발일보다 이후여야 합니다" in str(exc_info.value)

   def test_validate_group_data_deposit_exceeds_total():
       group = Group(
           name="하노이골프",
           start_date=date(2025, 1, 15),
           end_date=date(2025, 1, 20),
           pax=20,
           price_per_pax=1500000,
           total_price=30000000,
           deposit=40000000,  # 총액 초과
           status="estimate"
       )
       with pytest.raises(ValidationError) as exc_info:
           validate_group_data(group)
       assert "계약금은 총액을 초과할 수 없습니다" in str(exc_info.value)

   def test_validate_group_data_pax_out_of_range():
       group = Group(
           name="하노이골프",
           start_date=date(2025, 1, 15),
           end_date=date(2025, 1, 20),
           pax=1000,  # 999 초과
           price_per_pax=1500000,
           status="estimate"
       )
       with pytest.raises(ValidationError) as exc_info:
           validate_group_data(group)
       assert "인원수는 1명 이상 999명 이하여야 합니다" in str(exc_info.value)

   # 일정 검증 테스트
   def test_validate_itinerary_data_success():
       group = Group(start_date=date(2025, 1, 15), end_date=date(2025, 1, 20))
       itinerary = Itinerary(
           group_id=group.id,
           day_no=1,
           itinerary_date=date(2025, 1, 15)
       )
       validate_itinerary_data(itinerary, group)  # 예외 없이 통과

   def test_validate_itinerary_data_before_start():
       group = Group(start_date=date(2025, 1, 15), end_date=date(2025, 1, 20))
       itinerary = Itinerary(
           group_id=group.id,
           day_no=1,
           itinerary_date=date(2025, 1, 10)  # 출발일 이전
       )
       with pytest.raises(ValidationError) as exc_info:
           validate_itinerary_data(itinerary, group)
       assert "일정 날짜는 출발일 이후여야 합니다" in str(exc_info.value)
   ```

**중요 사항:**
- **경고 vs 오류**: PRD Section 12.1에 따라, 일부 규칙 위반은 경고만 표시하고 저장은 허용합니다 (과거 날짜, 일정 날짜 범위 초과 등)
- **로깅**: 경고 메시지는 logger.warning()을 사용하여 로그에 기록하세요
- **상태별 검증**: 확정(confirmed) 상태에서는 더 엄격한 검증을 수행합니다
- **DB 제약조건**: day_no 중복 등 일부 검증은 DB UNIQUE 제약조건으로 처리되므로 애플리케이션 레벨에서 중복 검증하지 않아도 됩니다
- **Pydantic root_validator**: 여러 필드 간 관계를 검증할 때는 @root_validator를 사용하세요

**검증 방법:**

1. 단위 테스트 실행:
   ```bash
   pytest tests/test_validation.py::test_validate_group_data_success -v
   pytest tests/test_validation.py::test_validate_group_data_end_date_before_start -v
   pytest tests/test_validation.py::test_validate_group_data_deposit_exceeds_total -v
   pytest tests/test_validation.py -k "business" -v  # 비즈니스 규칙 테스트만 실행
   ```

2. API 테스트 (curl):
   ```bash
   # 출발일 > 도착일 오류 테스트
   curl -X POST http://localhost:8000/api/groups \
     -H "Content-Type: application/json" \
     -d '{
       "name": "하노이골프",
       "start_date": "2025-01-20",
       "end_date": "2025-01-15",
       "pax": 20,
       "price_per_pax": 1500000,
       "status": "estimate"
     }'
   # 예상 응답: 400 Bad Request ("도착일은 출발일보다 이후여야 합니다")

   # 계약금 > 총액 오류 테스트
   curl -X POST http://localhost:8000/api/groups \
     -H "Content-Type: application/json" \
     -d '{
       "name": "하노이골프",
       "start_date": "2025-01-15",
       "end_date": "2025-01-20",
       "pax": 20,
       "price_per_pax": 1500000,
       "total_price": 30000000,
       "deposit": 40000000,
       "status": "estimate"
     }'
   # 예상 응답: 400 Bad Request ("계약금은 총액을 초과할 수 없습니다")
   ```

3. 통합 테스트:
   - 단체 생성 → 일정 추가 → 출발일 변경 → 일정 날짜 재계산 → 일정 검증
   - 모든 비즈니스 규칙이 올바르게 적용되는지 확인

**산출물:**
- `backend/services/validation.py`: 비즈니스 규칙 검증 함수 4개 추가
- `backend/schemas/group.py`: root_validator 추가
- `tests/test_validation.py`: 비즈니스 규칙 검증 단위 테스트 추가

**의존성:**
- 선행 task: T-VALID-01 (ValidationError 클래스), T-VALID-02 (형식 검증 함수)
- 후행 task: T-VALID-04 (에러 처리 및 사용자 알림)

---

### T-VALID-04 에러 처리 및 사용자 알림

**참조 문서:**
- PRD Section 12.3: 에러 처리 시나리오 (계산 오류, PDF 생성 실패, DB 오류, 데이터 불일치)
- PRD Section 12.4: 사용자 알림 및 피드백 (성공/경고/오류 알림)
- TRD Section 9.2: 자동 계산 예외 처리
- TRD Section 9.3: PDF 생성 실패 처리
- TRD Section 9.4: 데이터베이스 오류 처리
- TRD Section 9.5: 사용자 알림 및 피드백

**목표**:
시스템의 모든 에러를 일관된 방식으로 처리하고, 사용자에게 친화적인 알림 메시지를 제공하는 시스템을 구축합니다. 에러 타입 정의, 에러 핸들러 구현, 알림 시스템 연동을 포함합니다.

**배경:**
PRD Section 12.3과 12.4에 따르면, 시스템에서 발생하는 다양한 에러(검증 오류, 계산 오류, PDF 생성 실패, DB 오류 등)를 사용자에게 명확하고 친화적으로 전달해야 합니다. 또한 성공, 경고, 오류 등 다양한 상황에서 적절한 피드백을 제공해야 합니다.

**작업 내용:**

1. **에러 타입 정의**

   시스템에서 사용할 커스텀 예외 클래스들을 정의하세요.

   ```python
   # backend/exceptions.py

   class TravelAgencyException(Exception):
       """여행사 시스템 기본 예외 클래스"""
       def __init__(self, message: str, field: str = None, code: str = None):
           self.message = message
           self.field = field
           self.code = code or self.__class__.__name__
           super().__init__(self.message)

   class ValidationError(TravelAgencyException):
       """데이터 검증 오류 (400 Bad Request)"""
       pass

   class NotFoundError(TravelAgencyException):
       """리소스를 찾을 수 없음 (404 Not Found)"""
       pass

   class ForbiddenError(TravelAgencyException):
       """권한 없음 또는 허용되지 않는 작업 (403 Forbidden)"""
       pass

   class CalculationError(TravelAgencyException):
       """자동 계산 오류 (500 Internal Server Error)"""
       pass

   class PDFGenerationError(TravelAgencyException):
       """PDF 생성 오류 (500 Internal Server Error)"""
       pass

   class DatabaseError(TravelAgencyException):
       """데이터베이스 오류 (500 Internal Server Error)"""
       pass

   class IntegrityError(TravelAgencyException):
       """데이터 무결성 오류 (409 Conflict)"""
       pass
   ```

2. **FastAPI 에러 핸들러 구현**

   각 예외를 HTTP 응답으로 변환하는 글로벌 에러 핸들러를 구현하세요.

   ```python
   # backend/main.py 또는 backend/error_handlers.py

   from fastapi import FastAPI, Request, status
   from fastapi.responses import JSONResponse
   from fastapi.exceptions import RequestValidationError
   import logging

   logger = logging.getLogger('travel_agency')

   app = FastAPI()

   @app.exception_handler(ValidationError)
   async def validation_error_handler(request: Request, exc: ValidationError):
       """검증 오류 핸들러 (400 Bad Request)"""
       logger.warning(f"Validation error: {exc.message}, field: {exc.field}")
       return JSONResponse(
           status_code=status.HTTP_400_BAD_REQUEST,
           content={
               "error": "ValidationError",
               "message": exc.message,
               "field": exc.field,
               "code": exc.code
           }
       )

   @app.exception_handler(NotFoundError)
   async def not_found_error_handler(request: Request, exc: NotFoundError):
       """리소스를 찾을 수 없음 (404 Not Found)"""
       logger.warning(f"Not found: {exc.message}")
       return JSONResponse(
           status_code=status.HTTP_404_NOT_FOUND,
           content={
               "error": "NotFoundError",
               "message": exc.message,
               "code": exc.code
           }
       )

   @app.exception_handler(ForbiddenError)
   async def forbidden_error_handler(request: Request, exc: ForbiddenError):
       """권한 없음 (403 Forbidden)"""
       logger.warning(f"Forbidden: {exc.message}")
       return JSONResponse(
           status_code=status.HTTP_403_FORBIDDEN,
           content={
               "error": "ForbiddenError",
               "message": exc.message,
               "code": exc.code
           }
       )

   @app.exception_handler(CalculationError)
   async def calculation_error_handler(request: Request, exc: CalculationError):
       """계산 오류 (500 Internal Server Error)"""
       logger.error(f"Calculation error: {exc.message}", exc_info=True)
       return JSONResponse(
           status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
           content={
               "error": "CalculationError",
               "message": "계산 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요",
               "code": exc.code
           }
       )

   @app.exception_handler(PDFGenerationError)
   async def pdf_generation_error_handler(request: Request, exc: PDFGenerationError):
       """PDF 생성 오류 (500 Internal Server Error)"""
       logger.error(f"PDF generation error: {exc.message}", exc_info=True)
       return JSONResponse(
           status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
           content={
               "error": "PDFGenerationError",
               "message": "PDF 생성에 실패했습니다. 잠시 후 다시 시도해주세요",
               "code": exc.code
           }
       )

   @app.exception_handler(DatabaseError)
   async def database_error_handler(request: Request, exc: DatabaseError):
       """데이터베이스 오류 (500 Internal Server Error)"""
       logger.error(f"Database error: {exc.message}", exc_info=True)
       return JSONResponse(
           status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
           content={
               "error": "DatabaseError",
               "message": "시스템에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요",
               "code": exc.code
           }
       )

   @app.exception_handler(IntegrityError)
   async def integrity_error_handler(request: Request, exc: IntegrityError):
       """데이터 무결성 오류 (409 Conflict)"""
       logger.warning(f"Integrity error: {exc.message}")
       return JSONResponse(
           status_code=status.HTTP_409_CONFLICT,
           content={
               "error": "IntegrityError",
               "message": exc.message,
               "code": exc.code
           }
       )

   @app.exception_handler(RequestValidationError)
   async def pydantic_validation_error_handler(request: Request, exc: RequestValidationError):
       """Pydantic 검증 오류 핸들러"""
       logger.warning(f"Request validation error: {exc.errors()}")

       # 첫 번째 오류 추출
       first_error = exc.errors()[0] if exc.errors() else {}
       field = '.'.join(str(loc) for loc in first_error.get('loc', []))
       message = first_error.get('msg', '입력 데이터가 올바르지 않습니다')

       return JSONResponse(
           status_code=status.HTTP_400_BAD_REQUEST,
           content={
               "error": "ValidationError",
               "message": message,
               "field": field,
               "details": exc.errors()
           }
       )

   @app.exception_handler(Exception)
   async def general_exception_handler(request: Request, exc: Exception):
       """일반 예외 핸들러 (예상치 못한 오류)"""
       logger.error(f"Unexpected error: {str(exc)}", exc_info=True)
       return JSONResponse(
           status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
           content={
               "error": "InternalServerError",
               "message": "예상치 못한 오류가 발생했습니다. 관리자에게 문의해주세요",
               "code": "INTERNAL_SERVER_ERROR"
           }
       )
   ```

3. **사용자 알림 메시지 정의**

   일관된 알림 메시지를 정의하고 관리하는 시스템을 구축하세요.

   ```python
   # backend/config/messages.py

   MESSAGES = {
       'success': {
           'save': '저장되었습니다',
           'pdf_generated': 'PDF가 생성되었습니다. 다운로드하시겠습니까?',
           'recalculated': '자동 계산이 완료되었습니다',
           'delete': '삭제되었습니다',
           'status_changed': '상태가 변경되었습니다'
       },
       'warning': {
           'manual_modified': '자동 계산값이 수동으로 수정되었습니다',
           'date_out_of_range': '입력한 날짜가 여행 기간을 벗어났습니다',
           'amount_mismatch': '계산된 금액과 입력한 금액이 다릅니다',
           'past_date': '과거 날짜가 입력되었습니다',
           'past_balance_due_date': '잔액 완납일이 과거입니다',
           'itinerary_modified': '출발일 변경으로 인해 {count}개의 일정 날짜가 변경되었습니다'
       },
       'error': {
           'required_field': '{field}을(를) 입력해주세요',
           'invalid_format': '{field}의 형식이 올바르지 않습니다',
           'business_rule': '{message}',
           'not_found': '{resource}을(를) 찾을 수 없습니다',
           'forbidden': '이 작업을 수행할 권한이 없습니다',
           'calculation_failed': '계산 중 오류가 발생했습니다',
           'pdf_generation_failed': 'PDF 생성에 실패했습니다',
           'database_error': '시스템에 일시적인 문제가 발생했습니다'
       }
   }

   def get_message(message_type: str, message_key: str, **kwargs) -> str:
       """
       메시지 조회 및 포맷팅

       Args:
           message_type: 메시지 타입 (success/warning/error)
           message_key: 메시지 키
           **kwargs: 포맷팅 파라미터

       Returns:
           str: 포맷된 메시지

       Example:
           >>> get_message('error', 'required_field', field='출발일')
           '출발일을(를) 입력해주세요'

           >>> get_message('warning', 'itinerary_modified', count=5)
           '출발일 변경으로 인해 5개의 일정 날짜가 변경되었습니다'
       """
       message_template = MESSAGES.get(message_type, {}).get(message_key, '')
       if not message_template:
           return '알 수 없는 메시지'

       return message_template.format(**kwargs)
   ```

4. **프론트엔드 알림 시스템 구축**

   백엔드에서 전달된 에러/알림을 사용자에게 표시하는 시스템을 구축하세요.

   ```javascript
   // frontend/js/notification.js

   /**
    * 알림 표시 시스템
    */
   class NotificationSystem {
       constructor() {
           this.container = document.getElementById('notification-container');
           if (!this.container) {
               // 알림 컨테이너 생성
               this.container = document.createElement('div');
               this.container.id = 'notification-container';
               this.container.className = 'notification-container';
               document.body.appendChild(this.container);
           }
       }

       /**
        * 성공 알림 표시
        */
       showSuccess(message, duration = 3000) {
           this._showNotification(message, 'success', duration);
       }

       /**
        * 경고 알림 표시
        */
       showWarning(message, duration = 5000) {
           this._showNotification(message, 'warning', duration);
       }

       /**
        * 오류 알림 표시
        */
       showError(message, duration = 0) {  // 0 = 수동 닫기
           this._showNotification(message, 'error', duration);
       }

       /**
        * 알림 표시 (내부 함수)
        */
       _showNotification(message, type, duration) {
           const notification = document.createElement('div');
           notification.className = `notification notification-${type}`;

           // 아이콘 추가
           const icon = this._getIcon(type);
           notification.innerHTML = `
               <span class="notification-icon">${icon}</span>
               <span class="notification-message">${message}</span>
               <button class="notification-close" onclick="this.parentElement.remove()">×</button>
           `;

           this.container.appendChild(notification);

           // 자동 닫기 (duration > 0인 경우)
           if (duration > 0) {
               setTimeout(() => {
                   notification.classList.add('fade-out');
                   setTimeout(() => notification.remove(), 300);
               }, duration);
           }
       }

       /**
        * 타입별 아이콘 반환
        */
       _getIcon(type) {
           const icons = {
               'success': '✓',
               'warning': '⚠',
               'error': '✖'
           };
           return icons[type] || 'ℹ';
       }

       /**
        * API 에러 응답 처리
        */
       handleApiError(error) {
           if (error.response && error.response.data) {
               const data = error.response.data;

               // 필드 오류인 경우 해당 필드 강조
               if (data.field) {
                   this._highlightErrorField(data.field);
               }

               // 에러 메시지 표시
               this.showError(data.message || '오류가 발생했습니다');
           } else {
               this.showError('네트워크 오류가 발생했습니다');
           }
       }

       /**
        * 오류 필드 강조
        */
       _highlightErrorField(fieldName) {
           const field = document.querySelector(`[name="${fieldName}"]`);
           if (field) {
               field.classList.add('error-field');
               field.focus();

               // 3초 후 강조 제거
               setTimeout(() => {
                   field.classList.remove('error-field');
               }, 3000);
           }
       }
   }

   // 전역 알림 시스템 인스턴스
   const notification = new NotificationSystem();
   ```

   ```css
   /* frontend/css/notification.css */

   .notification-container {
       position: fixed;
       top: 20px;
       right: 20px;
       z-index: 9999;
       max-width: 400px;
   }

   .notification {
       display: flex;
       align-items: center;
       padding: 15px 20px;
       margin-bottom: 10px;
       border-radius: 4px;
       box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
       animation: slideIn 0.3s ease-out;
   }

   .notification-success {
       background-color: #4CAF50;
       color: white;
   }

   .notification-warning {
       background-color: #FF9800;
       color: white;
   }

   .notification-error {
       background-color: #F44336;
       color: white;
   }

   .notification-icon {
       font-size: 20px;
       margin-right: 10px;
   }

   .notification-message {
       flex: 1;
   }

   .notification-close {
       background: none;
       border: none;
       color: white;
       font-size: 24px;
       cursor: pointer;
       margin-left: 10px;
   }

   .notification.fade-out {
       animation: fadeOut 0.3s ease-out;
       opacity: 0;
   }

   @keyframes slideIn {
       from {
           transform: translateX(400px);
           opacity: 0;
       }
       to {
           transform: translateX(0);
           opacity: 1;
       }
   }

   @keyframes fadeOut {
       from { opacity: 1; }
       to { opacity: 0; }
   }

   .error-field {
       border: 2px solid #F44336 !important;
       background-color: #FFEBEE !important;
   }
   ```

5. **API 호출 시 에러 처리 통합**

   프론트엔드에서 API 호출 시 일관된 에러 처리를 적용하세요.

   ```javascript
   // frontend/js/api.js

   /**
    * 단체 생성 API 호출 (에러 처리 포함)
    */
   async function createGroup(groupData) {
       try {
           const response = await fetch('/api/groups', {
               method: 'POST',
               headers: {
                   'Content-Type': 'application/json'
               },
               body: JSON.stringify(groupData)
           });

           const data = await response.json();

           if (!response.ok) {
               // 에러 응답 처리
               if (data.field) {
                   notification._highlightErrorField(data.field);
               }
               notification.showError(data.message || '오류가 발생했습니다');
               throw new Error(data.message);
           }

           // 성공 알림
           notification.showSuccess('단체가 생성되었습니다');
           return data;

       } catch (error) {
           console.error('API Error:', error);
           if (!error.message.includes('오류가 발생했습니다')) {
               notification.showError('네트워크 오류가 발생했습니다');
           }
           throw error;
       }
   }
   ```

**실행 절차:**

1. `backend/exceptions.py` 파일 생성:
   - TravelAgencyException 기본 클래스 정의
   - ValidationError, NotFoundError, ForbiddenError 등 커스텀 예외 정의
   - 각 예외에 message, field, code 속성 포함

2. `backend/error_handlers.py` 또는 `backend/main.py`에 에러 핸들러 추가:
   - @app.exception_handler 데코레이터 사용
   - 각 예외를 적절한 HTTP 상태 코드로 변환
   - 일관된 JSON 응답 형식 반환

3. `backend/config/messages.py` 파일 생성:
   - 성공/경고/오류 메시지 딕셔너리 정의
   - get_message() 함수 구현

4. `frontend/js/notification.js` 파일 생성:
   - NotificationSystem 클래스 구현
   - showSuccess(), showWarning(), showError() 메서드 구현
   - handleApiError() 메서드 구현

5. `frontend/css/notification.css` 파일 생성:
   - 알림 스타일 정의
   - 애니메이션 추가

6. 모든 API 호출에서 에러 처리 적용:
   - try-catch 블록 사용
   - notification.handleApiError() 호출

7. 단위 테스트 작성 (`tests/test_error_handlers.py`):
   ```python
   def test_validation_error_handler():
       """ValidationError가 400 Bad Request로 변환되는지 테스트"""
       response = client.post('/api/groups', json={
           'name': '하노이골프',
           # 필수 필드 누락
       })
       assert response.status_code == 400
       assert response.json()['error'] == 'ValidationError'

   def test_not_found_error_handler():
       """NotFoundError가 404 Not Found로 변환되는지 테스트"""
       response = client.get('/api/groups/non-existent-id')
       assert response.status_code == 404
       assert response.json()['error'] == 'NotFoundError'
   ```

**중요 사항:**
- **일관된 응답 형식**: 모든 에러 응답은 `{error, message, code, field?}` 형식 준수
- **로깅**: 모든 에러는 적절한 로그 레벨로 기록 (warning/error)
- **사용자 친화적 메시지**: 내부 오류는 숨기고 사용자가 이해할 수 있는 메시지만 표시
- **필드 강조**: 검증 오류 발생 시 해당 필드를 시각적으로 강조
- **자동 닫기**: 성공 알림은 3초, 경고는 5초, 오류는 수동 닫기

**검증 방법:**

1. 단위 테스트 실행:
   ```bash
   pytest tests/test_error_handlers.py -v
   ```

2. 브라우저 테스트:
   - 필수 필드 누락 → 에러 알림 표시 및 필드 강조 확인
   - 잘못된 날짜 형식 → 에러 메시지 표시 확인
   - 계약금 > 총액 → 비즈니스 규칙 오류 표시 확인
   - 성공 저장 → 성공 알림 3초 후 자동 닫기 확인

3. 에러 시나리오 테스트:
   - DB 연결 끊기 → "시스템에 일시적인 문제가 발생했습니다" 표시 확인
   - PDF 생성 실패 → "PDF 생성에 실패했습니다" 표시 및 재시도 버튼 확인

**산출물:**
- `backend/exceptions.py`: 커스텀 예외 클래스
- `backend/error_handlers.py`: FastAPI 에러 핸들러
- `backend/config/messages.py`: 알림 메시지 정의
- `frontend/js/notification.js`: 알림 시스템 클래스
- `frontend/css/notification.css`: 알림 스타일
- `tests/test_error_handlers.py`: 에러 핸들러 단위 테스트

**의존성:**
- 선행 task: T-VALID-01, T-VALID-02, T-VALID-03 (검증 로직 및 예외 정의)
- 후행 task: T-TEST-01~T-TEST-06 (테스트 시 에러 처리 검증)

---

**Phase 9 완료 요약:**

Phase 9에서는 데이터 검증 및 예외 처리 시스템을 구축했습니다:

1. **T-VALID-01**: 필수 필드 검증 로직
   - REQUIRED_FIELDS 딕셔너리
   - validate_required_fields() 함수
   - Pydantic 스키마에 필수 필드 정의

2. **T-VALID-02**: 데이터 타입 및 형식 검증
   - validate_date_format(): 날짜 형식 검증 (YYYY-MM-DD)
   - validate_amount(): 금액 형식 검증 (소수점 2자리)
   - validate_pax(): 인원수 검증 (양의 정수)
   - validate_percentage(): 비율 검증 (0~100)

3. **T-VALID-03**: 비즈니스 규칙 검증
   - validate_group_data(): 단체 비즈니스 규칙
   - validate_itinerary_data(): 일정 비즈니스 규칙
   - validate_cancel_rule_data(): 취소 규정 비즈니스 규칙
   - validate_group_with_relations(): 복합 검증

4. **T-VALID-04**: 에러 처리 및 사용자 알림
   - 커스텀 예외 클래스 (ValidationError, NotFoundError, ForbiddenError 등)
   - FastAPI 에러 핸들러
   - 사용자 알림 메시지 시스템
   - 프론트엔드 알림 시스템 (NotificationSystem)

**핵심 산출물:**
- `backend/services/validation.py`: 모든 검증 함수
- `backend/exceptions.py`: 커스텀 예외 클래스
- `backend/error_handlers.py`: FastAPI 에러 핸들러
- `backend/config/messages.py`: 알림 메시지 정의
- `frontend/js/notification.js`: 프론트엔드 알림 시스템
- `tests/test_validation.py`: 검증 로직 단위 테스트
- `tests/test_error_handlers.py`: 에러 핸들러 단위 테스트

**다음 단계:**
Phase 10: 테스트 task 개선 (T-TEST-01 ~ T-TEST-06, 6개)

---