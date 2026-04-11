# Tasks Checklist
## 여행사 관리 시스템 개발 작업 목록

### 1. 문서화 및 기획 (Documentation & Planning) - [현재 진행 중]
- [x] PRD (요구사항 정의서) 작성
- [x] TRD (기술 정의서) 작성
- [x] User Flow (사용자 흐름) 문서화
- [x] Database Schema 정의
- [x] Design System 가이드 작성
- [x] VibeLabs 아티클 적용 방안 구체화 (Spec-Driven Development 도입)

### 2. 기능 개선 (Feature Improvements) - v1.6.0 목표
- [x] **자동 백업 시스템 구축**
    - [x] LocalStorage 데이터 변경 감지
    - [x] IndexedDB로 이중 저장 (안정성 확보)
    - [x] 백업 히스토리 관리 (최근 5개 시점)
- [x] **백업 파일 관리 강화** ✅ (2026-01-23)
    - [x] 백업 파일(.json) 다운로드 기능 개선
    - [x] 백업 파일 복원 시 유효성 검사 로직 추가
- [ ] **UI/UX 개선**
    - [ ] 모바일 반응형 레이아웃 최적화 (사이드바, 테이블)
    - [ ] 알림 센터 UI 고도화 (애니메이션, 읽음 처리 UX)

### 3. 신규 기능 (New Features)
- [ ] **상담 로그 관리**
    - [ ] 고객별 상담 내역(통화, 미팅) 기록 기능
- [ ] **정산 시스템**
    - [ ] 예약별 입금/미수금 관리 (단순화된 버전)

### 4. 코드 리팩토링 (Refactoring)
- [ ] `main.js` 모듈 분리
    - [ ] `CustomerManager.js`, `BookingManager.js`, `ProductManager.js` 등으로 클래스 분리 검토
- [ ] 공통 유틸리티 함수 (`dateUtils.js`, `formatUtils.js`) 분리

---

## TourWorld Landing 브로슈어 시스템 (tourworld1/landing)

### 5. 브로슈어 미리보기 개선 ✅ (2026-01-26)

#### 5.1 Excel 파서 개선 (TourForm.tsx)
- [x] test-1.xlsx 형식 지원
- [x] "제N일" 패턴 인식 (기존 "N일차", "Day N" 외 추가)
- [x] 병합 셀 처리 (지역, 교통편 값 유지)
- [x] Excel 시간 시리얼 → HH:MM 변환
- [x] 식사 정보 파싱 (조/중/석 분리)

#### 5.2 미리보기 레이아웃 수정
- [x] **HotelInfo.tsx/css** - 오른쪽 치우침 문제 해결
    - width: 182mm (고정) → 100% (유동) 변경
    - flexbox 레이아웃 적용
    - 긴 텍스트 자동 줄바꿈 (word-wrap, word-break)
    - 별점 표시: `*` → `★` 변경
- [x] **Itinerary.tsx/css** - 일정표 레이아웃 수정
    - width: 100% 변경
    - PageWithHeaderFooter 내부 호환
- [x] **Checklist.module.css** - 100% 너비 변경
- [x] **CountryInfo.module.css** - 100% 너비 변경
- [x] **CityTouristInfo.module.css** - 100% 너비 변경
- [x] **App.tsx** - PageWithHeaderFooter 본문 영역 `overflow: visible` 변경

#### 5.3 일정표 페이지 분할 기능
- [x] B5 용지 초과 시 자동 페이지 분할
- [x] **화면 미리보기에서도 페이지 분할 표시** (JavaScript 높이 측정)
- [x] 각 페이지에 테이블 헤더 반복
- [x] 페이지 번호 표시 (일정표 1/2, 2/2 형식)
- [x] 마지막 페이지에만 법적 고지문 표시

#### 5.4 미리보기 섹션 선택적 표시
- [x] 여행준비물 (체크리스트) 표시/숨김 토글
- [x] 국가정보 표시/숨김 토글
- [x] 도시/관광지 표시/숨김 토글
- [x] 상단 컨트롤 패널에 체크박스 UI 추가

#### 5.5 표지/국가정보 분리
- [x] Step1BasicInfo: "여행지" → "표지 국가명 (표지에만 표시)" 라벨 변경
- [x] 안내 문구 추가: "국가정보 페이지의 국가명은 Step 4에서 별도 입력"
- [x] App.tsx: 국가정보는 countries 배열에서만 렌더링 (destination 폴백 제거)
- [x] 국가 미등록 시 국가정보 페이지 표시 안 함

#### 5.6 Excel 파서 버그 수정 ✅ (2026-01-26)
- [x] **TourForm.tsx** - 빈 셀에 이전 값 중복 표시 버그 수정
    - `currentLocation`/`currentTransport` 변수 제거
    - 각 행마다 독립적으로 `rowLocation`/`rowTransport` 값 사용
    - 빈 셀은 빈 문자열로 유지 (이전 값 상속 안 함)

#### 5.7 일정표 머리말/꼬리말 및 페이지 번호 ✅ (2026-01-26)
- [x] **Itinerary.tsx** - standalone 모드에 머리말/꼬리말 추가
    - EvenPageHeader/OddPageHeader 컴포넌트 적용
    - EvenPageFooter/OddPageFooter 컴포넌트 적용
    - companyInfo, startPageNumber props 추가
- [x] **Itinerary.module.css** - contentArea 스타일 추가
- [x] **App.tsx** - Itinerary에 companyInfo 전달
- [x] 페이지 번호 표시 제거 ("일정표 1/2" 삭제)

#### 5.8 일정표 타이틀 헤더 (첫 페이지) ✅ (2026-01-26)
- [x] **Itinerary.tsx** - 첫 페이지 타이틀 헤더 기능 추가
    - `ItineraryTitleInfo` 인터페이스 정의 (destination, nights, days, subtitle, airplaneIcon)
    - `titleInfo` prop 추가
    - `renderTitleHeader()` 함수 - 타이틀 헤더 렌더링
    - 첫 페이지만 타이틀 헤더 표시, 2페이지부터는 기본 머리말만
- [x] **Itinerary.module.css** - 타이틀 헤더 스타일 추가
    - `.titleHeader` - 메인 컨테이너 (청록색 하단 테두리)
    - `.titleDestination` - 국가명 (28pt, 진한 파란색)
    - `.titleDuration` - 기간 (22pt, 청록색)
    - `.titleSubtitle` - 부제목 (14pt, 청록색)
    - `.airplaneIcon` - 비행기 아이콘 이미지
- [x] **BrochureWizard.tsx** - WizardData에 itineraryTitle 필드 추가
- [x] **Step3Itinerary.tsx** - 타이틀 헤더 입력 UI 추가
    - 국가명, 박/일, 부제목 텍스트 입력
    - 비행기 아이콘 이미지 업로드
