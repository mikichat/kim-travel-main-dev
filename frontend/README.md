# 여행사 계약 자동화 시스템 - 프론트엔드

## 개요

단체 여행의 계약서, 견적서, 일정표를 자동으로 생성하는 시스템의 프론트엔드 UI입니다.

## 기술 스택

- **HTML5 / CSS3** - 기본 마크업 및 스타일링
- **Vanilla JavaScript (ES6+)** - 프레임워크 없이 순수 JavaScript 사용
- **Fetch API** - FastAPI 백엔드와 REST API 통신

## 프로젝트 구조

```
frontend/
├── pages/                          # HTML 페이지
│   ├── group_list.html            # 단체 목록 (T-UI-01)
│   ├── group_form.html            # 단체 입력/수정 (T-UI-02)
│   ├── group_dashboard.html       # 단체 관리 대시보드 (T-UI-04~07 통합)
│   └── itinerary.html             # 일정 관리 (T-UI-03)
├── static/
│   ├── css/
│   │   └── styles.css             # 공통 스타일시트
│   └── js/
│       ├── utils.js               # 공통 유틸리티 함수
│       ├── api.js                 # API 호출 함수
│       ├── group_list.js          # 단체 목록 로직
│       ├── group_form.js          # 단체 입력/수정 로직
│       ├── group_dashboard.js     # 대시보드 로직
│       └── itinerary.js           # 일정 관리 로직
└── README.md                       # 이 파일
```

## 주요 기능

### 1. 단체 목록 (T-UI-01)

**파일**: `pages/group_list.html`, `static/js/group_list.js`

- 단체 목록 조회 및 표시
- 검색 및 필터링
  - 단체명 실시간 검색 (debounce 300ms)
  - 날짜 범위 필터
  - 상태 필터 (견적/계약/확정)
- 페이징 처리 (20개/페이지)
- 상태별 색상 배지 표시

### 2. 단체 입력/수정 (T-UI-02)

**파일**: `pages/group_form.html`, `static/js/group_form.js`

- 단체 기본 정보 입력
  - 단체명, 출발일, 도착일, 인원, 1인당 요금, 계약금
- **자동 계산 기능**
  - 박수 = 도착일 - 출발일
  - 일수 = 박수 + 1
  - 총액 = 인원 × 1인당 요금
  - 잔액 = 총액 - 계약금
  - 잔액 완납일 = 출발일 - 7일
- **수동 수정 기능**
  - 자동 계산값을 수동으로 변경 가능
  - 자동/수동 구분 시각화 (파란색/노란색 배경)
  - 자동 계산으로 되돌리기 버튼
- 실시간 유효성 검증

### 3. 일정 관리 (T-UI-03)

**파일**: `pages/itinerary.html`, `static/js/itinerary.js`

- 일정 CRUD (생성, 조회, 수정, 삭제)
- day_no 자동 부여
- 일정 날짜 자동 계산 (출발일 기준)
- 일정 정보 입력
  - 장소, 교통, 시간, 일정, 식사, 숙박

### 4. 단체 관리 대시보드 (T-UI-04~07 통합)

**파일**: `pages/group_dashboard.html`, `static/js/group_dashboard.js`

통합 관리 페이지로 다음 기능을 포함:

#### 기본 정보 탭
- 단체 상세 정보 표시
- 기본 정보 수정 버튼
- 상태 변경 버튼 (T-UI-07)
- 단체 삭제 버튼

#### 일정 관리 탭 (T-UI-03)
- 일정 목록 간략 보기
- 일정 추가 버튼
- 상세 일정 관리 페이지로 이동

#### 취소 규정 탭 (T-UI-04)
- 취소 규정 CRUD
- 취소 날짜 자동 계산 (출발일 - days_before)
- 위약금 비율 설정

#### 포함/불포함 탭 (T-UI-05)
- 포함 항목 관리
- 불포함 항목 관리
- display_order 자동 부여

#### 문서 출력 탭 (T-UI-06)
- 견적서 생성 및 다운로드
- 계약서 생성 및 다운로드
- 일정표 생성 및 다운로드
- 통합 문서 생성 및 다운로드

### 5. 사용자 알림 시스템 (T-UI-08)

**구현**: `static/js/utils.js`

- 토스트 알림
  - `showSuccess()` - 성공 메시지
  - `showError()` - 오류 메시지
  - `showWarning()` - 경고 메시지
  - `showInfo()` - 정보 메시지
- 확인 모달 (`showConfirm()`)
- 자동 사라짐 (3~5초)

## 공통 유틸리티

### utils.js

날짜, 숫자, 문자열 포맷팅, 알림, 모달, 유효성 검증 등

**주요 함수**:
- `formatDate()` - 날짜 한국어 포맷팅
- `formatCurrency()` - 통화 포맷팅
- `escapeHtml()` - XSS 방지
- `renderStatusBadge()` - 상태 배지 HTML 생성
- `showToast()` - 토스트 알림
- `showConfirm()` - 확인 모달
- `validateRequired()`, `validateNumber()`, `validateDate()` - 유효성 검증

### api.js

FastAPI 백엔드와의 REST API 통신

