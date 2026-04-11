# Design System: Travel World CMS

## 1. 디자인 원칙
- **직관성** - 교육 없이 바로 사용 가능
- **효율성** - 최소 클릭으로 작업 완료
- **일관성** - 동일한 패턴으로 예측 가능한 UX
- **전문성** - 신뢰감 있는 비즈니스 디자인

---

## 2. 컬러 시스템

```css
:root {
  /* Primary */
  --color-primary-500: #2B7DE9;
  --color-primary-600: #1E6AD4;
  
  /* Secondary */
  --color-secondary-500: #F59E0B;
  
  /* Neutral */
  --color-gray-50: #F9FAFB;
  --color-gray-200: #E5E7EB;
  --color-gray-700: #374151;
  --color-gray-900: #111827;
  
  /* Semantic */
  --color-success: #10B981;
  --color-error: #EF4444;
}
```

---

## 3. 타이포그래피

- **폰트**: Pretendard (한글), JetBrains Mono (코드)
- **제목**: 24-36px, 600-700 weight
- **본문**: 14px, 400 weight
- **캡션**: 12px, 500 weight

---

## 4. 스페이싱

```css
--space-2: 8px;   /* 컴포넌트 내부 */
--space-4: 16px;  /* 컴포넌트 사이 */
--space-6: 24px;  /* 섹션 사이 */
```

---

## 5. 컴포넌트

### 버튼
- Primary: 파란색 배경, 흰색 텍스트
- Secondary: 흰색 배경, 테두리

### 카드
- 흰색 배경, 8px 라운드, 그림자

### 드래그앤드롭
- 점선 테두리, 호버 시 파란색 강조

---

## 6. 레이아웃

```
Header (60px) + Sidebar (240px) + Main Content
```

---

## 7. 아이콘

**Lucide React** 사용
- 인라인: 16px
- 기본: 20px
- 대형: 48px
