# PRD — 여행사 계약·견적·일정 자동화 인트라넷

## 1. 문서 목적 (Purpose)
본 문서는 여행사 내부 인트라넷에서 **단체명 선택만으로 견적서·계약서·일정표를 자동 생성(PDF)** 하기 위한 시스템의 요구사항을 정의한다.

본 PRD는 다음 목표를 가진다.
- 입력은 한 번, 출력은 여러 문서
- 날짜·금액·인원 불일치 사고 제거
- 실무자가 바로 사용할 수 있는 자동화 시스템 구축

---

## 2. 배경 및 문제 정의 (Background & Problem)
### 기존 문제점
- 계약서 / 견적서 / 일정표를 각각 수동 수정
- 출발일 변경 시 취소규정, 잔액일, 일정 불일치 빈번
- 단체별 문서 이력 관리 불가
- 실무자 개인 의존도 높음

### 해결 방향
- 단체 데이터를 DB로 일원화
- 자동 계산 로직을 시스템화
- HTML → PDF 출력 파이프라인 구축

---

## 3. 목표 (Goals)

### 핵심 목표
- 단체 선택 → 모든 문서 자동 출력
- 자동 계산 + 수동 보정 공존 구조
- 계약 확정 이후 데이터 보호

### 비목표 (Out of Scope)
- 외부 고객용 웹페이지
- 실시간 항공 API 연동 (차후 확장)

---

## 4. 사용자 정의 (Users)

| 사용자 | 설명 |
|---|---|
| 실무자 | 견적·계약·일정 작성 담당 |
| 관리자 | 계약 확정·수정 관리 |

---

## 5. 핵심 사용자 시나리오 (User Flow)

1. 실무자 로그인
2. 단체 선택 또는 신규 생성
3. 자동/수동 입력 화면에서 정보 입력
4. 자동 계산 로직 실행
5. 버튼 클릭
   - 견적서 PDF
   - 계약서 PDF
   - 통합 PDF
6. 문서 이력 자동 저장

---

## 6. 데이터 모델 요약 (Data Model)

### 6.1 핵심 테이블
- groups (단체 기본)
- group_itinerary (일정)
- group_cancel_rules (취소 규정)
- group_includes (포함/불포함)
- documents (문서 이력)

### 6.2 상세 스키마 정의

#### 6.2.1 groups (단체 기본 정보)
| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
|--------|------------|---------|------|
| id | UUID/VARCHAR(36) | PRIMARY KEY | 단체 고유 식별자 |
| name | VARCHAR(255) | NOT NULL | 단체명 (중복 허용) |
| start_date | DATE | NOT NULL | 출발일 (모든 계산의 기준) |
| end_date | DATE | NOT NULL | 도착일 (CHECK: end_date > start_date) |
| nights | INTEGER | NOT NULL | 박수 (자동 계산) |
| nights_manual | BOOLEAN | DEFAULT FALSE | 박수 수동 수정 여부 |
| days | INTEGER | NOT NULL | 일수 (자동 계산) |
| days_manual | BOOLEAN | DEFAULT FALSE | 일수 수동 수정 여부 |
| pax | INTEGER | NOT NULL CHECK (pax > 0) | 인원수 |
| price_per_pax | DECIMAL(12,2) | NOT NULL CHECK (price_per_pax >= 0) | 1인당 요금 |
| total_price | DECIMAL(12,2) | NOT NULL | 총액 (자동 계산) |
| total_price_manual | BOOLEAN | DEFAULT FALSE | 총액 수동 수정 여부 |
| deposit | DECIMAL(12,2) | DEFAULT 0 CHECK (deposit >= 0) | 계약금 |
| balance | DECIMAL(12,2) | NOT NULL | 잔액 (자동 계산) |
| balance_manual | BOOLEAN | DEFAULT FALSE | 잔액 수동 수정 여부 |
| balance_due_date | DATE | | 잔액 완납일 (자동 계산) |
| balance_due_date_manual | BOOLEAN | DEFAULT FALSE | 잔액 완납일 수동 수정 여부 |
| status | ENUM('estimate', 'contract', 'confirmed') | DEFAULT 'estimate' | 상태 (견적/계약/확정) |
| created_by | VARCHAR(100) | | 생성자 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 생성 일시 |
| updated_by | VARCHAR(100) | | 최종 수정자 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 수정 일시 |

