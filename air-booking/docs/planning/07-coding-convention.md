# 07-coding-convention.md — 코딩 컨벤션

**프로젝트명**: DB 통합 및 서버 일원화
**버전**: 1.0
**작성일**: 2026-04-01

---

## 개요

**1번 규칙: 원데이터 하나 → 두 가지 뷰**

```
🔴 금지: 같은 PNR을 여러 테이블에 저장
  ❌ flight_saves (변환기)
  ❌ air_bookings (예약장부)
  ❌ flight_schedules (항공편 관리)

🟢 필수: 단일 PNR 저장소
  ✅ flight_bookings (통합 테이블)
  ✅ UNIQUE constraint on pnr column
  ✅ 모든 화면이 같은 API 사용

규칙:
  • 입력은 어디서든 가능 (변환기, 예약장부)
  • 저장은 flight_bookings에만 (중복 체크 자동)
  • 조회는 양쪽 화면에서 동일 데이터 반환
```

이 문서는 DB 통합 프로젝트의 코딩 규칙 및 베스트 프랙티스를 정의합니다.

**적용 범위**:
- TypeScript (서버 & 클라이언트)
- JavaScript (변환기)
- HTML/CSS
- SQL

---

## 1. 파일 및 폴더 구조

### 1.1 서버 구조 (Express + TypeScript)

```
server/
├── src/
│   ├── index.ts                           -- 진입점
│   ├── config/
│   │   └── database.ts                    -- DB 설정
│   ├── middlewares/
│   │   ├── errorHandler.ts                -- 에러 처리
│   │   ├── logger.ts                      -- 로깅
│   │   ├── cors.ts                        -- CORS 설정
│   │   └── validation.ts                  -- 유효성 검사
│   ├── routes/
│   │   ├── index.ts                       -- 라우트 통합
│   │   ├── bookings.ts                    -- /api/bookings
│   │   ├── schedules.ts                   -- /api/schedules
│   │   ├── converter.ts                   -- /api/converter
│   │   └── images.ts                      -- /api/images
│   ├── controllers/
│   │   ├── bookings.controller.ts         -- 예약 로직
│   │   ├── schedules.controller.ts        -- 항공편 로직
│   │   └── converter.controller.ts        -- 변환기 로직
│   ├── services/
│   │   ├── booking.service.ts             -- 예약 비즈니스 로직
│   │   ├── schedule.service.ts            -- 항공편 비즈니스 로직
│   │   └── converter.service.ts           -- 변환기 비즈니스 로직
│   ├── models/
│   │   ├── booking.ts                     -- 예약 타입
│   │   ├── schedule.ts                    -- 항공편 타입
│   │   └── common.ts                      -- 공통 타입
│   ├── utils/
│   │   ├── validators.ts                  -- 유효성 검사 함수
│   │   ├── parsers.ts                     -- 파싱 함수 (PNR 등)
│   │   ├── formatters.ts                  -- 포맷팅 함수
│   │   └── constants.ts                   -- 상수
│   ├── database/
│   │   ├── migrations/
│   │   │   └── migrate-db.ts              -- 마이그레이션 스크립트
│   │   └── queries.ts                     -- SQL 쿼리 헬퍼
│   └── types/
│       └── index.ts                       -- 전역 타입
├── tests/
│   ├── unit/
│   │   ├── booking.test.ts
│   │   └── schedule.test.ts
│   └── integration/
│       └── api.test.ts
├── package.json
├── tsconfig.json
└── .env.example
```

### 1.2 클라이언트 구조 (React + TypeScript)

