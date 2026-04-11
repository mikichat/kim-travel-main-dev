# 기술 설계서

## 아키텍처

```
┌──────────────────────┐     ┌──────────────────────┐
│ tourworld 포털       │     │ air-booking          │
│ (192.168.0.15:5001)  │     │ (localhost:5174)     │
│                      │     │                      │
│ flight-schedule.html │     │ React UI (Vite)      │
│ + flight-schedule-   │     │ + Bookings.tsx       │
│   app.js             │     │                      │
│                      │     │                      │
│ Express (JS)         │     │ Express (TS)         │
│ ├ /api/flight-       │     │ ├ /api/bookings      │
│ │  schedules         │     │ ├ /api/flight-       │
│ ├ /api/air-bookings  │     │ │  schedules         │
│ │  (신규 추가)       │     │ ├ /api/bookings/     │
│ └ /api/air-bookings/ │     │ │  check-pnr/:pnr    │
│    check-pnr/:pnr    │     │ │  (신규 추가)       │
│    (신규 추가)       │     │                      │
└──────────┬───────────┘     └──────────┬───────────┘
           │                            │
           └────────────┬───────────────┘
                        ▼
              travel_agency.db
              ├── flight_schedules (+pnr, +source)
              ├── air_bookings
              ├── air_booking_passengers
              └── air_booking_segments
```

## 변경 파일 목록

### tourworld (backend) 측
| 파일 | 변경 유형 | 내용 |
|------|----------|------|
| `backend/database.js` | 수정 | flight_schedules 마이그레이션 (pnr, source 컬럼) |
| `backend/routes/air-bookings.js` | 신규 | air_bookings 조회 API |
| `backend/routes/flight-schedules.js` | 수정 | PNR 중복 체크 API, PNR 필드 저장 |
| `backend/server.js` | 수정 | air-bookings 라우트 등록 |
| `flight-schedule.html` | 수정 | 예약장부 탭 UI 추가 |
| `js/flight-schedule-app.js` | 수정 | 예약장부 데이터 로드/렌더링 |

### air-booking 측
| 파일 | 변경 유형 | 내용 |
|------|----------|------|
| `server/src/services/bookings.service.ts` | 수정 | PNR 중복 체크 로직 추가 |
| `server/src/routes/bookings.ts` | 수정 | check-pnr API 추가 |

## DB 마이그레이션

```sql
-- backend/database.js initializeDatabase()에 추가
-- flight_schedules 테이블 확장 (기존 데이터 보존)

-- 1. pnr 컬럼 추가
ALTER TABLE flight_schedules ADD COLUMN pnr TEXT;

-- 2. source 컬럼 추가
ALTER TABLE flight_schedules ADD COLUMN source TEXT DEFAULT 'portal';

-- 3. PNR 인덱스
CREATE INDEX IF NOT EXISTS idx_fs_pnr ON flight_schedules(pnr);
```

**주의**: ALTER TABLE은 컬럼이 이미 존재하면 에러 발생.
`PRAGMA table_info(flight_schedules)`로 존재 여부 확인 후 실행.

## API 설계

### GET /api/air-bookings (tourworld backend)
```
Query params:
  - search: PNR 또는 이름 검색
  - status: pending|confirmed|cancelled
  - departure_from: 출발일 시작
  - departure_to: 출발일 끝
  - page: 페이지 번호 (default 1)
  - limit: 항목 수 (default 50)

Response: {
  bookings: [{
    id, pnr, name_kr, name_en, airline, flight_number,
    route_from, route_to, departure_date, return_date,
    nmtl_date, tl_date, status, pax_count, agency,
    passengers: [{ name_en, name_kr, title, gender }],
    segments: [{ airline, flight_number, route_from, route_to, departure_date, departure_time }]
  }],
  total: number,
  page: number,
  totalPages: number
}
```

### GET /api/air-bookings/check-pnr/:pnr (tourworld backend)
```
Response: {
  exists: boolean,
  booking: { pnr, name_kr, airline, flight_number, departure_date, status } | null
}
```

### GET /api/bookings/check-pnr/:pnr (air-booking backend)
```
Response: {
  existsInFlightSchedules: boolean,
  schedule: { group_name, airline, flight_number, departure_date } | null
}
```

## 보안 고려

- air_bookings의 passport_number는 AES-256-GCM 암호화 저장
- tourworld API에서 조회 시 마스킹 처리: `AB***89`
- 복호화 키는 air-booking 서버에만 존재
- tourworld는 암호화된 값을 복호화하지 않고 마스킹된 값만 제공
