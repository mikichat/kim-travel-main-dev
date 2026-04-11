# 02-features.md — 기능 명세서

## 기능 맵 (우선순위)

```
Phase 0 (MVP 필수)
├─ P0-T1: AI 안내문 생성 (Gemini API 호출)
├─ P0-T2: 항공편 불러오기 (flight_schedules 팝업)
└─ P0-T3: 이미지 캡처 & 클립보드 복사 (html2canvas)

Phase 1 (편의 기능)
├─ P1-T1: 인라인 편집 (AI 결과 직접 수정)
├─ P1-T2: 섹션 토글 (날씨/복장/준비물/환율 On/Off)
├─ P1-T3: 저장 & 목록 (DB 저장, 재사용)
└─ P1-T4: 모바일 일정표 (tourworld1 schedules)

Phase 2 (고도화)
├─ P2-T1: 배경 이미지 자동 설정 (Unsplash)
└─ P2-T2: 커스텀 공지사항 (여행사 브랜드별)
```

---

## Phase 0 기능 명세

### P0-T1: AI 안내문 생성

**설명**: 여행지+날짜 입력 → Gemini API 호출 → 날씨/복장/준비물/환율 자동 생성

**입력**:
- `destination` (string): 여행지 이름 (예: "필리핀")
- `start_date` (string): 출발 날짜 (ISO 8601)
- `end_date` (string): 귀국 날짜 (ISO 8601)
- `departure_place` (string, 선택): 출발지 (예: "함열스포츠센터")
- `departure_time` (string, 선택): 출발 시간 (예: "02:00")
- `cost_per_person` (number, 선택): 1인 경비 (원)

**프롬프트 설계** (환각 방지):
```
당신은 여행 안내 전문가입니다.

[여행지 정보]
- 여행지: {destination}
- 날짜: {start_date} ~ {end_date} ({days}일)
- 출발지: {departure_place} ({departure_time} 출발)
- 1인 경비: {cost_per_person}원

[생성 규칙]
1. 날씨: 해당 월 평균 기온과 습도만 제공 (실시간 예보 X)
2. 복장: 날씨에 맞는 기본 복장만 (구체적 브랜드/상점 X)
3. 준비물: 
   - 필수 (여권, 비자, 예방접종)
   - 날씨별 추가 (선글라스, 우산 등)
   - 불명확한 정보는 생략
4. 환율: 해당 월 기준치 제공, "대략적 환산" 명시
5. 톤: 따뜻하고 전문적, 40대+ 대상

[금지 사항]
- 확실하지 않은 정보 생략
- 정확하지 않은 환율 제공 금지 ("확인하세요" 명시)
- 장황한 설명 금지 (핵심만)
- 가치 판단 금지 ("최고의", "반드시" 등)

[출력 형식 (JSON)]
{
  "weather": "문단 (3~5줄)",
  "outfit": "불릿 포인트 (3~5개)",
  "checklist": [
    { "category": "필수", "items": ["여권", "비자", ...] },
    { "category": "날씨별", "items": ["선글라스", ...] }
  ],
  "currency": "문단 (2~3줄, 환율+팁)",
  "general_notice": "일반 안내사항 (2~3줄)"
}

[예시]
필리핀 필리핀 12월 5일 여행 기준:
- weather: "12월 필리핀은 건기로 평균 기온 28°C, 습도 75% 정도입니다. 낮에는 햇빛이 강하고 새벽은 서늘합니다."
- outfit: ["반팔/민소매 셔츠", "린넨 바지", "선글라스 및 모자", "가벼운 겉옷 (에어컨용)"]
- currency: "1필리핀 페소는 현재 약 24원입니다. 환전은 공항에서 가능하며, 신용카드 사용 가능한 곳이 많습니다. (확인 필요)"

{destination}, {start_date} ~ {end_date}에 대한 안내문을 생성해주세요.
```

**출력**:
```json
{
  "weather": "문단",
  "outfit": ["항목1", "항목2", ...],
  "checklist": [
    { "category": "필수", "items": [...] },
    { "category": "날씨별", "items": [...] }
  ],
  "currency": "문단",
  "general_notice": "문단"
}
```

