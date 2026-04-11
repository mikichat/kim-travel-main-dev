# 06-screens.md — 화면 목록 및 라우트

**프로젝트명**: DB 통합 및 서버 일원화
**버전**: 1.0
**작성일**: 2026-04-01

---

## 개요

**핵심 설계 원칙: 원데이터 하나 → 두 가지 뷰**

```
같은 flight_bookings 데이터를 두 가지 라우트로 표시:

/booking/* → 예약장부용 뷰
  • 공항코드(ICN), 마감일(NMTL/TL), 정산, 발권
  • 여행사 직원 / 대리점 관계자 대상

/converter/* → 고객용 뷰
  • 도시명(인천), 읽기 쉬운 형식, 이미지/랜딩카드
  • 일반 고객 대상

📌 동일한 데이터 소스, 다른 UI 표현 방식
```

**구성**:
- **Route**: 서버 라우트 경로
- **Component**: React/HTML 컴포넌트
- **Type**: 'react' 또는 'html'
- **Status**: 'existing' (기존) 또는 'new' (새로 만들기)

---

## 라우트 맵

### Root 라우트

| Route | 화면명 | Component | Type | Status | 설명 |
|-------|--------|-----------|------|--------|------|
| `/` | 홈 | Home.tsx | react | new | 통합 서버 홈 화면 |
| `/health` | 헬스 체크 | - | api | new | 서버 상태 확인 |

---

### 에어북킹 (air-booking) 라우트

| Route | 화면명 | Component | Type | Status | 설명 |
|-------|--------|-----------|------|--------|------|
| `/booking` | 예약관리 홈 | BookingHome.tsx | react | existing | 기존 air-booking 홈 |
| `/booking/list` | 예약장부 | BookingList.tsx | react | update | 기존 + DB 연동 |
| `/booking/form` | 예약 입력 폼 | BookingForm.tsx | react | new | 새 예약/수정 |
| `/booking/:id` | 예약 상세 | BookingDetail.tsx | react | new | 예약 상세 정보 |
| `/booking/invoice/:id` | 인보이스 | BookingInvoice.tsx | react | existing | 기존 기능 유지 |
| `/booking/certificate/:id` | 요금증명서 | BookingCertificate.tsx | react | existing | 기존 기능 유지 |
| `/booking/quotation/:id` | 견적서 | BookingQuotation.tsx | react | existing | 기존 기능 유지 |

---

### 변환기 라우트

| Route | 화면명 | Component | Type | Status | 설명 |
|-------|--------|-----------|------|--------|------|
| `/converter` | 변환기 홈 | Converter.html | html | update | 기존 + DB 연동 |
| `/converter/parse` | PNR 파싱 | (Converter.html 내) | html | update | 텍스트 변환 + API |
| `/converter/saved` | 저장된 항공편 | (Converter.html 내) | html | update | 통합 목록 표시 |
| `/converter/image/:id` | 이미지 미리보기 | (Modal) | html | new | 이미지 생성 & 다운로드 |

---

### 항공편 관리 라우트

| Route | 화면명 | Component | Type | Status | 설명 |
|-------|--------|-----------|------|--------|------|
| `/schedule` | 항공편 관리 홈 | ScheduleList.tsx | react | new | 항공편 목록 |
| `/schedule/form` | 항공편 입력 | ScheduleForm.tsx | react | new | 항공편 추가/수정 |
| `/schedule/:id` | 항공편 상세 | ScheduleDetail.tsx | react | new | 항공편 정보 & 예약 |

---

### 대시보드 & 관리 라우트

| Route | 화면명 | Component | Type | Status | 설명 |
|-------|--------|-----------|------|--------|------|
| `/dashboard` | 대시보드 | Dashboard.tsx | react | new | 마감 알림, 통계 |
| `/calendar` | 달력 | Calendar.tsx | react | existing | 마감 일정 |
| `/settings` | 설정 | Settings.tsx | react | existing | 시스템 설정 |

---

### API 라우트

