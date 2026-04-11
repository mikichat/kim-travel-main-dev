# 인보이스 자동 작성 기능 기획서

> 작성일: 2026-03-15
> 목표: 예약장부에서 인보이스 작성 시 항공스케줄 + 탑승객 명단이 자동으로 채워지는 시스템

---

## 1. 현재 문제

| 문제 | 설명 |
|------|------|
| 인보이스가 예약과 분리됨 | 인보이스에 booking_id FK 없음 → 어떤 예약의 인보이스인지 추적 불가 |
| 수동 입력 | 수신자, 금액, 항목을 모두 수동으로 입력해야 함 |
| 항공스케줄 미포함 | 편명/구간/날짜를 인보이스에 자동 표시하는 기능 없음 |
| 탑승객 명단 미포함 | 몇 명인지, 누구인지 인보이스에 자동으로 안 들어감 |
| 정산과 연결 안 됨 | 정산(settlement)과 인보이스 사이 링크 없음 |

---

## 2. 원하는 흐름

```
예약장부 → 예약 행 확장 → [인보이스 작성] 버튼 클릭
    ↓
인보이스 작성 화면이 열림 (모달 또는 새 페이지)
    ↓
자동으로 채워진 항목:
  ├── 수신자: 예약의 고객명 (또는 대리점명)
  ├── 항공스케줄: segments 데이터
  │   ├── OZ369  ICN→CAN  2026-04-01  09:30→12:15
  │   └── OZ370  CAN→ICN  2026-04-05  14:00→18:30
  ├── 탑승객 명단: passengers 데이터
  │   ├── 1. KIM/GUKJIN MR
  │   ├── 2. LEE/MINJUNG MS
  │   └── 3. PARK/JINHO MR
  ├── 티켓번호: tickets 데이터
  │   ├── 988-5075523971 (발권)
  │   └── 988-1933710740 (발권)
  ├── 항공운임: fare × pax_count
  └── 인원수: pax_count
    ↓
사용자가 확인/수정 후 [저장]
    ↓
인보이스 저장 + 정산 자동 연결 (선택)
```

---

## 3. 데이터 모델 변경

### 3-1. invoices 테이블 수정

```sql
-- 기존 필드 유지 + 새 필드 추가
ALTER TABLE air_invoices ADD COLUMN booking_id TEXT REFERENCES air_bookings(id);
ALTER TABLE air_invoices ADD COLUMN settlement_id TEXT REFERENCES air_settlements(id);
ALTER TABLE air_invoices ADD COLUMN flight_info TEXT;      -- JSON: segments 배열
ALTER TABLE air_invoices ADD COLUMN passenger_info TEXT;    -- JSON: passengers 배열
ALTER TABLE air_invoices ADD COLUMN ticket_info TEXT;       -- JSON: tickets 배열

CREATE INDEX IF NOT EXISTS idx_air_invoices_booking ON air_invoices(booking_id);
```

### 3-2. flight_info JSON 구조

```json
[
  {
    "airline": "OZ",
    "flight_number": "OZ369",
    "route_from": "ICN",
    "route_to": "CAN",
    "departure_date": "2026-04-01",
    "departure_time": "09:30",
    "arrival_time": "12:15"
  },
  {
    "airline": "OZ",
    "flight_number": "OZ370",
    "route_from": "CAN",
    "route_to": "ICN",
    "departure_date": "2026-04-05",
    "departure_time": "14:00",
    "arrival_time": "18:30"
  }
]
```

### 3-3. passenger_info JSON 구조

```json
[
  { "name_en": "KIM/GUKJIN", "name_kr": "김국진", "title": "MR", "gender": "M" },
  { "name_en": "LEE/MINJUNG", "name_kr": "이민정", "title": "MS", "gender": "F" }
]
```

### 3-4. ticket_info JSON 구조

