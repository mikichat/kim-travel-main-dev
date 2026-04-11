# 07-coding-convention.md — 코딩 컨벤션

## 개요

TWAIB는 air-booking의 기존 코드 패턴을 따릅니다. 이 문서는 air-booking의 컨벤션을 정리하고, TWAIB 추가 규칙을 명시합니다.

---

## 1. 파일 및 폴더 명명

### 폴더 구조

```
client/src/
├─ pages/          — 페이지 컴포넌트 (full page)
├─ components/     — 재사용 컴포넌트 (generic)
├─ services/       — API 호출, 유틸리티
├─ context/        — Context API (상태 관리)
├─ types/          — TypeScript 타입 정의
├─ styles/         — CSS/TailwindCSS
├─ hooks/          — Custom React Hooks
└─ utils/          — 유틸리티 함수

server/src/
├─ routes/         — Express 라우트
├─ services/       — 비즈니스 로직
├─ db/            — 데이터베이스 스키마, 쿼리
├─ middleware/     — Express 미들웨어
├─ types/          — TypeScript 타입 정의
└─ utils/          — 유틸리티 함수
```

### 파일 명명

- **컴포넌트**: PascalCase (예: `TravelGuideForm.tsx`)
- **함수/유틸리티**: camelCase (예: `formatDate.ts`, `parseFlightInfo.ts`)
- **페이지**: PascalCase (예: `PnrConverter.tsx`)
- **타입 정의**: PascalCase (예: `TravelGuide.ts`)
- **스타일**: kebab-case (예: `travel-guide.css`)
- **API 라우트**: kebab-case (예: `travel-guides.ts`)

---

## 2. TypeScript 규칙

### 타입 정의

```typescript
// ✓ 좋은 예: 인터페이스로 정의
interface TravelGuide {
  id: number;
  title: string;
  destination: string;
  start_date: string; // ISO 8601
  end_date: string;
  sections_config: SectionsConfig;
  ai_content: AIContent;
  custom_content?: Partial<AIContent>;
  created_at: string;
}

// ✓ API 요청/응답 타입
interface GenerateGuideRequest {
  destination: string;
  start_date: string;
  end_date: string;
  departure_place?: string;
  departure_time?: string;
  cost_per_person?: number;
}

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// ✗ 나쁜 예: any 사용
function handleData(data: any) { ... }

// ✓ 좋은 예: 제네릭 사용
function handleData<T>(data: T) { ... }
```

### 타입 위치

- **클라이언트**: `client/src/types/travel-guide.ts`
- **서버**: `server/src/types/travel-guide.ts`
- **공유 타입**: 각각 정의 (중복 OK, 일관성 중요)

---

## 3. React 컴포넌트 규칙

### 함수형 컴포넌트 + TypeScript

```typescript
// ✓ 좋은 예
import { ReactNode } from 'react';

interface TravelGuideFormProps {
  onSubmit: (data: TravelGuide) => void;
  isLoading?: boolean;
  destination: string;
}

export function TravelGuideForm({
  onSubmit,
  isLoading = false,
  destination,
}: TravelGuideFormProps) {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, destination });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* JSX */}
    </form>
  );
}

// ✗ 나쁜 예: 클래스형 또는 암묵적 any
export class TravelGuideForm extends React.Component { ... }

export function TravelGuideForm(props) { ... }
```

### Props 구조화

```typescript
// ✓ Props 인터페이스 분리
interface TravelGuidePreviewProps {
  aiContent: AIContent;
  customContent?: Partial<AIContent>;
  sectionsConfig: SectionsConfig;
  onEditSection: (section: string) => void;
}

export function TravelGuidePreview(props: TravelGuidePreviewProps) {
  const { aiContent, customContent, onEditSection } = props;
  // ...
}

// ✗ 인라인 props (복잡한 경우)
export function TravelGuidePreview(
  props: { aiContent: AIContent; ... }
) { ... }
```

### 상태 관리

