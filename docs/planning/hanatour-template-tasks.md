# TASKS: 하나투어 랜딩 페이지 템플릿 선택 기능

## 프로젝트 개요

**목표**: travel-advanced.html 생성기에서 출력물 디자인 템플릿을 선택할 수 있게 하여, 기존 preview.html 디자인 외에 모바일 최적화된 새로운 디자인(screen.png 기반)도 사용 가능하게 함.

**관련 파일**:
- `hanatour/travel-advanced.html` - 여행 안내문 생성기 (입력 폼)
- `hanatour/preview.html` - 기존 출력물 (데스크톱 스타일)
- `hanatour/imges/travel-advenced/screen.png` - 새 디자인 참고 이미지
- `hanatour/imges/travel-advenced/code.html` - 새 디자인 HTML 샘플

---

## 마일스톤 개요

| 마일스톤 | 설명 | 주요 산출물 |
|----------|------|------------|
| M1 | 템플릿 선택 UI 추가 | 생성기에 템플릿 선택 드롭다운/라디오 |
| M2 | 모바일 템플릿 생성 | preview-mobile.html 신규 파일 |
| M3 | 템플릿 라우팅 연동 | 선택한 템플릿에 따라 다른 preview 페이지로 이동 |
| M4 | 테스트 및 마무리 | 크로스브라우저 테스트, 버그 수정 |

---

## M1: 템플릿 선택 UI 추가

### [] T1.1: 템플릿 선택 섹션 디자인

**담당**: frontend-specialist

**작업 내용**:
- travel-advanced.html에 "출력물 디자인" 섹션 추가
- 템플릿 미리보기 이미지 카드 UI
- 라디오 버튼 또는 카드 선택 방식

**수정 파일**:
- `hanatour/travel-advanced.html` (폼 섹션 추가)

**완료 조건**:
- [ ] 템플릿 선택 UI가 폼 상단에 표시됨
- [ ] 2개 템플릿 선택지: "기본(데스크톱)", "모바일"
- [ ] 각 템플릿에 미리보기 썸네일 표시
- [ ] 선택 상태가 시각적으로 표시됨

**UI 예시**:
```html
<div class="template-selector">
  <h3>출력물 디자인 선택</h3>
  <div class="template-cards">
    <div class="template-card selected">
      <img src="thumbnails/desktop.png" />
      <span>기본 (데스크톱)</span>
    </div>
    <div class="template-card">
      <img src="thumbnails/mobile.png" />
      <span>모바일 최적화</span>
    </div>
  </div>
</div>
```

---

### [] T1.2: 템플릿 선택 상태 저장

**담당**: frontend-specialist

**작업 내용**:
- 선택한 템플릿 ID를 폼 데이터에 포함
- localStorage에 마지막 선택 템플릿 저장 (기본값 유지)

**수정 파일**:
- `hanatour/travel-advanced.html` (JavaScript 로직)

**완료 조건**:
- [ ] 템플릿 선택 시 `templateId` 값 저장
- [ ] 페이지 새로고침 후에도 마지막 선택 유지
- [ ] 저장/불러오기 기능에 템플릿 정보 포함

---

## M2: 모바일 템플릿 생성

### [] T2.1: preview-mobile.html 기본 구조

**담당**: frontend-specialist

**작업 내용**:
- screen.png 디자인을 기반으로 새 preview 파일 생성
- Tailwind CSS + Material Icons 사용
- 모바일 우선 반응형 레이아웃

**신규 파일**:
- `hanatour/preview-mobile.html`

**디자인 특징** (screen.png 기반):
- 헤더: 도시 이미지 배경 + 그라데이션 오버레이
- 카드 기반 섹션 (rounded-2xl, 그림자)
- 다크모드 지원
- 하단 고정 네비게이션 바
- Material Icons 사용

**완료 조건**:
- [ ] 모바일 뷰포트에서 최적화된 레이아웃
- [ ] 기존 preview.html과 동일한 데이터 구조 사용
- [ ] 다크모드 토글 동작

---

### [] T2.2: 헤더 섹션 구현

**담당**: frontend-specialist

**작업 내용**:
- 타이틀 배경 이미지 + 그라데이션 오버레이
- 여행 제목, 기간 표시
- TOURWORLD 로고 뱃지

**완료 조건**:
- [ ] 배경 이미지가 full-width로 표시
- [ ] 텍스트가 이미지 위에 읽기 좋게 표시
- [ ] 그라데이션으로 텍스트 가독성 확보

**코드 구조**:
```html
<header class="relative h-64 w-full overflow-hidden">
  <img class="w-full h-full object-cover" />
  <div class="absolute inset-0 hero-gradient flex flex-col justify-end p-6 text-white">
    <h1 class="text-2xl font-bold">여행 제목</h1>
    <p class="text-sm opacity-90">2026-01-22 ~ 2026-01-25</p>
  </div>
  <div class="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">
    <span class="text-xs text-white font-medium">TOURWORLD</span>
  </div>
</header>
```

