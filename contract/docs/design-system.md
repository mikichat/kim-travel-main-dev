# Design System — 여행사 계약·견적·일정 자동화 시스템

## 1. 개요

본 문서는 여행사 인트라넷 시스템의 디자인 시스템을 정의합니다.

### 1.1 디자인 원칙

1. **명료성 (Clarity)**: 정보가 명확하고 이해하기 쉬워야 함
2. **일관성 (Consistency)**: 모든 화면에서 동일한 패턴 사용
3. **효율성 (Efficiency)**: 최소한의 클릭으로 작업 완료
4. **신뢰성 (Reliability)**: 자동 계산 결과의 시각적 신뢰 제공

### 1.2 대상 사용자

- 내부 직원 (실무자, 관리자)
- 데스크톱 환경 중심 (해상도: 1920x1080 이상)

---

## 2. 색상 시스템 (Color System)

### 2.1 기본 색상 (Primary Colors)

```css
/* 주요 브랜드 색상 */
--primary-blue: #2563EB;      /* 주요 액션 버튼 */
--primary-blue-hover: #1D4ED8;
--primary-blue-light: #DBEAFE;

/* 보조 색상 */
--secondary-gray: #64748B;     /* 보조 텍스트, 아이콘 */
--secondary-gray-light: #F1F5F9;
```

### 2.2 상태 색상 (State Colors)

```css
/* 성공 */
--success-green: #10B981;
--success-green-light: #D1FAE5;

/* 경고 */
--warning-yellow: #F59E0B;
--warning-yellow-light: #FEF3C7;

/* 오류 */
--error-red: #EF4444;
--error-red-light: #FEE2E2;

/* 정보 */
--info-blue: #3B82F6;
--info-blue-light: #DBEAFE;
```

### 2.3 단체 상태 색상

```css
/* 견적 */
--status-estimate: #8B5CF6;    /* 보라색 */
--status-estimate-light: #EDE9FE;

/* 계약 */
--status-contract: #F59E0B;    /* 주황색 */
--status-contract-light: #FEF3C7;

/* 확정 */
--status-confirmed: #10B981;   /* 녹색 */
--status-confirmed-light: #D1FAE5;
```

### 2.4 중성 색상 (Neutral Colors)

```css
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-200: #E5E7EB;
--gray-300: #D1D5DB;
--gray-400: #9CA3AF;
--gray-500: #6B7280;
--gray-600: #4B5563;
--gray-700: #374151;
--gray-800: #1F2937;
--gray-900: #111827;

--white: #FFFFFF;
--black: #000000;
```

### 2.5 배경 색상

```css
--bg-primary: #FFFFFF;
--bg-secondary: #F9FAFB;
--bg-tertiary: #F3F4F6;
--bg-dark: #1F2937;
```

---

## 3. 타이포그래피 (Typography)

### 3.1 폰트 패밀리

```css
/* 기본 폰트 */
--font-primary: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* 숫자 전용 폰트 (가독성 향상) */
--font-numeric: 'Roboto Mono', 'Courier New', monospace;
```

### 3.2 폰트 크기

```css
/* 헤딩 */
--text-3xl: 30px;   /* H1 - 페이지 제목 */
--text-2xl: 24px;   /* H2 - 섹션 제목 */
--text-xl: 20px;    /* H3 - 서브섹션 제목 */
--text-lg: 18px;    /* H4 - 작은 제목 */

/* 본문 */
--text-base: 16px;  /* 기본 텍스트 */
--text-sm: 14px;    /* 보조 텍스트 */
--text-xs: 12px;    /* 캡션, 라벨 */
```

### 3.3 폰트 두께

```css
--font-light: 300;
--font-regular: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### 3.4 줄 높이

```css
--leading-tight: 1.25;   /* 제목용 */
--leading-normal: 1.5;   /* 본문용 */
--leading-relaxed: 1.75; /* 긴 텍스트용 */
```

### 3.5 타이포그래피 예시

```css
/* H1 - 페이지 제목 */
.heading-1 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  color: var(--gray-900);
}