**에러 처리**:
- API 호출 실패 → "AI 생성에 실패했습니다. 나중에 다시 시도하세요."
- 빈 응답 → "유효한 응답을 받지 못했습니다."
- 토큰 초과 → "요청이 너무 깁니다."

**저장 안 함**: 미리보기만 표시, [저장] 버튼으로 명시적 저장

---

### P0-T2: 항공편 불러오기

**설명**: flight_schedules 팝업에서 항공편 선택 → 여행지/기간/출발시간/경비 자동 채움

**인터랙션**:
1. [항공편 불러오기] 버튼 클릭
2. 팝업: flight_schedules 목록 (기존 flight-schedules.tsx 재사용)
3. 항공편 선택
4. 팝업 닫기
5. 입력 필드 자동 채움:
   - `destination`: flight_schedules의 arrival_airport → 공항명 → 국가명 (매핑)
   - `start_date`: departure_date
   - `end_date`: (추론 가능하면) 마지막 arrival_date, 아니면 수동
   - `departure_time`: departure_time
   - `cost_per_person`: (선택) 기존 입력값 유지

**데이터 매핑** (예):
```javascript
// flight_schedules.arrival_airport = "NRT" (성田)
// → getAirportName("NRT") = "Narita"
// → extract country: "Japan"
// input.destination = "일본"
// input.start_date = flight.departure_date
```

**구현 위치**: 
- 팝업: `client/src/pages/SavedFlights.tsx` (기존) 또는 새 `FlightSchedulePopup.tsx`
- 통합: `TravelGuideForm.tsx` 컴포넌트 내

---

### P0-T3: 이미지 캡처 & 클립보드 복사

**설명**: 미리보기를 html2canvas로 이미지로 변환 → 클립보드 복사

**인터랙션**:
1. [안내문 이미지 복사] 버튼 클릭
2. 미리보기 컨테이너 (id="guide-preview") html2canvas 변환
3. 이미지 → Blob → 클립보드 복사
4. "이미지가 클립보드에 복사되었습니다. 카톡에 붙여넣으세요."
5. [일정표 이미지 복사] 버튼 → 일정표만 캡처

**코드 패턴** (air-booking 기존):
```typescript
import html2canvas from 'html2canvas';

const handleCopyImage = async (elementId: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#FAFAF5',
      scale: 2, // 고해상도
      logging: false,
    });
    
    canvas.toBlob((blob) => {
      if (blob) {
        navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        toast.success('이미지가 클립보드에 복사되었습니다.');
      }
    });
  } catch (err) {
    toast.error('이미지 캡처에 실패했습니다.');
  }
};
```

**미리보기 레이아웃**:
- ID: `guide-preview`
- 크기: 800px (카톡 최적 너비)
- 패딩: 충분한 마진
- 배경: #FAFAF5
- 폰트: 최소 16px

---

## Phase 1 기능 명세

### P1-T1: 인라인 편집

**설명**: 미리보기의 각 섹션을 클릭 → 모달에서 수정 → 실시간 반영

**섹션**:
1. 일반 안내사항
2. 날씨
3. 복장
4. 준비물 (카테고리별)
5. 환율
6. (선택) 커스텀 공지

**인터랙션**:
```
미리보기 [섹션] 위의 [수정] 버튼 클릭
  ↓
모달 열기: "섹션 편집"
  - 텍스트 입력 (불릿 포인트 또는 문단)
  - 대비 미리보기
  ↓
[저장] 버튼 → ai_content 병합
  ↓
미리보기 실시간 반영
```

**데이터 구조**:
```javascript
// state: aiContent
{
  weather: "...",
  outfit: ["", ""],
  checklist: [
    { category: "필수", items: ["", ""] },
    { category: "날씨별", items: [""] }
  ],
  currency: "...",
  general_notice: "..."
}

// 수정 후: aiContent[section] = newValue
// → setAiContent({ ...aiContent, [section]: newValue })
// → 미리보기 자동 반영
```

**모달 컴포넌트**: `EditSectionModal.tsx`

---

### P1-T2: 섹션 토글

**설명**: 각 섹션 On/Off → 필요 정보만 표시