| Route | Method | 담당 | 설명 |
|-------|--------|------|------|
| `/api/bookings` | GET | bookings.ts | 예약 목록 |
| `/api/bookings` | POST | bookings.ts | 예약 생성 |
| `/api/bookings/:id` | GET | bookings.ts | 예약 상세 |
| `/api/bookings/:id` | PUT | bookings.ts | 예약 수정 |
| `/api/bookings/:id` | DELETE | bookings.ts | 예약 삭제 |
| `/api/schedules` | GET | schedules.ts | 항공편 목록 |
| `/api/schedules` | POST | schedules.ts | 항공편 추가 |
| `/api/schedules/:id` | GET | schedules.ts | 항공편 상세 |
| `/api/schedules/:id` | PUT | schedules.ts | 항공편 수정 |
| `/api/schedules/:id` | DELETE | schedules.ts | 항공편 삭제 |
| `/api/schedules/search` | GET | schedules.ts | 항공편 검색 |
| `/api/converter/parse` | POST | converter.ts | PNR 파싱 |
| `/api/converter/save` | POST | converter.ts | 변환기 저장 |
| `/api/images/generate` | POST | images.ts | 이미지 생성 |

---

## 화면별 상세 정보

### S01: 홈 화면 (/)

**컴포넌트**: `client/src/pages/Home.tsx`

**파일 구조**:
```
Home.tsx
├── Navigation (상단 네비게이션)
├── QuickStats (통계 위젯)
├── RecentBookings (최근 예약)
├── UpcomingDeadlines (마감 임박)
└── QuickActions (빠른 액션 버튼)
```

**기능**:
- 최근 3개 예약 표시
- 마감 임박 알림 (NMTL/TL 7일 이내)
- 빠른 액션 (새 예약, 변환기, 항공편 관리)

**상태 관리**:
- Redux: `bookings`, `deadlines`
- 폴링: 5초마다 갱신

---

### S02: 예약장부 (/booking/list)

**컴포넌트**: `client/src/pages/BookingList.tsx`

**파일 구조**:
```
BookingList.tsx
├── SearchBar (검색 & 필터)
├── BookingTable (예약 테이블)
│   └── BookingRow (각 행)
│       └── BookingDetail (상세 정보)
├── BookingForm (입력/수정 모달)
└── Pagination (페이지네이션)
```

**기능**:
- 예약 목록 표시 (GET /api/bookings)
- 필터: 항공편, 상태, 날짜
- 검색: PNR, 탑승객명
- 정렬: 출발 날짜, 마감 상태
- CRUD 작업

**Props**:
```typescript
interface BookingListProps {
  filters?: BookingFilters;
  onRefresh?: () => void;
  autoPolling?: boolean;  // 기본값: true
}
```

**상태 관리**:
- Redux: `bookings`, `filters`, `pagination`
- Local: `selectedRow`, `isFormOpen`

---

### S02-1: 예약 입력 폼 (/booking/form)

**컴포넌트**: `client/src/components/BookingForm.tsx`

**파일 구조**:
```
BookingForm.tsx
├── PNRSection (PNR 입력)
├── FlightSection (항공편 선택)
│   └── AirportCityConverter (공항코드 → 도시명 변환)
├── PassengersSection (탑승객 입력)
│   └── PassengerRow (각 탑승객)
├── DeadlineSection (마감 입력)
├── PNRMemoSection (메모 필드 - 원본 PNR 보존)
└── StatusSection (상태 & 비고)
```

**기능**:
- PNR 6자 입력 & 검증
- 항공편 자동완성 (GET /api/schedules/search)
- 탑승객 다중 입력
- 마감 날짜 선택
- **PNR 메모** — 원본 PNR 텍스트 자동 저장/불러오기
- 도착일 표시 (PNR 파싱에서 추출)
- **공항코드 변환** — ICN → 인천 (UI 표시)
- 상태 선택 (saved/booked/ticketed/cancelled)

**공항코드 변환 매핑**:
```typescript
const AIRPORT_CITY_MAP = {
  'ICN': '인천',
  'NRT': '나리타',
  'HND': '하네다',
  'LAX': '로스앤젤레스',
  'JFK': '뉴욕',
  'LHR': '런던',
  'CDG': '파리',
  'NNG': '난징',
  'PVG': '상하이',
  'PEK': '베이징',
  'DFW': '댈러스-포트워스',
  'SFO': '샌프란시스코',
  // ... 추가
};
```

