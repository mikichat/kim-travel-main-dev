# localStorage → 서버 DB 전환 현황 리포트

> 작성일: 2026-04-01 | 목표: 모든 PC에서 데이터 공유

---

## 현재 완료된 작업

| 키 | 용도 | API | 상태 |
|----|------|-----|------|
| `flight_saves_v2` | 항공편 관리 | `/api/flight-saves` | **완료** |
| `invoice_recipients` | 인보이스 수신자 | `/api/invoice-recipients` | **완료** |
| `invoice_templates` | 인보이스 템플릿 | `/api/invoice-templates` | **완료** |
| `travel_saves_v1` | 여행안내문 저장 | `/api/travel-saves` | **완료** |

---

## 추가 개선 필요 사항

### 즉시 수정 (1건)

| 파일 | 문제 | 영향 |
|------|------|------|
| `hanatour/js/auto-populate.js` | `flight_saves_v2`를 localStorage에서 직접 읽음 (FlightSyncManager 미사용) | 일정표 자동채우기에서 서버 DB 데이터 못 읽음 |

---

### Phase 1: 단체명단 DB화 (높음)

**키:** `group-roster-data`  
**영향 파일:** 7개  
**현재:** localStorage에만 저장 — PC 바꾸면 소실  

| 파일 | 참조 수 |
|------|---------|
| `group-roster-manager-v2 (3).html` | 9건 |
| `group-roster/index.html` | 다수 |
| `js/app.js` | 1건 |
| `frontend/static/js/group_form.js` | 1건 |

**작업:**
1. `group_rosters` 테이블 생성
2. `/api/group-rosters` CRUD API
3. GroupRosterManager 클래스 → 서버 API 전환
4. 마이그레이션 버튼 추가

---

### Phase 2: 견적서 DB화 (높음)

**키:** `quote_data`  
**영향 파일:** 3개  

| 파일 | 참조 수 |
|------|---------|
| `quote-editor-v1/index.html` | 2건 |
| `hanatour/js/auto-populate.js` | 1건 |

**작업:**
1. `quotes` 테이블 생성
2. `/api/quotes` CRUD API
3. 견적서 에디터 → 서버 API 전환

---

### Phase 3: 부수 데이터 (보통)

| 키 | 용도 | 파일 | 우선순위 |
|----|------|------|----------|
| `bus_reservations` | 버스 예약 | air1/storage-manager.js | 보통 |
| `saved_notices` | 공지사항 | air1/storage-manager.js | 보통 |
| `hanatour_packages` | 하나투어 패키지 | hanatour/ai_converter.html | 보통 |
| `tourLeaders` | 인솔자 정보 | hanatour/travel-*.html | 보통 |

---

### 자동 백업 시스템 업데이트

**파일:** `js/auto-backup.js`  
**현재:** `flight_saves_v2` 등 localStorage 키를 백업  
**문제:** 서버 DB로 이전된 데이터는 localStorage에 없어서 백업이 빈 값  
**수정:** `DATA_KEYS`에서 이전 완료된 키 제거, 서버 DB 백업은 별도 처리

---

## 변경 불필요 (localStorage 유지 OK)

| 키 | 용도 | 이유 |
|----|------|------|
| `air-booking-font-size` | 글꼴 크기 | UI 환경설정 (PC별 다를 수 있음) |
| `air-booking-dark-mode` | 다크모드 | UI 환경설정 |
| `air1_airport_code_mode` | 공항코드 표시 | UI 환경설정 |
| `darkMode` (preview) | 미리보기 다크모드 | 임시 세션 데이터 |
| `__pending_load__` | 페이지 간 데이터 전달 | 임시 (새로고침 시 소멸) |
| `__preview_images__` | 미리보기 이미지 캐시 | 임시 세션 데이터 |
| `travel_simple_selected_template` | 선택된 템플릿 ID | UI 상태 |

---

## 요약

| 구분 | 키 수 | 상태 |
|------|-------|------|
| 서버 DB 전환 완료 | 4개 | **완료** |
| 서버 DB 전환 필요 | 6개 | 미완료 |
| localStorage 유지 | 7개 | 변경 불필요 |
| **전체** | **17개** | |
