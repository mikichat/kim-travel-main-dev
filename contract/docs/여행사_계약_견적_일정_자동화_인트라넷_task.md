# TASK — 여행사 계약·견적·일정 자동화 인트라넷

본 문서는 PRD / TRD를 기반으로 실제 개발을 위한 **작업 단위(Task) 분해 문서**이다.
각 TASK는 개발·테스트·배포까지 바로 연결될 수 있는 수준으로 정의한다.

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

### T-DB-01 기본 테이블 생성
**목표**: 5개 핵심 테이블 생성 (PostgreSQL DDL 작성)

**작업 내용**:
- `groups` 테이블 생성
  - 컬럼: id(UUID), name(VARCHAR), start_date(DATE), end_date(DATE), nights(INTEGER), days(INTEGER), pax(INTEGER), price_per_pax(DECIMAL), total_price(DECIMAL), deposit(DECIMAL), balance(DECIMAL), balance_due_date(DATE), status(VARCHAR), created_by, created_at, updated_by, updated_at
  - 제약조건: PRIMARY KEY(id), CHECK(end_date > start_date), CHECK(pax > 0), CHECK(price_per_pax >= 0), CHECK(deposit >= 0)
  - 인덱스: idx_groups_name, idx_groups_start_date, idx_groups_status
  - **중요**: name 컬럼에 UNIQUE 제약 없음 (중복 허용)

- `group_itinerary` 테이블 생성
  - 컬럼: id(UUID), group_id(UUID), day_no(INTEGER), itinerary_date(DATE), itinerary_date_manual(BOOLEAN), location, transport, time, schedule, meals, accommodation, created_at, updated_at
  - 제약조건: PRIMARY KEY(id), FOREIGN KEY(group_id), CHECK(day_no > 0), UNIQUE(group_id, day_no)
  - 인덱스: idx_itinerary_group_id, idx_itinerary_group_day

- `group_cancel_rules` 테이블 생성
  - 컬럼: id(UUID), group_id(UUID), days_before(INTEGER), cancel_date(DATE), cancel_date_manual(BOOLEAN), penalty_rate(DECIMAL), penalty_amount(DECIMAL), description, created_at
  - 제약조건: PRIMARY KEY(id), FOREIGN KEY(group_id), CHECK(penalty_rate >= 0 AND penalty_rate <= 100)
  - 인덱스: idx_cancel_rules_group_id, idx_cancel_rules_days_before

- `group_includes` 테이블 생성
  - 컬럼: id(UUID), group_id(UUID), item_type(ENUM), category, description, display_order, created_at
  - 제약조건: PRIMARY KEY(id), FOREIGN KEY(group_id), CHECK(item_type IN ('include', 'exclude'))
  - 인덱스: idx_includes_group_id, idx_includes_type_order

- `documents` 테이블 생성
  - 컬럼: id(UUID), group_id(UUID), document_type(ENUM), version(INTEGER), file_path, file_name, generated_at, generated_by, file_size
  - 제약조건: PRIMARY KEY(id), FOREIGN KEY(group_id), CHECK(document_type IN ('estimate', 'contract', 'itinerary', 'bundle'))
  - 인덱스: idx_documents_group_id, idx_documents_type_version

**산출물**: 
- DDL 스크립트 파일 (`database/schema.sql`)
- 마이그레이션 스크립트

### T-DB-02 자동/수동 플래그 컬럼 추가
**목표**: 자동 계산 필드에 수동 수정 플래그 추가

**작업 내용**:
- `groups` 테이블에 다음 컬럼 추가:
  - `nights_manual BOOLEAN DEFAULT FALSE`
  - `days_manual BOOLEAN DEFAULT FALSE`
  - `total_price_manual BOOLEAN DEFAULT FALSE`
  - `balance_manual BOOLEAN DEFAULT FALSE`
  - `balance_due_date_manual BOOLEAN DEFAULT FALSE`

- `group_itinerary` 테이블에 추가:
  - `itinerary_date_manual BOOLEAN DEFAULT FALSE`

- `group_cancel_rules` 테이블에 추가:
  - `cancel_date_manual BOOLEAN DEFAULT FALSE`

**산출물**: 
- ALTER TABLE 마이그레이션 스크립트

### T-DB-03 상태 제어 컬럼
**목표**: 상태값 제어를 위한 컬럼 및 제약조건 설정

**작업 내용**:
- `groups.status` 컬럼 설정
  - 타입: VARCHAR(20) 또는 ENUM
  - 제약조건: CHECK(status IN ('estimate', 'contract', 'confirmed'))
  - 기본값: 'estimate'
  - 인덱스 생성 (상태별 필터링용)

**산출물**: 
- 상태값 제어 로직 문서

### T-DB-04 감사 로그 테이블 생성
**목표**: 모든 변경 이력을 추적하기 위한 감사 로그 테이블 생성