```typescript
// ✓ useState (단순)
const [destination, setDestination] = useState('');
const [isLoading, setIsLoading] = useState(false);

// ✓ useCallback (콜백 메모이제이션)
const handleGenerate = useCallback(async () => {
  setIsLoading(true);
  try {
    const res = await fetch('/api/travel-guides/generate', { ... });
    // ...
  } finally {
    setIsLoading(false);
  }
}, []);

// ✓ useEffect (부수 효과)
useEffect(() => {
  if (!isOpen) return;
  fetchGuides();
}, [isOpen]);

// ✗ 과도한 useState (객체로 통합)
const [input1, setInput1] = useState('');
const [input2, setInput2] = useState('');
const [input3, setInput3] = useState('');
// → 대신 useReducer 또는 Context 고려
```

### 조건부 렌더링

```typescript
// ✓ 좋은 예: 명확한 조건부
{sectionsConfig.weather && (
  <WeatherSection content={aiContent.weather} />
)}

// ✓ early return
if (!aiContent) {
  return <LoadingSpinner />;
}

// ✗ 나쁜 예: 복잡한 삼항 연산자
{isLoading ? <Spinner /> : aiContent ? <Content /> : <Empty />}
```

### 이벤트 핸들러

```typescript
// ✓ 좋은 예: 타입 안정성
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  console.log(e.currentTarget.value);
};

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setTitle(e.currentTarget.value);
};

// ✗ 나쁜 예: any 타입
const handleClick = (e: any) => { ... }
```

---

## 4. Express/Node.js 규칙

### 라우트 정의

```typescript
// ✓ 좋은 예: 타입 안전, 에러 처리
import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';

export const travelGuidesRouter = Router();
travelGuidesRouter.use(requireAuth);

travelGuidesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { title, destination } = req.body;
    
    // 입력 검증
    if (!title || !destination) {
      return res.status(400).json({
        success: false,
        error: '제목과 목적지를 입력해주세요.',
      });
    }

    // 비즈니스 로직 호출
    const guide = await travelGuideService.create({ title, destination });
    res.status(201).json({ success: true, data: guide });
  } catch (err: any) {
    console.error('Create guide error:', err);
    res.status(500).json({ success: false, error: '서버 오류' });
  }
});

// ✗ 나쁜 예: 에러 처리 없음, async await 없음
travelGuidesRouter.post('/', (req, res) => {
  const guide = db.insert(req.body);
  res.json(guide);
});
```

### 서비스 레이어

```typescript
// ✓ 좋은 예: 분리된 비즈니스 로직
// server/src/services/travel-guide.service.ts

export async function createGuide(data: CreateGuideRequest): Promise<TravelGuide> {
  // 입력 검증
  if (!data.title) throw new Error('제목 필수');
  
  // 비즈니스 로직
  const daysCount = calculateDays(data.start_date, data.end_date);
  
  // DB 저장
  const guide = await travelGuideDb.create({
    ...data,
    days_count: daysCount,
  });
  
  return guide;
}

// ✗ 나쁜 예: 라우트 핸들러에 로직 포함
router.post('/', async (req, res) => {
  const daysCount = calculateDays(req.body.start, req.body.end);
  const guide = db.insert({ ...req.body, daysCount });
  res.json(guide);
});
```

### 데이터베이스 쿼리

