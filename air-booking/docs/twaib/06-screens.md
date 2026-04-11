# 06-screens.md — 화면 목록 및 라우트

## 라우팅 구조

### 현재 air-booking 라우팅 (PnrConverter 탭)

```
<PnrConverter />
  ├─ Tab: 변환기 (converter)
  │   └─ <PnrConverterTab />
  ├─ Tab: 저장된 항공편 (saved)
  │   └─ <SavedFlights />
  ├─ Tab: 버스예약 (bus)
  │   └─ <BusReservation />
  └─ Tab: 안내문 (notices) ◄─── 새 탭 (기존 <Notices /> 교체)
      └─ <TravelGuideTab />  ◄─── 새 컴포넌트
```

### 새 라우트 추가

```
/pnr-converter
  └─ query: tab=notices  ◄─── 기본 네비게이션은 탭 ID로 관리
```

---

## 컴포넌트 계층 구조

```
PnrConverter (기존)
│
├─ TravelGuideTab (새)
│  │
│  ├─ TravelGuideForm
│  │  ├─ DestinationInput
│  │  ├─ DateRangeInput
│  │  ├─ FlightSchedulePopup
│  │  ├─ AdditionalInfoForm
│  │  └─ SectionsToggle
│  │
│  ├─ TravelGuidePreview
│  │  ├─ GuideHero
│  │  ├─ GuideSection[] (map)
│  │  │  ├─ GeneralNoticeSection
│  │  │  ├─ WeatherSection
│  │  │  ├─ OutfitSection
│  │  │  ├─ ChecklistSection
│  │  │  ├─ CurrencySection
│  │  │  └─ CustomNoticeSection
│  │  └─ GuideFooter
│  │
│  ├─ ActionButtons
│  │  ├─ CopyImageButton
│  │  ├─ CopyScheduleButton
│  │  ├─ SaveButton
│  │  └─ LoadGuideButton
│  │
│  ├─ MobileScheduleTable
│  │
│  ├─ EditSectionModal
│  │
│  ├─ SaveGuideModal
│  │
│  └─ SavedGuidesPopup
│
└─ FlightSchedulePopup (기존, 재사용)
```

---

## 주요 컴포넌트 명세

### 1. TravelGuideTab (메인 컨테이너)

**경로**: `client/src/pages/TravelGuideTab.tsx`

**역할**: 안내문 탭의 전체 레이아웃 관리

**상태**:
- destination, start_date, end_date
- flight_schedule_id, departure_airport, arrival_airport
- departure_place, departure_time, cost_per_person
- sectionsConfig
- aiContent
- customContent
- background_url
- isGenerating
- showEditModal
- editingSection
- showSaveModal
- savedGuides

**Props**: 없음 (Context 또는 Provider 사용)

**구현 패턴**:
```jsx
export function TravelGuideTab() {
  // Context 또는 local state 관리
  // Layout: Input → Preview → Actions → Schedule
  return (
    <div className="travel-guide-container">
      <TravelGuideForm />
      {aiContent && (
        <>
          <TravelGuidePreview />
          <ActionButtons />
          <MobileScheduleTable />
        </>
      )}
      <EditSectionModal />
      <SaveGuideModal />
      <SavedGuidesPopup />
    </div>
  );
}
```

---

### 2. TravelGuideForm

**경로**: `client/src/pages/pnr-converter/TravelGuideForm.tsx`

**역할**: 입력 필드 및 생성 버튼

**Props**:
```typescript
interface TravelGuideFormProps {
  onDestinationChange: (dest: string) => void;
  onDatesChange: (start: string, end: string) => void;
  onFlightSelect: (id: number, dept: string, arr: string) => void;
  onAdditionalInfoChange: (place?: string, time?: string, cost?: number) => void;
  onSectionToggle: (section: string) => void;
  onGenerate: () => Promise<void>;
  isGenerating: boolean;
  error?: string;
  sectionsConfig: SectionsConfig;
  destination: string;
  start_date: string;
  end_date: string;
  flight_schedule_id?: number;
  departure_time?: string;
  cost_per_person?: number;
}
```

**자식 컴포넌트**:
- DestinationInput
- DateRangeInput
- FlightSchedulePopup
- AdditionalInfoForm
- SectionsToggle
- GenerateButton