**작업 내용**:
- `audit_logs` 테이블 생성
  - 컬럼: id(UUID), action(VARCHAR), entity_type(VARCHAR), entity_id(UUID), field_name(VARCHAR), old_value(TEXT), new_value(TEXT), reason(TEXT), metadata(JSONB), user_id(VARCHAR), ip_address(VARCHAR), created_at(TIMESTAMP)
  - 인덱스: idx_audit_logs_entity, idx_audit_logs_user, idx_audit_logs_action, idx_audit_logs_created_at

**산출물**: 
- audit_logs 테이블 DDL

---

## 2. 백엔드 API TASK

### T-API-01 단체 목록 조회 API
**목표**: 단체 목록 조회 및 검색/필터링 기능 구현

**작업 내용**:
- `GET /api/groups` 엔드포인트 구현
  - Query Parameters: name(검색), status(필터), start_date_from, start_date_to, page, limit
  - 응답: 페이징된 단체 목록 (total, page, limit 포함)
  - 인덱스 활용하여 성능 최적화

**산출물**: 
- API 엔드포인트 코드
- 단위 테스트

### T-API-02 단체 상세 조회 API
**목표**: 단체 상세 정보 및 관련 데이터 조회

**작업 내용**:
- `GET /api/groups/{group_id}` 엔드포인트 구현
  - 단체 기본 정보 + 일정 + 취소 규정 + 포함/불포함 항목 조회
  - N+1 쿼리 문제 방지 (JOIN 또는 eager loading)

**산출물**: 
- API 엔드포인트 코드
- 단위 테스트

### T-API-03 단체 생성 API
**목표**: 신규 단체 생성 및 자동 계산 트리거

**작업 내용**:
- `POST /api/groups` 엔드포인트 구현
  - Request Body 검증 (필수 필드, 데이터 타입, 비즈니스 규칙)
  - 자동 계산 로직 실행 (기간, 요금, 잔액 완납일)
  - 트랜잭션 처리 및 롤백 로직
  - 에러 응답 형식 정의

**산출물**: 
- API 엔드포인트 코드
- 검증 로직 코드
- 단위 테스트

### T-API-04 단체 수정 API
**목표**: 단체 정보 수정 및 변경된 필드에 따른 자동 재계산

**작업 내용**:
- `PUT /api/groups/{group_id}` 엔드포인트 구현
  - 상태 확인 (확정 상태면 수정 불가)
  - 변경된 필드 감지
  - 변경된 필드에 따른 자동 재계산 트리거
  - 수동 수정 플래그 보호 로직
  - 응답에 재계산된 필드 목록 포함

**산출물**: 
- API 엔드포인트 코드
- 변경 감지 로직
- 단위 테스트

### T-API-05 상태 변경 API
**목표**: 단체 상태 변경 및 권한 검증

**작업 내용**:
- `PUT /api/groups/{group_id}/status` 엔드포인트 구현
  - 상태 전환 규칙 검증 (견적 → 계약 → 확정 순서만 허용)
  - 관리자 권한 검증 (확정 상태 변경 시)
  - 상태 변경 로그 기록

**산출물**: 
- API 엔드포인트 코드
- 권한 검증 로직
- 단위 테스트

### T-API-06 자동 계산 트리거 API
**목표**: 수동으로 자동 계산 실행

**작업 내용**:
- `POST /api/groups/{group_id}/recalculate` 엔드포인트 구현
  - 상태 확인 (확정 상태면 재계산 불가)
  - 선택적 필드 재계산 지원 (Request Body에 fields 배열)
  - 수동 수정 플래그 보호 로직
  - 재계산된 필드 목록 응답

**산출물**: 
- API 엔드포인트 코드
- 재계산 로직
- 단위 테스트

### T-API-07 일정 관리 API
**목표**: 일정 추가/수정/삭제 기능

**작업 내용**:
- `POST /api/groups/{group_id}/itineraries` - 일정 추가
  - day_no 자동 부여 로직 (생략 시)
  - 출발일 기준 날짜 자동 계산
- `PUT /api/groups/{group_id}/itineraries/{itinerary_id}` - 일정 수정
  - 수동 날짜 수정 시 플래그 설정
- `DELETE /api/groups/{group_id}/itineraries/{itinerary_id}` - 일정 삭제
  - day_no 재정렬하지 않음 (의도적인 빈 번호 허용)
- `GET /api/groups/{group_id}/itineraries` - 일정 목록 조회

**산출물**: 
- 일정 관리 API 코드
- 단위 테스트

### T-API-08 취소 규정 관리 API
**목표**: 취소 규정 추가/수정/삭제 기능

**작업 내용**:
- `POST /api/groups/{group_id}/cancel-rules` - 취소 규정 추가
- `PUT /api/groups/{group_id}/cancel-rules/{rule_id}` - 취소 규정 수정
- `DELETE /api/groups/{group_id}/cancel-rules/{rule_id}` - 취소 규정 삭제
- 취소 규정 날짜 자동 계산 (출발일 기준)

**산출물**: 
- 취소 규정 관리 API 코드
- 단위 테스트

