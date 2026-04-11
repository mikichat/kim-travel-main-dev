# PRD — 인보이스 생성 시스템

## 1. 문서 목적 (Purpose)

본 문서는 여행사 내부 인트라넷에서 **인보이스(청구서)를 자동 생성(PDF)** 하기 위한 시스템의 요구사항을 정의한다.

본 PRD는 다음 목표를 가진다.
- 항공 스케줄 정보를 DB에서 자동 불러오기
- 항공료 및 선호좌석 자동 계산
- 은행 계좌 정보 DB 관리 및 선택
- 수신 및 일자 수동 수정 가능
- 로고 및 도장 이미지 관리 (플레이스홀더)

---

## 2. 배경 및 문제 정의 (Background & Problem)

### 기존 문제점
- 인보이스를 수동으로 작성하여 시간 소모
- 항공 스케줄 정보를 매번 입력해야 함
- 금액 계산 오류 발생 가능
- 은행 계좌 정보를 매번 입력해야 함
- 문서 형식이 일관되지 않음

### 해결 방향
- 항공 스케줄 정보를 DB로 일원화
- 자동 계산 로직을 시스템화
- HTML → PDF 출력 파이프라인 구축
- 은행 계좌 정보 DB 관리

---

## 3. 목표 (Goals)

### 핵심 목표
- 항공 스케줄 선택 → 인보이스 자동 생성
- 항공료 및 선호좌석 자동 계산
- 은행 계좌 정보 DB 관리
- 수신 및 일자 수동 수정 가능
- PDF 자동 생성 및 다운로드

### 비목표 (Out of Scope)
- 외부 고객용 웹페이지
- 실시간 항공 API 연동 (차후 확장)
- 결제 시스템 연동

---

## 4. 사용자 정의 (Users)

| 사용자 | 설명 |
|---|---|
| 실무자 | 인보이스 작성 담당 |
| 관리자 | 인보이스 관리 및 은행 계좌 정보 관리 |

---

## 5. 핵심 사용자 시나리오 (User Flow)

1. 실무자 로그인
2. 인보이스 생성 페이지 접속
3. 항공 스케줄 선택 (DB에서 드롭다운)
4. 수신 및 일자 입력 (수동 수정)
5. 항공료 및 선호좌석 정보 입력
   - 단가 × 수량 = 합계 (자동 계산)
6. 총액 자동 계산
7. 은행 계좌 선택 (DB에서 드롭다운)
8. 미리보기 확인
9. PDF 생성 및 다운로드

---

## 6. 데이터 모델 요약 (Data Model)

### 6.1 핵심 테이블
- flight_schedules (항공 스케줄)
- bank_accounts (은행 계좌 정보)
- invoices (인보이스 메타데이터)

### 6.2 상세 스키마 정의

#### 6.2.1 flight_schedules (항공 스케줄)

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
|--------|------------|---------|------|
| id | TEXT | PRIMARY KEY | 항공 스케줄 고유 식별자 |
| group_id | TEXT | FOREIGN KEY | 단체 ID (선택적) |
| group_name | TEXT | | 단체명 |
| airline | TEXT | NOT NULL | 항공사명 (예: 아시아나항공) |
| flight_number | TEXT | | 항공편명 (예: OZ729) |
| departure_date | TEXT | NOT NULL | 출발일 (예: 2026.02.26) |
| departure_airport | TEXT | NOT NULL | 출발 공항 코드 (예: ICN) |
| departure_time | TEXT | NOT NULL | 출발 시간 (예: 20:35) |
| arrival_date | TEXT | NOT NULL | 도착일 (예: 2026.02.27) |
| arrival_airport | TEXT | NOT NULL | 도착 공항 코드 (예: VTE) |
| arrival_time | TEXT | NOT NULL | 도착 시간 (예: 00:25) |
| passengers | INTEGER | DEFAULT 0 | 승객 수 |
| created_at | TEXT | DEFAULT (datetime('now','localtime')) | 생성 일시 |

**인덱스:**
- PRIMARY KEY (id)
- INDEX idx_flight_schedules_group_id (group_id) - 단체별 조회용
- INDEX idx_flight_schedules_departure (departure_date) - 날짜 검색용

#### 6.2.2 bank_accounts (은행 계좌 정보)

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
|--------|------------|---------|------|
| id | TEXT | PRIMARY KEY | 은행 계좌 고유 식별자 |
| bank_name | TEXT | NOT NULL | 은행명 (예: 하나은행) |
| account_number | TEXT | NOT NULL | 계좌번호 (예: 611-016420-721) |
| account_holder | TEXT | NOT NULL | 예금주 (예: (유)여행세상) |
| is_default | INTEGER | DEFAULT 0 | 기본 계좌 여부 (0: 아니오, 1: 예) |
| created_at | TEXT | DEFAULT (datetime('now','localtime')) | 생성 일시 |