```typescript
// ✓ 좋은 예: 타입 안전, 매개변수 바인딩
// server/src/db/travel-guides.db.ts

import Database from 'better-sqlite3';

const db = new Database('data/air-booking.db');

export function create(data: CreateGuideRequest): TravelGuide {
  const stmt = db.prepare(`
    INSERT INTO travel_guides (title, destination, start_date, end_date, days_count, sections_config, ai_content, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
  `);
  
  const result = stmt.run(
    data.title,
    data.destination,
    data.start_date,
    data.end_date,
    calculateDays(data.start_date, data.end_date),
    JSON.stringify(data.sections_config),
    JSON.stringify(data.ai_content)
  );
  
  return getById(result.lastInsertRowid as number)!;
}

export function getById(id: number): TravelGuide | null {
  const stmt = db.prepare('SELECT * FROM travel_guides WHERE id = ?');
  const row = stmt.get(id) as any;
  
  if (!row) return null;
  
  return {
    ...row,
    sections_config: JSON.parse(row.sections_config),
    ai_content: JSON.parse(row.ai_content),
  };
}

// ✗ 나쁜 예: SQL injection 위험
function create(data) {
  const result = db.exec(`
    INSERT INTO travel_guides VALUES (${data.id}, '${data.title}', ...)
  `);
}
```

### 에러 처리

```typescript
// ✓ 좋은 예: 구체적인 에러 메시지
try {
  const guide = await generateGuide(data);
} catch (err: any) {
  if (err.message.includes('API key')) {
    console.error('Gemini API 키 오류:', err);
    return res.status(500).json({
      success: false,
      error: 'AI 서비스 설정 오류',
      code: 'API_CONFIG_ERROR',
    });
  }
  
  if (err.message.includes('timeout')) {
    return res.status(504).json({
      success: false,
      error: 'AI 서비스 타임아웃',
      code: 'API_TIMEOUT',
    });
  }
  
  // 일반 오류
  console.error('Generate guide error:', err);
  res.status(500).json({
    success: false,
    error: 'AI 생성에 실패했습니다.',
  });
}

// ✗ 나쁜 예: 일반적인 에러
catch (err) {
  res.status(500).json({ error: 'Error' });
}
```

---

## 5. 스타일 (CSS/TailwindCSS)

### Tailwind 클래스 사용

```typescript
// ✓ 좋은 예: Tailwind 클래스 활용
export function GuideSection() {
  return (
    <section className="bg-white border-b border-gray-200 px-6 py-8">
      <h2 className="text-2xl font-semibold text-navy-dark mb-4">
        날씨
      </h2>
      <p className="text-base text-gray-700 leading-relaxed">
        평균 기온은 28°C입니다.
      </p>
      <button className="mt-4 px-4 py-2 bg-gold text-white rounded hover:bg-gold-dark transition-colors">
        수정
      </button>
    </section>
  );
}

// ✗ 나쁜 예: 인라인 스타일
<section style={{ backgroundColor: '#fff', borderBottom: '1px solid #ccc' }}>
  <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1B3A5C' }}>
    날씨
  </h2>
</section>

// ✗ 나쁜 예: 외부 CSS 파일 (Tailwind 선호)
<section className="guide-section">
  <h2 className="guide-title">날씨</h2>
</section>
```

### 커스텀 스타일 (필요 시)

```css
/* client/src/styles/travel-guide.css */

/* BEM 패턴 사용 */
.guide-preview {
  background-color: #FAFAF5;
  padding: 24px;
}

.guide-preview__section {
  margin-bottom: 32px;
}

.guide-preview__section--weather {
  border-top: 2px solid #C8A45E;
}

.guide-preview__section-title {
  font-size: 24px;
  font-weight: 600;
  color: #1B3A5C;
  margin-bottom: 16px;
}

/* dark mode 지원 */
@media (prefers-color-scheme: dark) {
  .guide-preview {
    background-color: #2a2a2a;
    color: #e0e0e0;
  }
}

/* 모바일 반응형 */
@media (max-width: 768px) {
  .guide-preview {
    padding: 16px;
  }

  .guide-preview__section {
    margin-bottom: 16px;
  }

  .guide-preview__section-title {
    font-size: 18px;
  }
}
```

### 색상 정의

```typescript
// ✓ Tailwind 커스텀 설정 (tailwind.config.ts)
export default {
  theme: {
    extend: {
      colors: {
        'navy-dark': '#1B3A5C',
        'gold': '#C8A45E',
        'cream': '#FAFAF5',
        'text-dark': '#333333',
      },
    },
  },
};

// 사용
<div className="bg-cream text-navy-dark">...</div>
<button className="bg-gold hover:bg-opacity-90">저장</button>
```

---

## 6. API 호출 패턴

### Axios 사용 (권장)

```typescript
// ✓ 좋은 예: 에러 처리, 타입 안전
import axios from 'axios';

interface GenerateGuideResponse {
  success: boolean;
  data: AIContent;
  error?: string;
}

export async function generateGuide(req: GenerateGuideRequest): Promise<AIContent> {
  try {
    const { data } = await axios.post<GenerateGuideResponse>(
      '/api/travel-guides/generate',
      req,
      { withCredentials: true }
    );

    if (!data.success) {
      throw new Error(data.error || 'AI 생성 실패');
    }

    return data.data;
  } catch (err: any) {
    if (err.response?.status === 401) {
      throw new Error('인증이 필요합니다.');
    }

    if (err.response?.status === 400) {
      throw new Error(err.response.data.error || '입력 검증 오류');
    }

    throw new Error(err.message || 'API 호출 실패');
  }
}

// ✗ 나쁜 예: 에러 처리 없음
export async function generateGuide(req) {
  const res = await fetch('/api/travel-guides/generate', {
    method: 'POST',
    body: JSON.stringify(req),
  });
  return res.json();
}
```

### 요청 인증

```typescript
// ✓ credentials 필수
const res = await fetch('/api/travel-guides', {
  credentials: 'include', // 쿠키 포함
});

// Axios
axios.defaults.withCredentials = true;
```

---

## 7. 로깅 및 디버깅

### console 사용

```typescript
// ✓ 좋은 예: 적절한 레벨 사용
console.log('User action:', destinat ion);         // 정보
console.warn('Missing data:', missingField);       // 경고
console.error('API error:', err.message);          // 오류

// ✗ 나쁜 예: console.log 남용
console.log('test');
console.log('aaa');
console.log(data); // 프로덕션 코드에 남기지 말 것
```

### 에러 추적

```typescript
// ✓ 상세한 로그
try {
  const content = await generateGuide({...});
  console.log('Generate success:', { destination, days: content.length });
} catch (err: any) {
  console.error('Generate guide error:', {
    destination,
    error: err.message,
    stack: err.stack,
    code: err.code,
  });
  // 에러 리포팅 서비스 연동 (Sentry 등)
}
```

---

## 8. 주석 및 문서

### JSDoc 사용 (공개 API)

```typescript
/**
 * AI 안내문 생성
 * @param destination - 여행지 이름
 * @param startDate - 출발 날짜 (ISO 8601)
 * @param endDate - 귀국 날짜 (ISO 8601)
 * @returns 생성된 안내 컨텐츠
 * @throws {Error} API 호출 실패 시
 */
export async function generateGuide(
  destination: string,
  startDate: string,
  endDate: string
): Promise<AIContent> {
  // ...
}

// ✗ 나쁜 예: 불필요한 주석
const destination = '필리핀'; // 여행지
const daysCount = calculateDays(start, end); // 일 수 계산
```

### 코드 정리 주석

```typescript
// TODO: Unsplash API 통합 (P2)
// FIXME: 모바일에서 레이아웃 깨짐
// NOTE: Gemini API는 일시적으로 문자 길이 제한 있음
```

---

## 9. 테스트

### 단위 테스트 (Jest)

```typescript
// ✓ 좋은 예: 테스트 명확, 에러 케이스 포함
import { calculateDays } from '@/utils/dateUtils';

describe('calculateDays', () => {
  it('should calculate days between two dates', () => {
    const start = '2024-12-18';
    const end = '2024-12-22';
    expect(calculateDays(start, end)).toBe(5);
  });

  it('should handle same day', () => {
    expect(calculateDays('2024-12-18', '2024-12-18')).toBe(1);
  });

  it('should throw error on invalid date', () => {
    expect(() => calculateDays('invalid', '2024-12-22')).toThrow();
  });
});

// ✗ 나쁜 예: 테스트 불명확
it('works', () => {
  expect(calculateDays('2024-12-18', '2024-12-22')).toBe(5);
});
```

### 통합 테스트

```typescript
// API 테스트 (supertest)
import request from 'supertest';
import app from '@/server';

describe('POST /api/travel-guides', () => {
  it('should create travel guide', async () => {
    const res = await request(app)
      .post('/api/travel-guides')
      .send({
        title: '필리핀 5일',
        destination: '필리핀',
        start_date: '2024-12-18',
        end_date: '2024-12-22',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
  });

  it('should return 400 on missing title', async () => {
    const res = await request(app)
      .post('/api/travel-guides')
      .send({
        destination: '필리핀',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
```

---

## 10. Git 커밋 메시지

### 형식

```
feat: 새로운 기능 추가 (AI 안내문 생성)
fix: 버그 수정 (이미지 캡처 실패)
refactor: 코드 리팩토링 (Context API 통합)
docs: 문서 작성 (05-tech-spec.md)
test: 테스트 추가 (travel-guide.service.test.ts)
chore: 빌드, 의존성 등 (npm install @google/generative-ai)

format: "type(scope): subject"
- type: feat, fix, refactor, docs, test, chore, perf, style
- scope: travel-guides, ai-generation, ui, api 등 (선택)
- subject: 명사형, 현재형, 한글 또는 영어

예시:
feat(travel-guides): AI 안내문 생성 기능 추가
fix(preview): 모바일에서 이미지 캡처 실패 수정
refactor(context): TravelGuideContext 상태 통합
docs: TWAIB 기획 문서 작성 완료
```

### 커밋 크기

- **원자적 커밋**: 한 가지 변경만 (기능/버그/리팩토링 하나)
- **기능당 평균 3~5개 커밋**
- **과도한 분할 회피** (50줄 미만 여러 커밋 X)

---

## 11. 성능 최적화

### 메모이제이션

```typescript
// ✓ useCallback (콜백 메모이제이션)
const handleGenerate = useCallback(async () => {
  // API 호출
}, [destination, start_date]); // 의존성 명시

// ✓ useMemo (계산 결과 캐싱)
const daysCount = useMemo(
  () => calculateDays(start_date, end_date),
  [start_date, end_date]
);

// ✓ React.memo (컴포넌트 메모이제이션)
export const GuideSection = React.memo(function GuideSection({
  title,
  content,
  onEdit,
}: GuideSectionProps) {
  return <section>{/* ... */}</section>;
});
```

### 번들 최적화

```typescript
// ✓ 동적 임포트 (큰 라이브러리)
const html2canvas = (await import('html2canvas')).default;

// ✓ 조건부 로드
if (shouldShowGuide) {
  import('./TravelGuideTab').then(module => { ... });
}
```

---

## 12. Accessibility (A11y)

### 시맨틱 HTML

```typescript
// ✓ 좋은 예
<main>
  <section aria-labelledby="hero-title">
    <h1 id="hero-title">필리핀 5일 여행</h1>
  </section>
  
  <form>
    <label htmlFor="destination">여행지</label>
    <input id="destination" type="text" required aria-required="true" />
  </form>
  
  <button aria-label="AI 안내문 생성">생성</button>
</main>

// ✗ 나쁜 예
<div onClick={() => generate()}>생성</div>
<span className="label">여행지</span>
<input type="text" />
```

### 색상 대비

- WCAG AA: 4.5:1 (텍스트), 3:1 (큰 텍스트)
- #1B3A5C(네이비) + #FAFAF5(아이보리): 5.2:1 OK
- #C8A45E(골드) + #FAFAF5: 확인 필요

---

## 요약 체크리스트

- [ ] TypeScript strict mode 활성화
- [ ] 모든 함수/컴포넌트에 타입 정의
- [ ] Props 인터페이스 분리
- [ ] API 응답에 success 플래그 + error 메시지
- [ ] try-catch 에러 처리
- [ ] credentials: 'include' (인증 필요 API)
- [ ] Tailwind CSS 사용 (인라인 스타일 최소화)
- [ ] console.log 제거 (프로덕션)
- [ ] 접근성: label, aria-label, 시맨틱 HTML
- [ ] 테스트: 주요 기능 및 에러 케이스
- [ ] 커밋 메시지: feat/fix/refactor 형식
- [ ] 문서: JSDoc (공개 함수), README 업데이트