**토글 항목**:
- [ ] 일반 안내사항
- [x] 날씨
- [x] 복장 / 준비물
- [x] 환율
- [ ] 수하물 정보 (예정)
- [ ] 커스텀 공지

**데이터 구조**:
```javascript
// state: sectionsConfig
{
  general_notice: true,
  weather: true,
  outfit: true,
  checklist: true,
  currency: true,
  baggage: false,
  custom_notice: false
}
```

**저장 위치**: travel_guides.sections_config (JSON)

**미리보기**: sectionsConfig 기준으로 렌더링

```jsx
{sectionsConfig.weather && (
  <section className="guide-weather">
    <h3>날씨</h3>
    <p>{aiContent.weather}</p>
  </section>
)}
```

---

### P1-T3: 저장 & 목록

**설명**: 작성한 안내문을 DB에 저장 → 이전 안내문 재사용

**저장 흐름**:
1. [저장] 버튼 클릭
2. 제목 입력 모달 (기본: "{destination} {days}일 여행")
3. POST /api/travel-guides → 200 OK
4. "저장되었습니다."
5. saved_id 반환 → 추후 [편집] 가능

**목록 불러오기**:
1. [저장된 안내문 목록] 버튼
2. 팝업: GET /api/travel-guides (페이지네이션)
3. 리스트:
   ```
   [필리핀 5일 여행] 2024-12-18 [편집] [삭제]
   [일본 3일 여행] 2024-11-20 [편집] [삭제]
   ```
4. 선택 → 입력 필드 자동 채움

**API**:
```
POST /api/travel-guides
{
  title: "필리핀 5일 여행",
  destination: "필리핀",
  start_date: "2024-12-18",
  end_date: "2024-12-22",
  flight_schedule_id: 123,
  departure_place: "함열스포츠센터",
  departure_time: "02:00",
  cost_per_person: 2380000,
  sections_config: { weather: true, ... },
  ai_content: { weather: "...", ... },
  background_url: null
}

GET /api/travel-guides?page=1&limit=10
응답:
{
  success: true,
  data: {
    guides: [...],
    total: 25,
    page: 1,
    limit: 10
  }
}

GET /api/travel-guides/:id
응답:
{
  success: true,
  data: { id, title, destination, ..., ai_content, custom_content }
}

PUT /api/travel-guides/:id
{
  ai_content: { ... }, // 또는 custom_content
  sections_config: { ... }
}

DELETE /api/travel-guides/:id
```

---

### P1-T4: 모바일 일정표

**설명**: tourworld1 schedules API → 항공편+버스 일정표 모바일 최적화 렌더링

**출력 예**:
```
날짜     | 항공편      | 도시     | 버스
---------|-----------|---------|----------
12/18    | AA123     | 서울→인천 | 출발
12/18    | AA123     | 인천→마닐라| 비행
12/19    | -         | 마닐라   | 호텔→몰
12/20    | -         | 마닐라   | 몰→해변
12/22    | AA456     | 마닐라→인천| 비행
12/22    | AA456     | 인천→서울| 도착
```

**기술**:
- 데이터 출처: tourworld1 /api/schedules/:id
- 렌더링: 모바일 최적화 테이블 (TailwindCSS)
- 폰트: 14px+, 높은 대비
- 반응형: 모바일 스크롤 가능

**컴포넌트**: `MobileScheduleTable.tsx`

---

## Phase 2 기능 명세

### P2-T1: 배경 이미지 자동 설정

**설명**: Unsplash API → 여행지 관련 이미지 자동 매칭 → 히어로 섹션

**구현**:
1. AI 생성 시 destination + season 조합으로 Unsplash 검색
2. 첫 번째 이미지 URL → background_url에 저장
3. 미리보기 히어로 섹션 배경으로 적용

**쿼리**:
```javascript
// destination = "필리핀", start_date = "2024-12-18"
// season = "12월" = "겨울/건기"
const query = `${destination} ${season} travel`;
// → "필리핀 겨울 여행"
// Unsplash API: https://api.unsplash.com/search/photos?query={query}&per_page=1
```

**히어로 섹션**:
```jsx
<div 
  className="guide-hero"
  style={{
    backgroundImage: `url(${background_url})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    height: '300px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}