**인덱스:**
- PRIMARY KEY (id)
- INDEX idx_bank_accounts_default (is_default) - 기본 계좌 조회용

#### 6.2.3 invoices (인보이스 메타데이터)

| 컬럼명 | 데이터 타입 | 제약조건 | 설명 |
|--------|------------|---------|------|
| id | TEXT | PRIMARY KEY | 인보이스 고유 식별자 |
| invoice_number | TEXT | UNIQUE | 인보이스 번호 (자동 생성) |
| recipient | TEXT | NOT NULL | 수신 (예: 무주 성립관광) |
| invoice_date | TEXT | NOT NULL | 일자 (예: 2025년 12월 17일) |
| description | TEXT | | 설명 (예: 라오스 - 비엔티엔 항공권) |
| flight_schedule_id | TEXT | FOREIGN KEY | 항공 스케줄 ID |
| airfare_unit_price | INTEGER | DEFAULT 0 | 항공료 단가 |
| airfare_quantity | INTEGER | DEFAULT 0 | 항공료 수량 |
| airfare_total | INTEGER | DEFAULT 0 | 항공료 합계 (자동 계산) |
| seat_preference_unit_price | INTEGER | DEFAULT 0 | 선호좌석 단가 |
| seat_preference_quantity | INTEGER | DEFAULT 0 | 선호좌석 수량 |
| seat_preference_total | INTEGER | DEFAULT 0 | 선호좌석 합계 (자동 계산) |
| total_amount | INTEGER | NOT NULL | 총액 (자동 계산) |
| bank_account_id | TEXT | FOREIGN KEY | 은행 계좌 ID |
| logo_path | TEXT | | 로고 이미지 경로 |
| seal_path | TEXT | | 도장 이미지 경로 |
| pdf_file_path | TEXT | | PDF 파일 경로 |
| created_at | TEXT | DEFAULT (datetime('now','localtime')) | 생성 일시 |
| updated_at | TEXT | DEFAULT (datetime('now','localtime')) | 수정 일시 |

**인덱스:**
- PRIMARY KEY (id)
- INDEX idx_invoices_date (invoice_date) - 날짜 검색용
- FOREIGN KEY (flight_schedule_id) REFERENCES flight_schedules(id)
- FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)

### 6.3 설계 원칙
- 항공 스케줄 정보는 DB에서 관리하여 재사용 가능
- 은행 계좌 정보는 DB에서 관리하여 일관성 유지
- 자동 계산 값은 실시간 업데이트
- 수신 및 일자는 수동 수정 가능
- 로고 및 도장은 이미지 경로로 관리

---

## 7. 자동 계산 로직 요구사항

### 7.1 항공료 계산
- **합계 계산**: `airfare_total = airfare_unit_price × airfare_quantity`
- **재계산 조건**: 단가 또는 수량 변경 시 자동 재계산
- **실시간 업데이트**: 입력 즉시 화면에 반영

### 7.2 선호좌석 계산
- **합계 계산**: `seat_preference_total = seat_preference_unit_price × seat_preference_quantity`
- **재계산 조건**: 단가 또는 수량 변경 시 자동 재계산
- **실시간 업데이트**: 입력 즉시 화면에 반영

### 7.3 총액 계산
- **계산 공식**: `total_amount = airfare_total + seat_preference_total`
- **재계산 조건**: 항공료 또는 선호좌석 합계 변경 시 자동 재계산
- **실시간 업데이트**: 입력 즉시 화면에 반영

---

## 8. 화면 요구사항 (UI Requirements)

### 8.1 인보이스 편집 페이지

#### 8.1.1 헤더 영역
- 로고 플레이스홀더 (이미지 업로드 버튼)
- 회사 정보 표시

#### 8.1.2 기본 정보 섹션
- 수신 (recipient): 텍스트 입력 필드 (수동 수정)
- 일자 (invoice_date): 날짜 선택기 (수동 수정)
- 설명 (description): 텍스트 입력

#### 8.1.3 항공 스케줄 선택 섹션
- 드롭다운: DB에서 항공 스케줄 목록 불러오기
- 선택 시 자동으로 출발/도착 정보 표시
- 항공사, 항공편명, 출발/도착 일시 표시

#### 8.1.4 항목 및 금액 섹션
- 항공료
  - 단가 입력 필드
  - 수량 입력 필드
  - 합계 자동 계산 및 표시
- 선호좌석
  - 단가 입력 필드
  - 수량 입력 필드
  - 합계 자동 계산 및 표시
