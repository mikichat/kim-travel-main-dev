# 05-tech-spec.md — 기술 설계서

## 기술 스택 확정

| 계층 | 기술 | 버전 | 용도 |
|------|------|------|------|
| Frontend | React | 18.2+ | 기존 air-booking |
| 언어 | TypeScript | 5.0+ | 기존 air-booking |
| 스타일 | TailwindCSS | 3.3+ | 기존 air-booking |
| 이미지 캡처 | html2canvas | 1.4+ | 미리보기 → 이미지 |
| 클립보드 | Web Clipboard API | - | 브라우저 표준 |
| Backend | Express | 4.18+ | 기존 air-booking |
| 데이터베이스 | SQLite | 3 | 기존 air-booking.db |
| AI | Google Gemini | @google/generative-ai | 안내문 생성 |
| API 클라이언트 | Axios | 1.4+ | HTTP 요청 |
| HTTP 클라이언트 | node-fetch | 3+ | Node.js 환경 |
| 시간 처리 | date-fns | 2.30+ | 날짜 포맷팅 |

---

## 데이터베이스 스키마

### travel_guides 테이블 생성

```sql
CREATE TABLE IF NOT EXISTS travel_guides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 기본 정보
  title TEXT NOT NULL UNIQUE,                -- "필리핀 5일 여행"
  destination TEXT NOT NULL,                -- "필리핀"
  start_date TEXT NOT NULL,                 -- "2024-12-18" (ISO 8601)
  end_date TEXT NOT NULL,                   -- "2024-12-22"
  days_count INTEGER NOT NULL,              -- 5 (계산된 필드)
  
  -- 항공편 정보
  flight_schedule_id INTEGER,               -- FK → flight_schedules.id
  departure_airport TEXT,                   -- "ICN" (항공편 선택 시 자동 채움)
  arrival_airport TEXT,                     -- "MNL"
  
  -- 추가 정보
  departure_place TEXT,                     -- "함열스포츠센터" (출발지)
  departure_time TEXT,                      -- "02:00" (항공편 선택 시 자동)
  cost_per_person INTEGER,                  -- 2380000 (원)
  
  -- 컨텐츠
  sections_config TEXT NOT NULL,            -- JSON: 섹션 토글 설정
  ai_content TEXT,                          -- JSON: Gemini AI 생성 결과
  custom_content TEXT,                      -- JSON: 관리자 수정 내용 (ai_content 병합)
  
  -- 배경 이미지
  background_url TEXT,                      -- Unsplash URL (선택)
  
  -- 메타데이터
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime')),
  created_by TEXT,                          -- 사용자 ID (추후 다중 사용자)
  is_archived INTEGER DEFAULT 0             -- 0: 활성, 1: 보관됨
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_travel_guides_destination ON travel_guides(destination);
CREATE INDEX IF NOT EXISTS idx_travel_guides_created_at ON travel_guides(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_travel_guides_archived ON travel_guides(is_archived);
```

### 마이그레이션 스크립트