**주요 함수**:
- `getGroups()` - 단체 목록 조회
- `getGroup()` - 단체 상세 조회
- `createGroup()` - 단체 생성
- `updateGroup()` - 단체 수정
- `deleteGroup()` - 단체 삭제
- `changeGroupStatus()` - 상태 변경
- `recalculateGroup()` - 재계산
- `getItineraries()`, `createItinerary()`, ... - 일정 관리
- `getCancelRules()`, `createCancelRule()`, ... - 취소 규정 관리
- `getIncludes()`, `createInclude()`, ... - 포함/불포함 관리
- `generateDocument()` - 문서 생성

## 사용 방법

### 1. 백엔드 서버 실행

먼저 FastAPI 백엔드 서버를 실행해야 합니다.

```bash
cd ../api
uvicorn main:app --reload --port 8000
```

### 2. 정적 파일 서빙

프론트엔드 파일을 웹 서버를 통해 서빙합니다.

**옵션 1: Python HTTP 서버 (개발용)**

```bash
cd frontend
python -m http.server 3000
```

**옵션 2: VS Code Live Server 확장 프로그램**

VS Code에서 `group_list.html`을 열고 "Go Live" 클릭

**옵션 3: FastAPI에서 정적 파일 서빙**

`api/main.py`에 다음 추가:

```python
from fastapi.staticfiles import StaticFiles

app.mount("/pages", StaticFiles(directory="../frontend/pages"), name="pages")
app.mount("/static", StaticFiles(directory="../frontend/static"), name="static")
```

### 3. 접속

브라우저에서 접속:

```
http://localhost:3000/pages/group_list.html
```

## 화면 흐름

```
group_list.html (목록)
    ↓ 신규 생성
group_form.html (입력, mode=create)
    ↓ 저장
group_list.html
    ↓ 행 클릭
group_dashboard.html (대시보드, id=xxx)
    ├─ 기본 정보 탭
    │   └─ 수정 버튼 → group_form.html (mode=edit)
    ├─ 일정 관리 탭
    │   └─ 일정 추가 → itinerary.html
    ├─ 취소 규정 탭
    ├─ 포함/불포함 탭
    └─ 문서 출력 탭
```

## 주요 기술적 특징

### 1. Vanilla JavaScript

- 프레임워크 없이 순수 JavaScript 사용
- 가볍고 빠른 로딩
- 종속성 최소화

### 2. 반응형 디자인

- 모바일 대응 (768px 미만)
- Flexbox 및 CSS Grid 활용

### 3. 사용자 경험

- 실시간 검색 (debounce)
- 자동 계산 시각화
- 토스트 알림
- 로딩 인디케이터

### 4. 보안

- XSS 방지 (HTML 이스케이프)
- CSRF 대응 (추후 추가 필요)
- 입력 유효성 검증

### 5. 에러 처리

- API 오류 처리
- 사용자 친화적 오류 메시지
- 필드별 유효성 검증 피드백

## 개발 진행 상황

### 완료된 Task

- ✅ **T-UI-01**: 단체 선택 화면
- ✅ **T-UI-02**: 단체 입력 화면 (자동 계산, 수동 수정)
- ✅ **T-UI-03**: 일정 관리 화면
- ✅ **T-UI-04**: 취소 규정 관리 화면
- ✅ **T-UI-05**: 포함/불포함 항목 관리 화면
- ✅ **T-UI-06**: 문서 출력 버튼 영역
- ✅ **T-UI-07**: 상태 변경 UI
- ✅ **T-UI-08**: 사용자 알림 시스템

### 다음 단계

- [ ] 프론트엔드와 백엔드 통합 테스트
- [ ] 인증 및 권한 관리 추가
- [ ] 배포 설정

## API 엔드포인트 연동

프론트엔드는 다음 백엔드 API 엔드포인트를 사용합니다:

- `GET /api/groups` - 단체 목록
- `GET /api/groups/{id}` - 단체 상세
- `POST /api/groups` - 단체 생성
- `PUT /api/groups/{id}` - 단체 수정
- `DELETE /api/groups/{id}` - 단체 삭제
- `PATCH /api/groups/{id}/status` - 상태 변경
- `POST /api/groups/{id}/recalculate` - 재계산
- `GET /api/groups/{id}/itineraries` - 일정 목록
- `POST /api/groups/{id}/itineraries` - 일정 생성
- `PUT /api/groups/{id}/itineraries/{id}` - 일정 수정
- `DELETE /api/groups/{id}/itineraries/{id}` - 일정 삭제
- `GET /api/groups/{id}/cancel-rules` - 취소 규정 목록
- `POST /api/groups/{id}/cancel-rules` - 취소 규정 생성
- `DELETE /api/groups/{id}/cancel-rules/{id}` - 취소 규정 삭제
- `GET /api/groups/{id}/includes` - 포함/불포함 목록
- `POST /api/groups/{id}/includes` - 포함/불포함 생성
- `DELETE /api/groups/{id}/includes/{id}` - 포함/불포함 삭제
- `POST /api/groups/{id}/documents/generate` - 문서 생성
- `GET /api/groups/{id}/documents/{doc_id}/download` - 문서 다운로드

## 브라우저 지원

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 라이선스

Internal Use Only
