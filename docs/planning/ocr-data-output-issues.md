# OCR 데이터 저장/출력 문제 분석 보고서

> 작성일: 2026-01-21
> 대상: tourworld1/landing 프로젝트

---

## 1. 시스템 아키텍처 개요

### 데이터 흐름

```
사용자 (클라이언트)
    ↓
Step3Itinerary.tsx (파일 업로드 UI)
    ↓
itineraryService.ts (API 호출)
    ↓
서버: itinerary.route.ts
    ├→ Google Vision OCR 또는 Gemini AI OCR
    ├→ 텍스트 파싱 (ocr.service.ts 또는 gemini-ocr.service.ts)
    ├→ ItineraryTemplate 테이블 저장
    └→ Schedule 테이블 저장
    ↓
데이터 표시
    ├→ ScheduleSelector 컴포넌트 (테이블 조회)
    └→ Itinerary.tsx 컴포넌트 (일정 렌더링)
```

### 관련 파일

| 구분 | 파일 경로 |
|------|----------|
| OCR 서비스 | `server/src/services/ocr.service.ts` |
| Gemini OCR | `server/src/services/gemini-ocr.service.ts` |
| API 라우터 | `server/src/routes/itinerary.route.ts` |
| 클라이언트 업로드 | `client/src/components/wizard/steps/Step3Itinerary.tsx` |
| 일정 렌더링 | `client/src/components/templates/Itinerary.tsx` |
| DB 스키마 | `server/prisma/schema.prisma` |

---

## 2. 핵심 문제점

### 문제 1: Activity별 교통편 정보 손실 ⚠️ HIGH

**현상**
- OCR 파싱에서 Ferry, 전용차량 등 특수 교통편을 `activity.transport`에 저장
- Schedule 테이블 저장 시 `day.transport` (일차 레벨)만 사용하여 활동별 교통편 누락

**문제 코드 위치**

`itinerary.route.ts` Line 86-87:
```typescript
// 현재 코드 - activity.transport를 무시
return activities.map((act: any) => ({
    transport: day.transport || '',  // ❌ act.transport 미사용
    ...
}));
```

**영향**
- 브로슈어 출력 시 활동별 교통편 정보가 표시되지 않음
- Ferry 탑승 일정이 있어도 교통편에 "전용차량"만 표시됨

**해결 방안**
```typescript
// 수정 코드
return activities.map((act: any) => ({
    transport: act.transport || day.transport || '',  // ✅ fallback 처리
    ...
}));
```

---

### 문제 2: 데이터 구조 필드명 불일치 ⚠️ HIGH

**현상**
- OCR 결과, Step3Itinerary, Itinerary 컴포넌트 간 필드명이 다름
- location 필드가 OCR에서 생성되지 않아 항상 빈칸

**필드 매핑 불일치**

| 필드 | OCR 결과 | Step3Itinerary | Itinerary.tsx | 결과 |
|------|----------|----------------|---------------|------|
| 장소 | ❌ 없음 | `location` | `location` | 빈칸 |
| 내용 | `description` | `description` | `content` | 미스매치 |
| 시간 | `time` | `time` | `time` | ✅ 정상 |

**문제 코드 위치**

`ocr.service.ts` Line 8-13:
```typescript
export interface ParsedActivity {
    time: string;
    location?: string;     // 선택사항이지만 실제로 설정 안 됨
    transport?: string;
    description: string;   // Itinerary에서는 'content' 필요
}
```

`Step3Itinerary.tsx` Line 197:
```typescript
activities: day.activities.map((a: any) => ({
    location: a.location || '',  // 항상 undefined
    description: a.description || ''
}))
```

`Itinerary.tsx` Line 5-9:
```typescript
interface ScheduleItem {
    time: string;
    location: string;      // 필수 필드로 기대
    content: string;       // description이 아닌 content
}
```

**해결 방안**

Option A: OCR 서비스에서 location 추출 로직 추가
```typescript
// description에서 장소명 추출
const extractLocation = (description: string): string => {
    const locationPattern = /^([^-–]+)[-–]/;
    const match = description.match(locationPattern);
    return match ? match[1].trim() : '';
};
```

