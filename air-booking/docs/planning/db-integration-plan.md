# DB 통합 개선 기획서

> 작성일: 2026-04-02
> 상태: 기획 초안

---

## 1. 현재 상태 (AS-IS)

### 시스템 구성

```
┌─────────────────────────────┐
│ main (tourworld 포털)       │
│ 192.168.0.15:5001           │
│                             │
│ ├── 항공편 변환기 (air1/)   │  → StorageManager → flight_saves 테이블
│ ├── 항공편 관리             │  → FlightSyncManager → flight_saves + air_bookings
│ ├── 안내문 작성             │  → StorageManager
│ └── 인보이스/원가계산 등    │  → 각 테이블
│                             │
│ backend: Express + JS       │
│ DB: travel_agency.db        │
└─────────────────────────────┘

┌─────────────────────────────┐
│ tourworld1 / landing        │
│ (별도 서버)                 │
│ ├── 여행 상품 관리          │
│ └── 계약서/랜딩 페이지      │
└─────────────────────────────┘

┌─────────────────────────────┐
│ air-booking                 │
│ 192.168.0.15:5174           │
│                             │
│ ├── 예약장부 (PNR 등록)     │  → air_bookings 테이블
│ ├── 마감관리 (NMTL/TL)     │
│ ├── 정산/인보이스           │
│ └── 발권/요금증명서         │
│                             │
│ backend: Express + TS       │
│ DB: travel_agency.db (공유) │
└─────────────────────────────┘
```

### 테이블 현황 (travel_agency.db)

| 테이블 | 사용 시스템 | 용도 | 문제 |
|--------|-----------|------|------|
| `flight_saves` | main 변환기 | 변환된 항공편 저장 | 포털 전용, PNR 중심 아님 |
| `flight_schedules` | main 관리 | 항공 스케줄 | 포털 전용, air-booking과 중복 |
| `air_bookings` | air-booking | 예약장부 | air-booking 전용 |
| `air_booking_segments` | air-booking | 구간 정보 | air-booking 전용 |
| `air_booking_passengers` | air-booking | 탑승객 | air-booking 전용 |

### 데이터 흐름 (현재 — 파편화)

```
항공사 카운터 직원: PNR 받음
    │
    ├──→ air-booking에서 PNR 등록 → air_bookings 저장
    │    (마감일, 정산, 발권 관리)
    │
    └──→ main 변환기에서 PNR 입력 → flight_saves 저장
         (이미지 생성, 고객 전달용)

문제: 같은 PNR을 두 곳에 따로 입력해야 함
     → 데이터 불일치, 이중 작업
```

---

## 2. 오늘 발생한 문제들

| # | 문제 | 근본 원인 |
|---|------|----------|
| 1 | 윈도우에서 저장 → 맥에서 안 보임 | StorageManager가 localStorage 사용 |
| 2 | 항공편 관리에서 air_bookings 안 보임 | 별도 테이블, API 없음 |
| 3 | 다중 PNR 중복 구간 표시 | PNR별 분리 로직 없음 |
| 4 | 모바일 랜딩 페이지 깨짐 | CDN 경로, Tailwind 경로 오류 |
| 5 | 이미지 복사 안 됨 | HTTP 내부망에서 Clipboard API 차단 |
| 6 | 페이지 로딩 느림 | 외부 CDN 내부망 타임아웃 |
| 7 | 삭제 시 데이터 전부 사라짐 | air-booking 데이터 보호 없음 |

**공통 원인: 같은 데이터가 여러 테이블/저장소에 분산 → 동기화 실패**

---

## 3. 개선 방향 (TO-BE)

### 핵심 원칙: 원데이터 하나 → 두 가지 뷰