**도착일 표시 규칙**:
- arrival_date가 NULL이면 표시 안 함
- arrival_date = departure_date + 1 (익일 도착) → **빨간색 강조**
- arrival_date > departure_date + 1 (2일 이상) → 검은색

**Validation**:
- 실시간 유효성 검사
- 오류 메시지 표시

**Props**:
```typescript
interface BookingFormProps {
  bookingId?: number;  // 수정 시
  onSave: (data: Booking) => Promise<void>;
  onCancel: () => void;
}
```

---

### S03: 변환기 (/converter)

**컴포넌트**: `client/public/converter.html`

**파일 구조**:
```
converter.html
├── Navigation (상단 네비게이션)
├── Tabs
│   ├── PNR 변환 탭
│   │   ├── TextArea (PNR 입력)
│   │   ├── Convert 버튼
│   │   ├── ParseResult (파싱 결과)
│   │   └── Save 버튼
│   └── 저장된 항공편 탭
│       ├── SearchBox
│       └── SavedFlightsList (통합 목록)
└── ImageModal (이미지 생성 & 다운로드)
```

**JavaScript 파일**: `client/public/js/converter.js`

**기능**:
- PNR 텍스트 입력
- 텍스트 파싱 (POST /api/converter/parse)
- 파싱 결과 표시
- DB 저장 (POST /api/converter/save)
- 저장된 항공편 목록 (GET /api/bookings)
- 이미지 생성 (POST /api/images/generate)

**API 호출**:
```javascript
// converter.js

// 1. PNR 파싱 (arrival_date, original_pnr_text 포함)
async function parseFlightText(text) {
  const res = await fetch('/api/converter/parse', {
    method: 'POST',
    body: JSON.stringify({ text })
  });
  const result = await res.json();

  // 메모에 원본 PNR 텍스트 저장
  result.data.remarks = result.data.original_pnr_text;

  return result;
}

// 2. 저장된 항공편 목록 (remarks에서 원본 추출 가능)
async function getSavedFlights() {
  const res = await fetch('/api/bookings');
  return await res.json();
}

// 3. 메모에서 원본 추출 (재변환용)
function extractOriginalPnrFromRemarks(remarks) {
  // remarks에 저장된 원본 PNR 반환
  return remarks || '';
}

// 4. 이미지 생성
async function generateImage(bookingId) {
  const res = await fetch('/api/images/generate', {
    method: 'POST',
    body: JSON.stringify({ booking_id: bookingId })
  });
  return await res.json();
}
```

---

### S04: 항공편 관리 (/schedule)

**컴포넌트**: `client/src/pages/ScheduleList.tsx`

**파일 구조**:
```
ScheduleList.tsx
├── SearchBar (검색 & 필터)
├── ScheduleTable (항공편 테이블)
│   └── ScheduleRow (각 행)
├── ScheduleForm (입력/수정 모달)
└── Pagination (페이지네이션)
```

**기능**:
- 항공편 목록 (GET /api/schedules)
- 필터: 항공사, 출발지, 날짜
- 검색: 편명, 항공사
- CRUD 작업
- 항공편별 예약 통계

**Props**:
```typescript
interface ScheduleListProps {
  filters?: ScheduleFilters;
  onRefresh?: () => void;
}
```

---

### S05: 이미지/랜딩카드 생성

**컴포넌트**: `client/src/components/ImageModal.tsx`

**파일 구조**:
```
ImageModal.tsx
├── Preview (이미지 미리보기)
├── FormatSelector (포맷 선택)
├── SizeSelector (크기 선택)
└── ActionButtons (다운로드, 클립보드 복사)
```

**기능**:
- 이미지/랜딩카드 생성 (POST /api/images/generate)
- 포맷 선택: image, landing, pdf
- 크기: normal, large
- 다운로드
- 클립보드 복사 (HTTPS 환경)

**Props**:
```typescript
interface ImageModalProps {
  bookingId: number;
  onClose: () => void;
}
```

---

## 네비게이션 구조

### 상단 네비게이션

```
[ Logo ] [ 예약관리 ] [ 변환기 ] [ 항공편관리 ] [ 대시보드 ] [ 설정 ]
                                                         [ 사용자 정보 ]
```

### 사이드바 (모바일)