**인덱스:**
- PRIMARY KEY (id)
- INDEX idx_groups_name (name) - 단체명 검색용
- INDEX idx_groups_start_date (start_date) - 날짜 범위 검색용
- INDEX idx_groups_status (status) - 상태별 필터링용

**중복 허용 정책:**
- 단체명(name)은 중복을 허용하며, 고유 식별은 id를 사용
- 동일한 단체명이 여러 개 존재할 수 있음 (예: "하노이 골프단 1기", "하노이 골프단 2기" 등)

#### 6.2.2 group_itinerary (일정)
| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
|--------|------------|---------|------|
| id | UUID/VARCHAR(36) | PRIMARY KEY | 일정 고유 식별자 |
| group_id | UUID/VARCHAR(36) | NOT NULL, FOREIGN KEY (groups.id) | 단체 ID |
| day_no | INTEGER | NOT NULL CHECK (day_no > 0) | 일차 번호 (1부터 시작) |
| itinerary_date | DATE | NOT NULL | 일정 날짜 (자동 계산) |
| itinerary_date_manual | BOOLEAN | DEFAULT FALSE | 일정 날짜 수동 수정 여부 |
| location | VARCHAR(255) | | 지역/장소 |
| transport | VARCHAR(255) | | 교통편 정보 |
| time | VARCHAR(50) | | 시간 정보 |
| schedule | TEXT | | 일정 내용 |
| meals | VARCHAR(255) | | 식사 정보 |
| accommodation | VARCHAR(255) | | 숙박 정보 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 생성 일시 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 수정 일시 |

**인덱스:**
- PRIMARY KEY (id)
- INDEX idx_itinerary_group_id (group_id) - 단체별 일정 조회용
- INDEX idx_itinerary_group_day (group_id, day_no) - 단체별 일차 순서 정렬용
- FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE

#### 6.2.3 group_cancel_rules (취소 규정)
| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
|--------|------------|---------|------|
| id | UUID/VARCHAR(36) | PRIMARY KEY | 취소 규정 고유 식별자 |
| group_id | UUID/VARCHAR(36) | NOT NULL, FOREIGN KEY (groups.id) | 단체 ID |
| days_before | INTEGER | NOT NULL | 출발일 기준 며칠 전 |
| cancel_date | DATE | NOT NULL | 취소 기준일 (자동 계산) |
| cancel_date_manual | BOOLEAN | DEFAULT FALSE | 취소 기준일 수동 수정 여부 |
| penalty_rate | DECIMAL(5,2) | NOT NULL CHECK (penalty_rate >= 0 AND penalty_rate <= 100) | 위약금 비율 (%) |
| penalty_amount | DECIMAL(12,2) | | 위약금 금액 |
| description | TEXT | | 취소 규정 설명 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 생성 일시 |

**인덱스:**
- PRIMARY KEY (id)
- INDEX idx_cancel_rules_group_id (group_id) - 단체별 취소 규정 조회용
- INDEX idx_cancel_rules_days_before (group_id, days_before) - 정렬용
- FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE

**취소 규정 계산 로직:**
- cancel_date = start_date - days_before
- 출발일 변경 시 모든 취소 규정의 cancel_date 자동 재계산

#### 6.2.4 group_includes (포함/불포함 항목)
| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
|--------|------------|---------|------|
| id | UUID/VARCHAR(36) | PRIMARY KEY | 항목 고유 식별자 |
| group_id | UUID/VARCHAR(36) | NOT NULL, FOREIGN KEY (groups.id) | 단체 ID |
| item_type | ENUM('include', 'exclude') | NOT NULL | 포함/불포함 구분 |
| category | VARCHAR(100) | | 항목 카테고리 (예: 항공, 호텔, 식사 등) |
| description | TEXT | NOT NULL | 항목 설명 |
| display_order | INTEGER | DEFAULT 0 | 표시 순서 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 생성 일시 |

**인덱스:**
- PRIMARY KEY (id)
- INDEX idx_includes_group_id (group_id) - 단체별 항목 조회용
- INDEX idx_includes_type_order (group_id, item_type, display_order) - 정렬용
- FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE

