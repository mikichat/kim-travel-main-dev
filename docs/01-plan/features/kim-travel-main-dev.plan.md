# Plan: 자유여행 예약내역 생성기

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 여행사 직원이 항공/호텔/렌터카/골프 등 자유여행 예약 내역을 고객에게 효과적으로 전달할 방법이 없음 |
| **Solution** | 에디터 + 모바일 최적화 미리보기 URL 생성 시스템 — 저장소: SQLite3 (로컬 DB) |
| **Function UX Effect** | 직원은 에디터에서 예약 내역 입력 → SQLite에 저장 → 미리보기 URL로 공유 → 모바일에서 확인 |
| **Core Value** | 로컬 DB 기반으로 데이터 영속성 보장, 서버 API 없이도 데이터 관리 가능 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 여행사 직원이 고객에게 예약을 효과적으로 전달하고 싶음 |
| **WHO** | 여행사 직원 (관리자), 고객 (수신자) |
| **RISK** | SQLite3 로컬 DB — 브라우저가 아닌 별도 프로세스로 관리, 초기 설정 필요 |
| **SUCCESS** | 직원 입력 → SQLite DB 저장 → preview URL 생성 → 고객이 모바일에서 확인 |
| **SCOPE** | 에디터(travel-free.html) + 미리보기(preview-free.html) + SQLite3 연동 + 사이드바 메뉴 등록 |

---

## 1. 요구사항 정리

### 1.1 주요 기능

| 기능 | 설명 |
|------|------|
| 에디터 페이지 | `frontend/itineraries/travel-free.html` — 예약 내역 입력 폼 |
| 미리보기 페이지 | `frontend/itineraries/preview-free.html` — 모바일 최적화 확인 |
| 저장/불러오기 | SQLite3 기반 (`freetravel.db`) — Express API (`/api/freetravel/*`) |
| 미리보기 URL 생성 | LZString 압축 → URL 파라미터 → 새 탭 열기 |
| 사이드바 메뉴 등록 | 모든 HTML의 일정표 서브메뉴에 추가 |

### 1.2 에디터 섹션

| 섹션 | 필수 | 미리보기 포함 |
|------|------|-------------|
| 기본 정보 (수신인, 발신인, 작성일, 여행기간, 여행지) | Y | - |
| 항공편 | Y | 체크박스 |
| 숙박 | Y | 체크박스 |
| 렌터카 | N | 체크박스 |
| 골프 | N | 체크박스 |
| 커스텀 섹션 | N | 체크박스 |
| 결제 정보 | Y | 체크박스 |
| 회사 정보 | Y | 체크박스 |

### 1.3 미리보기 UX

- 모바일 최적화 (`max-w-md mx-auto`)
- 사이드바 없음 (고객용)
- 상단/하단 고정 액션 바
- 체크박스 해제 시 해당 섹션 숨김

---

## 2. 성공 기준 (Success Criteria)

| # | 기준 | 검증 방법 |
|---|------|----------|
| SC-1 | 에디터에서 모든 섹션 입력 후 미리보기 URL 생성 가능 | 실제 데이터로 테스트 |
| SC-2 | 생성된 URL을 새 브라우저에서 열면 모든 섹션 정상 렌더링 | 다른 브라우저/디바이스로 확인 |
| SC-3 | "미리보기 포함" 체크박스 해제 시 해당 섹션 숨김 처리 | UI 테스트 |
| SC-4 | localStorage에 저장된 데이터 불러오기/삭제 가능 | CRUD 테스트 |
| SC-5 | 사이드바 메뉴에서 travel-free.html 접근 가능 | 사이드바 네비게이션 테스트 |
| SC-6 | 도장 이미지 업로드/미리보기 반영 | 이미지 base64 인코딩 테스트 |
| SC-7 |印刷 미리보기 정상 동작 | @media print 확인 |

---

## 3. 제약사항

| 항목 | 내용 |
|------|------|
| 데이터 저장 | SQLite3 로컬 DB (`freetravel.db`) — 서버 프로세스 필요 |
| URL 파라미터 크기 | 브라우저 URL 길이 제한 (약 2000자) — 이미지는 DB 또는 localStorage 별도 |
| 브라우저 호환 | Chrome, Safari, Firefox 최신 버전 |
| 외부 의존성 | Tailwind CDN, lz-string CDN, html2canvas CDN, better-sqlite3 |
| 서버 | 로컬 Node.js 서버 (Express) — API 호출 필요 |

---

## 4. 파일 구조