**상호작용**:
```
사용자 입력
  ↓
onDestinationChange / onDatesChange / onAdditionalInfoChange
  ↓
부모 상태 업데이트
  ↓
Form 리렌더링 (현재 값 표시)
```

---

### 3. TravelGuidePreview

**경로**: `client/src/pages/pnr-converter/TravelGuidePreview.tsx`

**역할**: AI 생성 결과 미리보기 및 섹션 렌더링

**Props**:
```typescript
interface TravelGuidePreviewProps {
  aiContent: AIContent;
  customContent?: Partial<AIContent>;
  sectionsConfig: SectionsConfig;
  background_url?: string;
  destination: string;
  start_date: string;
  end_date: string;
  onEditSection: (section: string) => void;
  isLoading?: boolean;
}
```

**구현**:
```jsx
export function TravelGuidePreview({
  aiContent,
  customContent,
  sectionsConfig,
  ...props
}: TravelGuidePreviewProps) {
  // 최종 콘텐츠 병합: customContent > aiContent
  const finalContent = {
    weather: customContent?.weather ?? aiContent.weather,
    outfit: customContent?.outfit ?? aiContent.outfit,
    // ...
  };

  return (
    <div id="guide-preview" className="guide-preview">
      <GuideHero {...} />
      {sectionsConfig.general_notice && (
        <GeneralNoticeSection content={finalContent.general_notice} />
      )}
      {sectionsConfig.weather && (
        <WeatherSection content={finalContent.weather} />
      )}
      {/* ... 다른 섹션들 */}
    </div>
  );
}
```

**출력 ID**: `id="guide-preview"` (html2canvas 타겟)

---

### 4. GuideSection (기본 섹션 컴포넌트)

**경로**: `client/src/pages/pnr-converter/GuideSection.tsx`

**역할**: 섹션 렌더링 + [수정] 버튼

**Props**:
```typescript
interface GuideSectionProps {
  title: string;
  content: string | string[] | Array<{ category: string; items: string[] }>;
  sectionKey: string;
  onEdit: (sectionKey: string) => void;
  className?: string;
}
```

**구현**:
```jsx
export function GuideSection({ title, content, sectionKey, onEdit, className }: GuideSectionProps) {
  return (
    <section className={`guide-section ${className || ''}`}>
      <div className="section-header">
        <h2>{title}</h2>
        <button className="btn-edit" onClick={() => onEdit(sectionKey)}>
          수정
        </button>
      </div>
      <div className="section-content">
        {typeof content === 'string' && <p>{content}</p>}
        {Array.isArray(content) && content[0]?.category && (
          <ul>
            {content.map((cat) => (
              <li key={cat.category}>
                <strong>{cat.category}</strong>
                <ul>
                  {cat.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
        {Array.isArray(content) && !content[0]?.category && (
          <ul>
            {content.map((item) => (
              <li key={item}>✓ {item}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
```

---

### 5. EditSectionModal

**경로**: `client/src/pages/pnr-converter/EditSectionModal.tsx`

**역할**: 섹션 편집 모달

**Props**:
```typescript
interface EditSectionModalProps {
  isOpen: boolean;
  sectionKey: string;
  sectionTitle: string;
  content: string | string[] | Array<{ category: string; items: string[] }>;
  onSave: (content: any) => void;
  onClose: () => void;
}
```

**기능**:
- 텍스트 편집 (문단)
- 불릿 포인트 편집 (배열)
- 카테고리별 편집 (체크리스트)
- 실시간 미리보기

---

### 6. ActionButtons

**경로**: `client/src/pages/pnr-converter/ActionButtons.tsx`

**역할**: [이미지 복사], [저장], [목록] 버튼 그룹

**Props**:
```typescript
interface ActionButtonsProps {
  onCopyGuideImage: () => Promise<void>;
  onCopyScheduleImage: () => Promise<void>;
  onSave: () => void;
  onLoadGuides: () => void;
  isLoading?: boolean;
  destination: string;
  days: number;
}
```

