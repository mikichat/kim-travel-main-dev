# Design: 자유여행 예약내역 생성기

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 여행사 직원이 고객에게 예약을 효과적으로 전달하고 싶음 |
| **WHO** | 여행사 직원 (관리자), 고객 (수신자) |
| **RISK** | SQLite3 로컬 DB — 브라우저가 아닌 별도 프로세스로 관리, 초기 설정 필요 |
| **SUCCESS** | 직원 입력 → SQLite DB 저장 → preview URL 생성 → 고객이 모바일에서 확인 |
| **SCOPE** | 에디터(travel-free.html) + 미리보기(preview-free.html) + SQLite3 연동 + 사이드바 메뉴 등록 |

---

## 1. 아키텍처 개요

```
┌──────────────────────────────────────────────────────────────┐
│  에디터 페이지 (travel-free.html)                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  폼 입력 → serializeForm() → LZString → URL 파라미터  │  │
│  │  API 호출 → SQLite 저장                               │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              ↓ window.open()
┌──────────────────────────────────────────────────────────────┐
│  미리보기 페이지 (preview-free.html)                          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  URL 파라미터 → LZString 디코딩 → 카드 렌더링          │  │
│  │  (읽기 전용, sidebar 없음)                            │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. 3가지 설계 옵션 비교

### Option A — Minimal Changes

**개요**: 기존 `travel-simple.html` 패턴 최대한 재활용, jQuery + 기존 구조 유지

| 항목 | 내용 |
|------|------|
| **변경점** | 기존 HTML/CSS/JS 패턴 거의 그대로 에디터에 적용 |
| **데이터 흐름** | 폼 → localStorage + API 저장 |
| **복잡도** | 낮음 |
| **장점** | 개발 속도 빠름, 기존 코드 재활용 |
| **단점** | 아키텍처 일관성 낮음, 유지보수 어려울 수 있음 |

### Option B — Clean Architecture

**개요**: 백엔드 API 완전히 분리, 모던 프론트엔드 구조

| 항목 | 내용 |
|------|------|
| **변경점** | RESTful API + 모던 JS 모듈화 |
| **데이터 흐름** | 폼 → API → SQLite → 응답 → 미리보기 URL |
| **복잡도** | 높음 |
| **장점** | 확장성 우수, 테스트 용이, 유지보수 용이 |
| **단점** | 개발 effort 높음, 별도 프론트엔드 빌드 고려 |

### Option C — Pragmatic Balance (권장)

**개요**: 기존 HTML/CSS 재활용 + 최소 API 구조

| 항목 | 내용 |
|------|------|
| **변경점** | 에디터는 기존 HTML 패턴 재활용, 미리보기는 독립 페이지 |
| **데이터 흐름** | 폼 → API(`/api/freetravel/*`) → SQLite 저장 → preview URL |
| **복잡도** | 중간 |
| **장점** | 균형 잡힌 구조, 빠른 개발, 향후 확장 용이 |
| **단점** | 모던 SPA 대비 확장성 제한 |

---

## 3. 선택된 아키텍처: Option C

### 3.1 디렉토리 구조

```
backend/
├── routes/
│   └── freetravel.js           # API 라우터 (NEW)
├── db/
│   └── freetravel-init.js      # freetravel 테이블 초기화 (NEW)
└── travel_agency.db            # 기존 DB (bookings 테이블 추가)

frontend/
├── itineraries/
│   ├── travel-free.html       # 에디터 (NEW)
│   └── preview-free.html      # 미리보기 (NEW)
├── js/
│   └── freetravel-api.js      # API 호출 유틸리티 (NEW)
└── css/
    └── style.css              # 기존 재활용
```

### 3.2 데이터 모델

```sql
-- bookings 테이블 추가
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,              -- UUID
  name TEXT NOT NULL,               -- 저장 이름 (사용자 지정)
  recipient TEXT,                   -- 수신인
  sender TEXT,                      -- 발신인 (기본값: 여행세상)
  travel_period TEXT,                -- JSON: {start, end}
  destination TEXT,                 -- 여행지
  data TEXT NOT NULL,               -- LZString 압축된 폼 데이터
  sections TEXT,                   -- JSON: 포함 여부 플래그
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

-- company_defaults 테이블 추가
CREATE TABLE IF NOT EXISTS company_defaults (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT DEFAULT '(유) 여행세상',
  ceo TEXT DEFAULT '대표이사 김국진',
  address TEXT DEFAULT '(560-170) 전주시 완산구 서신동 856-1번지',
  phone TEXT DEFAULT '063) 271-9090',
  fax TEXT DEFAULT '063) 271-9030',
  manager_name TEXT,
  manager_phone TEXT,
  stamp_image TEXT                  -- base64
);
```

### 3.3 API Endpoints

| Method | Endpoint | 설명 | 요청/응답 |
|--------|----------|------|----------|
| GET | `/api/freetravel/bookings` | 예약 목록 조회 | `→ [{id, name, recipient, created_at}]` |
| POST | `/api/freetravel/bookings` | 예약 생성 | `{name, data, sections, ...}` → `{id, ...}` |
| GET | `/api/freetravel/bookings/:id` | 단일 예약 조회 | `→ {id, name, data, sections, ...}` |
| PUT | `/api/freetravel/bookings/:id` | 예약 수정 | `{name, data, sections, ...}` → `{success}` |
| DELETE | `/api/freetravel/bookings/:id` | 예약 삭제 | `→ {success}` |
| GET | `/api/freetravel/company` | 회사 기본정보 조회 | `→ {name, ceo, ...}` |
| PUT | `/api/freetravel/company` | 회사 기본정보 저장 | `{name, ceo, ...}` → `{success}` |
| GET | `/api/freetravel/preview/:id` | 미리보기용 데이터 조회 | `→ {data, sections, ...}` |

### 3.4 핵심 모듈 설계

#### 3.4.1 freetravel-api.js (프론트엔드 API 유틸리티)

```javascript
const API = {
  baseURL: '/api/freetravel',

  // 예약 CRUD
  async getBookings() { /* GET /bookings */ },
  async getBooking(id) { /* GET /bookings/:id */ },
  async saveBooking(data) { /* POST /bookings */ },
  async updateBooking(id, data) { /* PUT /bookings/:id */ },
  async deleteBooking(id) { /* DELETE /bookings/:id */ },

  // 회사 정보
  async getCompany() { /* GET /company */ },
  async saveCompany(data) { /* PUT /company */ },

  // 미리보기 URL 생성
  generatePreviewURL(compressedData) {
    return `preview-free.html?d=${encodeURIComponent(compressedData)}`;
  }
};
```

#### 3.4.2 직렬화/역직렬화

```javascript
// 폼 데이터 직렬화 (에디터)
function serializeForm() {
  const data = {
    recipient: document.getElementById('recipient').value,
    sender: document.getElementById('sender').value,
    // ... 각 섹션 수집
    sections: {
      flights: document.getElementById('include-flights').checked,
      hotels: document.getElementById('include-hotels').checked,
      // ...
    }
  };
  return LZString.compressToEncodedURIComponent(JSON.stringify(data));
}

