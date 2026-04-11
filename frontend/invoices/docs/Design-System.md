# Design System — 인보이스 생성 시스템

## 1. 개요

본 문서는 인보이스 생성 시스템의 디자인 시스템을 정의합니다.

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

### 2.3 중성 색상 (Neutral Colors)

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

---

## 4. 컴포넌트 디자인

### 4.1 입력 필드 (Input Fields)

```css
.input-field {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--gray-300);
    border-radius: 4px;
    font-size: var(--text-base);
    font-family: var(--font-primary);
}

.input-field:focus {
    outline: none;
    border-color: var(--primary-blue);
    box-shadow: 0 0 0 3px var(--primary-blue-light);
}

.input-field:disabled {
    background-color: var(--gray-100);
    color: var(--gray-500);
    cursor: not-allowed;
}
```

### 4.2 드롭다운 (Dropdown)

```css
.dropdown {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--gray-300);
    border-radius: 4px;
    font-size: var(--text-base);
    font-family: var(--font-primary);
    background-color: var(--white);
    cursor: pointer;
}

.dropdown:focus {
    outline: none;
    border-color: var(--primary-blue);
    box-shadow: 0 0 0 3px var(--primary-blue-light);
}
```

### 4.3 버튼 (Buttons)

```css
/* Primary Button */
.btn-primary {
    background-color: var(--primary-blue);
    color: var(--white);
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    font-size: var(--text-base);
    font-weight: var(--font-medium);
    cursor: pointer;
    transition: background-color 0.2s;
}

.btn-primary:hover {
    background-color: var(--primary-blue-hover);
}

.btn-primary:disabled {
    background-color: var(--gray-300);
    cursor: not-allowed;
}

/* Secondary Button */
.btn-secondary {
    background-color: var(--white);
    color: var(--primary-blue);
    padding: 10px 20px;
    border: 1px solid var(--primary-blue);
    border-radius: 4px;
    font-size: var(--text-base);
    font-weight: var(--font-medium);
    cursor: pointer;
    transition: all 0.2s;
}

.btn-secondary:hover {
    background-color: var(--primary-blue-light);
}
```

### 4.4 테이블 (Tables)

```css
.table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
}

.table th {
    background-color: var(--gray-100);
    padding: 12px;
    text-align: left;
    font-weight: var(--font-semibold);
    border-bottom: 2px solid var(--gray-300);
}

.table td {
    padding: 12px;
    border-bottom: 1px solid var(--gray-200);
}

.table tr:hover {
    background-color: var(--gray-50);
}
```

### 4.5 카드 (Cards)

```css
.card {
    background-color: var(--white);
    border: 1px solid var(--gray-200);
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card-header {
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--gray-200);
}
```

---

## 5. 인보이스 레이아웃

### 5.1 인보이스 편집 페이지 레이아웃

```
┌─────────────────────────────────────────┐
│ 헤더 (로고 + 회사 정보)                    │
├─────────────────────────────────────────┤
│ 기본 정보 섹션                            │
│ - 수신 (입력 필드)                        │
│ - 일자 (날짜 선택기)                      │
│ - 설명 (입력 필드)                        │
├─────────────────────────────────────────┤
│ 항공 스케줄 선택 섹션                      │
│ - 드롭다운 (항공 스케줄 선택)               │
│ - 선택된 항공 정보 표시                    │
├─────────────────────────────────────────┤
│ 항목 및 금액 섹션                         │
│ - 항공료 (단가 × 수량 = 합계)              │
│ - 선호좌석 (단가 × 수량 = 합계)            │
│ - 총액 (자동 계산)                        │
├─────────────────────────────────────────┤
│ 은행 정보 섹션                            │
│ - 드롭다운 (은행 계좌 선택)                │
│ - 선택된 계좌 정보 표시                    │
├─────────────────────────────────────────┤
│ 도장 영역 (플레이스홀더)                   │
├─────────────────────────────────────────┤
│ 액션 버튼 (미리보기, PDF 생성, 저장)        │
└─────────────────────────────────────────┘
```

### 5.2 인보이스 PDF 레이아웃

```
┌─────────────────────────────────────────┐
│ 로고                    INVOICE        │
├─────────────────────────────────────────┤
│ 수신: [수신명]                          │
│ 일자: [일자]                            │
│ 설명: [설명]                            │
├─────────────────────────────────────────┤
│ 항공 스케줄                             │
│ 출발: [날짜] [공항] [시간]              │
│ 도착: [날짜] [공항] [시간]              │
├─────────────────────────────────────────┤
│ 항목 테이블                             │
│ 항공료    [단가] × [수량] = [합계]      │
│ 선호좌석  [단가] × [수량] = [합계]      │
├─────────────────────────────────────────┤
│ TOTAL: [총액]                          │
├─────────────────────────────────────────┤
│ 은행: [은행명]                          │
│ 계좌: [계좌번호]                        │
│ 예금주: [예금주]                        │
├─────────────────────────────────────────┤
│ 회사 정보                                │
│ 연락처                                  │
│                    [도장]               │
└─────────────────────────────────────────┘
```

---

## 6. 반응형 디자인

### 6.1 브레이크포인트

```css
/* 모바일 */
@media (max-width: 768px) {
    .invoice-editor {
        padding: 10px;
    }
    
    .card {
        padding: 15px;
    }
}

/* 태블릿 */
@media (min-width: 769px) and (max-width: 1024px) {
    .invoice-editor {
        padding: 20px;
    }
}

/* 데스크톱 */
@media (min-width: 1025px) {
    .invoice-editor {
        max-width: 1200px;
        margin: 0 auto;
        padding: 30px;
    }
}
```

---

## 7. 접근성 (Accessibility)

### 7.1 키보드 네비게이션
- 모든 인터랙티브 요소는 키보드로 접근 가능해야 함
- Tab 순서가 논리적이어야 함

### 7.2 스크린 리더 지원
- 모든 입력 필드에 적절한 라벨 제공
- 버튼에 명확한 텍스트 제공

### 7.3 색상 대비
- 텍스트와 배경의 대비 비율 4.5:1 이상
- 중요한 정보는 색상만으로 전달하지 않음

---

## 8. 애니메이션 및 트랜지션

### 8.1 버튼 호버 효과

```css
.btn-primary {
    transition: background-color 0.2s ease;
}

.btn-primary:hover {
    background-color: var(--primary-blue-hover);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

### 8.2 로딩 상태

```css
.loading {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 3px solid var(--gray-300);
    border-top-color: var(--primary-blue);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
```

---

**작성일**: 2026-01-01
**버전**: 1.0
**작성자**: Design Team