```typescript
// server/src/db/migrations/001-create-travel-guides.ts

import Database from 'better-sqlite3';

export function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS travel_guides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL UNIQUE,
      destination TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days_count INTEGER NOT NULL,
      flight_schedule_id INTEGER,
      departure_airport TEXT,
      arrival_airport TEXT,
      departure_place TEXT,
      departure_time TEXT,
      cost_per_person INTEGER,
      sections_config TEXT NOT NULL,
      ai_content TEXT,
      custom_content TEXT,
      background_url TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      created_by TEXT,
      is_archived INTEGER DEFAULT 0
    );
    
    CREATE INDEX IF NOT EXISTS idx_travel_guides_destination 
      ON travel_guides(destination);
    CREATE INDEX IF NOT EXISTS idx_travel_guides_created_at 
      ON travel_guides(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_travel_guides_archived 
      ON travel_guides(is_archived);
  `);
}
```

---

## API 설계

### 1. POST /api/travel-guides/generate — AI 안내문 생성 (저장 X)

**요청**:
```typescript
interface GenerateRequest {
  destination: string;           // 필수: "필리핀"
  start_date: string;           // 필수: "2024-12-18"
  end_date: string;             // 필수: "2024-12-22"
  departure_place?: string;     // 선택: "함열스포츠센터"
  departure_time?: string;      // 선택: "02:00"
  cost_per_person?: number;     // 선택: 2380000
}
```

**응답 (200 OK)**:
```typescript
interface GenerateResponse {
  success: boolean;
  data: {
    weather: string;            // 날씨 문단
    outfit: string[];          // 복장 불릿 목록
    checklist: {
      category: string;         // "필수", "날씨별"
      items: string[];
    }[];
    currency: string;           // 환율 문단
    general_notice: string;     // 일반 안내사항
  };
}
```

**에러 응답 (400, 500)**:
```typescript
{
  success: false,
  error: "AI 생성에 실패했습니다. 나중에 다시 시도하세요.",
  code: "AI_GENERATION_ERROR"
}
```

---

### 2. POST /api/travel-guides — 안내문 저장

**요청**:
```typescript
interface CreateRequest {
  title: string;                // 필수: "필리핀 5일 여행"
  destination: string;          // 필수
  start_date: string;           // 필수
  end_date: string;             // 필수
  flight_schedule_id?: number;  // 선택
  departure_place?: string;     // 선택
  departure_time?: string;      // 선택
  cost_per_person?: number;     // 선택
  sections_config: {            // 필수: 섹션 토글
    general_notice: boolean;
    weather: boolean;
    outfit: boolean;
    checklist: boolean;
    currency: boolean;
    baggage?: boolean;
    custom_notice?: boolean;
  };
  ai_content: {                 // 필수: Gemini 생성 결과
    weather: string;
    outfit: string[];
    checklist: Array<{ category: string; items: string[] }>;
    currency: string;
    general_notice: string;
  };
  custom_content?: {            // 선택: 관리자 수정 내용
    weather?: string;
    outfit?: string[];
    checklist?: Array<{ category: string; items: string[] }>;
    currency?: string;
    general_notice?: string;
    custom_notice_title?: string;
    custom_notice_content?: string;
  };
  background_url?: string;      // 선택: Unsplash URL
}
```

**응답 (201 Created)**:
```typescript
{
  success: true,
  data: {
    id: 1,
    title: "필리핀 5일 여행",
    destination: "필리핀",
    start_date: "2024-12-18",
    end_date: "2024-12-22",
    created_at: "2024-04-03T14:30:00",
    ...
  }
}
```

---

### 3. GET /api/travel-guides — 목록 조회 (페이지네이션)

**요청 쿼리**:
```
GET /api/travel-guides?page=1&limit=10&destination=필리핀&is_archived=0
```

**응답**:
```typescript
interface ListResponse {
  success: boolean;
  data: {
    guides: Array<{
      id: number;
      title: string;
      destination: string;
      start_date: string;
      end_date: string;
      created_at: string;
    }>;
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
```

---

### 4. GET /api/travel-guides/:id — 상세 조회

**요청**:
```
GET /api/travel-guides/1
```

**응답**:
```typescript
interface GetResponse {
  success: boolean;
  data: {
    id: number;
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
    days_count: number;
    flight_schedule_id?: number;
    departure_place?: string;
    departure_time?: string;
    cost_per_person?: number;
    sections_config: { ... };
    ai_content: { ... };
    custom_content?: { ... };
    background_url?: string;
    created_at: string;
    updated_at: string;
  };
}
```

---

### 5. PUT /api/travel-guides/:id — 수정

**요청**:
```typescript
interface UpdateRequest {
  // 다음 중 일부만 제공 가능 (선택적)
  title?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  sections_config?: { ... };
  ai_content?: { ... };
  custom_content?: { ... };
  background_url?: string;
}
```

**응답**: 수정된 객체 (GetResponse와 동일)

---

### 6. DELETE /api/travel-guides/:id — 삭제 (Soft Delete)

**요청**:
```
DELETE /api/travel-guides/1
```

**응답**:
```typescript
{
  success: true,
  message: "삭제되었습니다."
}
```

**구현**: is_archived = 1로 업데이트 (hard delete 아님)

---

## Gemini API 프롬프트 설계

### 환각 방지 전략

1. **검증된 정보만**: 공개된 여행 정보, 통계 데이터만 사용
2. **불확실한 정보 생략**: "~일 수 있습니다"는 절대 금지, 확실하지 않으면 생략
3. **간결함 우선**: 핵심만, 문장 단순화
4. **현지화 오류 방지**: "음식은 맛있습니다" 같은 주관적 표현 금지
5. **최종 승인**: AI 결과는 항상 관리자가 검토 후 전송

### 시스템 프롬프트 (System Prompt)

```
당신은 여행 안내 전문가이며, 40대 이상 고객을 위한 실용적이고 정확한 정보를 제공합니다.

[역할]
- 여행지의 날씨, 복장, 준비물, 환율 정보를 제공
- 간단하고 명확한 언어 사용
- 불확실한 정보는 절대 포함하지 않기
- 개인적 의견이나 추천 금지

[톤]
- 따뜻하고 신뢰감 있게
- 전문적이면서도 친근하게
- 40대 이상 고객 대상으로 큰 글씨 기준 (간단한 문장)

[출력 형식]
JSON으로 정확하게 구성된 결과만 반환
```

### 유저 프롬프트 (User Prompt Template)

```
[여행 정보]
- 목적지: {destination}
- 여행 기간: {start_date} ~ {end_date} ({days}일)
- 출발지: {departure_place} (출발시간: {departure_time})
- 1인 예상 경비: {cost_per_person}원

[작성 규칙]
1. 날씨
   - 해당 월의 평균 기온과 습도만 제공 (실시간 예보 X)
   - 일반적인 날씨 특징만 (예: "건기", "우기", "날씨 좋음")
   - 최대 3줄

2. 복장
   - 날씨에 맞는 기본 복장 (3~5개 항목)
   - 구체적 브랜드/상점 금지
   - 불릿 포인트 형식

3. 준비물
   - 필수 (여권, 비자, 예방접종 등)
   - 날씨별 추가 (선글라스, 우산 등)
   - 불명확한 것은 생략
   - 불릿 포인트 형식, 카테고리 분류

4. 환율
   - 해당 월 기준 환율만 제공
   - "대략적 환산" 명시
   - 환전처 일반 정보 (공항, 환전소)
   - "확실하지 않으면 출발 전 확인하세요" 추가
   - 최대 3줄

5. 일반 안내사항
   - 여행지의 주요 특징과 안내
   - 최대 5줄
   - 주관적 평가 금지 (예: "최고의", "반드시" X)

[금지 사항]
- "~일 것으로 예상됩니다" 같은 불확실한 표현
- 실시간 정보 (현재 환율, 오늘 날씨 등)
- 개인 취향 표현 (예: "음식이 맛있습니다")
- 장황한 설명
- 구체적 숙소/음식점 추천
- 정확하지 않은 정보

[출력 JSON 형식]
{
  "weather": "{날씨 설명 문단 3~5줄}",
  "outfit": [
    "{항목1}",
    "{항목2}",
    "{항목3}",
    "{항목4}"
  ],
  "checklist": [
    {
      "category": "필수",
      "items": [
        "여권",
        "비자",
        "예방접종 증명서"
      ]
    },
    {
      "category": "날씨별",
      "items": [
        "자외선 차단제",
        "모자"
      ]
    }
  ],
  "currency": "{환율 설명 문단 2~3줄}",
  "general_notice": "{일반 안내사항 2~3줄}"
}

{destination} {start_date} ~ {end_date} 여행을 위한 안내 컨텐츠를 생성해주세요.
```

### 예시 (필리핀 12월)

**입력**:
```
목적지: 필리핀
여행 기간: 2024-12-18 ~ 2024-12-22 (5일)
출발지: 함열스포츠센터 (출발시간: 02:00)
1인 경비: 2,380,000원
```

**AI 응답**:
```json
{
  "weather": "12월 필리핀은 건기(dry season)로 맑은 날씨가 대부분입니다. 평균 기온은 28°C 정도이며 습도는 75% 정도입니다. 낮에는 햇빛이 강하고 새벽은 서늘할 수 있습니다.",
  
  "outfit": [
    "반팔 셔츠, 민소매 셔츠",
    "린넨 바지, 반바지",
    "선글라스 및 모자",
    "가벼운 겉옷 (호텔 에어컨 대비)"
  ],
  
  "checklist": [
    {
      "category": "필수",
      "items": [
        "여권 (유효기간 6개월 이상)",
        "비자 (60일 체류 가능)",
        "황열병 예방접종 증명서 (선택)"
      ]
    },
    {
      "category": "날씨별",
      "items": [
        "자외선 차단제 (SPF 50+)",
        "모기 퇴치제",
        "썬글라스"
      ]
    }
  ],
  
  "currency": "1필리핀 페소는 현재 약 24원입니다 (대략적 환산). 공항이나 시내 환전소에서 환전 가능하며, 신용카드 사용 가능한 곳이 많습니다. 정확한 환율은 출발 전에 확인하세요.",
  
  "general_notice": "필리핀은 동남아시아의 아름다운 섬나라입니다. 따뜻한 현지인들의 환대를 받으실 수 있으며, 자연경관이 뛰어났습니다. 현지 교통수단 이용 시 미리 경로를 확인하시길 권장합니다."
}
```

---

## Gemini API 통합 (Node.js)

### 설치

```bash
npm install @google/generative-ai
```

### 구현 (Backend Service)

```typescript
// server/src/services/travel-guide.service.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import { formatISO, parse } from 'date-fns';

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = client.getGenerativeModel({ model: 'gemini-pro' });

interface GenerateGuideRequest {
  destination: string;
  start_date: string; // ISO 8601
  end_date: string;
  departure_place?: string;
  departure_time?: string;
  cost_per_person?: number;
}

interface GuideContent {
  weather: string;
  outfit: string[];
  checklist: Array<{ category: string; items: string[] }>;
  currency: string;
  general_notice: string;
}

export async function generateGuide(req: GenerateGuideRequest): Promise<GuideContent> {
  const startDate = parse(req.start_date, 'yyyy-MM-dd', new Date());
  const endDate = parse(req.end_date, 'yyyy-MM-dd', new Date());
  const daysCount = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const systemPrompt = `당신은 여행 안내 전문가이며, 40대 이상 고객을 위한 실용적이고 정확한 정보를 제공합니다.

[역할]
- 여행지의 날씨, 복장, 준비물, 환율 정보를 제공
- 간단하고 명확한 언어 사용
- 불확실한 정보는 절대 포함하지 않기
- 개인적 의견이나 추천 금지

[톤]
- 따뜻하고 신뢰감 있게
- 전문적이면서도 친근하게`;

  const userPrompt = `[여행 정보]
- 목적지: ${req.destination}
- 여행 기간: ${req.start_date} ~ ${req.end_date} (${daysCount}일)
${req.departure_place ? `- 출발지: ${req.departure_place}` : ''}
${req.departure_time ? `- 출발시간: ${req.departure_time}` : ''}
${req.cost_per_person ? `- 1인 예상 경비: ${req.cost_per_person.toLocaleString()}원` : ''}

[작성 규칙]
1. 날씨: 해당 월 평균 기온, 습도, 일반적 특징만 (실시간 예보 X), 최대 3줄
2. 복장: 날씨에 맞는 기본 복장 (3~5개), 브랜드 금지, 불릿 포인트
3. 준비물: 필수 + 날씨별, 불명확한 것 생략, 불릿 + 카테고리
4. 환율: 기준 환율만, "대략적 환산" 명시, 환전처 정보, 최대 3줄
5. 일반 안내: 주요 특징, 최대 5줄, 주관적 표현 금지

[금지 사항]
- 불확실한 표현 ("~일 것으로 예상됩니다" X)
- 실시간 정보 (현재 환율, 오늘 날씨)
- 개인 취향 표현 ("맛있습니다", "최고" X)
- 장황한 설명
- 정확하지 않은 정보

[출력 형식: JSON]
{
  "weather": "...",
  "outfit": ["...", "..."],
  "checklist": [
    { "category": "필수", "items": ["...", "..."] },
    { "category": "날씨별", "items": ["...", "..."] }
  ],
  "currency": "...",
  "general_notice": "..."
}

${req.destination} ${req.start_date} ~ ${req.end_date} 여행을 위한 안내 컨텐츠를 생성해주세요.`;

  try {
    const result = await model.generateContent([
      { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }
    ]);

    const response = result.response.text();
    
    // JSON 추출
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from AI');
    }

    const content = JSON.parse(jsonMatch[0]) as GuideContent;
    
    // 유효성 검사
    if (!content.weather || !content.outfit || !content.currency || !content.general_notice) {
      throw new Error('Missing required fields in AI response');
    }

    return content;
  } catch (err) {
    console.error('Gemini API error:', err);
    throw new Error('AI 생성에 실패했습니다. 나중에 다시 시도하세요.');
  }
}
```

### API 라우트

```typescript
// server/src/routes/travel-guides.ts

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import * as travelGuideService from '../services/travel-guide.service';
import * as travelGuideDb from '../db/travel-guides.db';

export const travelGuidesRouter = Router();
travelGuidesRouter.use(requireAuth);

// POST /api/travel-guides/generate
travelGuidesRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const { destination, start_date, end_date, departure_place, departure_time, cost_per_person } = req.body;
    