Option B: 클라이언트에서 필드 변환
```typescript
// Step3Itinerary.tsx
activities: day.activities.map((a: any) => ({
    time: a.time || '',
    location: a.location || extractLocationFromDescription(a.description),
    transport: a.transport || day.transport || '',
    content: a.description || a.content || ''  // 필드명 매핑
}))
```

---

### 문제 3: 병합 셀(rowspan) 처리 불안정 ⚠️ MEDIUM

**현상**
- Gemini OCR의 rowspan 계산이 순차적 행 처리만 가정
- 테이블 행 순서가 변경되면 지역/교통편 정보가 잘못 매핑됨

**문제 코드 위치**

`gemini-ocr.service.ts` Line 185-200:
```typescript
let currentRegion = '';
let regionRemaining = 0;

for (const row of ocrResult.rows) {
    if (row.region !== null) {
        currentRegion = row.region;
        regionRemaining = row.region_rowspan - 1;
    } else if (regionRemaining > 0) {
        regionRemaining--;  // 순차적 처리만 가능
    }
    // 행 순서가 바뀌면 오류 발생
}
```

**해결 방안**
```typescript
// 행 인덱스 기반 병합 범위 계산
interface MergeRange {
    startIndex: number;
    endIndex: number;
    value: string;
}

const regionMerges: MergeRange[] = [];

ocrResult.rows.forEach((row, index) => {
    if (row.region !== null && row.region_rowspan > 1) {
        regionMerges.push({
            startIndex: index,
            endIndex: index + row.region_rowspan - 1,
            value: row.region
        });
    }
});

// 인덱스 기반으로 region 찾기
const getRegionForRow = (rowIndex: number): string => {
    const merge = regionMerges.find(m =>
        rowIndex >= m.startIndex && rowIndex <= m.endIndex
    );
    return merge?.value || ocrResult.rows[rowIndex].region || '';
};
```

---

### 문제 4: JSON 문자열 저장으로 쿼리 불가 ⚠️ MEDIUM

**현상**
- ItineraryTemplate의 `days` 필드가 JSON 문자열로 저장
- 데이터베이스 레벨에서 쿼리 불가능 (특정 지역 일정 검색 등)

**문제 코드 위치**

`schema.prisma`:
```prisma
model ItineraryTemplate {
  days        String           // JSON 문자열로 저장
}
```

`ocr.service.ts` Line 340:
```typescript
days: JSON.stringify(days),  // 구조화되지 않은 문자열
```

**영향**
- "방콕" 지역이 포함된 템플릿 검색 불가
- 모든 레코드를 로드 후 메모리에서 필터링 필요

**해결 방안**

Option A: JSON 타입 사용 (PostgreSQL)
```prisma
model ItineraryTemplate {
  days        Json           // PostgreSQL JSON 타입
}
```

Option B: 정규화된 별도 테이블
```prisma
model ItineraryDay {
  id              String   @id @default(uuid())
  templateId      String
  template        ItineraryTemplate @relation(fields: [templateId])
  dayNumber       Int
  region          String?
  transport       String?

  activities      ItineraryActivity[]
}

model ItineraryActivity {
  id              String   @id @default(uuid())
  dayId           String
  day             ItineraryDay @relation(fields: [dayId])
  time            String?
  location        String?
  transport       String?
  description     String?
}
```

---

### 문제 5: 식사 정보 문자열 저장 ⚠️ LOW

**현상**
- 식사 정보를 "조:xxx, 중:yyy, 석:zzz" 형식으로 저장
- 파싱 오버헤드 발생

**문제 코드 위치**

`itinerary.route.ts` Line 79:
```typescript
meals: day.meals ? `조:${breakfast}, 중:${lunch}, 석:${dinner}` : ''
```

**해결 방안**
```prisma
model Schedule {
  // 문자열 대신 개별 필드
  mealBreakfast   String?
  mealLunch       String?
  mealDinner      String?
}
```