### T-API-09 포함/불포함 항목 관리 API
**목표**: 포함/불포함 항목 추가/수정/삭제 기능

**작업 내용**:
- `POST /api/groups/{group_id}/includes` - 항목 추가
- `PUT /api/groups/{group_id}/includes/{item_id}` - 항목 수정
- `DELETE /api/groups/{group_id}/includes/{item_id}` - 항목 삭제
- 표시 순서(display_order) 관리

**산출물**: 
- 포함/불포함 항목 관리 API 코드
- 단위 테스트

### T-API-10 문서 출력 API
**목표**: PDF 문서 생성 및 다운로드

**작업 내용**:
- `POST /api/groups/{group_id}/documents/generate` - 문서 생성
  - document_type: estimate, contract, itinerary, bundle
  - 버전 자동 증가 로직
  - 파일명 생성 규칙 적용
- `GET /api/groups/{group_id}/documents` - 문서 이력 조회
- `GET /api/documents/{document_id}/download` - 문서 다운로드

**산출물**: 
- 문서 출력 API 코드
- 단위 테스트

### T-API-11 에러 처리 미들웨어
**목표**: 공통 에러 처리 및 응답 형식 통일

**작업 내용**:
- 에러 핸들러 미들웨어 구현
  - ValidationError → 400 Bad Request
  - NotFoundError → 404 Not Found
  - ForbiddenError → 403 Forbidden
  - InternalServerError → 500 Internal Server Error
- 공통 에러 응답 형식 정의
- 에러 로깅

**산출물**: 
- 에러 처리 미들웨어 코드
- 에러 응답 형식 문서

---

## 3. 자동 계산 로직 TASK

### T-CALC-01 기간 계산 로직
**목표**: 출발일과 도착일을 기준으로 박수와 일수 자동 계산

**작업 내용**:
- `calculate_period(group)` 함수 구현
  - `nights = (end_date - start_date).days`
  - `days = nights + 1`
  - `nights_manual` 또는 `days_manual`이 TRUE면 재계산 생략
  - 재계산 조건: start_date 또는 end_date 변경 시

**산출물**: 
- 기간 계산 함수 코드
- 단위 테스트 (정상 케이스, 수동 수정 보호 케이스)

### T-CALC-02 금액 계산 로직
**목표**: 인원수와 1인당 요금을 기준으로 총액과 잔액 계산

**작업 내용**:
- `calculate_price(group)` 함수 구현
  - `total_price = pax × price_per_pax`
  - `balance = total_price - deposit`
  - `total_price_manual` 또는 `balance_manual`이 TRUE면 재계산 생략
  - 재계산 조건: pax, price_per_pax, deposit 변경 시
  - 검증: `deposit > total_price`인 경우 ValidationError 발생

**산출물**: 
- 금액 계산 함수 코드
- 검증 로직 코드
- 단위 테스트 (정상 케이스, 계약금 초과 케이스, 수동 수정 보호 케이스)

### T-CALC-03 잔액 완납일 계산 로직
**목표**: 출발일 기준 잔액 완납일 자동 계산

**작업 내용**:
- `calculate_balance_due_date(group)` 함수 구현
  - `balance_due_date = start_date - N일` (N은 설정값, 기본 7일)
  - `balance_due_date_manual`이 TRUE면 재계산 생략
  - 재계산 조건: start_date 변경 시
  - 과거 날짜 경고 로직

**산출물**: 
- 잔액 완납일 계산 함수 코드
- 단위 테스트

### T-CALC-04 취소 규정 날짜 계산 로직
**목표**: 출발일 기준 취소 규정 날짜 자동 계산

**작업 내용**:
- `calculate_cancel_rules(group_id, start_date)` 함수 구현
  - `cancel_date = start_date - days_before`
  - 모든 취소 규정에 대해 일괄 계산
  - `cancel_date_manual`이 TRUE면 해당 규정만 재계산 생략
  - 재계산 조건: start_date 변경 시
  - days_before 기준 내림차순 정렬

**산출물**: 
- 취소 규정 날짜 계산 함수 코드
- 단위 테스트

### T-CALC-05 일정 날짜 자동 재배치 로직
**목표**: 출발일 변경 시 모든 일정 날짜 자동 재계산

**작업 내용**:
- `recalculate_itinerary_dates(group_id, new_start_date)` 함수 구현
  - **중요**: 수동 수정 여부와 관계없이 모든 일정 날짜 재계산
  - `itinerary_date = start_date + (day_no - 1)` 공식 적용
  - `itinerary_date_manual` 플래그는 유지 (사용자 알림용)
  - 일정 추가 시 day_no 자동 부여 로직
  - 일정 삭제 시 day_no 재정렬하지 않음
  - day_no 중복 검증 (DB 레벨 UNIQUE 제약조건)

**산출물**: 
- 일정 재배치 함수 코드
- 일정 추가/삭제 로직 코드
- 단위 테스트 (출발일 변경 케이스, 일정 추가/삭제 케이스)

