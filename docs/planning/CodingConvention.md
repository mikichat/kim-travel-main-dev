# Coding Convention: Travel World CMS

## 1. 프로젝트 구조

```
travel-world-cms/
├── client/                 # React 프론트엔드
│   ├── src/
│   │   ├── components/     # 재사용 컴포넌트
│   │   ├── pages/          # 페이지 컴포넌트
│   │   ├── hooks/          # 커스텀 훅
│   │   ├── services/       # API 호출
│   │   ├── stores/         # 상태 관리
│   │   └── utils/          # 유틸리티
├── server/                 # Express 백엔드
│   ├── src/
│   │   ├── controllers/    # 라우트 핸들러
│   │   ├── services/       # 비즈니스 로직
│   │   ├── models/         # DB 모델
│   │   └── middleware/     # 미들웨어
└── shared/                 # 공유 타입/유틸
```

---

## 2. 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 파일 (컴포넌트) | PascalCase | `ItineraryEditor.tsx` |
| 파일 (유틸) | camelCase | `formatDate.ts` |
| 컴포넌트 | PascalCase | `ItineraryEditor` |
| 함수/변수 | camelCase | `getItinerary` |
| 상수 | UPPER_SNAKE | `API_BASE_URL` |
| 타입/인터페이스 | PascalCase | `Itinerary` |

---

## 3. TypeScript 규칙

```typescript
// ✅ 인터페이스 사용
interface Itinerary {
  id: string;
  title: string;
  items: ItineraryItem[];
}

// ✅ 옵셔널 명시
interface Hotel {
  id: string;
  name: string;
  phone?: string;  // 선택적
}

// ❌ any 사용 금지
const data: any = {};  // 금지!
```

---

## 4. React 규칙

```tsx
// ✅ 함수형 컴포넌트 + hooks
export function ItineraryCard({ itinerary }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="card">
      {/* JSX */}
    </div>
  );
}

// ✅ Props 인터페이스 분리
interface ItineraryCardProps {
  itinerary: Itinerary;
  onEdit?: () => void;
}
```

---

## 5. API 규칙

```typescript
// RESTful 엔드포인트
GET    /api/itineraries
GET    /api/itineraries/:id
POST   /api/itineraries
PUT    /api/itineraries/:id
DELETE /api/itineraries/:id

// 응답 형식
{
  "success": true,
  "data": { ... },
  "error": null
}
```

---

## 6. 주석 규칙

```typescript
// FEAT-2: 일정표 편집기
// 드래그앤드롭으로 일정 순서 변경
function reorderItems(items: Item[], from: number, to: number) {
  // ... 구현
}

// TODO: v2에서 PDF 생성 기능 추가
// FIXME: 오프라인 동기화 충돌 해결 필요
```

---

## 7. Git 규칙

```
feat: 일정표 드래그앤드롭 기능 추가
fix: 호텔 저장 시 좌표 누락 수정
docs: API 문서 업데이트
refactor: 이미지 업로드 로직 개선
```

---

## 8. 테스트 규칙

- 파일명: `*.test.ts` 또는 `*.spec.ts`
- 커버리지 목표: 80% 이상
- 주요 기능별 E2E 테스트 필수