```json
[
  { "ticket_number": "988-5075523971", "issue_date": "2026-03-15", "status": "issued", "passenger_name": "KIM GUKJIN" },
  { "ticket_number": "988-1933710740", "issue_date": "2026-03-15", "status": "issued", "passenger_name": "LEE MINJUNG" }
]
```

---

## 4. API 변경

### 4-1. 인보이스 자동 생성 API (새로 추가)

```
POST /api/bookings/:bookingId/invoice
```

**동작:**
1. booking 조회 (passengers, segments, tickets 포함)
2. 인보이스 자동 생성:
   - `recipient`: booking.agency 또는 booking.name_kr
   - `flight_info`: segments 배열 → JSON
   - `passenger_info`: passengers 배열 → JSON (여권번호 제외)
   - `ticket_info`: tickets 배열 → JSON
   - `total_participants`: booking.pax_count
   - `base_price_per_person`: booking.fare
   - `total_amount`: fare × pax_count (초기값, 수정 가능)
3. 생성된 인보이스 반환

**응답:**
```json
{
  "success": true,
  "data": {
    "invoice": {
      "id": "uuid",
      "invoice_number": "INV-20260315-001",
      "booking_id": "booking-uuid",
      "recipient": "김국진",
      "flight_info": [...],
      "passenger_info": [...],
      "ticket_info": [...],
      "total_participants": 3,
      "base_price_per_person": 850000,
      "total_amount": 2550000,
      ...
    }
  }
}
```

### 4-2. 기존 인보이스 API 수정

```
GET /api/invoices/:id
```
- `flight_info`, `passenger_info`, `ticket_info` JSON 파싱하여 반환

```
PATCH /api/invoices/:id
```
- `flight_info`, `passenger_info`, `ticket_info` 수정 가능

---

## 5. UI 변경

### 5-1. 예약장부 → 인보이스 작성 버튼

```
예약 상세 카드 하단 액션 버튼에 추가:
[발권 처리] [정산 이동] [🎫 티켓 관리] [📋 인보이스 작성] [삭제]
```

클릭 시:
- 이미 인보이스가 있으면 → 기존 인보이스 조회/편집 모달
- 없으면 → 자동 생성 후 편집 모달

### 5-2. 인보이스 작성/편집 모달

```
┌──────────────────────────────────────────────────────────┐
│  📋 인보이스 작성                          INV-20260315-001  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  수신자: [김국진 / 여행세상        ]  PNR: LHNBZS        │
│                                                          │
│  ── 항공 스케줄 ─────────────────────────────────────      │
│  ┌────┬──────┬───────┬───────┬──────────┬──────────┐    │
│  │ #  │ 편명  │ 구간   │ 날짜   │ 출발시간  │ 도착시간  │    │
│  ├────┼──────┼───────┼───────┼──────────┼──────────┤    │
│  │ 1  │OZ369 │ICN→CAN│04/01  │ 09:30    │ 12:15    │    │
│  │ 2  │OZ370 │CAN→ICN│04/05  │ 14:00    │ 18:30    │    │
│  └────┴──────┴───────┴───────┴──────────┴──────────┘    │
│                                                          │
│  ── 탑승객 명단 ─────────────────────────────────────      │
│  ┌────┬──────────────┬────────┬────────────────────┐    │
│  │ #  │ 영문명        │ 한글명  │ 티켓번호            │    │
│  ├────┼──────────────┼────────┼────────────────────┤    │
│  │ 1  │KIM/GUKJIN MR │김국진   │988-5075523971      │    │
│  │ 2  │LEE/MINJUNG MS│이민정   │988-1933710740      │    │
│  │ 3  │PARK/JINHO MR │박진호   │988-1933710742      │    │
│  └────┴──────────────┴────────┴────────────────────┘    │
│                                                          │
│  ── 요금 ────────────────────────────────────────────      │
│  항공운임 (1인):  [850,000   ]원 × [3  ]명                │
│  항공운임 소계:   2,550,000원                              │
│  좌석 지정료:     [    0     ]원 × [3  ]명                │
│  좌석 소계:       0원                                     │
│  ─────────────────────────────────────────                │
│  추가 항목:  [+ 항목 추가]                                │
│  ─────────────────────────────────────────                │
│  합계:        2,550,000원                                 │
│  기수금:      [         ]원                                │
│  잔액:        2,550,000원                                 │
│                                                          │
│  비고: [                                               ]  │
│                                                          │
│             [취소]  [PDF 미리보기]  [저장]                  │
└──────────────────────────────────────────────────────────┘
```