```
freetravel.db                    # SQLite3 DB (NEW)
backend/
├── db/
│   ├── init.sql                # DB 스키마 (NEW)
│   └── sqlite.js               # SQLite 연동 유틸리티 (NEW)
└── routes/
    └── freetravel.js           # API routes (NEW)

frontend/
├── itineraries/
│   ├── travel-free.html       # 에디터 (NEW)
│   ├── preview-free.html      # 미리보기 (NEW)
│   ├── travel-simple.html    # 기존 참고
│   └── travel-simple-copy.html
├── js/
│   └── (기존 auto-populate.js, excel-import.js 재활용)
│   └── freetravel-api.js      # API 호출 유틸리티 (NEW)
└── css/
    └── (기존 style.css 재활용 — 사이드바)
```

### 4.1 SQLite3 스키마

```sql
-- 예약 내역 테이블
CREATE TABLE bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,           -- 저장 이름
  data TEXT NOT NULL,          -- JSON 데이터 (LZString 압축)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 회사 기본 정보 테이블
CREATE TABLE company_defaults (
  id INTEGER PRIMARY KEY,
  name TEXT,
  ceo TEXT,
  address TEXT,
  phone TEXT,
  fax TEXT,
  manager_name TEXT,
  manager_phone TEXT,
  stamp_image TEXT              -- base64 인코딩
);
```

### 4.2 API Endpoints

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/freetravel/bookings` | 저장된 예약 목록 |
| POST | `/api/freetravel/bookings` | 예약 저장 |
| GET | `/api/freetravel/bookings/:id` | 단일 예약 조회 |
| PUT | `/api/freetravel/bookings/:id` | 예약 수정 |
| DELETE | `/api/freetravel/bookings/:id` | 예약 삭제 |
| GET | `/api/freetravel/company` | 회사 기본 정보 조회 |
| PUT | `/api/freetravel/company` | 회사 기본 정보 저장 |

### 4.3 사이드바 메뉴 등록 대상

| 파일 | 경로 |
|------|------|
| index | `frontend/templates/templates/index.html` |
| group-roster | `frontend/templates/templates/group-roster.html` |
| schedules | `frontend/templates/templates/schedules.html` |
| select-group | `frontend/templates/templates/select-group.html` |
| select-schedules | `frontend/templates/templates/select-schedules.html` |
| flight-schedule | `frontend/templates/templates/flight-schedule.html` |
| cost-calculator | `frontend/templates/templates/cost-calculator.html` |
| backup-manager | `frontend/templates/templates/backup-manager.html` |
| travel-simple | `frontend/itineraries/travel-simple.html` |
| travel-simple-copy | `frontend/itineraries/travel-simple-copy.html` |
| travel-advanced | (확인 필요) |

---

## 5. 구현 순서

### Phase 1: 에디터 기본 골격
1. travel-free.html 기본 구조 + 사이드바
2. 기본 정보 섹션 (수신인, 발신인, 작성일, 여행기간, 여행지)
3. 저장/불러오기 기능 (localStorage CRUD)

### Phase 2: 동적 섹션 구현
4. 항공편 섹션 (탑승객 그룹, 항공편 카드)
5. 숙박 섹션
6. 렌터카 섹션
7. 골프 섹션
8. 커스텀 섹션
9. 결제 정보 섹션
10. 회사 정보 섹션

### Phase 3: 직렬화 + 미리보기 연동
11. serializeForm() / deserializeForm()
12. 미리보기 URL 생성 (LZString 압축)

### Phase 4: 미리보기 페이지
13. preview-free.html 구조
14. 섹션별 카드 UI 렌더링
15. 상단/하단 액션 바 (링크 복사, 이미지 저장, 인쇄)

### Phase 5: 사이드바 메뉴 등록
16. 모든 대상 HTML 파일에 메뉴 추가

### Phase 6: 테스트 + 배포
17. 기능/반응형/인쇄 테스트
18. 커밋 + 배포

---

## 6. Decision Record Chain

| Phase | Decision | Rationale |
|-------|----------|----------|
| Plan | SQLite3 저장 방식 | 로컬 DB로 데이터 영속성 보장, 서버 API를 통한 관리 |
| Plan | LZString URL 압축 | URL 파라미터로 데이터 전달 (미리보기 페이지용) |
| Plan | 사이드바 재활용 | 기존 css/style.css 재사용으로 일관성 |
| Plan | 각 섹션별 include 플래그 | 체크박스로 표시 여부 제어 |
| Plan | 도장 이미지는 DB에 base64 저장 | URL 길이 제한 회피 |