#### 6.2.5 documents (문서 이력)
| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
|--------|------------|---------|------|
| id | UUID/VARCHAR(36) | PRIMARY KEY | 문서 고유 식별자 |
| group_id | UUID/VARCHAR(36) | NOT NULL, FOREIGN KEY (groups.id) | 단체 ID |
| document_type | ENUM('estimate', 'contract', 'itinerary', 'bundle') | NOT NULL | 문서 종류 |
| version | INTEGER | NOT NULL DEFAULT 1 | 버전 번호 |
| file_path | VARCHAR(500) | NOT NULL | PDF 파일 저장 경로 |
| file_name | VARCHAR(255) | NOT NULL | 파일명 (예: 견적서_단체명_v1_20250101.pdf) |
| generated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 생성 일시 |
| generated_by | VARCHAR(100) | | 생성자 |
| file_size | BIGINT | | 파일 크기 (bytes) |

**인덱스:**
- PRIMARY KEY (id)
- INDEX idx_documents_group_id (group_id) - 단체별 문서 조회용
- INDEX idx_documents_type_version (group_id, document_type, version) - 버전 관리용
- FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE

**파일명 규칙:**
- 견적서: `견적서_{단체명}_v{version}_{YYYYMMDD}.pdf`
- 계약서: `계약서_{단체명}_v{version}_{YYYYMMDD}.pdf`
- 일정표: `일정표_{단체명}_v{version}_{YYYYMMDD}.pdf`
- 통합: `통합_{단체명}_v{version}_{YYYYMMDD}.pdf`

### 6.3 설계 원칙
- 출발일(start_date)을 모든 계산의 기준으로 사용
- 자동 계산 값에는 manual override 플래그 포함
- 단체명은 중복 허용, 고유 식별은 id 사용
- 모든 날짜 관련 필드는 출발일 변경 시 자동 재계산
- 외래키는 CASCADE 삭제로 데이터 무결성 보장

---

## 7. 자동 계산 로직 요구사항

### 7.1 기간 계산
- **박수 계산**: `nights = end_date - start_date`
- **일수 계산**: `days = nights + 1`
- **재계산 조건**: start_date 또는 end_date 변경 시 자동 재계산
- **수동 수정 보호**: nights_manual 또는 days_manual이 TRUE인 경우 재계산 생략

### 7.2 요금 계산
- **총액 계산**: `total_price = pax × price_per_pax`
- **잔액 계산**: `balance = total_price - deposit`
- **재계산 조건**: pax, price_per_pax, deposit 변경 시 자동 재계산
- **수동 수정 보호**: total_price_manual 또는 balance_manual이 TRUE인 경우 재계산 생략
- **검증 규칙**: 
  - deposit > total_price인 경우 오류 반환
  - balance < 0인 경우 경고 표시

### 7.3 잔액 완납일
- **계산 공식**: `balance_due_date = start_date - N일` (N은 설정 가능한 일수, 기본값 7일)
- **재계산 조건**: start_date 변경 시 자동 재계산
- **수동 수정 보호**: balance_due_date_manual이 TRUE인 경우 재계산 생략

### 7.4 취소 규정 날짜 계산
- **계산 공식**: `cancel_date = start_date - days_before`
- **재계산 조건**: start_date 변경 시 모든 취소 규정의 cancel_date 자동 재계산
- **수동 수정 보호**: cancel_date_manual이 TRUE인 경우 해당 규정만 재계산 생략
- **정렬 규칙**: days_before 기준 내림차순 정렬 (가장 늦은 날짜부터)

### 7.5 일정 날짜 자동 재배치
- **기본 계산 공식**: `itinerary_date = start_date + (day_no - 1)`
  - 예: 출발일이 2025-01-15이고 day_no가 1이면 → 2025-01-15
  - 예: 출발일이 2025-01-15이고 day_no가 3이면 → 2025-01-17

- **출발일 변경 시 자동 재배치 규칙**:
  1. 출발일(start_date)이 변경되면 해당 단체의 모든 일정 날짜를 자동 재계산
  2. 각 일정의 day_no를 기준으로 새로운 날짜 계산
  3. **수동 수정된 일정도 재배치됨** (itinerary_date_manual이 TRUE여도 재계산)
  4. 단, 수동 수정된 일정의 경우 재계산 후 사용자에게 알림 표시

- **재배치 예시**:
  ```
  [변경 전]
  출발일: 2025-01-15
  Day 1: 2025-01-15 (수동 수정됨)
  Day 2: 2025-01-16
  Day 3: 2025-01-17
  
  [출발일을 2025-01-20으로 변경 후]
  출발일: 2025-01-20
  Day 1: 2025-01-20 (자동 재계산, 수동 수정 플래그 유지)
  Day 2: 2025-01-21
  Day 3: 2025-01-22
  ```