**기능**:
```jsx
// [안내문 이미지 복사]
const handleCopyGuideImage = async () => {
  const element = document.getElementById('guide-preview');
  const canvas = await html2canvas(element, {
    backgroundColor: '#FAFAF5',
    scale: 2,
  });
  canvas.toBlob((blob) => {
    navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);
    toast.success('이미지가 클립보드에 복사되었습니다.');
  });
};

// [일정표 이미지 복사]
const handleCopyScheduleImage = async () => {
  const element = document.getElementById('schedule-table');
  // 동일한 로직
};

// [저장]
const handleSave = () => {
  // SaveGuideModal 열기
};

// [저장된 안내문 목록]
const handleLoadGuides = () => {
  // SavedGuidesPopup 열기
};
```

---

### 7. MobileScheduleTable

**경로**: `client/src/pages/pnr-converter/MobileScheduleTable.tsx`

**역할**: tourworld1 schedules API 통합 일정표

**Props**:
```typescript
interface MobileScheduleTableProps {
  flight_schedule_id?: number;
  destination?: string;
  start_date: string;
  end_date: string;
}
```

**데이터 소스**:
- GET /api/flight-schedules/:id (현재 air-booking)
- GET /api/schedules/:id (tourworld1 API, 선택)

**렌더링**:
```jsx
<div id="schedule-table" className="schedule-table">
  <table>
    <thead>
      <tr>
        <th>날짜</th>
        <th>항공편</th>
        <th>도시</th>
        <th>버스</th>
      </tr>
    </thead>
    <tbody>
      {schedules.map((row) => (
        <tr key={row.id}>
          <td>{row.date}</td>
          <td>{row.flight}</td>
          <td>{row.city}</td>
          <td>{row.bus}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**출력 ID**: `id="schedule-table"` (html2canvas 타겟)

---

### 8. SaveGuideModal

**경로**: `client/src/pages/pnr-converter/SaveGuideModal.tsx`

**역할**: 안내문 저장 (제목 입력)

**Props**:
```typescript
interface SaveGuideModalProps {
  isOpen: boolean;
  defaultTitle: string;
  onSave: (title: string) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}
```

**기능**:
```jsx
const [title, setTitle] = useState(defaultTitle);

const handleSave = async () => {
  const res = await fetch('/api/travel-guides', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      destination,
      start_date,
      end_date,
      flight_schedule_id,
      departure_place,
      departure_time,
      cost_per_person,
      sections_config: sectionsConfig,
      ai_content: aiContent,
      custom_content: customContent,
      background_url,
    }),
    credentials: 'include',
  });
  
  if (res.ok) {
    toast.success('저장되었습니다.');
    onClose();
  }
};
```

---

### 9. SavedGuidesPopup

**경로**: `client/src/pages/pnr-converter/SavedGuidesPopup.tsx`

**역할**: 저장된 안내문 목록 조회 및 로드

**Props**:
```typescript
interface SavedGuidesPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (guide: TravelGuide) => void;
  destination?: string;
}
```

**기능**:
```jsx
const [guides, setGuides] = useState<TravelGuide[]>([]);
const [page, setPage] = useState(1);
const [total, setTotal] = useState(0);

useEffect(() => {
  if (isOpen) {
    fetch(`/api/travel-guides?page=${page}&limit=10&is_archived=0`, {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        setGuides(data.data.guides);
        setTotal(data.data.total);
      });
  }
}, [isOpen, page]);

const handleSelect = (guide) => {
  onSelect(guide);
  // 입력 필드 자동 채움
};