### T-CALC-06 통합 재계산 로직
**목표**: 변경된 필드에 따라 필요한 계산만 선택적으로 실행

**작업 내용**:
- `recalculate_group(group_id, changed_fields)` 함수 구현
  - 상태 확인 (확정 상태면 재계산 불가)
  - 변경된 필드에 따라 필요한 계산만 실행
  - 각 계산 단계별 에러 처리
  - 수동 수정 플래그 보호 로직 통합
  - 재계산된 필드 목록 반환

**산출물**: 
- 통합 재계산 함수 코드
- 통합 테스트

---

## 4. 프론트엔드 UI TASK

### T-UI-01 단체 선택 화면
**목표**: 단체 목록 조회 및 검색/필터링 UI 구현

**작업 내용**:
- 단체 목록 테이블 표시
  - 컬럼: 단체명, 출발일, 도착일, 인원수, 상태, 최종 수정일
  - 상태별 색상 표시 (견적/계약/확정)
- 검색 기능
  - 단체명 실시간 검색
  - 날짜 범위 필터 (출발일 기준)
  - 상태 필터 (견적/계약/확정)
- 페이징 처리
- 단체 선택 시 상세 화면으로 이동

**산출물**: 
- 단체 선택 화면 HTML/CSS/JS
- 검색/필터링 로직

### T-UI-02 단체 입력 화면
**목표**: 단체 정보 입력 및 수정 UI 구현

**작업 내용**:
- 기본 정보 입력 폼
  - 단체명, 출발일, 도착일, 인원수, 1인당 요금, 계약금
  - 날짜 선택기 (YYYY-MM-DD 형식)
  - 실시간 자동 계산 결과 표시 (박수, 일수, 총액, 잔액, 잔액 완납일)
- 자동값/수동값 시각적 구분
  - 자동 계산값: 파란색 배경 또는 아이콘 표시
  - 수동 수정값: 노란색 배경 또는 경고 아이콘 표시
- 수동 수정 기능
  - 자동값 클릭 시 수동 수정 모드 전환
  - 수정 사유 입력 필드 표시
  - 수동 수정 플래그 설정
- 검증 및 에러 표시
  - 필수 필드 검증
  - 날짜 형식 검증
  - 비즈니스 규칙 검증 (출발일 < 도착일, 계약금 <= 총액 등)
  - 에러 메시지 표시

**산출물**: 
- 단체 입력 화면 HTML/CSS/JS
- 자동 계산 UI 로직
- 검증 로직

### T-UI-03 일정 관리 화면
**목표**: 일정 추가/수정/삭제 UI 구현

**작업 내용**:
- 일정 목록 표시
  - 일차, 날짜, 지역, 교통편, 시간, 일정, 식사, 숙박
  - 출발일 변경 시 날짜 자동 업데이트 알림
- 일정 추가 기능
  - day_no 자동 부여 또는 수동 입력
  - 날짜 자동 계산 (출발일 기준)
- 일정 수정 기능
  - 날짜 수동 수정 시 플래그 설정
- 일정 삭제 기능
  - 확인 다이얼로그
- 일정 날짜 검증
  - 출발일 이전 날짜 오류 표시
  - 도착일 이후 날짜 경고 표시

**산출물**: 
- 일정 관리 화면 HTML/CSS/JS
- 일정 CRUD 로직

### T-UI-04 취소 규정 관리 화면
**목표**: 취소 규정 추가/수정/삭제 UI 구현

**작업 내용**:
- 취소 규정 목록 표시
  - 출발일 기준 며칠 전, 취소 기준일, 위약금 비율, 설명
  - 출발일 변경 시 취소 기준일 자동 업데이트
- 취소 규정 추가/수정/삭제 기능
- 날짜 자동 계산 표시

**산출물**: 
- 취소 규정 관리 화면 HTML/CSS/JS

### T-UI-05 포함/불포함 항목 관리 화면
**목표**: 포함/불포함 항목 추가/수정/삭제 UI 구현

**작업 내용**:
- 포함 항목 섹션
- 불포함 항목 섹션
- 항목 추가/수정/삭제 기능
- 표시 순서 조정 기능 (드래그 앤 드롭 또는 위/아래 버튼)

**산출물**: 
- 포함/불포함 항목 관리 화면 HTML/CSS/JS

### T-UI-06 문서 출력 버튼 영역
**목표**: PDF 문서 생성 및 다운로드 UI 구현

**작업 내용**:
- 출력 버튼 그룹
  - 견적서 PDF 출력
  - 계약서 PDF 출력
  - 일정표 PDF 출력
  - 통합 PDF 출력
- PDF 생성 진행 상태 표시
  - 로딩 스피너
  - 진행률 표시 (선택사항)
- PDF 생성 완료 후 다운로드 링크 제공
- PDF 생성 실패 시 에러 메시지 및 재시도 버튼
- 문서 이력 조회 기능
  - 이전 버전 목록 표시
  - 버전별 다운로드

**산출물**: 
- 문서 출력 UI 컴포넌트
- PDF 생성 상태 관리 로직

