# Technical Requirements Document (TRD)
## 여행사 관리 시스템 (Travel Agency Management System)

### 1. 기술 스택 (Technology Stack)

#### 1.1 프론트엔드 (Frontend)
*   **HTML5:** 시멘틱 마크업 구조.
*   **CSS3:** Tailwind CSS (CDN 방식) 활용, 반응형 디자인.
*   **JavaScript (Vanilla):** ES6+ 문법, DOM 조작, 이벤트 핸들링.
*   **UX/UI:** SPA(Single Page Application) 유사 구조 (Section visibility toggling).

#### 1.2 외부 라이브러리 (External Libraries)
*   **Tailwind CSS:** 스타일링 프레임워크 (@cdn).
*   **FontAwesome (v6.4.0):** 아이콘 팩 (@cdn).
*   **SheetJS (xlsx):** 엑셀 파일 읽기/쓰기 (@cdnjs).
*   **Google Fonts:** Noto Sans KR (본문), Material Icons.

#### 1.3 데이터 저장소 (Data Storage)
*   **LocalStorage:** 브라우저 로컬 저장소를 메인 DB로 사용 (Legacy).
    *   `travel_bookings`, `travel_customers`, `travel_products`, `travel_notifications`
*   **IndexedDB (Backup):** `TravelAgencyDB` (v1) 사용.
    *   Store: `backups`
    *   KeyPath: `id` (timestamp)
    *   Indexes: `timestamp`
    *   Purpose: LocalStorage 데이터의 스냅샷 저장 (최대 5개 유지).

### 2. 시스템 아키텍처 (System Architecture)

#### 2.1 디렉토리 구조
*   `index.html`: 메인 진입점 및 컨테이너.
*   `css/`: 스타일 시트 (`style.css`, `sync-ui.css`, `wizard.css`).
*   `js/`: 비즈니스 로직 스크립트.
*   `docs/`: 프로젝트 문서.
*   `air1/`: 항공편 변환기 모듈.
*   `quote-editor-v1/`: 견적서 편집기 모듈.

#### 2.2 클라이언트 사이드 동작 방식
1.  **초기화:** `index.html` 로드 시 `js/main.js`(추정)에서 LocalStorage 데이터 로드.
2.  **라우팅:** Sidebar 클릭 이벤트를 통해 해당 Section ID (`#page-dashboard` 등)만 `display: block` 처리하고 나머지는 숨김.
3.  **데이터 처리:** 사용자의 입력은 즉시 LocalStorage에 JSON 형태로 직렬화되어 저장.

### 3. 데이터 모델 (Data Models - JSON Schema)

#### 3.1 Bookings (예약)
```json
{
  "id": "string (UUID)",
  "customerName": "string",
  "productName": "string",
  "departureDate": "string (YYYY-MM-DD)",
  "status": "string (enum: 문의, 예약확정, etc.)",
  "totalAmount": "number"
}
```

#### 3.2 Customers (고객)
```json
{
  "id": "string (UUID)",
  "nameKor": "string",
  "nameEng": "string",
  "passportNumber": "string",
  "passportExpiry": "string (YYYY-MM-DD)",
  "phone": "string"
}
```

#### 3.3 Backups (Defined in IndexedDB)
```json
{
  "id": "number (timestamp)",
  "timestamp": "number (created at)",
  "data": {
    "travel_bookings": "string (JSON)",
    "travel_customers": "string (JSON)",
    "travel_products": "string (JSON)",
    "travel_notifications": "string (JSON)"
  },
  "note": "string (Type: Auto/Manual)"
}
```

### 4. 보안 및 성능 (Security & Performance)
*   **보안:** 클라이언트 사이드에서만 동작하므로 서버로 데이터 전송 없음. (단, 로컬 PC 보안 중요)
*   **성능:** CDN 자원 캐싱 활용, DOM 조작 최소화 필요.