const handleDelete = async (id) => {
  await fetch(`/api/travel-guides/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  // 목록 새로고침
};
```

---

### 10. FlightSchedulePopup (기존 재사용)

**경로**: `client/src/pages/pnr-converter/FlightSchedulePopup.tsx` (또는 `SavedFlights.tsx`)

**역할**: flight_schedules 팝업 선택

**통합**: TravelGuideForm에서 호출

```jsx
<button onClick={() => setShowFlightPopup(true)}>
  항공편 불러오기
</button>

{showFlightPopup && (
  <FlightSchedulePopup
    onSelect={(flight) => {
      onFlightSelect(flight.id, flight.departure_airport, flight.arrival_airport);
      setShowFlightPopup(false);
    }}
    onClose={() => setShowFlightPopup(false)}
  />
)}
```

---

## 파일 구조

```
client/
└─ src/
   ├─ pages/
   │  ├─ PnrConverter.tsx (기존, 탭 추가)
   │  └─ pnr-converter/
   │     ├─ TravelGuideTab.tsx (새)
   │     ├─ TravelGuideForm.tsx (새)
   │     ├─ DestinationInput.tsx (새)
   │     ├─ DateRangeInput.tsx (새)
   │     ├─ AdditionalInfoForm.tsx (새)
   │     ├─ SectionsToggle.tsx (새)
   │     ├─ TravelGuidePreview.tsx (새)
   │     ├─ GuideHero.tsx (새)
   │     ├─ GuideSection.tsx (새)
   │     ├─ GeneralNoticeSection.tsx (새)
   │     ├─ WeatherSection.tsx (새)
   │     ├─ OutfitSection.tsx (새)
   │     ├─ ChecklistSection.tsx (새)
   │     ├─ CurrencySection.tsx (새)
   │     ├─ CustomNoticeSection.tsx (새)
   │     ├─ GuideFooter.tsx (새)
   │     ├─ ActionButtons.tsx (새)
   │     ├─ MobileScheduleTable.tsx (새)
   │     ├─ EditSectionModal.tsx (새)
   │     ├─ SaveGuideModal.tsx (새)
   │     ├─ SavedGuidesPopup.tsx (새)
   │     ├─ FlightSchedulePopup.tsx (기존 재사용 또는 새로 생성)
   │     └─ (기존 컴포넌트들)
   │
   ├─ context/
   │  └─ TravelGuideContext.tsx (새)
   │
   ├─ services/
   │  └─ travel-guide.service.ts (새)
   │
   ├─ styles/
   │  └─ travel-guide.css (새)
   │
   └─ types/
      └─ travel-guide.ts (새)

server/
└─ src/
   ├─ routes/
   │  ├─ travel-guides.ts (새)
   │  └─ flight-schedules.ts (기존)
   │
   ├─ services/
   │  ├─ travel-guide.service.ts (새)
   │  └─ flight-schedules.service.ts (기존)
   │
   ├─ db/
   │  ├─ travel-guides.db.ts (새)
   │  └─ migrations/
   │     └─ 001-create-travel-guides.ts (새)
   │
   └─ types/
      └─ travel-guide.ts (새)
```

---

## 탭 통합 방식

### 기존 PnrConverter.tsx 수정

```typescript
// 기존 코드 (라인 24-29)
const CONVERTER_TABS = [
  { id: 'converter', label: '변환기', icon: '⚡' },
  { id: 'saved', label: '저장된 항공편', icon: '💾' },
  { id: 'bus', label: '버스예약', icon: '🚌' },
  { id: 'notices', label: '안내문', icon: 'ℹ️' },  // 기존 Notices → TravelGuideTab으로 교체
] as const;

// 렌더링 로직 (라인 ~)
{converterTab === 'notices' && <TravelGuideTab />}
```

---

## 상태 관리 방식 (선택지)

### 옵션 1: Context API (권장)
- TravelGuideContext로 상태 관리
- Provider: TravelGuideTab 최상위
- 자식 컴포넌트: useContext 사용

### 옵션 2: 로컬 State (간단한 경우)
- TravelGuideTab에서 state 관리
- props로 자식에 전달

### 옵션 3: 외부 라이브러리 (확장성)
- Zustand, Redux 등

**결정**: 옵션 1 (Context API) 권장 (air-booking 기존 패턴)

---

## 네비게이션 흐름

```
[메인 페이지]
  ↓
[PnrConverter 열기]
  ↓
탭 선택: [변환기] [저장된항공편] [버스예약] [안내문]
  ↓
[안내문] 탭 선택
  ↓
<TravelGuideTab />
  ├─ <TravelGuideForm /> — 입력
  ├─ <TravelGuidePreview /> — AI 결과 미리보기
  ├─ <ActionButtons /> — 저장/이미지 복사
  ├─ <MobileScheduleTable /> — 일정표
  ├─ <EditSectionModal /> — 섹션 편집 (모달)
  ├─ <SaveGuideModal /> — 저장 (모달)
  └─ <SavedGuidesPopup /> — 목록 (팝업)
      ↓
  [저장된 안내문 선택]
      ↓
  입력 필드 자동 채움
      ↓
  미리보기 표시
```