>
  <div className="hero-overlay">
    <h1>{destination} {days}일 여행</h1>
    <p>{start_date} ~ {end_date}</p>
  </div>
</div>
```

**이미지 최적화**:
- 크기: 1200x600px 이상
- 포맷: WebP 또는 JPG
- 로딩: 지연 로드 (Lazy Load)

---

### P2-T2: 커스텀 공지사항

**설명**: 여행사 고유 공지 섹션 추가 (예: "선물 추천", "카드 안내" 등)

**저장**:
```javascript
// sections_config에 추가
{
  ...,
  custom_notice: true,
  custom_notice_title: "여행사 공지",
  custom_notice_content: "..."
}
```

**편집**:
1. 미리보기의 [수정] → 커스텀 공지 모달
2. 제목 + 내용 입력
3. 저장 → custom_content 필드 업데이트

**렌더링**:
```jsx
{sectionsConfig.custom_notice && (
  <section className="guide-custom-notice">
    <h3>{custom_notice_title}</h3>
    <p>{custom_notice_content}</p>
  </section>
)}
```

---

## 기능 의존성 그래프

```
P0-T1 (AI 생성)
  ├─ Gemini API 설정
  ├─ 프롬프트 설계
  └─ JSON 파싱

P0-T2 (항공편 불러오기)
  ├─ flight_schedules 팝업 (기존)
  └─ 데이터 매핑 로직

P0-T3 (이미지 캡처)
  ├─ html2canvas 설정
  └─ 클립보드 API
    
P1-T1 (인라인 편집)
  ├─ P0-T1 (AI 결과 필요)
  └─ EditSectionModal.tsx

P1-T2 (섹션 토글)
  ├─ P0-T1 (AI 결과 필요)
  └─ 상태 관리

P1-T3 (저장 & 목록)
  ├─ P0-T1, P0-T2 (기본 정보 필요)
  ├─ travel_guides 테이블
  └─ CRUD API

P1-T4 (모바일 일정표)
  ├─ P0-T2 (flight_schedule_id 필요)
  └─ tourworld1 schedules API

P2-T1 (배경 이미지)
  ├─ P0-T1 (destination 필요)
  └─ Unsplash API

P2-T2 (커스텀 공지)
  ├─ P1-T1, P1-T2 (편집 기능 필요)
  └─ 상태 관리
```

---

## 완료 조건 체크리스트

### P0-T1
- [ ] Gemini API 호출 성공
- [ ] JSON 응답 파싱 성공
- [ ] 환각 방지 프롬프트 적용
- [ ] 에러 처리 (API 실패, 빈 응답)
- [ ] 타입스크립트 타입 정의

### P0-T2
- [ ] flight_schedules 팝업 통합
- [ ] 데이터 매핑 로직 정확
- [ ] 입력 필드 자동 채움
- [ ] 여행지 추론 정확도 80% 이상

### P0-T3
- [ ] html2canvas 이미지 생성
- [ ] 클립보드 복사 성공
- [ ] 이미지 해상도 ≥1600x1000px
- [ ] 모바일 환경에서도 작동

### P1-T1
- [ ] 모달 열기/닫기
- [ ] 텍스트 수정 반영
- [ ] 불릿 포인트 편집
- [ ] 미리보기 실시간 업데이트

### P1-T2
- [ ] 토글 상태 저장
- [ ] 미리보기 섹션 On/Off
- [ ] 저장 시 sections_config 반영

### P1-T3
- [ ] POST /api/travel-guides 성공
- [ ] GET /api/travel-guides 페이지네이션
- [ ] PUT /api/travel-guides/:id 수정
- [ ] DELETE /api/travel-guides/:id soft delete
- [ ] 목록 불러오기 팝업

### P1-T4
- [ ] tourworld1 schedules API 호출
- [ ] 테이블 렌더링
- [ ] 모바일 최적화
- [ ] 날짜/항공편 정렬

### P2-T1
- [ ] Unsplash API 호출
- [ ] 이미지 URL 저장
- [ ] 히어로 섹션 적용
- [ ] 실패 시 기본 배경 사용

### P2-T2
- [ ] 커스텀 공지 입력
- [ ] 제목/내용 수정
- [ ] 저장 후 표시
- [ ] 섹션 토글 연동