---

### 문제 6: 시간 범위 정보 미사용 ⚠️ LOW

**현상**
- Gemini OCR에서 `time_start`, `time_end` 추출
- `time_end`는 저장되지 않고 버려짐

**문제 코드 위치**

`gemini-ocr.service.ts` Line 211:
```typescript
const time = row.time_start || '';  // time_end 미사용
```

**해결 방안**
```typescript
const time = row.time_end
    ? `${row.time_start} ~ ${row.time_end}`
    : row.time_start || '';
```

---

## 3. 데이터 흐름 상세

### 저장 흐름

```
업로드 이미지 (Base64)
    ↓
[OCR 추출]
    ↓ Google Vision: extractTextFromImage() → 문자열
    ↓ Gemini: extractScheduleWithGemini() → 구조화된 JSON
    ↓
[파싱]
    ↓ parseItineraryText() → ParsedDay[]
    ↓
[저장]
    ├→ ItineraryTemplate: days JSON 문자열로 저장
    ├→ Schedule: activities를 개별 행으로 변환
    └→ rawText: OCR 원본 저장

⚠️ Schedule 저장 시 activity.transport 정보 손실
```

### 조회 흐름

```
getItineraryDetail(templateId)
    ↓
ItineraryTemplate 조회
    ↓
days JSON 문자열 파싱
    ↓
클라이언트에 반환
    ↓
Step3Itinerary: 데이터 변환 (location 필드 추가 시도)
    ↓
Itinerary 컴포넌트: 테이블 렌더링

⚠️ 필드 불일치로 location, content 빈칸 발생
```

---

## 4. 우선순위별 수정 계획

### Phase 1: 긴급 (데이터 손실 방지)

| 작업 | 파일 | 예상 변경량 |
|------|------|------------|
| Activity별 교통편 저장 | itinerary.route.ts | ~5줄 |
| 필드명 매핑 (description→content) | Step3Itinerary.tsx | ~10줄 |

### Phase 2: 중요 (데이터 품질 향상)

| 작업 | 파일 | 예상 변경량 |
|------|------|------------|
| location 필드 추출 로직 | ocr.service.ts | ~20줄 |
| rowspan 처리 개선 | gemini-ocr.service.ts | ~30줄 |

### Phase 3: 개선 (장기)

| 작업 | 파일 | 예상 변경량 |
|------|------|------------|
| DB 스키마 정규화 | schema.prisma | 신규 모델 |
| 식사 정보 구조화 | 다수 파일 | ~50줄 |
| 시간 범위 저장 | gemini-ocr.service.ts | ~5줄 |

---

## 5. 테스트 시나리오

### TC-1: Activity별 교통편 저장 확인

1. Ferry가 포함된 일정 이미지 OCR 업로드
2. Schedule 테이블에서 해당 활동의 transport 필드 확인
3. 기대값: "Ferry" 또는 해당 교통편

### TC-2: 필드 매핑 확인

1. 일정 템플릿 조회
2. Itinerary 컴포넌트에서 렌더링 확인
3. 기대값: content 필드에 description 값 표시

### TC-3: 병합 셀 처리 확인

1. 지역이 3일에 걸쳐 병합된 일정 이미지 업로드
2. 각 일차별 region 값 확인
3. 기대값: 3일 모두 동일한 지역명

---

## 6. 참고: 현재 데이터베이스 스키마

```prisma
model ItineraryTemplate {
  id          String   @id @default(uuid())
  name        String
  destination String
  duration    String
  days        String        // ⚠️ JSON 문자열
  rawText     String?
  sourceFile  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@map("itinerary_templates")
}

model Schedule {
  id          String   @id @default(uuid())
  groupName   String?
  dayNumber   Int
  eventDate   String?
  region      String?
  transport   String?       // ⚠️ 일차 레벨만 저장됨
  time        String?
  description String?
  meals       String?       // ⚠️ 문자열로 저장
  sourceType  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@map("schedules")
}
```