// URL 파라미터 디코딩 (미리보기)
function decodePreviewURL() {
  const params = new URLSearchParams(window.location.search);
  const compressed = params.get('d');
  if (!compressed) return null;
  const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
  return JSON.parse(decompressed);
}
```

---

## 4. UI 설계

### 4.1 travel-free.html (에디터)

```
┌─────────────────────────────────────────────────────────┐
│  사이드바 (260px)                                        │
│  ├─ 홈 / 단체명단 / 고객관리 / 일정표 ▾                   │
│  │  ├─ 상세일정 (travel-advanced.html)                   │
│  │  ├─ 간략일정 (travel-simple.html)                     │
│  │  ├─ 골프일정 (travel-simple-copy.html)                │
│  │  └─ 자유여행 예약 (travel-free.html) ← NEW            │
│  └─ 비용계산기 / 명단管理等                              │
├─────────────────────────────────────────────────────────┤
│  메인 콘텐츠 (max-w-4xl)                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  h1: 자유여행 예약내역 생성기                      │   │
│  │                                                 │   │
│  │  [저장 ▼] [불러오기] [초기화] [미리보기 & 공유]   │   │
│  │                                                 │   │
│  │  ── 기본 정보 ─────────────────────────────────  │   │
│  │  수신인 / 발신인 / 작성일 / 여행기간 / 여행지      │   │
│  │                                                 │   │
│  │  ── 항공편 [✓미리보기 포함] ────────────────────  │   │
│  │  [+탑승객그룹] [+항공편추가]                      │   │
│  │                                                 │   │
│  │  ── 숙박 [✓미리보기 포함] ──────────────────────  │   │
│  │  [+숙소추가]                                     │   │
│  │                                                 │   │
│  │  ... (렌터카, 골프, 커스텀, 결제, 회사정보)      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 4.2 preview-free.html (미리보기)