```
client/
├── src/
│   ├── main.tsx                           -- React 진입점
│   ├── App.tsx                            -- 라우트 설정
│   ├── pages/
│   │   ├── Home.tsx                       -- 홈 페이지
│   │   ├── BookingList.tsx                -- 예약장부
│   │   ├── BookingDetail.tsx              -- 예약 상세
│   │   ├── ScheduleList.tsx               -- 항공편 관리
│   │   └── Dashboard.tsx                  -- 대시보드
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.tsx                 -- 헤더
│   │   │   ├── Navigation.tsx             -- 네비게이션
│   │   │   ├── LoadingSpinner.tsx         -- 로딩
│   │   │   └── ErrorBoundary.tsx          -- 에러 처리
│   │   ├── booking/
│   │   │   ├── BookingForm.tsx            -- 예약 폼
│   │   │   ├── BookingTable.tsx           -- 예약 테이블
│   │   │   └── BookingRow.tsx             -- 테이블 행
│   │   ├── schedule/
│   │   │   ├── ScheduleForm.tsx           -- 항공편 폼
│   │   │   └── ScheduleTable.tsx          -- 항공편 테이블
│   │   └── modals/
│   │       └── ImageModal.tsx             -- 이미지 모달
│   ├── hooks/
│   │   ├── useBookingSync.ts              -- 예약 동기화
│   │   ├── useApi.ts                      -- API 호출
│   │   └── useLocalStorage.ts             -- 로컬 스토리지
│   ├── services/
│   │   ├── api.ts                         -- API 호출 함수
│   │   ├── booking.ts                     -- 예약 로직
│   │   └── converter.ts                   -- 변환기 로직
│   ├── redux/
│   │   ├── slices/
│   │   │   ├── bookingSlice.ts
│   │   │   └── scheduleSlice.ts
│   │   ├── store.ts                       -- Redux 스토어
│   │   └── hooks.ts                       -- Redux 훅
│   ├── types/
│   │   ├── booking.ts                     -- 예약 타입
│   │   ├── schedule.ts                    -- 항공편 타입
│   │   └── common.ts                      -- 공통 타입
│   ├── styles/
│   │   ├── globals.css                    -- 글로벌 스타일
│   │   ├── variables.css                  -- CSS 변수
│   │   └── components/
│   │       └── booking.css                -- 컴포넌트 스타일
│   └── utils/
│       ├── validators.ts                  -- 유효성 검사
│       ├── formatters.ts                  -- 포맷팅
│       └── constants.ts                   -- 상수
├── public/
│   ├── index.html
│   ├── converter.html                     -- 변환기 (레거시)
│   └── js/
│       └── converter.js                   -- 변환기 스크립트
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 2. 명명 규칙 (Naming Convention)

### 2.1 파일명

```typescript
// ✓ 컴포넌트: PascalCase
BookingList.tsx
BookingForm.tsx
ImageModal.tsx

// ✓ 훅: useXxx 형식
useBookingSync.ts
useApi.ts

// ✓ 서비스/유틸: camelCase
bookingService.ts
validators.ts
parsers.ts

// ✓ 상수: UPPER_SNAKE_CASE
constants.ts  (내부에 export const PNR_LENGTH = 6)
```

### 2.2 변수명

```typescript
// ✓ 일반 변수: camelCase
const bookingId = 1;
const isLoading = false;
const userName = 'Kim';

// ✓ 상수: UPPER_SNAKE_CASE
const PNR_LENGTH = 6;
const MAX_PASSENGERS = 10;
const API_BASE_URL = 'http://localhost:5001';

// ✓ Boolean: is/has 접두사
const isValid = true;
const hasError = false;
const isLoading = true;
```

### 2.3 함수명

```typescript
// ✓ 액션: 동사 + 명사
function createBooking(data: BookingData): Promise<Booking> {}
function updateBooking(id: number, data: Partial<Booking>): Promise<void> {}
function deleteBooking(id: number): Promise<void> {}
function fetchBookings(filters?: BookingFilters): Promise<Booking[]> {}

// ✓ Boolean 반환: is/has 접두사
function isValidPnr(pnr: string): boolean {}
function hasExpired(date: string): boolean {}

// ✓ 포맷팅/변환: format/parse/convert
function formatDate(date: string): string {}
function parsePnrText(text: string): ParsedPnr {}
function convertToJSON(data: any): string {}
```

### 2.4 클래스/인터페이스명

```typescript
// ✓ 클래스: PascalCase
class BookingService {}
class ScheduleController {}
class DatabaseError extends Error {}

// ✓ 인터페이스: I + PascalCase (또는 PascalCase만)
interface IBooking { ... }
interface Booking { ... }

// ✓ Type: PascalCase
type BookingStatus = 'saved' | 'booked' | 'ticketed' | 'cancelled';
type BookingFilters = { airline?: string; status?: BookingStatus };

// ✓ Enum: PascalCase
enum BookingStatus {
  SAVED = 'saved',
  BOOKED = 'booked',
  TICKETED = 'ticketed',
  CANCELLED = 'cancelled'
}
```

### 2.5 DB 테이블 & 컬럼명

```sql
-- ✓ 테이블: snake_case (복수형)
CREATE TABLE flight_bookings (
  id INTEGER PRIMARY KEY,
  pnr TEXT NOT NULL,
  airline TEXT,
  flight_number TEXT,
  -- ...
);