### 5-3. 인보이스 PDF 출력

기존 PDF 출력에 추가:
- 항공 스케줄 테이블
- 탑승객 명단 테이블
- 티켓번호 포함

---

## 6. 구현 태스크

### Phase 1: DB + API (백엔드)

| ID | 태스크 | 담당 | 설명 |
|----|--------|------|------|
| INV-1 | DB 마이그레이션 | backend | invoices 테이블에 booking_id, flight_info, passenger_info, ticket_info 추가 |
| INV-2 | 인보이스 자동 생성 API | backend | POST /api/bookings/:id/invoice — 예약 데이터 자동 채우기 |
| INV-3 | 인보이스 조회/수정 API 수정 | backend | flight_info 등 JSON 필드 파싱/저장 |

### Phase 2: UI (프론트엔드)

| ID | 태스크 | 담당 | 설명 |
|----|--------|------|------|
| INV-4 | 예약장부에 인보이스 버튼 추가 | frontend | BookingDetailCard에 [인보이스 작성] 버튼 |
| INV-5 | 인보이스 작성/편집 모달 | frontend | 자동 채움 + 수정 가능한 모달 UI |
| INV-6 | 인보이스 PDF 출력 수정 | frontend | 항공스케줄 + 명단 + 티켓번호 포함 |

### Phase 3: 연결

| ID | 태스크 | 담당 | 설명 |
|----|--------|------|------|
| INV-7 | 정산→인보이스 연결 | backend | settlement_id FK 연결, 정산에서 인보이스 바로 접근 |
| INV-8 | 인보이스 목록에 예약 정보 표시 | frontend | 인보이스 목록에서 PNR, 고객명 표시 |

---

## 7. 자동 채움 매핑

| 인보이스 필드 | 예약 데이터 소스 | 자동/수동 |
|-------------|----------------|----------|
| recipient | booking.agency 또는 booking.name_kr | 자동 (수정 가능) |
| flight_info | booking.segments[] | 자동 |
| passenger_info | booking.passengers[] | 자동 |
| ticket_info | booking.tickets[] | 자동 |
| total_participants | booking.pax_count | 자동 |
| base_price_per_person | booking.fare | 자동 (수정 가능) |
| airfare_total | fare × pax_count | 자동 계산 |
| seat_preference | - | 수동 입력 |
| additional_items | - | 수동 입력 |
| deposit_amount | - | 수동 입력 |
| total_amount | 항공운임 + 좌석 + 추가 - 기수금 | 자동 계산 |
| description | booking.remarks | 자동 (수정 가능) |

---

## 8. 의존성

```
INV-1 (DB) → INV-2 (API) → INV-3 (API 수정)
                  ↓
            INV-4 (버튼) → INV-5 (모달) → INV-6 (PDF)
                                              ↓
                                        INV-7 (정산 연결) → INV-8 (목록 표시)
```

---

## 9. 예상 작업량

| Phase | 태스크 | 예상 복잡도 |
|-------|--------|-----------|
| Phase 1 | DB + API 3건 | 낮음 |
| Phase 2 | UI 3건 | 중간 (모달 UI가 핵심) |
| Phase 3 | 연결 2건 | 낮음 |
| **합계** | **8건** | **중간** |

---

## 10. 다음 단계

```
1. 이 문서 검토/수정
2. /auto-orchestrate 로 자동 구현
3. 테스트 + PDF 출력 확인
```