```
┌─────────────────────────────────────────────────────────┐
│  상단 고정 바 (sticky)                                   │
│  [←뒤로] [🔗복사] [💾저장] [🖨인쇄]                    │
├─────────────────────────────────────────────────────────┤
│  메인 콘텐츠 (max-w-md mx-auto, mobile-first)            │
│                                                         │
│  ┌─ 헤더 ─────────────────────────────────────────┐   │
│  │  여행세상 로고 + "예약 내역" 타이틀              │   │
│  │  수신인 / 발신인 / 작성일                        │   │
│  └────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ 항공편 카드 ──────────────────────────────────┐   │
│  │  👤 탑승객명 (배지)  ✈ OZ8143  12:25→13:20     │   │
│  │     [광주] ──────────→ [제주]                 │   │
│  └────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ 숙박 카드 ────────────────────────────────────┐   │
│  │  🏨 제주시리우스  /  2박  /  노기섭            │   │
│  └────────────────────────────────────────────────┘   │
│                                                         │
│  ... (렌터카, 골프, 커스텀 섹션)                        │
│                                                         │
│  ┌─ 결제 카드 (그라데이션) ──────────────────────┐   │
│  │  💰 총 결제액: ₩2,542,600                      │   │
│  │  은행: 하나은행 611-016420-721 (유) 여행세상    │   │
│  │  상태: [미결제] / [부분결제] / [결제완료]      │   │
│  └────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ 푸터 ─────────────────────────────────────────┐   │
│  │  (유) 여행세상 / 대표이사 김국진               │   │
│  │  [도장이미지]                                 │   │
│  │  전주시 완산구 서신동 / 063) 271-9090         │   │
│  └────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  하단 고정 바 (sticky)                                   │
│  [상세내역] [💾이미지저장] [🖨인쇄] [📞문의하기]        │
└─────────────────────────────────────────────────────────┘
```

---

## 5. 구현 순서 (Session Guide)

### Session 1: 백엔드 API
- [ ] `backend/db/freetravel-init.js` — 테이블 초기화
- [ ] `backend/routes/freetravel.js` — API 라우터
- [ ] `backend/server.js` — 라우터 등록
- [ ] 테스트: API 동작 확인

### Session 2: 에디터 기본 골격
- [ ] `frontend/itineraries/travel-free.html` — 기본 구조
- [ ] `frontend/js/freetravel-api.js` — API 유틸리티
- [ ] 기본 정보 섹션 + 저장/불러오기
- [ ] 테스트: 데이터 저장/조회

### Session 3: 동적 섹션
- [ ] 항공편 섹션 (탑승객 그룹, 항공편 카드)
- [ ] 숙박 섹션
- [ ] 렌터카 섹션
- [ ] 골프 섹션
- [ ] 커스텀 섹션
- [ ] 결제 정보 섹션
- [ ] 회사 정보 섹션

### Session 4: 미리보기 페이지
- [ ] `preview-free.html` — 기본 구조
- [ ] URL 파라미터 디코딩
- [ ] 섹션별 카드 UI 렌더링
- [ ] 상단/하단 액션 바

### Session 5: 사이드바 + 테스트
- [ ] 사이드바 메뉴 등록 (모든 대상 HTML)
- [ ] 기능 테스트
- [ ] 반응형 테스트
- [ ] 배포

---

## 6. 디자인 토큰

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--primary` | `#667eea` | 버튼, 강조 |
| `--primary-dark` | `#5a67d8` | 호버 |
| `--secondary` | `#764ba2` | 그라데이션 |
| `--accent` | `#7c3aed` | 아이콘, 배지 |
| `--card-radius` | `20px` | 카드 둥글기 |
| `--card-shadow` | `0 20px 60px rgba(0,0,0,0.3)` | 카드 그림자 |
| `--section-gap` | `1.5rem` | 섹션 간격 |
| `--font-kr` | `Noto Sans KR` | 한글 폰트 |

---

## 7. 테스트 플랜

### 7.1 API 테스트 (L1)
```bash
# 예약 목록
curl -s http://localhost:3000/api/freetravel/bookings

# 예약 생성
curl -s -X POST http://localhost:3000/api/freetravel/bookings \
  -H "Content-Type: application/json" \
  -d '{"name":"테스트예약","data":"{}"}'

# 예약 조회
curl -s http://localhost:3000/api/freetravel/bookings/:id

# 예약 삭제
curl -s -X DELETE http://localhost:3000/api/freetravel/bookings/:id
```

### 7.2 E2E 테스트 (Playwright)
```javascript
// 저장 → 미리보기 → 링크 복사 플로우
await page.click('#save-btn');
await page.fill('#save-name', '테스트예약');
await page.click('#confirm-save');
await page.click('#preview-share-btn');
// 새 탭에서 미리보기 페이지 확인
const newPage = await page.waitForEvent('popup');
await expect(newPage.locator('h1')).toContainText('예약 내역');
```

---

## 8. Decision Record Chain

| Phase | Decision | Rationale |
|-------|----------|----------|
| Plan | SQLite3 저장 방식 | 로컬 DB로 데이터 영속성 보장 |
| Plan | LZString URL 압축 | 미리보기 URL 파라미터로 데이터 전달 |
| Design | Option C (Pragmatic Balance) | 기존 HTML 재활용 + 최소 API 구조 |
| Design | RESTful API (`/api/freetravel/*`) | 백엔드 일관성 유지 |
| Design | UUID 기반 ID | 기존 `travel-saves.js` 패턴 참고 |
| Design | 섹션별 include 플래그 | 체크박스로 표시 여부 제어 |