```
☰ (메뉴 버튼)
├─ 홈
├─ 예약관리
│  ├─ 예약장부
│  ├─ 인보이스
│  ├─ 요금증명서
│  └─ 견적서
├─ 변환기
├─ 항공편관리
├─ 대시보드
└─ 설정
```

---

## 기존 화면 마이그레이션

### air-booking 기존 화면 → 새 라우트

| 기존 (air-booking) | 새 라우트 | 변경 사항 |
|-------------------|---------|---------|
| `air-booking.html` | `/booking` | 헤더 통합, 네비게이션 추가 |
| `flight-schedule.html` | `/schedule` | React로 전환 |
| `air-booking-detail.html` | `/booking/:id` | React로 전환 |

### 변환기 기존 화면 → 새 라우트

| 기존 (변환기) | 새 라우트 | 변경 사항 |
|-------------|---------|---------|
| `converter.html` | `/converter` | DB API 연동, localStorage 제거 |
| 임베드 이미지 | `/converter/image/:id` | 모달로 통합 |

---

## 라우트 가드 & 보안

### 인증 (현재 미적용, 향후 추가)

```typescript
// client/src/middleware/auth.ts

export const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
};
```

### CORS & 보안 헤더

```typescript
// server/src/middleware/cors.ts

app.use(cors({
  origin: ['http://localhost:5001', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
```

---

## 페이지 로딩 및 에러 처리

### 로딩 상태

```typescript
// 모든 데이터 페칭 시
<Suspense fallback={<LoadingSpinner />}>
  <BookingList />
</Suspense>
```

### 에러 처리

```typescript
<ErrorBoundary fallback={<ErrorPage />}>
  <BookingList />
</ErrorBoundary>
```

---

## 접근성 링크

| 라우트 | 액세스 | 설명 |
|--------|--------|------|
| `/` | public | 홈 화면 |
| `/booking/*` | 로그인 필수 (향후) | air-booking 영역 |
| `/converter` | public | 변환기 (현재) |
| `/schedule` | 로그인 필수 (향후) | 항공편 관리 |

---

## 데이터 플로우

### 예약 생성 플로우

```
BookingForm
  ↓ (입력)
  ↓
  POST /api/bookings
  ↓
  BookingList (폴링)
  ↓
  변환기 저장된 항공편 (폴링)
```

### 변환기 저장 플로우

```
Converter (PNR 입력)
  ↓
  POST /api/converter/parse (파싱)
  ↓
  POST /api/converter/save (DB 저장)
  ↓
  BookingList (폴링 갱신)
```

---

## 파일 구조 (프론트엔드)

```
client/
├── public/
│   ├── index.html             -- 메인 HTML
│   ├── converter.html         -- 변환기 (레거시)
│   ├── js/
│   │   ├── converter.js       -- 변환기 스크립트
│   │   └── utils.js           -- 유틸리티
│   └── css/
│       └── styles.css         -- 기본 스타일
├── src/
│   ├── main.tsx               -- React 진입점
│   ├── App.tsx                -- 라우트 설정
│   ├── pages/
│   │   ├── Home.tsx           -- 홈
│   │   ├── BookingList.tsx    -- 예약장부
│   │   ├── ScheduleList.tsx   -- 항공편 관리
│   │   └── Dashboard.tsx      -- 대시보드
│   ├── components/
│   │   ├── BookingForm.tsx    -- 예약 폼
│   │   ├── ScheduleForm.tsx   -- 항공편 폼
│   │   └── ImageModal.tsx     -- 이미지 모달
│   ├── hooks/
│   │   ├── useBookingSync.ts  -- 폴링 훅
│   │   └── useApi.ts          -- API 훅
│   ├── services/
│   │   ├── api.ts             -- API 호출
│   │   ├── booking.ts         -- 예약 로직
│   │   └── converter.ts       -- 변환기 로직
│   ├── redux/
│   │   ├── bookingSlice.ts    -- 예약 상태
│   │   └── store.ts           -- Redux 스토어
│   └── types/
│       └── index.ts           -- TypeScript 타입
└── vite.config.ts
```

---

## 참고 자료

- [01-prd.md](./01-prd.md) — 제품 요구사항
- [04-screen-design.md](./04-screen-design.md) — 화면 설계
- [05-tech-spec.md](./05-tech-spec.md) — 기술 명세
