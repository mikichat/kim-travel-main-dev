# 디자인 시스템 (Design System)

**문서 버전**: 1.0 | **작성일**: 2026-02-18 | **기반**: preview-mobile.html

---

## MVP 캡슐

| 항목 | 내용 |
|------|------|
| **기본 톤** | preview-mobile.html 디자인 패턴 |
| **메인 컬러** | Blue #3B82F6 + Purple #8B5CF6 |
| **반응형** | Mobile-first (max-width: 24rem) |
| **다크모드** | 지원 필수 |

---

## 1. 컬러 팔레트

### 주 색상
- Blue: #3B82F6 (주요 액션, 헤더)
- Purple: #8B5CF6 (보조 색상, 배지)

### 배경
- 라이트: #FFFFFF (기본), #F8FAFC (카드)
- 다크: #0F172A (배경), #1E293B (카드)

### 텍스트
- 라이트: #000000 (주), #64748B (보조)
- 다크: #FFFFFF (주), #CBD5E1 (보조)

### 상태 색상
- Success: #10B981
- Warning: #F59E0B
- Error: #EF4444

---

## 2. 타이포그래피

### 폰트
- 기본: Noto Sans KR
- 대체: Inter (영문)
- Google Fonts CDN

### 크기
- h1: 32px (700 weight)
- h2: 24px (700 weight)
- body: 16px (400 weight)
- small: 14px (400 weight)

---

## 3. 간격 시스템

```
4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px
(Tailwind: 1, 2, 3, 4, 6, 8, 12, 16)
```

---

## 4. 컴포넌트

### 카드
- 모서리: 12px 둥근 모서리
- 배경: 라이트 white, 다크 slate-800
- 보더: 1px
- 패딩: 16px

### 버튼
- Primary: bg-blue-500
- Secondary: bg-slate-200
- Danger: bg-red-500
- 패딩: px-4 py-2 (medium)

### 입력 필드
- 보더: slate-200 (라이트), slate-700 (다크)
- 포커스: ring-2 ring-blue-500
- 패딩: px-3 py-2

---

## 5. 레이아웃

### 모바일 레이아웃
- max-width: 24rem (384px)
- padding: 16px
- 모바일 우선 방식

### 사이드바 (기존)
- 너비: 260px (데스크톱)
- 위치: 고정
- 높이: 100vh
- 배경: 그라데이션

---

## 6. 다크모드

### 구현
```javascript
<html class="light"> // 또는 "dark"
```

### CSS
```css
/* 라이트 모드 */
.element { background: white; }

/* 다크 모드 */
.dark .element { background: slate-800; }
```

---

## 7. 아이콘

### Material Symbols
- flight (항공편)
- hotel (숙박)
- directions_car (렌트카)
- golf_course (골프)

### Font Awesome
- fas fa-plane (항공)
- fas fa-bed (호텔)
- fas fa-car (차)

---

## 8. 반응형

### 브레이크포인트
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px

### 모바일 우선
기본 스타일 후 md: 접두어로 업스케일

---

## 9. 인쇄

@media print {
  .no-print { display: none; }
  * { -webkit-print-color-adjust: exact; }
  .card { page-break-inside: avoid; }
}

---

## 10. 접근성

- 색상 대비: 최소 4.5:1
- 포커스: focus:ring-2
- ARIA: aria-label 사용

---

v1.0 | 2026-02-18