/* H2 - 섹션 제목 */
.heading-2 {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-tight);
  color: var(--gray-800);
}

/* 본문 텍스트 */
.body-text {
  font-size: var(--text-base);
  font-weight: var(--font-regular);
  line-height: var(--leading-normal);
  color: var(--gray-700);
}

/* 보조 텍스트 */
.text-secondary {
  font-size: var(--text-sm);
  font-weight: var(--font-regular);
  color: var(--gray-500);
}
```

---

## 4. 간격 시스템 (Spacing System)

### 4.1 간격 스케일

```css
--space-0: 0px;
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
```

### 4.2 간격 사용 가이드

| 용도 | 간격 | 크기 |
|------|------|------|
| 컴포넌트 내부 여백 (작음) | space-2 | 8px |
| 컴포넌트 내부 여백 (중간) | space-4 | 16px |
| 컴포넌트 내부 여백 (큼) | space-6 | 24px |
| 컴포넌트 간 간격 (작음) | space-4 | 16px |
| 컴포넌트 간 간격 (중간) | space-8 | 32px |
| 섹션 간 간격 | space-12 | 48px |
| 페이지 여백 | space-16 | 64px |

---

## 5. 레이아웃 (Layout)

### 5.1 그리드 시스템

```css
/* 12 컬럼 그리드 */
.container {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 var(--space-8);
}

.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-6);
}

.col-span-3 { grid-column: span 3; }
.col-span-4 { grid-column: span 4; }
.col-span-6 { grid-column: span 6; }
.col-span-8 { grid-column: span 8; }
.col-span-12 { grid-column: span 12; }
```

### 5.2 레이아웃 패턴

#### 5.2.1 사이드바 레이아웃

```
┌────────────────────────────────────┐
│ Header (고정)                       │
├──────┬─────────────────────────────┤
│      │                             │
│ Side │  Main Content Area          │
│ bar  │                             │
│      │                             │
│(200px│                             │
│      │                             │
└──────┴─────────────────────────────┘
```

#### 5.2.2 카드 그리드 레이아웃

```
┌──────────┬──────────┬──────────┐
│  Card 1  │  Card 2  │  Card 3  │
├──────────┼──────────┼──────────┤
│  Card 4  │  Card 5  │  Card 6  │
└──────────┴──────────┴──────────┘
```

---

## 6. 컴포넌트 (Components)

### 6.1 버튼 (Buttons)

#### 6.1.1 Primary Button

```css
.btn-primary {
  background-color: var(--primary-blue);
  color: var(--white);
  padding: var(--space-3) var(--space-6);
  border-radius: 8px;
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background-color: var(--primary-blue-hover);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.btn-primary:active {
  transform: translateY(1px);
}

.btn-primary:disabled {
  background-color: var(--gray-300);
  cursor: not-allowed;
}
```

#### 6.1.2 Secondary Button

```css
.btn-secondary {
  background-color: var(--white);
  color: var(--gray-700);
  border: 1px solid var(--gray-300);
  padding: var(--space-3) var(--space-6);
  border-radius: 8px;
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  border-color: var(--primary-blue);
  color: var(--primary-blue);
  background-color: var(--primary-blue-light);
}
```

#### 6.1.3 버튼 크기 변형

```css
/* Small */
.btn-sm {
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
}

/* Medium (기본) */
.btn-md {
  padding: var(--space-3) var(--space-6);
  font-size: var(--text-base);
}

/* Large */
.btn-lg {
  padding: var(--space-4) var(--space-8);
  font-size: var(--text-lg);
}
```

### 6.2 입력 필드 (Input Fields)

```css
.input-field {
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--gray-300);
  border-radius: 6px;
  font-size: var(--text-base);
  color: var(--gray-900);
  background-color: var(--white);
  transition: all 0.2s;
}

.input-field:focus {
  outline: none;
  border-color: var(--primary-blue);
  box-shadow: 0 0 0 3px var(--primary-blue-light);
}

.input-field:disabled {
  background-color: var(--gray-100);
  cursor: not-allowed;
}

/* 오류 상태 */
.input-field.error {
  border-color: var(--error-red);
}

.input-field.error:focus {
  box-shadow: 0 0 0 3px var(--error-red-light);
}

/* 수동 수정 표시 */
.input-field.manual-modified {
  border-left: 4px solid var(--warning-yellow);
  background-color: var(--warning-yellow-light);
}
```

### 6.3 카드 (Cards)

```css
.card {
  background-color: var(--white);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: var(--space-6);
  transition: all 0.2s;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card-header {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--gray-900);
  margin-bottom: var(--space-4);
}

.card-body {
  color: var(--gray-700);
  font-size: var(--text-base);
}
```

### 6.4 배지 (Badges)

```css
.badge {
  display: inline-block;
  padding: var(--space-1) var(--space-3);
  border-radius: 12px;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

/* 견적 */
.badge-estimate {
  background-color: var(--status-estimate-light);
  color: var(--status-estimate);
}

/* 계약 */
.badge-contract {
  background-color: var(--status-contract-light);
  color: var(--status-contract);
}

/* 확정 */
.badge-confirmed {
  background-color: var(--status-confirmed-light);
  color: var(--status-confirmed);
}
```

### 6.5 테이블 (Tables)

```css
.table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--white);
  border-radius: 8px;
  overflow: hidden;
}