```
🎯 원데이터 하나 → 뷰 두 개

DB에는 PNR 원본 데이터 1개만 저장.
이 하나의 데이터를 두 가지 화면으로 보여줍니다:

1️⃣  고객용 뷰 (항공편 변환기)
   • 대상: 일반 고객 (항공 업무를 모름)
   • 표시: 도시명(인천), 읽기 쉬운 날짜, 이미지/랜딩카드
   • 목적: 카톡/메일로 고객에게 전달

2️⃣  예약장부용 뷰 (air-booking)
   • 대상: 여행사 직원, 대리점 관계자
   • 표시: 공항코드(ICN), 마감일(NMTL/TL), 정산, 발권
   • 목적: 내부 예약관리

📌 데이터는 하나, 보여주는 방식만 다르다.
   같은 PNR을 두 곳에 따로 입력하는 것은 절대 금지.
```

### PNR 중복 방지 규칙 (필수)

```
어디서 저장하든 같은 PNR이면 1건만 존재

저장 흐름:
  변환기에서 PNR 저장 → DB에 같은 PNR 있나?
    → 없으면: INSERT (신규)
    → 있으면: UPDATE (기존 데이터 병합/갱신)

  예약장부에서 PNR 등록 → DB에 같은 PNR 있나?
    → 없으면: INSERT (신규)
    → 있으면: UPDATE (기존 데이터 병합/갱신)

예시:
  1. 변환기에서 FWJGD2 저장 → DB에 1건 생성
  2. 예약장부에서 FWJGD2 등록 → 같은 PNR → 기존 1건 업데이트 (2건 안 됨)
  3. 변환기에서 다시 불러오기 → 업데이트된 1건 표시

DB 제약:
  - PNR 컬럼에 UNIQUE 제약 또는 저장 시 중복 체크
  - 병합 시 기존 데이터(마감일, 정산 등)는 보존
  - 새 데이터(항공편, 탑승객)는 갱신
```

### 목표 아키텍처

```
┌──────────────────────────────────────────────────┐
│                travel_agency.db                  │
│                                                  │
│  bookings (통합 예약 테이블 — 단일 진실 원천)     │
│  ├── id, pnr (UNIQUE), airline, flight_number    │
│  ├── segments[] (구간), passengers[] (탑승객)    │
│  ├── nmtl_date, tl_date, departure_date          │
│  ├── status, fare, agency, group_id              │
│  ├── source ('air-booking' | 'portal')           │
│  └── customer_info (이름, 전화, 인원)             │
│                                                  │
│  /api/bookings (통합 API)                        │
│  ├── GET    /api/bookings          — 목록 조회   │
│  ├── GET    /api/bookings/:pnr     — PNR 조회    │
│  ├── POST   /api/bookings          — 등록        │
│  ├── PATCH  /api/bookings/:id      — 수정        │
│  └── DELETE /api/bookings/:id      — 삭제        │
└──────────────────────────────────────────────────┘
         │                    │                │
         ▼                    ▼                ▼
┌─────────────┐    ┌───────────────┐    ┌──────────┐
│ main 변환기  │    │ main 관리     │    │air-booking│
│             │    │              │    │          │
│ PNR 입력    │    │ 스케줄 보기   │    │ PNR 등록 │
│ → 불러오기  │    │ 고객 전달     │    │ 마감관리 │
│ → 이미지    │    │              │    │ 정산     │
│ → 랜딩카드  │    │              │    │ 발권     │
└─────────────┘    └───────────────┘    └──────────┘

모두 같은 /api/bookings 사용 → 데이터 항상 동일
```

### 변경 포인트

| 현재 | 통합 후 |
|------|--------|
| flight_saves + air_bookings + flight_schedules | bookings (1개) |
| StorageManager (localStorage) | API 호출 |
| FlightSyncManager (혼합) | API 호출 |
| 각 시스템 별도 API | /api/bookings 통합 |

---

## 4. 단계별 실행 계획

### Phase 1: 통합 API 구축 (backend)
- [ ] /api/bookings 통합 라우트 생성
- [ ] air_bookings 테이블을 기준으로 통합 스키마
- [ ] flight_saves → air_bookings 마이그레이션 스크립트
- [ ] flight_schedules → air_bookings 연결 (view 또는 trigger)

### Phase 2: main 변환기 연동
- [ ] StorageManager → /api/bookings API 전환
- [ ] "저장된 항공편" = /api/bookings에서 조회
- [ ] "불러오기" = PNR로 /api/bookings 조회 → 변환기에 자동 채움
- [ ] "저장" = /api/bookings에 POST (flight_saves 대신)