- **일정 추가/삭제 시 처리**:
  - 일정 추가 시 day_no는 자동으로 다음 번호 부여
  - 일정 삭제 시 남은 일정의 day_no는 유지 (재정렬하지 않음)
  - day_no 수동 변경 시 해당 일정의 날짜만 재계산

- **검증 규칙**:
  - 일정 날짜가 출발일보다 이전이면 오류
  - 일정 날짜가 도착일보다 이후이면 경고
  - day_no가 중복되면 오류

---

## 8. 화면 요구사항 (UI Requirements)

### 8.1 단체 선택 화면
- 단체명 검색
- 상태 표시 (견적/계약/확정)

### 8.2 입력 화면
- 자동값과 수동값 구분 표시
- 자동값 수동 수정 시 경고 및 사유 입력

### 8.3 출력 화면
- 견적서 PDF 출력
- 계약서 PDF 출력
- 통합 PDF 출력

---

## 9. 문서 출력 요구사항

### 9.1 문서 종류
- 견적서
- 계약서 (표준 계약서 양식 기반)
- 일정표
- 통합 문서 (3종 결합)

### 9.2 출력 방식
**기본 방식 (필수):**
- HTML 템플릿 렌더링 → 브라우저 미리보기
- 사용자가 브라우저 인쇄 기능(Ctrl+P)으로 PDF 저장 가능
- WeasyPrint 등 외부 라이브러리 불필요

**추가 방식 (선택):**
- WeasyPrint를 통한 서버 사이드 PDF 자동 생성
- 대용량 배치 문서 생성 시 유용

### 9.3 계약서 템플릿 요구사항
- **공정거래위원회 또는 한국여행업협회 표준 계약서 양식 적용 필수**
- 표준약관 제1조~제19조 포함
- 특히 제16조 (여행지 안전정보 제공) 2019년 개정 필수 조항 포함
- 표준 취소 수수료 규정 포함 (소비자분쟁해결기준)
- 시스템 데이터와 표준 양식의 통합

### 9.4 기술 방식
- HTML + Jinja2 Template Engine
- HTML → PDF 변환

### 9.3 문서 이력
- 출력 시 documents 테이블 기록
- 버전 관리 필수

---

## 10. 상태별 제어 규칙

| 상태 | 허용 행위 |
|---|---|
| 견적 | 전체 수정 가능 |
| 계약 | 자동 계산 활성 |
| 확정 | 자동 계산 잠금 |

---

## 11. 비기능 요구사항 (NFR)

- 한글 PDF 깨짐 없음
- 문서 출력 시간 3초 이내
- 데이터 수정 로그 보관
- 내부 인트라넷 환경 최적화

---

## 12. 예외 처리 및 데이터 검증 규칙

### 12.1 자동 계산 예외 케이스 처리

#### 12.1.1 날짜 관련 예외
- **출발일 > 도착일**: 
  - 오류 메시지: "도착일은 출발일보다 이후여야 합니다"
  - 저장 불가, 사용자에게 수정 요청
- **과거 날짜 입력**: 
  - 출발일이 오늘보다 이전인 경우 경고 표시 (저장은 가능)
  - 사용자 확인 후 진행
- **잔액 완납일이 과거**: 
  - balance_due_date가 오늘보다 이전인 경우 경고 표시
  - 저장 가능하되 사용자에게 알림

#### 12.1.2 금액 관련 예외
- **계약금 > 총액**: 
  - 오류 메시지: "계약금은 총액을 초과할 수 없습니다"
  - 저장 불가
- **음수 값 입력**: 
  - 인원수, 금액 필드에 음수 입력 시 오류
  - 오류 메시지: "{필드명}은 0 이상의 값이어야 합니다"
- **잔액 < 0**: 
  - balance가 음수인 경우 경고 표시
  - 저장 가능하되 사용자 확인 필요

#### 12.1.3 일정 관련 예외
- **일정 날짜가 출발일 이전**: 
  - 오류 메시지: "일정 날짜는 출발일 이후여야 합니다"
  - 저장 불가
- **일정 날짜가 도착일 이후**: 
  - 경고 메시지: "일정 날짜가 여행 기간을 벗어났습니다"
  - 저장 가능하되 사용자 확인 필요