    if (!destination || !start_date || !end_date) {
      return res.status(400).json({ 
        success: false, 
        error: '여행지, 출발일, 귀국일을 입력해주세요.' 
      });
    }

    const content = await travelGuideService.generateGuide({
      destination,
      start_date,
      end_date,
      departure_place,
      departure_time,
      cost_per_person: cost_per_person ? Number(cost_per_person) : undefined,
    });

    res.json({ success: true, data: content });
  } catch (err: any) {
    console.error('Generate guide error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message || 'AI 생성에 실패했습니다.' 
    });
  }
});

// POST /api/travel-guides
travelGuidesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const guide = await travelGuidesDb.create({
      ...req.body,
      created_by: req.user?.id, // 인증된 사용자
    });
    res.status(201).json({ success: true, data: guide });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/travel-guides
travelGuidesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '10', destination, is_archived = '0' } = req.query;
    const result = await travelGuidesDb.list({
      page: Number(page),
      limit: Number(limit),
      destination: destination as string | undefined,
      is_archived: Number(is_archived),
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/travel-guides/:id
travelGuidesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const guide = await travelGuidesDb.getById(Number(req.params.id));
    if (!guide) {
      return res.status(404).json({ success: false, error: '찾을 수 없습니다.' });
    }
    res.json({ success: true, data: guide });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/travel-guides/:id
travelGuidesRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const guide = await travelGuidesDb.update(Number(req.params.id), req.body);
    if (!guide) {
      return res.status(404).json({ success: false, error: '찾을 수 없습니다.' });
    }
    res.json({ success: true, data: guide });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/travel-guides/:id
travelGuidesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await travelGuidesDb.softDelete(Number(req.params.id));
    res.json({ success: true, message: '삭제되었습니다.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
```

---

## 클라이언트 상태 관리

### TravelGuideContext

```typescript
// client/src/context/TravelGuideContext.tsx

import { createContext, useState, useCallback } from 'react';

interface AIContent {
  weather: string;
  outfit: string[];
  checklist: Array<{ category: string; items: string[] }>;
  currency: string;
  general_notice: string;
}

interface SectionsConfig {
  general_notice: boolean;
  weather: boolean;
  outfit: boolean;
  checklist: boolean;
  currency: boolean;
  baggage?: boolean;
  custom_notice?: boolean;
}

interface TravelGuideState {
  destination: string;
  start_date: string;
  end_date: string;
  flight_schedule_id?: number;
  departure_airport?: string;
  arrival_airport?: string;
  departure_place?: string;
  departure_time?: string;
  cost_per_person?: number;
  sectionsConfig: SectionsConfig;
  aiContent?: AIContent;
  customContent?: Partial<AIContent>;
  background_url?: string;
  isGenerating: boolean;
  error?: string;
}

const defaultSectionsConfig: SectionsConfig = {
  general_notice: true,
  weather: true,
  outfit: true,
  checklist: true,
  currency: true,
  baggage: false,
  custom_notice: false,
};

export const TravelGuideContext = createContext<{
  state: TravelGuideState;
  setDestination: (dest: string) => void;
  setDates: (start: string, end: string) => void;
  setFlightInfo: (id: number, dept_airport: string, arr_airport: string) => void;
  setAdditionalInfo: (place?: string, time?: string, cost?: number) => void;
  toggleSection: (section: keyof SectionsConfig) => void;
  generateAI: () => Promise<void>;
  updateAIContent: (section: string, value: any) => void;
  updateCustomContent: (section: string, value: any) => void;
  setBackgroundUrl: (url: string) => void;
  resetForm: () => void;
}>(null as any);

export function TravelGuideProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TravelGuideState>({
    destination: '',
    start_date: '',
    end_date: '',
    sectionsConfig: defaultSectionsConfig,
    isGenerating: false,
  });

  const setDestination = useCallback((dest: string) => {
    setState(prev => ({ ...prev, destination: dest }));
  }, []);

  const setDates = useCallback((start: string, end: string) => {
    setState(prev => ({ ...prev, start_date: start, end_date: end }));
  }, []);

  const setFlightInfo = useCallback((id: number, dept_airport: string, arr_airport: string) => {
    setState(prev => ({
      ...prev,
      flight_schedule_id: id,
      departure_airport: dept_airport,
      arrival_airport: arr_airport,
    }));
  }, []);

  const setAdditionalInfo = useCallback((place?: string, time?: string, cost?: number) => {
    setState(prev => ({
      ...prev,
      departure_place: place,
      departure_time: time,
      cost_per_person: cost,
    }));
  }, []);

  const toggleSection = useCallback((section: keyof SectionsConfig) => {
    setState(prev => ({
      ...prev,
      sectionsConfig: {
        ...prev.sectionsConfig,
        [section]: !prev.sectionsConfig[section],
      },
    }));
  }, []);

  const generateAI = useCallback(async () => {
    setState(prev => ({ ...prev, isGenerating: true, error: undefined }));
    try {
      const res = await fetch('/api/travel-guides/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: state.destination,
          start_date: state.start_date,
          end_date: state.end_date,
          departure_place: state.departure_place,
          departure_time: state.departure_time,
          cost_per_person: state.cost_per_person,
        }),
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'AI 생성에 실패했습니다.');
      }

      const { data } = await res.json();
      setState(prev => ({ ...prev, aiContent: data }));
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err.message || 'AI 생성에 실패했습니다.',
      }));
    } finally {
      setState(prev => ({ ...prev, isGenerating: false }));
    }
  }, [state.destination, state.start_date, state.end_date, state.departure_place, state.departure_time, state.cost_per_person]);

  const updateAIContent = useCallback((section: string, value: any) => {
    setState(prev => ({
      ...prev,
      aiContent: prev.aiContent ? { ...prev.aiContent, [section]: value } : undefined,
    }));
  }, []);

  const updateCustomContent = useCallback((section: string, value: any) => {
    setState(prev => ({
      ...prev,
      customContent: { ...prev.customContent, [section]: value },
    }));
  }, []);

  const setBackgroundUrl = useCallback((url: string) => {
    setState(prev => ({ ...prev, background_url: url }));
  }, []);

  const resetForm = useCallback(() => {
    setState({
      destination: '',
      start_date: '',
      end_date: '',
      sectionsConfig: defaultSectionsConfig,
      isGenerating: false,
    });
  }, []);

  return (
    <TravelGuideContext.Provider
      value={{
        state,
        setDestination,
        setDates,
        setFlightInfo,
        setAdditionalInfo,
        toggleSection,
        generateAI,
        updateAIContent,
        updateCustomContent,
        setBackgroundUrl,
        resetForm,
      }}
    >
      {children}
    </TravelGuideContext.Provider>
  );
}
```

---

## 환경 변수

```bash
# .env (backend)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-pro