### Phase 3: air-booking 연동
- [ ] 기존 air_bookings API 유지 (하위 호환)
- [ ] PNR 등록 시 통합 bookings에도 반영
- [ ] 포털에서 등록한 예약도 air-booking에서 조회 가능

### Phase 4: 랜딩/이미지 개선
- [ ] reservation.html 경로 안정화
- [ ] 이미지 복사 HTTP 폴백 강화
- [ ] 내부망 전용 CDN 로컬화 완료

### Phase 5: 검증 & 정리
- [ ] 윈도우 ↔ 맥 데이터 공유 검증
- [ ] 기존 테이블 정리 (flight_saves → deprecated)
- [ ] 통합 테스트 스크립트

---

## 5. 실행 파이프라인 제안

```
/socrates (기획 확정)
    → 요구사항 21개 질문으로 정밀화
    → 화면별 데이터 흐름 확정
    ↓
/screen-spec (화면 명세)
    → 변환기, 관리, 예약장부 각 화면의 API 계약
    ↓
/tasks-generator (태스크 분해)
    → Phase별 구체적 태스크 목록
    ↓
/auto-orchestrate (자동 실행)
    → 전문가 에이전트가 태스크 순차 실행
    → 각 태스크 완료 후 검증
    ↓
/powerqa (QA 자동 사이클)
    → 테스트 → 수정 → 재테스트 반복
    → 오류 0개 확인 후 완료
```

### 오류 최소화 방법

| 방법 | 설명 |
|------|------|
| `/verification-before-completion` | 완료 주장 전 반드시 검증 |
| `/systematic-debugging` | 버그 발생 시 4단계 근본 원인 분석 |
| `/powerqa` | 자동 QA 사이클 (최대 5회 반복) |
| curl 테스트 스크립트 | API 변경마다 자동 검증 |
| 콘솔 에러 0개 정책 | 배포 전 F12 에러 확인 필수 |

---

## 6. 예상 일정

| Phase | 작업량 | 비고 |
|-------|-------|------|
| Phase 1 | 반나절 | API + 마이그레이션 |
| Phase 2 | 반나절 | 변환기 전환 |
| Phase 3 | 2시간 | air-booking 연동 |
| Phase 4 | 2시간 | 랜딩/이미지 |
| Phase 5 | 1시간 | 검증 |

---

## 7. 시스템 본질 (가장 중요)

### 두 시스템의 역할 차이

```
예약장부 (air-booking)
  → 대상: 여행사 직원, 대리점 관계자
  → 목적: 예약관리/정산/발권을 편하게 하려고 만든 시스템
  → 특징: PNR 기반, 마감관리, 내부 업무용

항공편 변환기 (air1)
  → 대상: 일반 고객
  → 목적: 항공 업무를 모르는 고객에게 쉽게 전달하려고 만든 시스템
  → 특징: PNR 텍스트 → 읽기 쉬운 이미지/랜딩카드 변환
```

**지금까지 만든 것은 여러 번 시행착오로 만든 내용이라 엄청 중요함. 기존 기능을 깨뜨리면 안 됨.**

### PNR 메모/원본 보존 (신규 요구사항)

```
현재 문제:
  - 변환기에서 저장 후 "불러오기" 하면 원본 PNR 텍스트가 없음
  - PNR 수정이 필요할 때 원본을 다시 입력해야 함
  - 예약장부에서도 PNR 원본을 보관하지 않음

해결 방향:
  - PNR을 변환기/예약장부에 넣으면 "메모 칸"에 원본 PNR 텍스트 보존
  - 불러오기 시 메모에서 원본 PNR을 꺼내 재변환 가능
  - 수정 시 원본 PNR을 편집 → 재변환 → 저장 플로우
```

### 도착일/공항코드 문제 (2026-04-02 발견)