- **day_no 중복**: 
  - 동일 단체 내에서 day_no가 중복되면 오류
  - 오류 메시지: "일차 번호가 중복되었습니다"

### 12.2 데이터 검증 규칙

#### 12.2.1 필수 필드 검증
다음 필드는 저장 시 반드시 입력되어야 함:
- groups: name, start_date, end_date, pax, price_per_pax, status
- group_itinerary: group_id, day_no, itinerary_date
- group_cancel_rules: group_id, days_before, penalty_rate

#### 12.2.2 데이터 타입 및 형식 검증
- **날짜 형식**: YYYY-MM-DD 형식만 허용
- **금액 형식**: 숫자만 허용, 소수점 2자리까지
- **인원수**: 양의 정수만 허용
- **비율**: 0~100 사이의 숫자만 허용

#### 12.2.3 비즈니스 규칙 검증
- **인원수 범위**: 1명 이상, 최대 999명 (설정 가능)
- **여행 기간**: 최소 1박 2일 이상
- **취소 규정**: days_before는 양의 정수, penalty_rate는 0~100
- **상태 전환**: 
  - 견적 → 계약 → 확정 순서로만 전환 가능
  - 확정 상태에서는 자동 계산 비활성화

### 12.3 에러 처리 시나리오

#### 12.3.1 계산 오류 처리
- **자동 계산 실패 시**:
  - 오류 로그 기록
  - 사용자에게 "계산 중 오류가 발생했습니다" 메시지 표시
  - 수동 입력 모드로 전환 가능
- **재계산 실패 시**:
  - 이전 값 유지
  - 사용자에게 알림 및 수동 수정 권장

#### 12.3.2 PDF 생성 실패 처리
- **PDF 생성 실패 시**:
  - 오류 로그 기록 (에러 메시지, 스택 트레이스 포함)
  - 사용자에게 "PDF 생성에 실패했습니다. 잠시 후 다시 시도해주세요" 메시지 표시
  - 재시도 버튼 제공 (최대 3회)
  - 3회 실패 시 관리자에게 알림

#### 12.3.3 데이터베이스 오류 처리
- **연결 실패**:
  - 사용자에게 "시스템에 일시적인 문제가 발생했습니다" 메시지 표시
  - 자동 재연결 시도 (최대 3회)
- **저장 실패**:
  - 트랜잭션 롤백
  - 사용자에게 입력 데이터 손실 방지를 위한 안내
  - 오류 로그 기록

#### 12.3.4 데이터 불일치 처리
- **자동 계산값과 수동 입력값 불일치**:
  - 사용자에게 불일치 항목 하이라이트 표시
  - "자동 계산값과 다릅니다. 수정하시겠습니까?" 확인 메시지
- **출발일 변경으로 인한 날짜 불일치**:
  - 변경된 일정 목록 표시
  - "출발일 변경으로 인해 {N}개의 일정 날짜가 변경되었습니다" 알림
  - 변경 사항 일괄 적용 또는 개별 확인 선택 가능

### 12.4 사용자 알림 및 피드백

#### 12.4.1 성공 알림
- 데이터 저장 성공: "저장되었습니다"
- PDF 생성 성공: "PDF가 생성되었습니다. 다운로드하시겠습니까?"
- 자동 계산 완료: "자동 계산이 완료되었습니다"

#### 12.4.2 경고 알림
- 수동 수정 감지: "자동 계산값이 수동으로 수정되었습니다"
- 날짜 범위 초과: "입력한 날짜가 여행 기간을 벗어났습니다"
- 금액 불일치: "계산된 금액과 입력한 금액이 다릅니다"

#### 12.4.3 오류 알림
- 필수 필드 누락: "{필드명}을(를) 입력해주세요"
- 데이터 형식 오류: "{필드명}의 형식이 올바르지 않습니다"
- 비즈니스 규칙 위반: 구체적인 오류 메시지 표시

---

## 13. 성공 기준 (Success Metrics)

- 문서 작성 시간 70% 이상 감소
- 계약서/견적서 불일치 0건
- 단체별 문서 이력 100% 관리

---

## 14. 향후 확장 (Future Work)

- 이메일 자동 발송
- 전자서명 연동
- 회계 시스템 연동
- CRM 고객 관리 연계

---

※ 본 PRD는 TRD 및 TASK 문서의 기준 문서로 사용된다.