# .env (frontend, 선택사항)
VITE_API_URL=http://localhost:3001
```

---

## 에러 처리

### 클라이언트 에러

```typescript
// Toast 통합
const [error, setError] = useState<string | null>(null);

if (error) {
  toast.error(error);
}

// API 에러 핸들링
try {
  const res = await fetch('/api/travel-guides/generate', { ... });
  if (!res.ok) {
    const { error } = await res.json();
    setError(error);
    return;
  }
} catch (err: any) {
  setError('네트워크 오류: ' + err.message);
}
```

### 서버 에러

```typescript
// Express 미들웨어
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, error: '입력 데이터가 유효하지 않습니다.' });
  }

  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(400).json({ success: false, error: '중복된 제목입니다.' });
  }

  res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
});
```

---

## 성능 최적화

### 1. API 응답 캐싱

```typescript
// 항공편 데이터 캐싱 (30분)
const flightScheduleCache = new Map();
const CACHE_TTL = 30 * 60 * 1000;

function getFlightSchedule(id: number) {
  const cached = flightScheduleCache.get(id);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  // API 호출 후 캐싱
}
```

### 2. 이미지 최적화

```typescript
// html2canvas 설정
const canvas = await html2canvas(element, {
  backgroundColor: '#FAFAF5',
  scale: 2, // Retina 지원
  logging: false,
  useCORS: true, // CORS 이미지 포함
  allowTaint: true, // 외부 리소스 허용
});
```

### 3. 번들 최적화

```typescript
// html2canvas 동적 로드
const handleCopyImage = async () => {
  const html2canvas = (await import('html2canvas')).default;
  // ...
};
```