-- ✓ 컬럼: snake_case
flight_number
route_from
route_to
departure_date
arrival_date
created_at
updated_at
```

---

## 3. TypeScript 규칙

### 3.1 타입 정의

```typescript
// ✓ 인터페이스 정의 (공개 타입)
interface Booking {
  id: number;
  pnr: string;
  airline: string;
  flight_number: string;
  route_from: string;
  route_to: string;
  departure_date: string;
  passengers: Passenger[];
  status: BookingStatus;
  created_at: string;
  updated_at: string;
}

// ✓ 타입 정의 (제한된 타입)
type BookingStatus = 'saved' | 'booked' | 'ticketed' | 'cancelled';
type BookingFilters = {
  airline?: string;
  status?: BookingStatus;
  departure_date_from?: string;
  departure_date_to?: string;
};

// ✗ any 타입 사용 금지
function processData(data: any) {}  // 나쁨

// ✓ 제네릭 사용
function processData<T>(data: T): void {}  // 좋음
```

### 3.2 async/await

```typescript
// ✓ 권장
async function fetchBooking(id: number): Promise<Booking> {
  try {
    const response = await fetch(`/api/bookings/${id}`);
    if (!response.ok) throw new Error('Fetch failed');
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// ✗ 콜백 지옥 피하기
function fetchBooking(id: number, callback) {
  fetch(`/api/bookings/${id}`)
    .then(res => res.json())
    .then(data => callback(null, data))
    .catch(err => callback(err));
}
```

### 3.3 null/undefined 처리

```typescript
// ✓ Optional Chaining
const userName = user?.profile?.name ?? 'Anonymous';

// ✓ Nullish Coalescing
const status = booking?.status ?? 'saved';

// ✗ 피해야 할 방식
const userName = user && user.profile && user.profile.name;
```

---

## 4. React 컴포넌트 규칙

### 4.1 함수형 컴포넌트

```typescript
// ✓ 권장 스타일
interface BookingListProps {
  filters?: BookingFilters;
  onRefresh?: () => void;
  autoPolling?: boolean;
}

export function BookingList({ filters, onRefresh, autoPolling = true }: BookingListProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchBookings();
  }, [filters]);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/bookings');
      const data = await response.json();
      setBookings(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorPage error={error} />;

  return (
    <div className="booking-list">
      {bookings.map(booking => (
        <BookingRow key={booking.id} booking={booking} />
      ))}
    </div>
  );
}
```

### 4.2 Props 전달

```typescript
// ✓ 인터페이스로 Props 정의
interface BookingRowProps {
  booking: Booking;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}

// ✓ 구조 분해로 Props 수신
function BookingRow({ booking, onEdit, onDelete }: BookingRowProps) {
  return (
    <tr>
      <td>{booking.pnr}</td>
      <td>{booking.airline}</td>
      <td>
        <button onClick={() => onEdit?.(booking.id)}>Edit</button>
        <button onClick={() => onDelete?.(booking.id)}>Delete</button>
      </td>
    </tr>
  );
}

// ✗ Props를 직접 전달
function BookingRow(props) {
  return <tr>...</tr>;  // 나쁨
}
```

### 4.3 Hook 규칙

```typescript
// ✓ 커스텀 훅 작성
function useBooking(id: number) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const res = await fetch(`/api/bookings/${id}`);
      setBooking(await res.json());
      setIsLoading(false);
    };
    fetch();
  }, [id]);

  return { booking, isLoading };
}

// ✓ 훅 사용
function BookingDetail({ id }: { id: number }) {
  const { booking, isLoading } = useBooking(id);

  if (isLoading) return <LoadingSpinner />;
  return <div>{booking?.pnr}</div>;
}
```

---

## 5. 에러 처리

### 5.1 Custom Error 클래스

```typescript
// server/src/utils/errors.ts

export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', 400, message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', 404, `${resource} not found`);
  }
}

// 사용
throw new ValidationError('PNR must be 6 characters');
throw new NotFoundError('Booking');
```

### 5.2 에러 핸들링 미들웨어

```typescript
// server/src/middlewares/errorHandler.ts