---

### [] T2.3: 상품가격 섹션 구현

**담당**: frontend-specialist

**작업 내용**:
- 카드 스타일 가격표
- 성인/아동/유아 구분 테이블
- Material Icons 사용

**완료 조건**:
- [ ] 테이블이 카드 내에 깔끔하게 표시
- [ ] 유류할증료 안내 문구 포함
- [ ] payments 아이콘 표시

---

### [] T2.4: 포함/불포함 섹션 구현

**담당**: frontend-specialist

**작업 내용**:
- 포함내역: 체크 아이콘 + 파란색
- 불포함내역: X 아이콘 + 빨간색
- 카테고리별 그룹화 ([교통], [숙박], [식사] 등)

**완료 조건**:
- [ ] 포함/불포함 구분이 명확함
- [ ] 아이콘과 색상으로 시각적 구분
- [ ] 카테고리별 접기/펼치기 (선택사항)

---

### [] T2.5: 미팅 정보 섹션 구현

**담당**: frontend-specialist

**작업 내용**:
- 공항 미팅: flight_takeoff 아이콘, 파란색
- 현지 미팅: flight_land 아이콘, 초록색
- 2열 그리드 레이아웃

**완료 조건**:
- [ ] 공항/현지 미팅이 나란히 표시
- [ ] 담당자, 연락처 정보 명확하게 표시
- [ ] 전화번호 터치 시 전화 앱 연동 (tel: 링크)

---

### [] T2.6: 상세 일정표 섹션 구현

**담당**: frontend-specialist

**작업 내용**:
- DAY 1, DAY 2... 뱃지 스타일
- 날짜별 카드 분리
- 숙소/식사 정보 하단 표시

**완료 조건**:
- [ ] 일자별 카드가 수직으로 나열
- [ ] DAY 뱃지가 눈에 띄게 표시
- [ ] 일정 세부사항이 읽기 좋게 정렬
- [ ] 숙소/식사 정보가 카드 하단에 표시

**코드 구조**:
```html
<div class="bg-card-light rounded-2xl shadow-sm border overflow-hidden">
  <div class="bg-slate-50 p-4 flex justify-between items-center">
    <span class="bg-primary text-white text-xs px-2 py-1 rounded-full font-bold">DAY 1</span>
    <span class="text-xs text-slate-500">2026-01-22 (목)</span>
  </div>
  <div class="p-4">
    <!-- 일정 내용 -->
  </div>
</div>
```

---

### [] T2.7: 현지 정보 및 회사 정보 섹션

**담당**: frontend-specialist

**작업 내용**:
- 현지 정보: 노란색 경고 스타일 카드
- 회사 정보: 푸터 영역

**완료 조건**:
- [ ] 유의사항이 눈에 띄는 스타일로 표시
- [ ] 회사 로고, 담당자, 연락처 표시
- [ ] 저작권 문구 포함

---

### [] T2.8: 하단 네비게이션 바

**담당**: frontend-specialist

**작업 내용**:
- 고정 위치 (fixed bottom)
- 홈, 일정, 문의, 마이 메뉴
- Material Icons 사용

**완료 조건**:
- [ ] 스크롤해도 하단에 고정
- [ ] 배경 블러 효과 (backdrop-blur)
- [ ] 현재 페이지 하이라이트

---

### [] T2.9: 다크모드 지원

**담당**: frontend-specialist

**작업 내용**:
- Tailwind dark: 클래스 활용
- 시스템 설정 자동 감지
- 수동 토글 버튼 (선택사항)

**완료 조건**:
- [ ] 다크모드에서 모든 섹션 가독성 유지
- [ ] 색상 대비 WCAG AA 기준 충족
- [ ] 이미지/아이콘 다크모드 대응

---

## M3: 템플릿 라우팅 연동

### [] T3.1: 미리보기 버튼 로직 수정

**담당**: frontend-specialist

**작업 내용**:
- 선택한 템플릿에 따라 다른 URL로 이동
- 데이터 인코딩 방식 통일

**수정 파일**:
- `hanatour/travel-advanced.html` (미리보기 함수)

**완료 조건**:
- [ ] "기본" 선택 시 → preview.html로 이동
- [ ] "모바일" 선택 시 → preview-mobile.html로 이동
- [ ] 동일한 데이터 형식 사용

**코드 예시**:
```javascript
function openPreview() {
  const templateId = getSelectedTemplate(); // 'desktop' | 'mobile'
  const previewUrl = templateId === 'mobile'
    ? 'preview-mobile.html'
    : 'preview.html';

  const payload = encodeData(collectFormData());
  window.open(`${previewUrl}?d=${payload}`, '_blank');
}
```

---

### [] T3.2: 데이터 파싱 로직 통일

**담당**: frontend-specialist

**작업 내용**:
- preview.html과 preview-mobile.html의 데이터 파싱 로직 통일
- 공통 유틸리티 함수 분리 (선택사항)