### T-UI-07 상태 변경 UI
**목표**: 단체 상태 변경 UI 구현

**작업 내용**:
- 상태 표시 및 변경 버튼
  - 견적 → 계약 버튼
  - 계약 → 확정 버튼 (관리자만 표시)
- 상태 변경 확인 다이얼로그
- 상태별 UI 제어
  - 확정 상태: 수정 불가 표시, 자동 계산 비활성화

**산출물**: 
- 상태 변경 UI 컴포넌트
- 권한 체크 로직

### T-UI-08 사용자 알림 시스템
**목표**: 성공/경고/오류 메시지 표시 시스템 구현

**작업 내용**:
- 토스트 알림 컴포넌트
  - 성공 메시지 (녹색)
  - 경고 메시지 (노란색)
  - 오류 메시지 (빨간색)
- 자동 계산 완료 알림
- 수동 수정 감지 알림
- 출발일 변경으로 인한 일정 재배치 알림
- 데이터 불일치 경고

**산출물**: 
- 알림 컴포넌트
- 알림 관리 로직

---

## 5. HTML 템플릿 TASK

### T-TPL-01 견적서 템플릿 작성
**목표**: 견적서 HTML 템플릿 작성 (Jinja2)

**작업 내용**:
- `estimate.html` 템플릿 작성
  - 단체 기본 정보 (단체명, 출발일, 도착일, 기간, 인원수)
  - 요금 정보 (1인당 요금, 총액, 계약금, 잔액, 잔액 완납일)
  - 포함/불포함 항목
  - 취소 규정
  - 날짜 형식: YYYY년 MM월 DD일
  - 금액 형식: 1,000,000원 (천 단위 구분)
- 반응형 레이아웃 (A4 용지 크기 고려)
- 인쇄 최적화 스타일

**산출물**: 
- estimate.html 템플릿 파일
- 템플릿 스타일시트

### T-TPL-02 일정표 템플릿 작성
**목표**: 일정표 HTML 템플릿 작성

**작업 내용**:
- `itinerary.html` 템플릿 작성
  - 일정 테이블 (일차, 날짜, 지역, 교통편, 시간, 일정, 식사, 숙박)
  - day_no 순서대로 정렬
  - 날짜 자동 계산 결과 표시

**산출물**: 
- itinerary.html 템플릿 파일

### T-TPL-03 계약서 템플릿 작성
**목표**: 계약서 HTML 템플릿 작성

**작업 내용**:
- `contract.html` 템플릿 작성
  - 계약서 표준 양식
  - 단체 정보, 요금 정보, 일정 정보 포함
  - 계약 조건 및 약관

**산출물**: 
- contract.html 템플릿 파일

### T-TPL-04 통합 템플릿 작성
**목표**: 통합 PDF용 템플릿 작성

**작업 내용**:
- `bundle.html` 템플릿 작성
  - 견적서 + 계약서 + 일정표 결합
  - 페이지 브레이크 CSS 적용
  - 페이지 번호 연속 표시

**산출물**: 
- bundle.html 템플릿 파일

### T-TPL-05 템플릿 헬퍼 함수
**목표**: 템플릿에서 사용할 헬퍼 함수 구현

**작업 내용**:
- 날짜 포맷 함수: `format_date(date) → "2025년 1월 15일"`
- 금액 포맷 함수: `format_currency(amount) → "1,000,000원"`
- 템플릿 엔진에 함수 등록

**산출물**: 
- 템플릿 헬퍼 함수 코드

---

## 6. PDF 출력 TASK

### T-PDF-01 PDF 변환 모듈 구현
**목표**: HTML을 PDF로 변환하는 모듈 구현 (WeasyPrint)

**작업 내용**:
- WeasyPrint 설정
  - 한글 폰트 설정 (Noto Sans KR)
  - 폰트 파일 경로 설정
- CSS 스타일 적용
  - A4 용지 크기 설정
  - 페이지 마진 설정
  - 테이블 스타일
  - 페이지 브레이크 처리
- HTML → PDF 변환 함수 구현
  - 에러 처리 및 재시도 로직
  - 파일 저장 경로 설정

**산출물**: 
- PDF 변환 모듈 코드
- 한글 폰트 파일
- CSS 스타일 파일

### T-PDF-02 파일명 생성 로직
**목표**: 문서별 파일명 규칙에 따른 파일명 생성

**작업 내용**:
- 파일명 생성 함수 구현
  - 견적서: `견적서_{단체명}_v{version}_{YYYYMMDD}.pdf`
  - 계약서: `계약서_{단체명}_v{version}_{YYYYMMDD}.pdf`
  - 일정표: `일정표_{단체명}_v{version}_{YYYYMMDD}.pdf`
  - 통합: `통합_{단체명}_v{version}_{YYYYMMDD}.pdf`
- 파일명 안전화 (특수문자 제거)
- 버전 번호 자동 증가 로직

**산출물**: 
- 파일명 생성 함수 코드
- 단위 테스트