export function errorHandler(err: any, req: any, res: any, next: any) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_ERROR';

  res.status(statusCode).json({
    success: false,
    error: code,
    message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

app.use(errorHandler);
```

---

## 6. 코드 스타일

### 6.1 들여쓰기 & 포맷팅

```typescript
// ✓ 들여쓰기: 2 spaces
function processBooking(booking: Booking): void {
  if (booking.status === 'booked') {
    // 작업 수행
  }
}

// ✓ 줄 길이: 100자 이내
const longVariableName =
  someFunction() && anotherCondition ? valueA : valueB;

// ✗ Tab 사용 금지
function bad() {
	console.log('bad');
}
```

### 6.2 주석 규칙

```typescript
// ✓ 함수 위에 JSDoc 주석
/**
 * 예약을 생성합니다.
 * @param data - 예약 데이터
 * @returns 생성된 예약 객체
 * @throws {ValidationError} 유효성 검사 실패 시
 */
async function createBooking(data: BookingData): Promise<Booking> {
  // ...
}

// ✓ 복잡한 로직 설명
// PNR 중복 확인 (DB에서 직접 조회)
const existing = await db.query('SELECT * FROM flight_bookings WHERE pnr = ?', [pnr]);

// ✗ 불필요한 주석
const age = 25;  // age is 25 (주석 없어도 명확함)
```

### 6.3 console 로그

```typescript
// ✓ 로깅 라이브러리 사용 (production)
import logger from './logger';
logger.info('Booking created', { id: booking.id });
logger.error('Database error', { error: err.message });

// ✓ 개발 중 console 사용 (제한적)
console.debug('Parsed PNR:', parsedData);

// ✗ console 남용 (제거 필요)
console.log('test');
console.log('debug', someVariable);
```

---

## 7. API 응답 형식

### 7.1 성공 응답

```typescript
// ✓ 일관된 응답 형식
{
  "success": true,
  "data": {
    "id": 1,
    "pnr": "ABC123",
    // ...
  },
  "message": "Booking created successfully",
  "timestamp": "2026-04-01T10:00:00Z"
}
```

### 7.2 에러 응답

```typescript
// ✓ 일관된 에러 형식
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "PNR must be 6 characters",
  "timestamp": "2026-04-01T10:00:00Z",
  "details": {
    "field": "pnr",
    "value": "ABC12"
  }
}
```

---

## 8. SQL 스타일

### 8.1 쿼리 작성

```sql
-- ✓ 예약 생성
INSERT INTO flight_bookings (
  pnr,
  airline,
  flight_number,
  route_from,
  route_to,
  departure_date,
  passengers,
  created_at,
  updated_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ✓ 복잡한 쿼리는 줄 바꿈
SELECT
  b.id,
  b.pnr,
  b.airline,
  b.departure_date,
  COUNT(s.id) AS segment_count
FROM flight_bookings b
LEFT JOIN air_booking_segments s ON b.id = s.booking_id
WHERE b.status = ?
GROUP BY b.id
ORDER BY b.departure_date DESC
LIMIT ?;

-- ✗ 한 줄로 쓰지 말 것
SELECT b.id, b.pnr, b.airline FROM flight_bookings b WHERE b.status = ? ORDER BY b.departure_date DESC;
```

### 8.2 매개변수화된 쿼리 (SQL Injection 방지)

```typescript
// ✓ 매개변수 사용
db.prepare('SELECT * FROM flight_bookings WHERE pnr = ?').get(pnr);

// ✗ 문자열 연결 (위험)
db.prepare(`SELECT * FROM flight_bookings WHERE pnr = '${pnr}'`).get();
```

---

## 9. 테스트 규칙

### 9.1 단위 테스트

```typescript
// tests/unit/validators.test.ts

import { describe, it, expect } from 'vitest';
import { isValidPnr, formatDate } from '../../src/utils/validators';

describe('Validators', () => {
  describe('isValidPnr', () => {
    it('should accept 6-character alphanumeric PNR', () => {
      expect(isValidPnr('ABC123')).toBe(true);
    });

    it('should reject PNR shorter than 6 characters', () => {
      expect(isValidPnr('ABC12')).toBe(false);
    });

    it('should reject PNR with special characters', () => {
      expect(isValidPnr('ABC@23')).toBe(false);
    });
  });
});
```

### 9.2 통합 테스트

```typescript
// tests/integration/api.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

describe('Booking API', () => {
  let bookingId: number;

  it('POST /api/bookings should create a booking', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({
        pnr: 'TEST01',
        airline: 'KE',
        flight_number: '1001',
        // ...
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    bookingId = res.body.data.id;
  });

  it('GET /api/bookings/:id should retrieve the booking', async () => {
    const res = await request(app).get(`/api/bookings/${bookingId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.pnr).toBe('TEST01');
  });
});
```

---

## 10. 성능 & 최적화

### 10.1 React 최적화

```typescript
// ✓ useMemo로 계산 결과 캐싱
const memoizedBookings = useMemo(
  () => bookings.filter(b => b.status === 'booked'),
  [bookings]
);

// ✓ useCallback으로 함수 캐싱
const handleDelete = useCallback(
  (id: number) => deleteBooking(id),
  []
);

// ✗ 불필요한 렌더링
function BookingList() {
  return bookings.map(b => <BookingRow key={b.pnr} booking={b} />);  // 나쁨, b.id 사용
}

// ✓ 안정적인 key 사용
function BookingList() {
  return bookings.map(b => <BookingRow key={b.id} booking={b} />);
}
```

### 10.2 DB 쿼리 최적화

```typescript
// ✓ 필요한 컬럼만 조회
SELECT id, pnr, airline FROM flight_bookings WHERE status = ?;

// ✗ 모든 컬럼 조회
SELECT * FROM flight_bookings WHERE status = ?;

// ✓ 인덱스 활용
CREATE INDEX idx_status_date ON flight_bookings(status, departure_date);

// ✓ 페이지네이션
SELECT * FROM flight_bookings LIMIT ? OFFSET ?;
```

---

## 11. 커밋 메시지 규칙

### 11.1 커밋 메시지 형식

```
<type>: <subject>

<body>

<footer>
```

### 11.2 Type 종류

```
feat:      새로운 기능
fix:       버그 수정
refactor:  코드 리팩토링
perf:      성능 개선
test:      테스트 추가
docs:      문서 수정
chore:     빌드 스크립트, 의존성 업데이트
ci:        CI/CD 설정 변경
```

### 11.3 예시

```
feat: add booking creation API

- Implement POST /api/bookings endpoint
- Add PNR validation
- Add passenger information handling

Closes #123
```

```
fix: correct date formatting in booking list

The departure_date was displayed with wrong timezone offset.
Changed to use ISO 8601 format consistently.

Fixes #456
```

---

## 12. Linting & Formatting

### 12.1 .eslintrc.json

```json
{
  "extends": ["eslint:recommended", "prettier"],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "react", "react-hooks"],
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "no-var": "error",
    "prefer-const": "error",
    "eqeqeq": ["error", "always"],
    "@typescript-eslint/no-explicit-any": "warn",
    "react/react-in-jsx-scope": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### 12.2 .prettierrc.json

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always"
}
```

### 12.3 실행 명령어

```bash
# 린트 검사
npm run lint

# 자동 포맷팅
npm run format

# 검사 + 수정
npm run lint:fix
```

---

## 13. localStorage 사용 금지 규칙

### 13.1 원칙

**절대 원칙**: 브라우저에 데이터 저장 금지, 항상 서버 DB 사용

```typescript
// ✗ 금지: localStorage 사용
localStorage.setItem('bookings', JSON.stringify(data));
const bookings = JSON.parse(localStorage.getItem('bookings'));

// ✓ 권장: 서버 DB 사용
const res = await fetch('/api/bookings');
const bookings = await res.json();
```

### 13.2 예시: 변환기 저장 기능

```typescript
// ❌ 나쁜 구현 (localStorage 사용)
function saveBooking(booking) {
  const saved = JSON.parse(localStorage.getItem('saved_bookings') || '[]');
  saved.push(booking);
  localStorage.setItem('saved_bookings', JSON.stringify(saved));
}

// ✅ 좋은 구현 (서버 DB 사용)
async function saveBooking(booking) {
  const res = await fetch('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(booking),
    headers: { 'Content-Type': 'application/json' }
  });

  if (!res.ok) throw new Error('Save failed');
  return await res.json();
}
```

### 13.3 migrateToServerDB 패턴

미전환 기능 마이그레이션 시 다음 패턴 사용:

```typescript
// 1. 기존 localStorage 데이터 읽기 (마이그레이션 목적만)
const legacyData = JSON.parse(localStorage.getItem('legacy_key') || '[]');

// 2. 서버로 전송
for (const item of legacyData) {
  await fetch('/api/legacy-endpoint', {
    method: 'POST',
    body: JSON.stringify(item)
  });
}

// 3. 완료 후 localStorage 정리
localStorage.removeItem('legacy_key');

// 4. 향후 모든 접근은 서버 API 사용
const data = await fetch('/api/legacy-endpoint');
```

### 13.4 데이터 일관성 보장

```typescript
// 여러 PC/브라우저에서 동일 데이터 확인
async function ensureDataConsistency() {
  // 같은 사용자라면 어디서든 같은 데이터
  const bookings = await fetch('/api/bookings').then(r => r.json());

  // PC 재시작 후에도 데이터 유지
  // 브라우저 변경 후에도 데이터 유지
  // 캐시 삭제 후에도 데이터 유지

  return bookings;
}
```

---

## 14. 인증 화이트리스트 관리 규칙

### 14.1 화이트리스트 엔드포인트 정의

```typescript
// server/src/config/authWhitelist.ts

export const AUTH_WHITELIST = [
  {
    path: '/api/flight-saves',
    methods: ['GET', 'POST'],
    reason: '변환기 저장된 항공편 (내부망 전용)'
  },
  {
    path: '/api/estimates',
    methods: ['GET', 'POST'],
    reason: '견적서 (내부망 전용)'
  }
];

// 기타 엔드포인트는 향후 인증 추가
export const AUTH_REQUIRED = [
  '/api/bookings',
  '/api/schedules',
  // ...
];
```

### 14.2 내부망 확인 미들웨어

```typescript
// server/src/middleware/internalNetworkCheck.ts

const INTERNAL_IP_PATTERNS = [
  /^192\.168\.0\./,       // 192.168.0.x
  /^127\.0\.0\.1$/,       // localhost
  /^::1$/                  // IPv6 localhost
];

export function isInternalNetwork(clientIp: string): boolean {
  return INTERNAL_IP_PATTERNS.some(pattern => pattern.test(clientIp));
}

export function internalNetworkCheckMiddleware(req, res, next) {
  const clientIp = req.ip || req.connection.remoteAddress;

  if (!isInternalNetwork(clientIp)) {
    logger.warn(`External access attempt: ${clientIp} → ${req.path}`);
    return res.status(403).json({
      error: 'Forbidden: Internal network only',
      client_ip: clientIp
    });
  }

  next();
}
```

### 14.3 화이트리스트 적용

```typescript
// server/src/index.ts

import { AUTH_WHITELIST } from './config/authWhitelist';
import { internalNetworkCheckMiddleware } from './middleware/internalNetworkCheck';

// 화이트리스트 엔드포인트: 내부망 확인만
AUTH_WHITELIST.forEach(config => {
  app.get(config.path, internalNetworkCheckMiddleware, handleRoute);
  app.post(config.path, internalNetworkCheckMiddleware, handleRoute);
});

// 기타 엔드포인트: 향후 인증 추가
```

### 14.4 로깅

```typescript
// server/src/services/logger.ts

export function logAuthAccess(req: Request, status: 'allowed' | 'denied') {
  const log = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
    status
  };

  if (status === 'denied') {
    logger.warn('AUTH_WHITELIST_DENIED', log);
  } else {
    logger.debug('AUTH_WHITELIST_ALLOWED', log);
  }
}
```

### 14.5 체크리스트 (새 엔드포인트 추가 시)

```
[ ] 엔드포인트가 인증 필수인가?
    [ YES ] → 인증 구현
    [ NO ]  → 화이트리스트에 추가
[ ] 화이트리스트 엔드포인트라면:
    [ ] 내부망 확인 미들웨어 적용?
    [ ] 로깅 구현?
    [ ] 문서화 완료?
[ ] AUTH_WHITELIST 설정 파일 업데이트?
```

---

## 15. 체크리스트 (PR 전)

### Before PR

- [ ] 코드 스타일 일관성 확인 (eslint, prettier 실행)
- [ ] TypeScript 컴파일 오류 없음
- [ ] 테스트 통과 (npm test)
- [ ] 커밋 메시지 명확함
- [ ] 주석/문서화 완료
- [ ] console.log 제거
- [ ] any 타입 최소화
- [ ] 보안 검토 (SQL injection, XSS 등)

---

## 참고 자료

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev)
- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [SQL Style Guide](https://www.sqlstyle.guide/)