- 총액
  - 자동 계산 및 강조 표시

#### 8.1.5 은행 정보 섹션
- 드롭다운: DB에서 은행 계좌 목록 불러오기
- 선택 시 계좌 정보 자동 표시
  - 은행명
  - 계좌번호
  - 예금주

#### 8.1.6 도장 영역
- 도장 플레이스홀더 (이미지 업로드 버튼)

#### 8.1.7 액션 버튼
- 미리보기 버튼
- PDF 생성 버튼
- 저장 버튼

---

## 9. 문서 출력 요구사항

### 9.1 출력 방식
- HTML 템플릿 렌더링 → 브라우저 미리보기
- HTML → PDF 변환 → 파일 다운로드

### 9.2 인보이스 레이아웃

이미지 기반 레이아웃:
- 상단: 로고 + "INVOICE" 제목
- 기본 정보: 수신, 송신, 일자, 설명
- 항공 스케줄: 출발/도착 정보 표
- 항목 테이블: 항공료, 선호좌석
- 총액: TOTAL 강조
- 은행 정보: 은행명, 계좌번호, 예금주
- 하단: 회사 정보, 연락처
- 도장 위치: 우측 하단

### 9.3 파일명 규칙
- `인보이스_{수신}_{YYYYMMDD}.pdf`
- 예: `인보이스_무주성립관광_20251217.pdf`

---

## 10. 기능 요구사항

### 10.1 항공 스케줄 관리
- 항공 스케줄 목록 조회
- 항공 스케줄 생성/수정/삭제
- 드롭다운에서 선택 가능

### 10.2 은행 계좌 관리
- 은행 계좌 목록 조회
- 은행 계좌 추가/수정/삭제
- 기본 계좌 설정
- 드롭다운에서 선택 가능

### 10.3 인보이스 관리
- 인보이스 목록 조회
- 인보이스 생성/수정/삭제
- PDF 생성 및 다운로드
- 미리보기 기능

### 10.4 이미지 관리
- 로고 이미지 업로드
- 도장 이미지 업로드
- 이미지 경로 저장

---

## 11. 비기능 요구사항

### 11.1 성능
- 항공 스케줄 목록 조회: 1초 이내
- PDF 생성: 5초 이내
- 자동 계산: 실시간 반영

### 11.2 보안
- 파일 업로드 검증 (이미지 파일만 허용)
- 파일 크기 제한 (10MB 이하)

### 11.3 사용성
- 직관적인 UI/UX
- 자동 계산 결과 명확히 표시
- 에러 메시지 명확히 표시

---

## 12. 제약사항

- Node.js/Express와 Python/FastAPI 양쪽 시스템에 구현
- SQLite (Node.js) 및 PostgreSQL (Python) 지원
- 기존 데이터베이스 스키마와 호환

---

## 13. 구현 완료 사항 (2026-01-01 업데이트)

### 13.1 핵심 기능 구현
- ✅ 동적 항목 관리 시스템: 항공료, 선호좌석 외에 여행경비, 잔액 등 여러 항목 추가/삭제 가능
- ✅ 이미지 관리: 로고(이미지/브랜드.jpg), 도장(이미지/사용인감2.jpg) 자동 표시
- ✅ 회사 정보: 하단에 (유)여행세상 대표이사 김국진 정보 추가
- ✅ 미리보기 기능: 실시간 인보이스 미리보기 (새 창)

### 13.2 데이터베이스
- ✅ flight_schedules 테이블: 항공 스케줄 정보 저장
- ✅ bank_accounts 테이블: 은행 계좌 정보 관리
- ✅ invoices 테이블: 인보이스 메타데이터 저장 (항목은 JSON 형식으로 확장 가능)

### 13.3 API 구현
- ✅ Node.js/Express API: 항공 스케줄, 은행 계좌, 인보이스 CRUD
- ✅ Python/FastAPI 모델 및 라우터: 인보이스 관리 API

### 13.4 프론트엔드
- ✅ 인보이스 편집 페이지: 동적 항목 추가/삭제 기능
- ✅ 자동 계산: 실시간 총액 계산
- ✅ 항공 스케줄 드롭다운: DB 연동
- ✅ 은행 계좌 드롭다운: DB 연동
- ✅ 미리보기 페이지: 인쇄 최적화된 레이아웃

### 13.5 향후 개선 사항
- PDF 생성 기능 (HTML → PDF 변환)
- 이미지 업로드 기능 (로고/도장 변경)
- 항목 템플릿 저장 기능

---

**작성일**: 2026-01-01
**최종 업데이트**: 2026-01-01
**버전**: 1.1
**작성자**: Development Team
