# Design System
## 여행사 관리 시스템 디자인 가이드

### 1. Color Palette (색상 팔레트)

#### Primary Colors
*   **Primary Purple:** `#7B61FF` (메인 포인트 컬러, 버튼, 활성 상태)
*   **Primary Hover:** `#6D54E0` (호버 상태)

#### Secondary Colors (Status)
*   **Success (Green):** `#10B981` (완료, 성공, 엑셀)
*   **Warning (Orange):** `#F59E0B` (대기, 주의)
*   **Danger (Red):** `#EF4444` (삭제, 취소, 위험)
*   **Info (Blue):** `#3B82F6` (정보, 링크)

#### Backgrounds & Grays
*   **Bg Light:** `#F3F4F6` (메인 배경)
*   **Bg Dark:** `#1F2937` (사이드바 배경)
*   **Surface:** `#FFFFFF` (카드, 모달 배경)
*   **Text Main:** `#111827` (본문 텍스트)
*   **Text Muted:** `#6B7280` (보조 텍스트)

### 2. Typography (타이포그래피)

*   **Font Family:** 'Noto Sans KR', sans-serif
*   **Sizes:**
    *   **H1:** 24px, Bold (페이지 타이틀)
    *   **H2:** 20px, Bold (섹션 타이틀)
    *   **H3:** 18px, Medium (카드 타이틀)
    *   **Body:** 14px, Regular (본문)
    *   **Small:** 12px, Regular (보조 설명, 라벨)

### 3. Components (컴포넌트)

#### 3.1 Buttons (버튼)
Tailwind 유틸리티 클래스 기반.
*   `.btn`: 기본 패딩 (py-2 px-4), 라운드 처리 (rounded-lg), 트랜지션 포함.
*   `.btn-primary`: bg-primary text-white
*   `.btn-secondary`: bg-gray-200 text-gray-700
*   `.btn-danger`: bg-red-500 text-white

#### 3.2 Cards (카드)
*   배경: White (`#FFFFFF`)
*   쉐도우: `shadow-md` or `shadow-sm`
*   라운드: `rounded-xl`
*   패딩: `p-6`

#### 3.3 Inputs (입력 필드)
*   테두리: `border-gray-300`
*   포커스: `ring-2 ring-primary border-transparent`
*   라운드: `rounded-lg`

#### 3.4 Modal (모달)
*   오버레이: `bg-black bg-opacity-50`
*   컨텐츠: 중앙 정렬, 최대 너비 제한 (max-w-xl 등)