### T-PDF-03 문서 이력 기록 로직
**목표**: PDF 생성 시 documents 테이블에 이력 기록

**작업 내용**:
- 문서 이력 저장 함수 구현
  - group_id, document_type, version, file_path, file_name, file_size 저장
  - 버전 번호 자동 증가 (같은 document_type 내에서)
  - 생성자 정보 기록
- 파일 크기 계산 및 저장

**산출물**: 
- 문서 이력 저장 함수 코드
- 단위 테스트

### T-PDF-04 PDF 생성 통합 함수
**목표**: 데이터 조회부터 PDF 생성까지 전체 흐름 구현

**작업 내용**:
- `generate_pdf(group_id, document_type)` 함수 구현
  1. 데이터 조회 (단체 + 관련 데이터)
  2. HTML 템플릿 렌더링
  3. PDF 변환
  4. 파일 저장
  5. 문서 이력 기록
  6. 로그 기록
- 에러 처리 및 재시도 로직
- 통합 PDF 생성 로직 (3개 문서 결합)

**산출물**: 
- PDF 생성 통합 함수 코드
- 통합 테스트

### T-PDF-05 PDF 다운로드 API
**목표**: 생성된 PDF 파일 다운로드 기능

**작업 내용**:
- `GET /api/documents/{document_id}/download` 엔드포인트 구현
  - 파일 존재 여부 확인
  - 파일 스트림 반환
  - Content-Type: application/pdf
  - Content-Disposition 헤더 설정

**산출물**: 
- PDF 다운로드 API 코드

---

## 7. 상태별 제어 TASK

### T-STATE-01 확정 상태 잠금 로직
**목표**: 확정 상태일 때 자동 계산 및 수정 차단

**작업 내용**:
- 상태 확인 미들웨어 구현
  - 확정 상태면 PUT/POST 요청 차단
  - 재계산 API 차단
  - 에러 메시지: "확정된 계약은 수정할 수 없습니다"
- 프론트엔드 UI 제어
  - 확정 상태일 때 입력 필드 비활성화
  - 수정 버튼 숨김 또는 비활성화

**산출물**: 
- 상태 확인 미들웨어 코드
- 프론트엔드 상태 제어 로직

### T-STATE-02 상태 전환 검증 로직
**목표**: 상태 전환 규칙 검증 (견적 → 계약 → 확정 순서만 허용)

**작업 내용**:
- 상태 전환 검증 함수 구현
  - 견적 → 계약: 허용
  - 계약 → 확정: 허용 (관리자만)
  - 견적 → 확정: 불가 (중간 단계 필수)
  - 역전환 (확정 → 계약 등): 불가

**산출물**: 
- 상태 전환 검증 함수 코드
- 단위 테스트

### T-STATE-03 권한 제어 시스템
**목표**: 관리자 권한 검증 시스템 구현

**작업 내용**:
- 사용자 역할 정의 (실무자, 관리자)
- 권한 검증 미들웨어 구현
  - 관리자만 상태 '확정' 변경 가능
  - 관리자만 문서 삭제 가능
- 권한 체크 함수 구현

**산출물**: 
- 권한 검증 미들웨어 코드
- 권한 체크 함수 코드

---

## 8. 로그 및 감사 TASK

### T-LOG-01 로깅 시스템 구축
**목표**: 애플리케이션 로깅 시스템 구축

**작업 내용**:
- 로거 설정 (Python logging 모듈)
  - 로그 레벨 설정 (DEBUG, INFO, WARNING, ERROR, CRITICAL)
  - 파일 핸들러 및 콘솔 핸들러 설정
  - 로그 포맷 정의
- 로그 파일 관리
  - 로그 파일 경로 설정
  - 로그 로테이션 설정

**산출물**: 
- 로깅 설정 코드
- 로그 파일 구조

### T-LOG-02 자동 계산 실행 로그
**목표**: 자동 계산 실행 시 로그 기록

**작업 내용**:
- 자동 계산 로그 함수 구현
  - 계산 타입, 이전 값, 새 값 기록
  - 사용자 정보 기록
  - audit_logs 테이블에 기록

**산출물**: 
- 자동 계산 로그 함수 코드

### T-LOG-03 수동 수정 로그
**목표**: 수동 수정 시 로그 기록

**작업 내용**:
- 수동 수정 로그 함수 구현
  - 수정된 필드, 이전 값, 새 값, 수정 사유 기록
  - 사용자 정보 및 IP 주소 기록
  - audit_logs 테이블에 기록

**산출물**: 
- 수동 수정 로그 함수 코드

### T-LOG-04 문서 출력 로그
**목표**: 문서 출력 시 로그 기록

**작업 내용**:
- 문서 출력 로그 함수 구현
  - 문서 ID, 문서 타입, 파일 크기 기록
  - 생성자 정보 기록
  - audit_logs 테이블에 기록

**산출물**: 
- 문서 출력 로그 함수 코드

### T-LOG-05 감사 로그 조회 API
**목표**: 감사 로그 조회 API 구현