**수정 파일**:
- `hanatour/preview-mobile.html` (데이터 파싱)

**완료 조건**:
- [ ] 동일한 URL 파라미터 구조 사용
- [ ] localStorage 이미지 데이터 호환
- [ ] 에러 처리 동일

---

### [] T3.3: 저장/불러오기 템플릿 정보 포함

**담당**: frontend-specialist

**작업 내용**:
- 저장 시 선택한 템플릿 정보도 함께 저장
- 불러오기 시 템플릿 선택 상태 복원

**수정 파일**:
- `hanatour/travel-advanced.html`

**완료 조건**:
- [ ] 저장된 안내문에 templateId 포함
- [ ] 불러오기 시 템플릿 선택 UI 업데이트
- [ ] 기존 저장 데이터와 하위 호환 (기본값: desktop)

---

## M4: 테스트 및 마무리

### [] T4.1: 크로스브라우저 테스트

**담당**: frontend-specialist

**작업 내용**:
- Chrome, Safari, Firefox 테스트
- 모바일 브라우저 테스트 (iOS Safari, Android Chrome)
- 반응형 레이아웃 검증

**완료 조건**:
- [ ] 주요 브라우저에서 렌더링 문제 없음
- [ ] 모바일 뷰포트에서 정상 동작
- [ ] 터치 인터랙션 정상 동작

---

### [] T4.2: 접근성 검토

**담당**: frontend-specialist

**작업 내용**:
- 색상 대비 검사
- 키보드 네비게이션 확인
- 스크린리더 호환성 확인

**완료 조건**:
- [ ] WCAG 2.1 AA 기준 충족
- [ ] 포커스 표시 명확
- [ ] alt 텍스트 적절히 설정

---

### [] T4.3: 성능 최적화

**담당**: frontend-specialist

**작업 내용**:
- 이미지 최적화 (lazy loading)
- CSS/JS 최소화 (선택사항)
- 불필요한 리소스 제거

**완료 조건**:
- [ ] 페이지 로드 3초 이내
- [ ] 이미지 lazy loading 적용
- [ ] Lighthouse 점수 90+ (Performance)

---

### [] T4.4: 썸네일 이미지 생성

**담당**: frontend-specialist

**작업 내용**:
- 템플릿 선택 UI용 썸네일 이미지 생성
- 각 템플릿 미리보기 캡처

**신규 파일**:
- `hanatour/thumbnails/desktop.png`
- `hanatour/thumbnails/mobile.png`

**완료 조건**:
- [ ] 썸네일 이미지 200x300px 정도
- [ ] 각 템플릿의 특징이 잘 보이도록 캡처
- [ ] 파일 크기 최적화 (< 50KB)

---

## 의존성 그래프

```
M1: 템플릿 선택 UI
├── T1.1: 템플릿 선택 섹션 디자인
└── T1.2: 템플릿 선택 상태 저장

M2: 모바일 템플릿 생성 (T1.1 이후 병렬 가능)
├── T2.1: 기본 구조
├── T2.2: 헤더 섹션 ─┐
├── T2.3: 상품가격 ──┤
├── T2.4: 포함/불포함 ├── (T2.1 이후 병렬 가능)
├── T2.5: 미팅 정보 ──┤
├── T2.6: 상세 일정표 ─┤
├── T2.7: 현지/회사 정보─┤
├── T2.8: 하단 네비 ───┘
└── T2.9: 다크모드 (모든 섹션 완료 후)

M3: 템플릿 라우팅 연동 (M1, M2 완료 후)
├── T3.1: 미리보기 버튼 로직
├── T3.2: 데이터 파싱 통일
└── T3.3: 저장/불러오기 연동

M4: 테스트 및 마무리 (M3 완료 후)
├── T4.1: 크로스브라우저 테스트
├── T4.2: 접근성 검토
├── T4.3: 성능 최적화
└── T4.4: 썸네일 이미지 생성
```

---

## 병렬 실행 가능 태스크

| 그룹 | 태스크들 | 설명 |
|------|----------|------|
| M1 | T1.1, T1.2 | 순차 실행 |
| M2 섹션 | T2.2 ~ T2.8 | T2.1 완료 후 병렬 가능 |
| M3 | T3.1, T3.2, T3.3 | M1, M2 완료 후 순차 실행 |
| M4 | T4.1, T4.2, T4.3 | 병렬 가능 |

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | HTML5, Tailwind CSS, Vanilla JavaScript |
| 아이콘 | Material Icons |
| 폰트 | Noto Sans KR (Google Fonts) |
| 데이터 | LZ-String (URL 압축), localStorage |
| 이미지 | html2canvas (캡처용) |

---

## 참고 자료

- 새 디자인 참고: `hanatour/imges/travel-advenced/screen.png`
- 기존 생성기: `hanatour/travel-advanced.html`
- 기존 미리보기: `hanatour/preview.html`