.table th {
  background-color: var(--gray-50);
  padding: var(--space-4);
  text-align: left;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--gray-700);
  border-bottom: 1px solid var(--gray-200);
}

.table td {
  padding: var(--space-4);
  border-bottom: 1px solid var(--gray-100);
  color: var(--gray-900);
  font-size: var(--text-base);
}

.table tr:hover {
  background-color: var(--gray-50);
}
```

### 6.6 알림 (Notifications)

```css
.notification {
  padding: var(--space-4) var(--space-6);
  border-radius: 8px;
  font-size: var(--text-base);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

/* 성공 */
.notification-success {
  background-color: var(--success-green-light);
  color: var(--success-green);
  border-left: 4px solid var(--success-green);
}

/* 경고 */
.notification-warning {
  background-color: var(--warning-yellow-light);
  color: var(--warning-yellow);
  border-left: 4px solid var(--warning-yellow);
}

/* 오류 */
.notification-error {
  background-color: var(--error-red-light);
  color: var(--error-red);
  border-left: 4px solid var(--error-red);
}

/* 정보 */
.notification-info {
  background-color: var(--info-blue-light);
  color: var(--info-blue);
  border-left: 4px solid var(--info-blue);
}
```

### 6.7 모달 (Modal)

```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background-color: var(--white);
  border-radius: 12px;
  padding: var(--space-8);
  max-width: 600px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-6);
  color: var(--gray-900);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-6);
}
```

---

## 7. 아이콘 시스템 (Icon System)

### 7.1 아이콘 라이브러리

- **Heroicons** (권장): https://heroicons.com/
- 스타일: Outline (기본), Solid (강조)
- 크기: 16px, 20px, 24px

### 7.2 주요 아이콘

| 기능 | 아이콘 | 크기 |
|------|--------|------|
| 추가 | plus-circle | 20px |
| 수정 | pencil | 20px |
| 삭제 | trash | 20px |
| 저장 | check-circle | 20px |
| 취소 | x-circle | 20px |
| 검색 | magnifying-glass | 20px |
| 필터 | funnel | 20px |
| 다운로드 | arrow-down-tray | 20px |
| PDF | document-text | 20px |
| 자동 계산 | calculator | 20px |
| 경고 | exclamation-triangle | 20px |
| 정보 | information-circle | 20px |

---

## 8. 애니메이션 & 전환 (Animation & Transitions)

### 8.1 전환 효과

```css
/* 기본 전환 */
.transition-default {
  transition: all 0.2s ease-in-out;
}

/* 빠른 전환 */
.transition-fast {
  transition: all 0.1s ease-in-out;
}