| 문제 | 원인 | 해결 방향 |
|------|------|----------|
| 도착일 미표시 | air_booking_segments.arrival_date 전부 NULL | PNR 파서에서 도착일 추출 → DB 저장 |
| 공항코드 3코드로 표시 | 예약장부는 ICN/VIE 등 코드로 저장 | 변환기 불러오기 시 getAirportName()으로 도시명 변환 |
| 익일 도착 계산 불가 | 도착일 데이터 자체가 없음 | PNR 텍스트에서 도착일 파싱 (두 번째 날짜) |

### 저장된 항공편 불러오기 개선

```
현재:
  저장된 항공편 → 불러오기 → 변환 결과만 표시 (PNR 원본 없음)
  → 수정하려면 PNR을 처음부터 다시 입력

개선 후:
  저장된 항공편 → 불러오기 → PNR 원본이 입력창에 자동 채워짐
  → 수정 후 "자동 변환하기" → 재변환 → 저장
```

---

## 8. localStorage 완전 제거 (최우선 원칙)

> **절대 원칙: main, tourworld1-landing, air-booking 모든 시스템에서 브라우저(localStorage)에 데이터 저장 금지. 반드시 서버 DB(travel_agency.db)에 저장하여 공용으로 사용.**

### 왜 중요한가

```
현재 문제:
  - 내역서를 A 브라우저에서 저장 → B 브라우저에서 안 보임
  - 직원 간 데이터 공유 불가 (같은 PC, 다른 브라우저도 안 됨)
  - 테스트를 저장한 그 브라우저에서만 해야 함
  - 브라우저 캐시 삭제하면 데이터 날아감
  - 윈도우 ↔ 맥 데이터 불일치

원칙:
  어떤 PC, 어떤 브라우저에서든 로그인하면 동일한 데이터가 보여야 함
```

### localStorage 사용 현황 (2026-04-02 기준)

| 시스템 | 데이터 | 현재 저장소 | 서버 DB 전환 상태 |
|--------|--------|-----------|-----------------|
| main 변환기 | 항공편 (flight_saves_v2) | ~~localStorage~~ → 서버 DB | ✅ 전환 완료 |
| main 변환기 | 버스예약 (bus_reservations) | localStorage | ❌ 미전환 |
| main 변환기 | 안내문 (saved_notices) | localStorage | ❌ 미전환 |
| main 변환기 | 견적서 (quote_data) | localStorage | ❌ 미전환 |
| main 변환기 | 단체명단 (group-roster-data) | localStorage | ❌ 미전환 |
| main 변환기 | 공항코드 모드 설정 | localStorage | (설정이라 유지 가능) |
| air-booking | 세션/인증 | 서버 세션 | ✅ |
| air-booking | 견적서/내역서 | 서버 DB (air_estimates) | ✅ |

### DB 전환 필요 목록 (4개)

```
1. bus_reservations → bus_reservations 테이블 (backend)
   - API: /api/bus-reservations (CRUD)
   - 이미 backend에 bus_reservations 테이블 존재

2. saved_notices → saved_notices 테이블 (backend)
   - API: /api/saved-notices (CRUD)
   - 이미 backend에 saved_notices 테이블 존재

3. quote_data → 별도 테이블 또는 air_estimates 확장
   - API: /api/quotes (CRUD)

4. group-roster-data → group_rosters 테이블 (backend)
   - API: /api/group-rosters (CRUD)
   - 이미 backend에 group_rosters 테이블 존재
```

### 전환 방식 (항공편과 동일 패턴)

```
StorageManager의 각 메서드:
  저장: localStorage.setItem() → fetch('/api/xxx', { method: 'POST' })
  조회: localStorage.getItem() → fetch('/api/xxx')
  삭제: localStorage.removeItem() → fetch('/api/xxx/:id', { method: 'DELETE' })
  폴백: 서버 실패 시 localStorage 읽기 (읽기만)
  마이그레이션: 첫 접속 시 localStorage → 서버 DB 자동 업로드
```

---

## 9. 리스크

| 리스크 | 대응 |
|--------|------|
| 마이그레이션 중 데이터 유실 | 작업 전 DB 백업 필수 |
| 기존 기능 깨짐 | 하위 호환 API 유지 기간 |
| SQLite 동시 접근 | WAL 모드 유지 + 쓰기 직렬화 |
