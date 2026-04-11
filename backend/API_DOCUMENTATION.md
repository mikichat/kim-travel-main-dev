# 여행사 관리 시스템 - Backend API Documentation

**버전**: v1.5.0
**베이스 URL**: `http://localhost:5000`
**작성일**: 2026-01-02
**프로토콜**: HTTP/HTTPS
**데이터 포맷**: JSON

---

## 📋 목차

1. [개요](#개요)
2. [인증](#인증)
3. [공통 응답 형식](#공통-응답-형식)
4. [에러 코드](#에러-코드)
5. [Generic CRUD API](#generic-crud-api)
6. [Invoices API](#invoices-api)
7. [Flight Schedules API](#flight-schedules-api)
8. [Bank Accounts API](#bank-accounts-api)
9. [Schedules API](#schedules-api)
10. [File Upload API](#file-upload-api)
11. [Sync API](#sync-api)
12. [Cost Calculations API](#cost-calculations-api)
13. [Backup API](#backup-api)

---

## 📖 개요

여행사 관리 시스템의 RESTful API입니다. 인보이스 생성, 항공 스케줄 관리, 고객 동기화, AI 기반 문서 파싱 등의 기능을 제공합니다.

### 주요 기능
- 📄 인보이스 생성 및 관리
- ✈️ 항공 스케줄 관리
- 👥 고객 및 단체명단 동기화
- 🤖 Gemini AI 기반 문서 자동 파싱
- 💰 원가 계산서 관리
- 💾 데이터베이스 백업

### 기술 스택
- **Runtime**: Node.js v18+
- **Framework**: Express.js 4.19.2
- **Database**: SQLite 3
- **AI**: Google Gemini API

---

## 🔐 인증

현재 버전(v1.5.0)은 인증이 없습니다. 모든 엔드포인트는 공개되어 있습니다.

### v2.0 예정
```http
Authorization: Bearer {JWT_TOKEN}
```

---

## 📦 공통 응답 형식

### 성공 응답
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

### 생성 성공 (201)
```json
{
  "id": "uuid-here",
  "created_at": "2026-01-02T12:00:00.000Z",
  ...
}
```

### 업데이트 성공 (200)
```json
{
  "message": "성공적으로 업데이트되었습니다.",
  "data": {...}
}
```

### 삭제 성공 (204)
```
No Content
```

---

## ⚠️ 에러 코드

| HTTP 상태 | 설명 | 예시 |
|-----------|------|------|
| 400 | Bad Request | 필수 파라미터 누락 |
| 404 | Not Found | 리소스를 찾을 수 없음 |
| 500 | Internal Server Error | 서버 내부 오류 |

### 에러 응답 형식
```json
{
  "error": "에러 메시지",
  "details": "상세 정보 (선택적)"
}
```

---

## 🔧 Generic CRUD API

모든 테이블에 대한 범용 CRUD 작업을 제공합니다.

### 지원 테이블
- `customers`
- `products`
- `bookings`
- `notifications`
- `todos`

---

### GET /tables/:tableName

전체 데이터 조회

#### Parameters

| Name | Type | In | Description |
|------|------|-----|-------------|
| tableName | string | path | 테이블 이름 (필수) |
| limit | integer | query | 조회 개수 (기본값: 100) |
| sort | string | query | 정렬 기준 컬럼 (기본값: created_at) |
| order | string | query | 정렬 순서 (desc/asc, 기본값: desc) |

#### Request Example
```http
GET /tables/customers?limit=20&sort=created_at&order=desc
```

#### Response Example (200)
```json
{
  "data": [
    {
      "id": "uuid-1",
      "name_kor": "홍길동",
      "name_eng": "HONG GILDONG",
      "passport_number": "M12345678",
      "birth_date": "1990-01-01",
      "phone": "010-1234-5678",
      "created_at": "2026-01-02T12:00:00.000Z"
    }
  ]
}
```

---

### GET /tables/:tableName/:id

단일 데이터 조회

#### Parameters

| Name | Type | In | Description |
|------|------|-----|-------------|
| tableName | string | path | 테이블 이름 (필수) |
| id | string | path | 데이터 ID (필수) |

#### Request Example
```http
GET /tables/customers/uuid-1
```

#### Response Example (200)
```json
{
  "id": "uuid-1",
  "name_kor": "홍길동",
  "name_eng": "HONG GILDONG",
  "passport_number": "M12345678",
  "birth_date": "1990-01-01",
  "passport_expiry": "2030-01-01",
  "phone": "010-1234-5678",
  "email": "hong@example.com",
  "created_at": "2026-01-02T12:00:00.000Z"
}
```

#### Response Example (404)
```json
{
  "error": "[customers] ID uuid-1를 찾을 수 없습니다."
}
```

---

### POST /tables/:tableName

데이터 생성

#### Parameters

| Name | Type | In | Description |
|------|------|-----|-------------|
| tableName | string | path | 테이블 이름 (필수) |

#### Request Body
```json
{
  "name_kor": "홍길동",
  "name_eng": "HONG GILDONG",
  "passport_number": "M12345678",
  "birth_date": "1990-01-01",
  "passport_expiry": "2030-01-01",
  "phone": "010-1234-5678"
}
```

#### Response Example (201)
```json
{
  "id": "auto-generated-uuid",
  "name_kor": "홍길동",
  "name_eng": "HONG GILDONG",
  "passport_number": "M12345678",
  "created_at": "2026-01-02T12:00:00.000Z"
}
```

**Note**: `id`와 `created_at`는 자동 생성됩니다.

---

### PUT /tables/:tableName/:id

데이터 전체 수정

#### Parameters

| Name | Type | In | Description |
|------|------|-----|-------------|
| tableName | string | path | 테이블 이름 (필수) |
| id | string | path | 데이터 ID (필수) |

#### Request Body
```json
{
  "name_kor": "홍길동",
  "phone": "010-9999-8888"
}
```

#### Response Example (200)
```json
{
  "message": "[customers] ID uuid-1가 성공적으로 업데이트되었습니다."
}
```

**Note**: `id`와 `created_at`는 수정되지 않습니다.

---

### PATCH /tables/:tableName/:id

데이터 부분 수정

#### Parameters

| Name | Type | In | Description |
|------|------|-----|-------------|
| tableName | string | path | 테이블 이름 (필수) |
| id | string | path | 데이터 ID (필수) |

#### Request Body
```json
{
  "phone": "010-9999-8888"
}
```

#### Response Example (200)
```json
{
  "message": "[customers] ID uuid-1가 성공적으로 패치되었습니다."
}
```

---

### DELETE /tables/:tableName/:id

데이터 삭제

#### Parameters

| Name | Type | In | Description |
|------|------|-----|-------------|
| tableName | string | path | 테이블 이름 (필수) |
| id | string | path | 데이터 ID (필수) |

#### Request Example
```http
DELETE /tables/customers/uuid-1
```

#### Response Example (204)
```
No Content
```

---

## 📄 Invoices API

인보이스 생성 및 관리 API

### 특징
- 자동 인보이스 번호 생성 (`INV-YYYYMMDD-XXX`)
- 자동 금액 계산 (단가 × 수량)
- 항공 스케줄 및 은행 계좌 연결

---

### GET /api/invoices

인보이스 목록 조회

#### Parameters

| Name | Type | In | Description |
|------|------|-----|-------------|
| invoice_date_from | string | query | 시작 날짜 (YYYY-MM-DD) |
| invoice_date_to | string | query | 종료 날짜 (YYYY-MM-DD) |
| recipient | string | query | 수신처 (부분 일치) |
| page | integer | query | 페이지 번호 (기본값: 1) |
| limit | integer | query | 페이지당 개수 (기본값: 20) |

#### Request Example
```http
GET /api/invoices?invoice_date_from=2026-01-01&invoice_date_to=2026-01-31&page=1&limit=20
```

#### Response Example (200)
```json
{
  "data": [
    {
      "id": "uuid-1",
      "invoice_number": "INV-20260102-001",
      "recipient": "ABC 여행사",
      "invoice_date": "2026-01-02",
      "total_amount": 1500000,
      "created_at": "2026-01-02T12:00:00.000Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20
}
```

---

### GET /api/invoices/:id

인보이스 상세 조회

#### Parameters

| Name | Type | In | Description |
|------|------|-----|-------------|
| id | string | path | 인보이스 ID (필수) |

#### Request Example
```http
GET /api/invoices/uuid-1
```

#### Response Example (200)
```json
{
  "id": "uuid-1",
  "invoice_number": "INV-20260102-001",
  "recipient": "ABC 여행사",
  "invoice_date": "2026-01-02",
  "description": "방콕 3박 4일 항공료",
  "flight_schedule_id": "flight-uuid-1",
  "airfare_unit_price": 500000,
  "airfare_quantity": 2,
  "airfare_total": 1000000,
  "seat_preference_unit_price": 50000,
  "seat_preference_quantity": 2,
  "seat_preference_total": 100000,
  "total_amount": 1100000,
  "bank_account_id": "bank-uuid-1",
  "created_at": "2026-01-02T12:00:00.000Z",
  "flight_schedule": {
    "id": "flight-uuid-1",
    "airline": "대한항공",
    "flight_number": "KE123",
    "departure_airport": "ICN",
    "arrival_airport": "BKK"
  },
  "bank_account": {
    "id": "bank-uuid-1",
    "bank_name": "국민은행",
    "account_number": "123-456-789012",
    "account_holder": "여행세상"
  }
}
```

---

### POST /api/invoices

인보이스 생성

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| recipient | string | ✅ | 수신처 |
| invoice_date | string | ✅ | 인보이스 날짜 (YYYY-MM-DD) |
| description | string | ❌ | 설명 |
| flight_schedule_id | string | ❌ | 항공 스케줄 ID |
| airfare_unit_price | integer | ❌ | 항공료 단가 |
| airfare_quantity | integer | ❌ | 항공료 수량 |
| seat_preference_unit_price | integer | ❌ | 좌석 선호 단가 |
| seat_preference_quantity | integer | ❌ | 좌석 선호 수량 |
| bank_account_id | string | ❌ | 은행 계좌 ID |

#### Request Example
```json
{
  "recipient": "ABC 여행사",
  "invoice_date": "2026-01-02",
  "description": "방콕 3박 4일 항공료",
  "flight_schedule_id": "flight-uuid-1",
  "airfare_unit_price": 500000,
  "airfare_quantity": 2,
  "seat_preference_unit_price": 50000,
  "seat_preference_quantity": 2,
  "bank_account_id": "bank-uuid-1"
}
```

#### Response Example (201)
```json
{
  "id": "auto-generated-uuid",
  "invoice_number": "INV-20260102-123",
  "recipient": "ABC 여행사",
  "invoice_date": "2026-01-02",
  "airfare_total": 1000000,
  "seat_preference_total": 100000,
  "total_amount": 1100000,
  "created_at": "2026-01-02T12:00:00.000Z"
}
```

**Note**:
- `invoice_number`는 자동 생성됩니다 (형식: `INV-YYYYMMDD-XXX`)
- 금액은 자동 계산됩니다 (`단가 × 수량`)

---

### PUT /api/invoices/:id

인보이스 수정

#### Parameters

| Name | Type | In | Description |
|------|------|-----|-------------|
| id | string | path | 인보이스 ID (필수) |

#### Request Body
```json
{
  "recipient": "XYZ 여행사",
  "airfare_unit_price": 550000,
  "airfare_quantity": 2
}
```

#### Response Example (200)
```json
{
  "id": "uuid-1",
  "invoice_number": "INV-20260102-123",
  "recipient": "XYZ 여행사",
  "airfare_total": 1100000,
  "total_amount": 1200000,
  "updated_at": "2026-01-02T13:00:00.000Z"
}
```

**Note**: 금액 관련 필드 수정 시 자동 재계산됩니다.

---

### DELETE /api/invoices/:id

인보이스 삭제

#### Parameters

| Name | Type | In | Description |
|------|------|-----|-------------|
| id | string | path | 인보이스 ID (필수) |

#### Response Example (204)
```
No Content
```

---

## ✈️ Flight Schedules API

항공 스케줄 관리 API

---

### GET /api/flight-schedules

항공 스케줄 목록 조회

#### Parameters

| Name | Type | In | Description |
|------|------|-----|-------------|
| group_id | string | query | 그룹 ID |
| departure_date_from | string | query | 출발 시작 날짜 (YYYY-MM-DD) |
| departure_date_to | string | query | 출발 종료 날짜 (YYYY-MM-DD) |
| page | integer | query | 페이지 번호 (기본값: 1) |
| limit | integer | query | 페이지당 개수 (기본값: 20) |

#### Request Example
```http
GET /api/flight-schedules?group_id=group-123&page=1&limit=20
```

#### Response Example (200)
```json
{
  "data": [
    {
      "id": "flight-uuid-1",
      "group_id": "group-123",
      "group_name": "서울교회 방콕 단체",
      "airline": "대한항공",
      "flight_number": "KE123",
      "departure_date": "2026-03-15",
      "departure_airport": "ICN",
      "departure_time": "09:00",
      "arrival_date": "2026-03-15",
      "arrival_airport": "BKK",
      "arrival_time": "13:00",
      "passengers": 25,
      "created_at": "2026-01-02T12:00:00.000Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20
}
```

---

### GET /api/flight-schedules/:id

항공 스케줄 상세 조회

#### Parameters

| Name | Type | In | Description |
|------|------|-----|-------------|
| id | string | path | 항공 스케줄 ID (필수) |

#### Response Example (200)
```json
{
  "id": "flight-uuid-1",
  "group_id": "group-123",
  "group_name": "서울교회 방콕 단체",
  "airline": "대한항공",
  "flight_number": "KE123",
  "departure_date": "2026-03-15",
  "departure_airport": "ICN",
  "departure_time": "09:00",
  "arrival_date": "2026-03-15",
  "arrival_airport": "BKK",
  "arrival_time": "13:00",
  "passengers": 25,
  "created_at": "2026-01-02T12:00:00.000Z"
}
```

---

### POST /api/flight-schedules

항공 스케줄 생성

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| group_id | string | ❌ | 그룹 ID |
| group_name | string | ❌ | 그룹명 |
| airline | string | ✅ | 항공사 |
| flight_number | string | ❌ | 항공편명 |
| departure_date | string | ✅ | 출발 날짜 (YYYY-MM-DD) |
| departure_airport | string | ✅ | 출발 공항 코드 |
| departure_time | string | ✅ | 출발 시간 (HH:MM) |
| arrival_date | string | ✅ | 도착 날짜 (YYYY-MM-DD) |
| arrival_airport | string | ✅ | 도착 공항 코드 |
| arrival_time | string | ✅ | 도착 시간 (HH:MM) |
| passengers | integer | ❌ | 승객 수 |

#### Request Example
```json
{
  "group_id": "group-123",
  "group_name": "서울교회 방콕 단체",
  "airline": "대한항공",
  "flight_number": "KE123",
  "departure_date": "2026-03-15",
  "departure_airport": "ICN",
  "departure_time": "09:00",
  "arrival_date": "2026-03-15",
  "arrival_airport": "BKK",
  "arrival_time": "13:00",
  "passengers": 25
}
```

#### Response Example (201)
```json
{
  "id": "auto-generated-uuid",
  "group_id": "group-123",
  "airline": "대한항공",
  "created_at": "2026-01-02T12:00:00.000Z"
}
```

---

### PUT /api/flight-schedules/:id

항공 스케줄 수정

#### Parameters

| Name | Type | In | Description |
|------|------|-----|-------------|
| id | string | path | 항공 스케줄 ID (필수) |

#### Request Body
```json
{
  "departure_time": "10:00",
  "arrival_time": "14:00",
  "passengers": 30
}
```

#### Response Example (200)
```json
{
  "id": "flight-uuid-1",
  "departure_time": "10:00",
  "arrival_time": "14:00",
  "passengers": 30
}
```

---

### DELETE /api/flight-schedules/:id

항공 스케줄 삭제

#### Response Example (204)
```
No Content
```

---

## 🏦 Bank Accounts API

은행 계좌 관리 API

---

### GET /api/bank-accounts

은행 계좌 목록 조회

#### Response Example (200)
```json
{
  "data": [
    {
      "id": "bank-uuid-1",
      "bank_name": "국민은행",
      "account_number": "123-456-789012",
      "account_holder": "여행세상",
      "is_default": 1,
      "created_at": "2026-01-02T12:00:00.000Z"
    },
    {
      "id": "bank-uuid-2",
      "bank_name": "신한은행",
      "account_number": "987-654-321098",
      "account_holder": "여행세상",
      "is_default": 0,
      "created_at": "2026-01-01T12:00:00.000Z"
    }
  ]
}
```

**Note**: `is_default` 순서로 정렬됩니다 (기본 계좌가 먼저).

---

### GET /api/bank-accounts/default

기본 은행 계좌 조회

#### Response Example (200)
```json
{
  "id": "bank-uuid-1",
  "bank_name": "국민은행",
  "account_number": "123-456-789012",
  "account_holder": "여행세상",
  "is_default": 1,
  "created_at": "2026-01-02T12:00:00.000Z"
}
```

#### Response Example (404)
```json
{
  "error": "기본 계좌를 찾을 수 없습니다."
}
```

---

### POST /api/bank-accounts

은행 계좌 추가

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| bank_name | string | ✅ | 은행명 |
| account_number | string | ✅ | 계좌번호 |
| account_holder | string | ✅ | 예금주 |
| is_default | boolean | ❌ | 기본 계좌 여부 |

#### Request Example
```json
{
  "bank_name": "국민은행",
  "account_number": "123-456-789012",
  "account_holder": "여행세상",
  "is_default": true
}
```

#### Response Example (201)
```json
{
  "id": "auto-generated-uuid",
  "bank_name": "국민은행",
  "account_number": "123-456-789012",
  "account_holder": "여행세상",
  "is_default": 1
}
```

**Note**: `is_default`가 `true`인 경우, 기존 기본 계좌는 자동으로 해제됩니다.

---

### PUT /api/bank-accounts/:id

은행 계좌 수정

#### Parameters

| Name | Type | In | Description |
|------|------|-----|-------------|
| id | string | path | 은행 계좌 ID (필수) |

#### Request Body
```json
{
  "account_number": "111-222-333444",
  "is_default": true
}
```

#### Response Example (200)
```json
{
  "id": "bank-uuid-1",
  "bank_name": "국민은행",
  "account_number": "111-222-333444",
  "is_default": 1
}
```

---

### PUT /api/bank-accounts/:id/set-default

기본 계좌로 설정

#### Parameters

| Name | Type | In | Description |
|------|------|-----|-------------|
| id | string | path | 은행 계좌 ID (필수) |

#### Response Example (200)
```json
{
  "id": "bank-uuid-1",
  "bank_name": "국민은행",
  "is_default": 1
}
```

---

### DELETE /api/bank-accounts/:id

은행 계좌 삭제

#### Response Example (204)
```
No Content
```

---

## 📅 Schedules API

여행 일정 관리 API

---

### GET /api/schedules

일정 목록 조회

#### Parameters

| Name | Type | In | Description |
|------|------|-----|-------------|
| group | string | query | 그룹명 (필터링) |

#### Request Example
```http
GET /api/schedules?group=서울교회%20방콕%20단체
```

#### Response Example (200)
```json
[
  {
    "id": 1,
    "group_name": "서울교회 방콕 단체",
    "event_date": "2026-03-15",
    "location": "방콕",
    "transport": "전용차량",
    "time": "09:00",
    "schedule": "호텔 체크인",
    "meals": "조:기내식, 중:현지식, 석:한식",
    "color": "#7B61FF",
    "created_at": "2026-01-02T12:00:00.000Z"
  }
]
```

---

### GET /api/schedules/:id

일정 상세 조회

#### Parameters

| Name | Type | In | Description |
|------|------|-----|-------------|
| id | integer | path | 일정 ID (필수) |

#### Response Example (200)
```json
{
  "id": 1,
  "group_name": "서울교회 방콕 단체",
  "event_date": "2026-03-15",
  "location": "방콕",
  "transport": "전용차량",
  "time": "09:00",
  "schedule": "호텔 체크인",
  "meals": "조:기내식, 중:현지식, 석:한식",
  "color": "#7B61FF",
  "created_at": "2026-01-02T12:00:00.000Z"
}
```

---

### GET /api/schedules/date/:date

날짜별 일정 조회

#### Parameters

| Name | Type | In | Description |
|------|------|-----|-------------|
| date | string | path | 날짜 (YYYY-MM-DD) |

#### Request Example
```http
GET /api/schedules/date/2026-03-15
```

#### Response Example (200)
```json
[
  {
    "id": 1,
    "group_name": "서울교회 방콕 단체",
    "event_date": "2026-03-15",
    "schedule": "호텔 체크인"
  },
  {
    "id": 2,
    "group_name": "부산교회 다낭 단체",
    "event_date": "2026-03-15",
    "schedule": "공항 미팅"
  }
]
```

---

### GET /api/schedules/export

Excel 내보내기

#### Parameters

| Name | Type | In | Description |
|------|------|-----|-------------|
| group_name | string | query | 그룹명 (필터링, 선택적) |

#### Request Example
```http
GET /api/schedules/export?group_name=서울교회%20방콕%20단체
```

#### Response
- **Content-Type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **파일명**: `{group_name}_schedules.xlsx` 또는 `all_schedules.xlsx`

#### Excel 컬럼
| 컬럼 | 설명 |
|------|------|
| 그룹명 | 단체명 |
| 일자 | 일정 날짜 |
| 지역 | 여행 지역 |
| 교통편 | 이동 수단 |
| 시간 | 일정 시간 |
| 일정 | 세부 일정 |
| 식사 | 식사 정보 |

---

### POST /api/schedules

일정 추가

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| group_name | string | ❌ | 그룹명 |
| event_date | string | ❌ | 일정 날짜 (YYYY-MM-DD) |
| location | string | ❌ | 지역 |
| transport | string | ❌ | 교통편 |
| time | string | ❌ | 시간 |
| schedule | string | ✅ | 일정 내용 |
| meals | string | ❌ | 식사 정보 |
| color | string | ❌ | 색상 (기본값: #7B61FF) |

#### Request Example
```json
{
  "group_name": "서울교회 방콕 단체",
  "event_date": "2026-03-15",
  "location": "방콕",
  "transport": "전용차량",
  "time": "09:00",
  "schedule": "호텔 체크인",
  "meals": "조:기내식, 중:현지식, 석:한식",
  "color": "#7B61FF"
}
```

#### Response Example (201)
```json
{
  "id": 1,
  "group_name": "서울교회 방콕 단체",
  "event_date": "2026-03-15",
  "schedule": "호텔 체크인",
  "created_at": "2026-01-02T12:00:00.000Z"
}
```

---

### PUT /api/schedules/:id

일정 수정

#### Parameters

| Name | Type | In | Description |
|------|------|-----|-------------|
| id | integer | path | 일정 ID (필수) |

#### Request Body
```json
{
  "time": "10:00",
  "schedule": "호텔 체크인 및 휴식"
}
```

#### Response Example (200)
```json
{
  "id": 1,
  "time": "10:00",
  "schedule": "호텔 체크인 및 휴식"
}
```

---

### DELETE /api/schedules/:id

일정 삭제

#### Response Example (204)
```
No Content
```

---

## 📤 File Upload API

파일 업로드 및 AI 기반 자동 파싱 API

### 특징
- **Gemini AI 통합**: 문서 자동 파싱
- **지원 형식**: PDF, Excel (.xlsx, .xls), Word (.docx, .doc), HWP
- **동적 모델 선택**: 최신 Gemini Flash 모델 자동 감지
- **자동 저장**: 파싱된 데이터를 `schedules` 테이블에 저장

---

### POST /api/upload

일정표 파일 업로드 및 파싱

#### Content-Type
```
multipart/form-data
```

#### Form Data

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| schedule_file | file | ✅ | 일정표 파일 |
| group_name | string | ✅ | 단체명 |

#### Supported File Types
- **PDF**: `.pdf`
- **Excel**: `.xlsx`, `.xls`
- **Word**: `.docx`, `.doc`
- **HWP**: `.hwp`

#### Request Example (cURL)
```bash
curl -X POST http://localhost:5000/api/upload \
  -F "schedule_file=@schedule.pdf" \
  -F "group_name=서울교회 방콕 단체"
```

#### Response Example (200)
```json
{
  "success": true,
  "message": "총 5개의 일정 중 5개가 저장되었습니다.",
  "saved": 5,
  "total": 5,
  "group_name": "서울교회 방콕 단체"
}
```

#### Response Example (부분 성공)
```json
{
  "success": true,
  "message": "총 5개의 일정 중 3개가 저장되었습니다.",
  "saved": 3,
  "total": 5,
  "errors": [
    {
      "item": {
        "event_date": null,
        "schedule": "일정 내용"
      },
      "error": "필수 필드 누락"
    }
  ],
  "group_name": "서울교회 방콕 단체"
}
```

#### Response Example (400)
```json
{
  "error": "파일이 업로드되지 않았습니다."
}
```

```json
{
  "error": "그룹명을 입력해주세요."
}
```

#### Response Example (500)
```json
{
  "error": "서버 내부 오류가 발생했습니다.",
  "details": "Gemini API 호출 실패"
}
```

---

### AI 파싱 결과 형식

Gemini AI가 반환하는 JSON 형식:

```json
[
  {
    "event_date": "2026-03-15",
    "location": "방콕",
    "transport": "전용차량",
    "time": "09:00",
    "schedule": "호텔 체크인",
    "meals": "조:기내식, 중:현지식, 석:한식"
  },
  {
    "event_date": "2026-03-16",
    "location": "방콕",
    "transport": "전용차량",
    "time": "09:00",
    "schedule": "시내 관광",
    "meals": "조:호텔식, 중:현지식, 석:한식"
  }
]
```

---

### 파싱 규칙

1. **날짜 형식**: `YYYY-MM-DD`로 통일
2. **병합 셀**: 각 행마다 개별 항목으로 분리
3. **정보 추출**: 시간, 교통편, 식사를 해당 필드에 분리
4. **빈 필드**: 빈 문자열(`""`)로 설정
5. **마크다운 제거**: JSON만 반환 (백틱 제거)

---

## 🔄 Sync API

고객 및 단체명단 동기화 API

### 특징
- **배치 동기화**: 여러 고객을 한 번에 동기화
- **중복 검사**: 여권번호 → 이름+생년월일 → 전화번호 우선순위
- **자동 업데이트**: 기존 고객은 업데이트, 신규는 생성
- **이력 로깅**: 모든 동기화 작업을 `sync_logs`에 기록

---

### POST /api/sync/customers/batch

배치 고객 동기화

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| group_id | string | ❌ | 그룹 ID |
| group_name | string | ❌ | 단체명 |
| departure_date | string | ❌ | 출발 날짜 |
| return_date | string | ❌ | 귀국 날짜 |
| destination | string | ❌ | 목적지 |
| members | array | ✅ | 멤버 목록 |
| sync_options | object | ❌ | 동기화 옵션 |

#### Member Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| nameKor | string | ✅ | 한글명 |
| nameEn | string | ✅ | 영문명 |
| passportNo | string | ✅ | 여권번호 |
| birthDate | string | ✅ | 생년월일 (YYYY-MM-DD) |
| passportExpire | string | ✅ | 여권만료일 (YYYY-MM-DD) |
| phone | string | ❌ | 전화번호 |
| gender | string | ❌ | 성별 |

#### Request Example
```json
{
  "group_id": "group-123",
  "group_name": "서울교회 방콕 단체",
  "departure_date": "2026-03-15",
  "return_date": "2026-03-18",
  "destination": "방콕",
  "members": [
    {
      "nameKor": "홍길동",
      "nameEn": "HONG GILDONG",
      "passportNo": "M12345678",
      "birthDate": "1990-01-01",
      "passportExpire": "2030-01-01",
      "phone": "010-1234-5678"
    },
    {
      "nameKor": "김영희",
      "nameEn": "KIM YOUNGHEE",
      "passportNo": "M87654321",
      "birthDate": "1985-05-15",
      "passportExpire": "2029-05-15",
      "phone": "010-9876-5432"
    }
  ]
}
```

#### Response Example (200)
```json
{
  "total": 2,
  "created": 1,
  "updated": 1,
  "skipped": 0,
  "errors": [],
  "sync_log_id": "log-uuid-1"
}
```

#### Response Example (부분 성공)
```json
{
  "total": 3,
  "created": 1,
  "updated": 1,
  "skipped": 1,
  "errors": [
    {
      "index": 2,
      "member": {
        "nameKor": "박철수",
        "nameEn": null
      },
      "errors": [
        "한글명 또는 영문명 필수",
        "여권번호 필수"
      ]
    }
  ],
  "sync_log_id": "log-uuid-1"
}
```

---

### POST /api/sync/validate

동기화 전 검증

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| members | array | ✅ | 멤버 목록 |

#### Request Example
```json
{
  "members": [
    {
      "nameKor": "홍길동",
      "nameEn": "HONG GILDONG",
      "passportNo": "M12345678",
      "birthDate": "1990-01-01",
      "passportExpire": "2030-01-01"
    }
  ]
}
```

#### Response Example (200)
```json
{
  "valid": [
    {
      "index": 0,
      "member": {...},
      "action": "create"
    }
  ],
  "invalid": [],
  "duplicates": []
}
```

#### Response Example (중복 발견)
```json
{
  "valid": [],
  "invalid": [],
  "duplicates": [
    {
      "index": 0,
      "member": {
        "nameKor": "홍길동",
        "passportNo": "M12345678"
      },
      "existing_customer": {
        "id": "customer-uuid-1",
        "name_kor": "홍길동",
        "passport_number": "M12345678"
      },
      "match_type": "passport"
    }
  ]
}
```

**Match Types**:
- `passport`: 여권번호 일치
- `name_birth`: 이름 + 생년월일 일치

---

### GET /api/products/match

상품 자동 매칭

#### Parameters

| Name | Type | In | Description |
|------|------|-----|-------------|
| destination | string | query | 목적지 (필수) |

#### Request Example
```http
GET /api/products/match?destination=방콕
```

#### Response Example (정확한 매칭)
```json
{
  "exact_match": {
    "id": "product-uuid-1",
    "name": "방콕 3박 4일",
    "destination": "방콕",
    "price": 500000
  },
  "similar_matches": []
}
```

#### Response Example (유사 매칭)
```json
{
  "exact_match": null,
  "similar_matches": [
    {
      "id": "product-uuid-2",
      "name": "방콕 + 파타야 4박 5일",
      "destination": "방콕 파타야",
      "similarity": 0.75
    },
    {
      "id": "product-uuid-3",
      "name": "태국 방콕 자유여행",
      "destination": "태국 방콕",
      "similarity": 0.67
    }
  ]
}
```

**Note**: 유사도는 Levenshtein Distance 알고리즘으로 계산됩니다 (0~1).

---

### GET /api/sync/history

동기화 이력 조회

#### Parameters

| Name | Type | In | Description |
|------|------|-----|-------------|
| group_id | string | query | 그룹 ID |
| limit | integer | query | 조회 개수 (기본값: 50) |
| offset | integer | query | 오프셋 (기본값: 0) |
| sync_type | string | query | 동기화 타입 (customer_sync 등) |

#### Request Example
```http
GET /api/sync/history?group_id=group-123&limit=10
```

#### Response Example (200)
```json
[
  {
    "id": "log-uuid-1",
    "sync_type": "customer_sync",
    "group_id": "group-123",
    "group_name": "서울교회 방콕 단체",
    "operation": "batch_sync",
    "entity_type": "customer",
    "entity_id": null,
    "status": "success",
    "details": {
      "total": 2,
      "created": 1,
      "updated": 1,
      "skipped": 0
    },
    "error_message": null,
    "created_at": "2026-01-02T12:00:00.000Z"
  }
]
```

---

## 💰 Cost Calculations API

원가 계산서 관리 API

### 특징
- **자동 코드 생성**: `COST-YYYY-MM-XXX` 형식
- **JSON 필드**: 복잡한 데이터 구조 저장 (항공료, 랜드비 등)
- **버전 관리**: `code`를 통한 업데이트/생성 구분

---

### GET /api/cost-calculations

원가 계산서 목록 조회

#### Response Example (200)
```json
[
  {
    "id": 1,
    "code": "COST-2026-01-001",
    "name": "방콕 3박 4일 원가",
    "destination": "방콕",
    "departure_date": "2026-03-15",
    "arrival_date": "2026-03-18",
    "nights": 3,
    "days": 4,
    "adults": 25,
    "children": 0,
    "infants": 0,
    "created_at": "2026-01-02T12:00:00.000Z",
    "updated_at": "2026-01-02T12:00:00.000Z"
  }
]
```

---

### GET /api/cost-calculations/:id

원가 계산서 상세 조회

#### Parameters

| Name | Type | In | Description |
|------|------|-----|-------------|
| id | integer | path | 원가 계산서 ID (필수) |

#### Response Example (200)
```json
{
  "id": 1,
  "code": "COST-2026-01-001",
  "name": "방콕 3박 4일 원가",
  "destination": "방콕",
  "departure_date": "2026-03-15",
  "arrival_date": "2026-03-18",
  "nights": 3,
  "days": 4,
  "adults": 25,
  "children": 0,
  "infants": 0,
  "domestic_vehicle_type": "45인승 버스",
  "domestic_vehicle_total": 300000,
  "flight_data": [
    {
      "airline": "대한항공",
      "route": "ICN-BKK",
      "price": 500000,
      "quantity": 25
    }
  ],
  "etc_costs": [
    {
      "item": "여행자 보험",
      "price": 10000,
      "quantity": 25
    }
  ],
  "land_cost_1": {
    "company": "A 랜드사",
    "total": 5000000
  },
  "land_cost_2": {
    "company": "B 랜드사",
    "total": 4800000
  },
  "margin_amount_1": 500000,
  "margin_amount_2": 700000,
  "notes_1": "A사 조건: 전일 현지식",
  "notes_2": "B사 조건: 중식 1회 한식",
  "created_at": "2026-01-02T12:00:00.000Z",
  "updated_at": "2026-01-02T12:00:00.000Z"
}
```

**Note**: JSON 필드(`flight_data`, `etc_costs`, `land_cost_1`, `land_cost_2`)는 자동 파싱됩니다.

---

### POST /api/cost-calculations

원가 계산서 저장 (생성 또는 업데이트)

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| code | string | ❌ | 코드 (없으면 자동 생성) |
| name | string | ✅ | 행사명 |
| destination | string | ❌ | 목적지 |
| departure_date | string | ❌ | 출발 날짜 |
| arrival_date | string | ❌ | 도착 날짜 |
| nights | integer | ❌ | 박 수 |
| days | integer | ❌ | 일 수 |
| adults | integer | ❌ | 성인 수 |
| children | integer | ❌ | 소아 수 |
| infants | integer | ❌ | 유아 수 |
| flight_data | array | ❌ | 항공료 데이터 (JSON) |
| etc_costs | array | ❌ | 기타 비용 (JSON) |
| land_cost_1 | object | ❌ | 랜드비 1 (JSON) |
| land_cost_2 | object | ❌ | 랜드비 2 (JSON) |
| margin_amount_1 | integer | ❌ | 마진 금액 1 |
| margin_amount_2 | integer | ❌ | 마진 금액 2 |
| notes_1 | string | ❌ | 비고 1 |
| notes_2 | string | ❌ | 비고 2 |

#### Request Example (신규 생성)
```json
{
  "name": "방콕 3박 4일 원가",
  "destination": "방콕",
  "departure_date": "2026-03-15",
  "arrival_date": "2026-03-18",
  "nights": 3,
  "days": 4,
  "adults": 25,
  "flight_data": [
    {
      "airline": "대한항공",
      "route": "ICN-BKK",
      "price": 500000,
      "quantity": 25
    }
  ]
}
```

#### Response Example (201)
```json
{
  "message": "원가 계산서가 저장되었습니다.",
  "data": {
    "id": 1,
    "code": "COST-2026-01-001",
    "name": "방콕 3박 4일 원가",
    "created_at": "2026-01-02T12:00:00.000Z"
  }
}
```

#### Request Example (업데이트)
```json
{
  "code": "COST-2026-01-001",
  "name": "방콕 3박 4일 원가 (수정)",
  "adults": 30
}
```

#### Response Example (200)
```json
{
  "message": "원가 계산서가 업데이트되었습니다.",
  "data": {
    "id": 1,
    "code": "COST-2026-01-001",
    "name": "방콕 3박 4일 원가 (수정)",
    "adults": 30,
    "updated_at": "2026-01-02T13:00:00.000Z"
  }
}
```

**Note**:
- `code`가 없으면 자동 생성 (형식: `COST-YYYY-MM-XXX`)
- `code`가 있고 DB에 존재하면 업데이트, 없으면 새로 생성

---

### DELETE /api/cost-calculations/:id

원가 계산서 삭제

#### Response Example (204)
```
No Content
```

---

## 💾 Backup API

데이터베이스 백업 API

---

### GET /api/backup/database

JSON 형식 백업 조회

#### Response Example (200)
```json
{
  "timestamp": 1735804800000,
  "date": "2026-01-02T12:00:00.000Z",
  "version": "1.0",
  "tables": {
    "customers": [...],
    "products": [...],
    "bookings": [...],
    "schedules": [...],
    "todos": [...],
    "notifications": [...]
  }
}
```

---

### GET /api/backup/download

JSON 파일 다운로드

#### Response
- **Content-Type**: `application/json`
- **파일명**: `database-backup-YYYY-MM-DD.json`

#### 파일 내용
```json
{
  "timestamp": 1735804800000,
  "date": "2026-01-02T12:00:00.000Z",
  "version": "1.0",
  "tables": {
    "customers": [...],
    "products": [...],
    "bookings": [...],
    "schedules": [...],
    "todos": [...],
    "notifications": [...]
  }
}
```

---

### GET /api/backup/file

SQLite 파일 백업

#### Response Example (200)
```json
{
  "success": true,
  "message": "데이터베이스 파일 백업 완료",
  "backupFile": "travel_agency_backup_2026-01-02T12-00-00-000Z.db",
  "totalBackups": 5
}
```

**Note**:
- 백업 파일은 `backend/backups/` 폴더에 저장됩니다
- 최근 7개 백업만 유지됩니다 (오래된 백업은 자동 삭제)

---

## 📚 추가 리소스

### Postman Collection
TODO: Postman Collection 파일 추가 예정

### OpenAPI Spec
TODO: OpenAPI 3.0 스펙 파일 추가 예정

### 관련 문서
- [시스템 아키텍처](../in/docs/SYSTEM_ARCHITECTURE.md)
- [데이터베이스 설계](../in/docs/Database-Design.md)
- [사용자 플로우](../USER_FLOW.md)

---

## 🔄 변경 이력

### v1.5.0 (2026-01-02)
- 초기 API 문서 작성
- 모든 엔드포인트 문서화 완료

### v1.4.0 (2025-12-28)
- 동기화 API 추가
- 원가 계산서 API 추가

### v1.3.0 (2025-12-27)
- 항공 스케줄 API 추가
- 은행 계좌 API 추가

---

**문서 버전**: v1.0
**마지막 업데이트**: 2026-01-02
**작성자**: Backend Team