/* 느린 전환 */
.transition-slow {
  transition: all 0.3s ease-in-out;
}
```

### 8.2 호버 효과

```css
/* 버튼 호버 */
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 카드 호버 */
.hover-scale:hover {
  transform: scale(1.02);
}
```

### 8.3 로딩 애니메이션

```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

---

## 9. 반응형 디자인 (Responsive Design)

### 9.1 브레이크포인트

```css
/* 모바일 */
--breakpoint-sm: 640px;

/* 태블릿 */
--breakpoint-md: 768px;

/* 데스크톱 (작음) */
--breakpoint-lg: 1024px;

/* 데스크톱 (중간) */
--breakpoint-xl: 1280px;

/* 데스크톱 (큼) */
--breakpoint-2xl: 1536px;
```

### 9.2 반응형 유틸리티

```css
/* 모바일 우선 접근 */
@media (min-width: 640px) {
  .sm\:hidden { display: none; }
}

@media (min-width: 768px) {
  .md\:grid-cols-2 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .lg\:grid-cols-3 {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

---

## 10. 접근성 (Accessibility)

### 10.1 색상 대비

- **텍스트 대비**: 최소 4.5:1 (WCAG AA 기준)
- **큰 텍스트 대비**: 최소 3:1

### 10.2 포커스 상태

```css
.focusable:focus {
  outline: 2px solid var(--primary-blue);
  outline-offset: 2px;
}

/* 키보드 포커스만 표시 */
.focus-visible:focus-visible {
  outline: 2px solid var(--primary-blue);
  outline-offset: 2px;
}
```

### 10.3 스크린 리더

```css
/* 시각적으로 숨기되 스크린 리더에는 노출 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

## 11. 자동 계산 표시 디자인

### 11.1 자동 계산 필드

```css
.field-auto-calculated {
  position: relative;
  background-color: var(--primary-blue-light);
  border-left: 3px solid var(--primary-blue);
}

.field-auto-calculated::after {
  content: '🤖 자동';
  position: absolute;
  right: var(--space-2);
  top: 50%;
  transform: translateY(-50%);
  font-size: var(--text-xs);
  color: var(--primary-blue);
  background-color: var(--white);
  padding: var(--space-1) var(--space-2);
  border-radius: 4px;
}
```

### 11.2 수동 수정 필드

```css
.field-manual-modified {
  background-color: var(--warning-yellow-light);
  border-left: 3px solid var(--warning-yellow);
}

.field-manual-modified::after {
  content: '✏️ 수동';
  position: absolute;
  right: var(--space-2);
  top: 50%;
  transform: translateY(-50%);
  font-size: var(--text-xs);
  color: var(--warning-yellow);
  background-color: var(--white);
  padding: var(--space-1) var(--space-2);
  border-radius: 4px;
}
```

---

## 12. PDF 문서 디자인

### 12.1 PDF 스타일

```css
/* PDF용 페이지 설정 */
@page {
  size: A4;
  margin: 2cm;
}

/* PDF 본문 */
.pdf-body {
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 12pt;
  line-height: 1.6;
  color: #000000;
}

/* PDF 제목 */
.pdf-title {
  font-size: 24pt;
  font-weight: 700;
  text-align: center;
  margin-bottom: 20pt;
}

/* PDF 테이블 */
.pdf-table {
  width: 100%;
  border-collapse: collapse;
  margin: 10pt 0;
}

.pdf-table th,
.pdf-table td {
  border: 1px solid #ddd;
  padding: 8pt;
  text-align: left;
}

.pdf-table th {
  background-color: #f2f2f2;
  font-weight: 700;
}

/* 페이지 구분 */
.page-break {
  page-break-after: always;
}
```

---

## 13. 다크 모드 (향후 확장)

```css
/* 다크 모드 색상 변수 */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #1F2937;
    --bg-secondary: #111827;
    --text-primary: #F9FAFB;
    --text-secondary: #D1D5DB;
  }
}
```

---

**작성일**: 2024-12-23
**버전**: 1.0
**작성자**: Design Team