**작업 내용**:
- `GET /api/audit-logs` 엔드포인트 구현
  - 필터링: entity_type, entity_id, action, user_id, 날짜 범위
  - 페이징 처리
  - 정렬 (생성일 기준 내림차순)

**산출물**: 
- 감사 로그 조회 API 코드

---

## 9. 데이터 검증 및 예외 처리 TASK

### T-VALID-01 필수 필드 검증 로직
**목표**: 필수 필드 검증 로직 구현

**작업 내용**:
- 필수 필드 정의 (PRD Section 12.2.1 기준)
- 검증 함수 구현
  - groups: name, start_date, end_date, pax, price_per_pax, status
  - group_itinerary: group_id, day_no, itinerary_date
  - group_cancel_rules: group_id, days_before, penalty_rate
- 에러 메시지 정의

**산출물**: 
- 필수 필드 검증 함수 코드
- 단위 테스트

### T-VALID-02 데이터 타입 및 형식 검증 로직
**목표**: 데이터 타입 및 형식 검증 로직 구현

**작업 내용**:
- 날짜 형식 검증 (YYYY-MM-DD)
- 금액 형식 검증 (숫자, 소수점 2자리)
- 인원수 검증 (양의 정수)
- 비율 검증 (0~100)
- 검증 함수 구현 및 에러 메시지 정의

**산출물**: 
- 데이터 타입 검증 함수 코드
- 단위 테스트

### T-VALID-03 비즈니스 규칙 검증 로직
**목표**: 비즈니스 규칙 검증 로직 구현

**작업 내용**:
- 출발일 < 도착일 검증
- 계약금 <= 총액 검증
- 인원수 범위 검증 (1~999)
- 여행 기간 검증 (최소 1박 2일)
- 일정 날짜 범위 검증 (출발일 ~ 도착일)
- day_no 중복 검증
- 검증 함수 구현 및 에러/경고 메시지 정의

**산출물**: 
- 비즈니스 규칙 검증 함수 코드
- 단위 테스트

### T-VALID-04 에러 처리 및 사용자 알림
**목표**: 에러 처리 및 사용자 친화적 메시지 제공

**작업 내용**:
- 에러 타입 정의 (ValidationError, NotFoundError, ForbiddenError 등)
- 에러 핸들러 구현
- 사용자 알림 메시지 정의 (성공/경고/오류)
- 프론트엔드 알림 시스템 연동

**산출물**: 
- 에러 처리 코드
- 알림 메시지 정의 파일

---

## 10. 테스트 TASK

### T-TEST-01 단위 테스트 작성
**목표**: 각 모듈별 단위 테스트 작성

**작업 내용**:
- 자동 계산 로직 단위 테스트
  - 기간 계산 테스트
  - 금액 계산 테스트
  - 날짜 계산 테스트
  - 일정 재배치 테스트
- 데이터 검증 로직 단위 테스트
- API 엔드포인트 단위 테스트

**산출물**: 
- 단위 테스트 코드
- 테스트 커버리지 리포트

### T-TEST-02 통합 테스트 작성
**목표**: 전체 흐름 통합 테스트 작성

**작업 내용**:
- 단체 생성 → 수정 → 상태 변경 → PDF 생성 흐름 테스트
- 출발일 변경 시 자동 재계산 통합 테스트
- 예외 케이스 통합 테스트

**산출물**: 
- 통합 테스트 코드
- 테스트 시나리오 문서

### T-TEST-03 날짜 변경 시나리오 테스트
**목표**: 출발일 변경 시 모든 관련 데이터 재계산 검증

**작업 내용**:
- 출발일 변경 테스트
  - 기간 재계산 확인
  - 잔액 완납일 재계산 확인
  - 취소 규정 날짜 재계산 확인
  - 일정 날짜 재배치 확인
- 수동 수정값 보호 테스트
- 일정 재배치 테스트 (수동 수정 플래그 유지 확인)

**산출물**: 
- 날짜 변경 테스트 코드
- 테스트 결과 문서

### T-TEST-04 금액 불일치 시나리오 테스트
**목표**: 금액 관련 검증 및 예외 처리 테스트

**작업 내용**:
- 계약금 > 총액 케이스 테스트
- 음수 값 입력 테스트
- 잔액 < 0 케이스 테스트
- 수동 수정값 보호 테스트

**산출물**: 
- 금액 불일치 테스트 코드

### T-TEST-05 PDF 출력 테스트
**목표**: PDF 생성 및 출력 기능 테스트

**작업 내용**:
- 각 문서 타입별 PDF 생성 테스트
- 한글 폰트 렌더링 테스트
- 파일명 규칙 테스트
- 버전 관리 테스트
- PDF 생성 실패 재시도 테스트

**산출물**: 
- PDF 출력 테스트 코드
- 생성된 PDF 샘플

### T-TEST-06 성능 테스트
**목표**: 성능 요구사항 검증

**작업 내용**:
- 단체 조회 응답 시간 테스트 (< 500ms)
- PDF 생성 시간 테스트 (< 3초)
- 동시 사용자 부하 테스트

**산출물**: 
- 성능 테스트 코드
- 성능 테스트 결과 리포트

---

## 11. 배포 TASK

### T-DEPLOY-01 개발 환경 구축
**목표**: 개발 환경 설정 및 의존성 설치

**작업 내용**:
- Python 가상환경 설정
- 의존성 패키지 설치 (requirements.txt)
  - FastAPI, SQLAlchemy, WeasyPrint, Jinja2 등
- PostgreSQL 데이터베이스 설정
- 환경 변수 설정 (.env 파일)
- 개발 서버 실행 설정

**산출물**: 
- 개발 환경 설정 가이드
- requirements.txt 파일

### T-DEPLOY-02 데이터베이스 마이그레이션
**목표**: 프로덕션 데이터베이스 스키마 구축

**작업 내용**:
- DDL 스크립트 실행
- 초기 데이터 마이그레이션 (필요한 경우)
- 인덱스 생성 확인
- 제약조건 확인

**산출물**: 
- 마이그레이션 스크립트
- 마이그레이션 실행 로그

### T-DEPLOY-03 내부 서버 배포
**목표**: 내부 인트라넷 서버에 애플리케이션 배포

**작업 내용**:
- 서버 환경 설정
  - Python 런타임 설치
  - PostgreSQL 클라이언트 설치
  - 한글 폰트 설치 (Noto Sans KR)
- 애플리케이션 배포
  - 코드 배포
  - 설정 파일 배포
  - 정적 파일 배포 (템플릿, 폰트 등)
- 웹 서버 설정 (Nginx 또는 Apache)
- WSGI 서버 설정 (Gunicorn 또는 uWSGI)

**산출물**: 
- 배포 스크립트
- 서버 설정 파일
- 배포 가이드 문서

### T-DEPLOY-04 인트라넷 연동
**목표**: 내부 인트라넷 시스템과 연동

**작업 내용**:
- 인트라넷 메뉴 추가
- 인증 시스템 연동 (SSO 또는 LDAP)
- 권한 시스템 연동
- 네트워크 설정 확인

**산출물**: 
- 연동 설정 문서
- 연동 테스트 결과

### T-DEPLOY-05 모니터링 및 로깅 설정
**목표**: 운영 환경 모니터링 및 로깅 설정

**작업 내용**:
- 로그 파일 경로 설정
- 로그 로테이션 설정
- 에러 모니터링 설정 (선택사항)
- 성능 모니터링 설정 (선택사항)

**산출물**: 
- 모니터링 설정 파일
- 로깅 설정 파일

---

## 12. 최종 산출물

### 12.1 문서
- PRD (Product Requirements Document)
- TRD (Technical Requirements Document)
- TASK (작업 분해 문서)
- API 문서 (Swagger/OpenAPI)
- 사용자 매뉴얼

### 12.2 소스 코드
- 백엔드 API 코드
- 프론트엔드 UI 코드
- 데이터베이스 스키마 및 마이그레이션 스크립트
- HTML 템플릿 파일
- 테스트 코드

### 12.3 설정 파일
- 환경 변수 설정 파일
- 데이터베이스 설정 파일
- 로깅 설정 파일
- 배포 스크립트

### 12.4 테스트 결과물
- 단위 테스트 결과
- 통합 테스트 결과
- 성능 테스트 결과
- 생성된 PDF 샘플

### 12.5 배포 산출물
- 배포 가이드 문서
- 운영 매뉴얼
- 트러블슈팅 가이드

---

## 13. 작업 우선순위 및 의존성

### Phase 1: 기반 구축 (필수)
1. DB 구축 (T-DB-01 ~ T-DB-04)
2. 데이터 검증 로직 (T-VALID-01 ~ T-VALID-03)
3. 기본 API (T-API-01 ~ T-API-04)

### Phase 2: 핵심 기능 (필수)
4. 자동 계산 로직 (T-CALC-01 ~ T-CALC-06)
5. 상태별 제어 (T-STATE-01 ~ T-STATE-03)
6. 기본 UI (T-UI-01 ~ T-UI-02)

### Phase 3: 문서 출력 (필수)
7. HTML 템플릿 (T-TPL-01 ~ T-TPL-05)
8. PDF 출력 (T-PDF-01 ~ T-PDF-05)

### Phase 4: 추가 기능 (권장)
9. 일정/취소규정/포함항목 관리 (T-API-07 ~ T-API-09, T-UI-03 ~ T-UI-05)
10. 로그 및 감사 (T-LOG-01 ~ T-LOG-05)

### Phase 5: 테스트 및 배포
11. 테스트 (T-TEST-01 ~ T-TEST-06)
12. 배포 (T-DEPLOY-01 ~ T-DEPLOY-05)

---

※ 본 TASK 문서는 실제 개발 일정(WBS) 및 외주 견적 산정의 기준 문서로 사용된다.

