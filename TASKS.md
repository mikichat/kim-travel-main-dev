# TASKS.md - 품질 개선 이력 (2026-02-22)

## 프로젝트 개요
localhost:5000 여행사 관리 시스템 - 백엔드/프론트엔드 코드 품질 개선

---

## 완료된 작업 (2026-02-20 ~ 02-21)

### Phase 1: API 입력 검증 강화 ✅
- [x] T1.1: 항공 스케줄 시간/날짜/필수필드 유효성 검증 (`backend/routes/flight-schedules.js`)
- [x] T1.2: 인보이스 API 입력 검증 - 필수필드, 숫자형식, 문자열길이 (`backend/routes/invoices.js`)

### Phase 2: 환경 설정 개선 ✅
- [x] T2.1: CORS 출처를 `CORS_ORIGINS` 환경변수로 설정 가능 (`backend/server.js`)
- [x] T2.2: DB 경로를 `DATABASE_PATH` 환경변수로 설정 가능 (`backend/database.js`)

### Phase 3: 코드 품질 ✅
- [x] T3.1: 동기 파일 연산(mkdirSync, unlinkSync) → 비동기 전환 (`backend/server.js`)
- [x] T3.2: parseProductText 함수에 JSDoc + 섹션 구분 주석 (`backend/server.js`)

### Phase 4: 남은 alert/confirm → toast/modal 전환 ✅
- [x] T4.1: quote-editor-v1 alert/confirm → toast/modal (`quote-editor-v1/`)
- [x] T4.2: hanatour auto-populate prompt → DOM 모달 (`hanatour/js/auto-populate.js`)

### Phase 5: fetch 에러 처리 강화 ✅
- [x] T5.1: js/app.js fetch 호출 7곳 response.ok 체크 + catch showToast
- [x] T5.2: eventHandlers.js 빈 catch 블록 개선

### Phase 6: console.log 정리 ✅
- [x] T6.1: air1/ 디버그 console.log 24개 제거 (saved-flights, notice-writer, main)
- [x] T6.2: cost-calculator.js 디버그 console.log 2개 제거

### Phase 7: 마무리 품질 개선 ✅
- [x] T7.1: fix-flight-schedule.js, data-loader-1.js alert → toast + console 정리
- [x] T7.2: invoice-editor.js fetch 에러 처리 + console.log 11개 제거
- [x] T7.3: select-group.html, select-schedules.html 접근성 aria-label 7건 추가

### Phase 8: 서버 안정성 ✅
- [x] T8.1: auth.js requireAdmin 미들웨어 try-catch 추가
- [x] T8.2: server.js 글로벌 unhandledRejection/uncaughtException 핸들러
- [x] T8.3: eventHandlers.js 디버그 console.log 19개 제거

### Phase 9: 백엔드 API Integration Test ✅
- [x] T9.1: Jest + Supertest 설정 (jest.config.js, uuid ESM→CJS mock)
- [x] T9.2: 테스트 인프라 구축 (in-memory SQLite, Express 앱 팩토리, 인증 헬퍼)
- [x] T9.3: auth.test.js — login/logout/me/admin CRUD (25 cases)
- [x] T9.4: bank-accounts.test.js — CRUD + default 계좌 (17 cases)
- [x] T9.5: flight-schedules.test.js — CRUD + 유효성 검증 + 만료 정리 (24 cases)
- [x] T9.6: invoices.test.js — Simple/Advanced 모드 + 자동계산 + FK 조인 (25 cases)

### Phase 10: 프론트엔드 단위 테스트 ✅
- [x] T10.1: conflict-resolver.js, airport-database.js에 CJS module.exports 추가
- [x] T10.2: 루트 Jest 설정 (jest.config.cjs) + test:frontend 스크립트
- [x] T10.3: airline-codes.test.js — 코드 추출, 항공사명 변환, 데이터 검증 (21 cases)
- [x] T10.4: conflict-resolver.test.js — resolve, merge, 필드 매핑, batch (23 cases)
- [x] T10.5: airport-database.test.js — 코드/도시/지역 조회, 검색, 포맷 (25 cases)

### Phase 11: HTML 접근성 개선 ✅
- [x] T11.1: 사이드바 nav-item-parent role/tabindex/aria-expanded 추가 (9파일, 22개)
- [x] T11.2: toggleSubmenu 함수 aria-expanded 토글 로직 추가 (9파일)
- [x] T11.3: index.html label for 연결 78건 + 필터 aria-label 7건
- [x] T11.4: flight-schedule.html 필터 aria-label 5건 + label for 19건 + loading role
- [x] T11.5: cost-calculator.html aria-label 4건 + label for 2건
- [x] T11.6: air1/index.html textarea aria-label 2건

### Phase 12: 자유여행 예약 시스템 QA ✅
- [x] T12.1: travel-free.html + preview-free.html 코드 리뷰
- [x] T12.2: XSS 취약점 수정 (addCostEtcRow innerHTML → .value 프로퍼티)
- [x] T12.3: localStorage quota 에러 시 사용자 피드백 추가
- [x] T12.4: preview-free.html console.error 3건 제거
- [x] T12.5: travel-free.html 폼 접근성 (label for 20건, aria-label 30건+)
- [x] T12.6: free-travel.test.js 단위 테스트 (8 suites, 56 cases)

### Phase 13: fetchJSON 유틸 함수 추출 ✅
- [x] T13.1: `js/fetch-utils.js` 신규 생성 — fetchJSON 전역 유틸 (Content-Type 기본, 에러 추출, 204 처리)
- [x] T13.2: `__tests__/js/fetch-utils.test.js` 단위 테스트 7개 작성
- [x] T13.3: 고우선순위 리팩터링 — app.js(16), ui.js(4), cost-calculator.js(6), group-sync-manager.js(6)
- [x] T13.4: 중우선순위 리팩터링 — invoice-editor.js(5), invoice-list.html(4), select-schedules.html(1)
- [x] T13.5: HTML script 태그 추가 (index.html, invoice-editor.html, invoice-list.html, select-schedules.html)

### Phase 14: 백엔드 로깅 체계화 (winston) ✅
- [x] T14.1: winston 설치 + `backend/logger.js` 로거 모듈 생성 (콘솔+파일, 레벨별 분리, 로테이션)
- [x] T14.2: server.js console.log/error/warn 31개 → logger.info/error/warn 전환
- [x] T14.3: database.js console.log/error 53개 → logger 전환
- [x] T14.4: routes/ 4파일 (auth, invoices, flight-schedules, bank-accounts) 31개 → logger 전환
- [x] T14.5: services/notify.js 8개 → logger 전환
- [x] T14.6: .gitignore에 backend/logs/ 추가

### Phase 15: CSS 공통 스타일 정리 ✅
- [x] T15.1: select-group.html — 중복 sidebar/main-content/search-input CSS 제거
- [x] T15.2: select-schedules.html — 중복 btn/main-content CSS 제거 (btn-success/warning 유지)
- [x] T15.3: schedules.html — 중복 btn 기본 스타일 제거 (페이지 고유 스타일 유지)
- [x] T15.4: flight-schedule.html — 중복 sidebar/modal/btn/form/card CSS ~200줄 제거

### Phase 16: 레거시/테스트 파일 정리 ✅
- [x] T16.1: 루트 test-*.html 9개 삭제
- [x] T16.2: air1/test-*.html + auto-test.html 5개 삭제
- [x] T16.3: hanatour/ test-*.html + backup/copy 4개 삭제
- [x] T16.4: quote-editor-v1/ test-*.html 3개 삭제
- [x] T16.5: contract/legacy-html/ 디렉토리 전체 삭제 (12파일) + backups/*.bak 2개 삭제
- [x] T16.6: 루트 debug/fix/delete 유틸 HTML 3개 삭제
- [x] T16.7: backend/scripts/ 일회성 스크립트 12개 삭제 + migrations/test 1개 삭제

### Phase 17: 프론트엔드 ES Modules 도입 ✅
- [x] T17.1: ESM 래퍼 모듈 9개 생성 (`js/modules/toast.js`, `fetch-utils.js`, `airline-codes.js`, `airport-database.js`, `group-sync-manager.js`, `conflict-resolver.js`, `product-matcher.js`, `flight-sync-manager.js`, `auto-backup.js`)
- [x] T17.2: `eventHandlers.js` — bare global 참조 → 명시적 import 전환 (showToast, fetchJSON, FlightSyncManager, GroupSyncManager)
- [x] T17.3: `app.js` — bare global 참조 → 명시적 import 전환 (showToast, showPromptModal, showConfirmModal, fetchJSON, FlightSyncManager)
- [x] T17.4: `index.html` 인라인 스크립트 ~1,150줄 → `js/modules/iframe-bridge.js` 추출 (postMessage, 고객동기화, 위자드, 인증/401)
- [x] T17.5: `flight-schedule.html` 인라인 스크립트 ~1,311줄 → `js/flight-schedule-app.js` 추출 (CRUD, PNR파싱, 동기화)

### Phase 18: CI/CD 파이프라인 + Prettier 포맷 ✅
- [x] T18.1: `.github/workflows/ci.yml` 생성 — 3개 병렬 Job (format-check, backend-tests, frontend-tests)
- [x] T18.2: `js/`, `__tests__/` 35파일 Prettier 포맷 일괄 적용 (CI green 보장)

### 이전 세션 (2026-02-20)
- [x] 전체 HTML 파일 alert/confirm/prompt → toast/modal 전환 (30+ 파일)
- [x] Backend 보안: 파일 업로드 MIME 검증, rate limiting, ENV 유효성 검사
- [x] Backend 정리: 유틸리티 스크립트 15개 scripts/ 이동, .gitignore 정비

---

## 커밋 이력

| 날짜 | 커밋 | 내용 |
|------|------|------|
| 03-17 | `8591b6c` | group-roster 컴포넌트 마이그레이션 — 106 Vitest 통과 (Phase 61) |
| 03-17 | `d765af2` | group-roster Vite + React + TS 스캐폴드 (Phase 61) |
| 03-17 | `82edeb8` | Docker 컨테이너화 — compose + Nginx + 볼륨 (Phase 62) |
| 03-17 | `1f8c793` | E2E Playwright POM 패턴 — 37 테스트 케이스 (Phase 63) |
| 02-22 | `4d76a80` | Helmet 보안 헤더 + Rate Limiting + 모달 포커스 트래핑 (Phase 44) |
| 02-22 | `d9c2b8d` | parseInt NaN 방어 + localStorage try-catch + 키보드 접근성 (Phase 43) |
| 02-22 | `4394129` | 불필요한 CSS !important 3건 제거 (Phase 42) |
| 02-22 | `3fb9d36` | button type="button" 속성 331개 추가 (Phase 41) |
| 02-22 | `0d199d6` | setInterval 누수 방지 + ID 생성 패턴 통합 (Phase 40) |
| 02-22 | `b6112ae` | npm 패키지 업데이트 + .gitignore 보완 + innerHTML 루프 최적화 (Phase 39) |
| 02-22 | `df86c5b` | 루트 ESLint config 수정 — 191 problems → 0 (Phase 38) |
| 02-22 | `d23616f` | formatPhoneNumber 중복 제거 + unused vars + broken import 수정 (Phase 37) |
| 02-22 | `06b23eb` | 중복 ESM wrapper 9개 삭제 + import→window 전역 변환 (Phase 35) |
| 02-22 | `f66f87d` | 서브디렉토리 CSS 미사용 스타일 14개 제거 (Phase 34) |
| 02-22 | `6a74c97` | 레거시/빈 파일 삭제 + localhost 환경변수화 (Phase 33) |
| 02-22 | `046db37` | 루트 일회성 유틸 스크립트 49개 삭제 (Phase 32) |
| 02-22 | `af43940` | npm 패키지 정리 + 보안 감사 (Phase 31) |
| 02-22 | `5e7fcf5` | CSS 미사용 스타일 34개 클래스 제거 (Phase 30) |
| 02-22 | `9f2bcb2` | readFileSync→async + innerHTML XSS 보안 수정 (Phase 29) |
| 02-22 | `9f7d7ab` | ESLint no-unused-vars 59→0 수정 (Phase 28) |
| 02-22 | `96bae58` | HTML console.log 정리 + 프론트엔드 ESLint (Phase 27) |
| 02-22 | `1cc96a6` | 프론트엔드 console.log 정리 Part 2 (Phase 26) |
| 02-22 | `8bde66c` | 테스트 커버리지 보강 (Phase 25) |
| 02-22 | `d4d6e61` | quote-editor-v1/ ES Modules 전환 (Phase 23) |
| 02-22 | `4abb0e1` | 백엔드 API 문서화 Swagger/OpenAPI (Phase 22) |
| 02-22 | `72e47bd` | in/ ES Modules 전환 (Phase 21) |
| 02-22 | `43e1bfe` | CI/CD 파이프라인 + Prettier 포맷 (Phase 18) |
| 02-21 | `4abfff0` | 코드 품질 개선 Phase 13-17 |
| 02-21 | `8556b0d` | 자유여행 QA Phase 12 |
| 02-21 | `2fbf504` | HTML 접근성 개선 Phase 11 |
| 02-21 | `e1cf575` | 프론트엔드 단위 테스트 (3 suites, 69 cases) |
| 02-21 | `8869695` | 백엔드 API integration test (91 cases) |
| 02-21 | `5a6656c` | 서버 안정성: 에러 핸들러, middleware try-catch |
| 02-21 | `b8b9d7b` | 마무리: 남은 alert, invoice 에러 처리, 접근성 |
| 02-21 | `2f07f4e` | Frontend: alert 전환, fetch 에러 처리, console 정리 |
| 02-21 | `d1ba1c1` | Backend: API 검증, 환경변수, 비동기 전환, JSDoc |

---

## 완료된 개선 영역

- [x] 프론트엔드 테스트 코드 작성 → Phase 10 (3 suites, 69 cases)
- [x] 백엔드 API 테스트 코드 작성 → Phase 9 (4 suites, 91 cases)
- [x] 자유여행 예약 시스템 QA → Phase 12 (56 tests + XSS fix + a11y)
- [x] HTML 접근성 개선 → Phase 11 (9파일, ~140건)
- [x] fetchJSON 유틸 추출 → Phase 13 (32개 호출 리팩터)
- [x] 백엔드 로깅 체계화 → Phase 14 (winston, 124개 전환)
- [x] CSS 공통 스타일 정리 → Phase 15 (4파일, ~400줄 제거)
- [x] 레거시/테스트 파일 정리 → Phase 16 (51파일 삭제)
- [x] ES Modules 도입 → Phase 17 (ESM 래퍼 9개 + 인라인 추출 ~2,460줄)
- [x] CI/CD 파이프라인 → Phase 18 (GitHub Actions 3 Job + Prettier 35파일 포맷)
- [x] hanatour/ ESM 전환 → Phase 19 (3파일, toast.js 누락 수정)
- [x] air1/ ESM 전환 → Phase 20 (6파일, 2 HTML 전환)
- [x] in/ ESM 전환 → Phase 21 (4파일, toast.js 누락 수정, resetExtraItems 추가)
- [x] API 문서화 → Phase 22 (Swagger/OpenAPI, 35 경로, 13 태그, 7 스키마)
- [x] quote-editor-v1/ ESM 전환 → Phase 23 (3 JS + 5 HTML, script 순서 정리)
- [x] Backend ESLint → Phase 24 (ESLint 10 flat config, 27개 문제 수정, CI lint Job)
- [x] 테스트 커버리지 보강 → Phase 25 (51 cases 추가, auth.js 100%, threshold 설정)
- [x] 프론트엔드 console.log 정리 Part 2 → Phase 26 (15파일, ~138개 제거, error/warn 유지)
- [x] HTML console.log 정리 + 프론트엔드 ESLint → Phase 27 (13 HTML, 18 lint 에러 수정, CI frontend-lint Job)
- [x] ESLint no-unused-vars 수정 → Phase 28 (59→0 경고, 15파일, varsIgnorePattern 설정)
- [x] readFileSync→async + innerHTML XSS 보안 → Phase 29 (5 sync→async, 14파일 XSS 수정)
- [x] CSS 미사용 스타일 정리 → Phase 30 (34 클래스 제거, 372줄 삭제)
- [x] npm 패키지 정리 + 보안 감사 → Phase 31 (미사용 2개 제거, 누락 1개 추가, audit fix 31→27)
- [x] 루트 일회성 유틸 스크립트 정리 → Phase 32 (49파일 삭제, 5,803줄 제거)
- [x] 레거시/빈 파일 삭제 + localhost 환경변수화 → Phase 33 (2파일 삭제, APP_URL 환경변수)
- [x] 서브디렉토리 CSS 미사용 스타일 정리 → Phase 34 (4파일 14개 클래스 제거, 87줄 삭제)
- [x] 중복 ESM wrapper 통합 → Phase 35 (9개 wrapper 삭제, 14파일 import→window 변환, -73줄)
- [x] 중복 함수 통합 + unused vars 정리 → Phase 37 (formatPhoneNumber 1곳 통합, broken import 6건 수정, unused 5건 제거)
- [x] 루트 ESLint config 수정 → Phase 38 (191 problems → 0, ignores 4개 추가, config 블록 2개 추가)
- [x] npm 업데이트 + .gitignore + innerHTML 최적화 → Phase 39 (cors/dotenv minor, gitignore 패턴 추가, DOM 리파싱 제거)
- [x] setInterval 누수 방지 + ID 생성 통합 → Phase 40 (인터벌 ID 저장, unref(), generateId() 유틸)
- [x] button type 속성 누락 수정 → Phase 41 (35파일 331개 type="button" 추가)
- [x] CSS !important 정리 → Phase 42 (3건 제거: style.css 2건, wizard.css 1건)
- [x] parseInt NaN 방어 + localStorage 안전 + ID 생성 통합 + 키보드 접근성 → Phase 43 (14파일 수정)
- [x] Helmet 보안 헤더 + Rate Limiting + 모달 포커스 트래핑 → Phase 44 (보안 + WCAG 접근성)

---

## 다음 작업 계획 (2026-02-22~)

### Phase 19: `hanatour/` ES Modules 전환 ✅
- [x] T19.1: hanatour/ JS 3파일 분석 (main.js, auto-populate.js, excel-import.js)
- [x] T19.2: ESM import 추가 (toast.js 래퍼) + 중복 showToast 제거 (main.js)
- [x] T19.3: excel-import.js IIFE 제거, window 노출 추가 (onclick 핸들러용)
- [x] T19.4: HTML 3파일 script `type="module"` 전환 + toast.js 누락 수정

### Phase 20: `air1/` ES Modules 전환 ✅
- [x] T20.1: air1/ JS 6파일 분석 (storage-manager, saved-flights, bus-reservation, notice-writer, main, manual-flight)
- [x] T20.2: ESM import/export 전환 (toast, StorageManager, airline-codes) + window 노출
- [x] T20.3: index.html, sync-storage.html script `type="module"` 전환

### Phase 21: `in/` ES Modules 전환 ✅
- [x] T21.1: in/ JS 4파일 분석 (config.js, invoice-editor.js, invoice-templates.js, invoice-excel.js)
- [x] T21.2: ESM import/export 전환 (toast, fetch-utils, flight-sync-manager 래퍼 활용) + window 노출
- [x] T21.3: invoice-editor.html — toast.js 누락 수정 + script `type="module"` 전환
- [x] T21.4: resetExtraItems() 함수 추가 (cross-module 상태 관리), config.js classic 유지

### Phase 22: 백엔드 API 문서화 (Swagger/OpenAPI) ✅
- [x] T22.1: swagger-jsdoc + swagger-ui-express 설치 및 설정 (`swagger.js` — 7개 스키마 정의)
- [x] T22.2: 4개 라우트 파일 JSDoc @swagger 어노테이션 (auth 8개, invoices 6개, flight-schedules 8개, bank-accounts 7개)
- [x] T22.3: server.js 라우트 정의 `swagger-defs.js` (upload, schedules, cost-calculations, sync, backup, tables 등 18개)
- [x] T22.4: `/api-docs` Swagger UI + `/api-docs.json` 스펙 엔드포인트 (인증 불필요)

### Phase 23: `quote-editor-v1/` ES Modules 전환 ✅
- [x] T23.1: JS 3파일 CJS → ESM 전환 (data-binding.js, itinerary-data.js, flight-loader.js)
- [x] T23.2: window exposure 추가 (inline script / onclick 핸들러용)
- [x] T23.3: HTML 5파일 script `type="module"` 전환 + classic 선로딩 정리
- [x] T23.4: index.html script 순서 재정렬 (toast/flight-sync-manager classic → storage-manager/data-binding/flight-loader module)

### Phase 24: Backend ESLint 설정 + CI 연동 ✅
- [x] T24.1: ESLint 10 + @eslint/js + eslint-config-prettier + globals 설치
- [x] T24.2: `backend/eslint.config.js` flat config 생성 (CommonJS + Node.js + Jest)
- [x] T24.3: lint 에러 12개 수정 (no-useless-escape 5, no-case-declarations 5, no-useless-assignment 1, preserve-caught-error 1)
- [x] T24.4: lint 경고 15개 수정 (unused catch vars → `_e`, unused imports 제거)
- [x] T24.5: CI `backend-lint` Job 추가 (4개 병렬 Job)

### Phase 25: 테스트 커버리지 측정 및 보강 ✅
- [x] T25.1: 초기 커버리지 측정 — Backend 87.14%/85.23%/97.01%/87.31%, Frontend 93.69%/92.64%/100%/93.45%
- [x] T25.2: `backend/__tests__/middleware/auth.test.js` 신규 — requireAuth 미들웨어 39 cases (whitelist, 401, redirect, static, edge)
- [x] T25.3: `backend/__tests__/routes/error-handling.test.js` 신규 — DB 에러 경로 12 cases (auth/bank/flight/invoice catch blocks)
- [x] T25.4: 커버리지 threshold 설정 — backend (90/85/95/90), frontend (90/90/100/90)
- [x] T25.5: 최종 커버리지 — Backend 91.74%/87.3%/97.01%/92.03%, auth.js 75%→100%

### Phase 26: 프론트엔드 console.log 정리 Part 2 ✅
- [x] T26.1: Tier 1 대량 파일 — iframe-bridge(38), flight-schedule-app(20), auto-backup(17), flight-sync-manager(7), group-sync-manager(4), ui(4)
- [x] T26.2: Tier 1 소량 파일 — app(1), sampleData(3), modals(1), indexed-db(2)
- [x] T26.3: Tier 2 서브디렉토리 — auto-populate(4), excel-import(5), invoice-excel(2), data-binding(4), flight-loader(2)
- [x] T26.4: Prettier 포맷 + 테스트 (Backend 133, Frontend 132 passed) + 잔여 console.log 0개 확인

### Phase 27: HTML console.log 정리 + 프론트엔드 ESLint ✅
- [x] T27.1: HTML 인라인 console.log 정리 — 소형 12파일 (34개: preview, flight-schedule, quote-editor, invoice-preview, air1, upload, edit-schedule)
- [x] T27.2: group-roster-manager-v2 console.log 42개 제거 (console.error 27 + console.warn 15 유지)
- [x] T27.3: 프론트엔드 ESLint — eslint.config.js Vanilla JS 블록 (globals.browser, eqeqeq, prefer-const, no-console warn) + 에러 18개 수정 + --fix 118개 자동 수정
- [x] T27.4: CI frontend-lint Job 추가 (5개 병렬 Job) + 테스트 통과 (Backend 133, Frontend 132)

### Phase 28: ESLint no-unused-vars 경고 59→0 수정 ✅
- [x] T28.1: catch 변수 11개 (_e/_error), 함수 인자 7개 (_prefix), 미사용 변수 19개 (제거/prefix), HTML 런타임 함수 22개 (eslint-disable)
- [x] T28.2: ESLint config — varsIgnorePattern + caughtErrorsIgnorePattern 추가, 최종 0 errors 0 warnings
- 참고: 중복 유틸 파일 8쌍 (js/ + js/modules/) 분석 → 의도적 ESM 래퍼 구조, 24 HTML classic script 의존으로 통합 보류

### Phase 29: readFileSync → async + innerHTML XSS 보안 수정 ✅
- [x] T29.1: backend/server.js `readFileSync` 5개 → `fs.promises.readFile` 비동기 전환 (fileToGenerativePart, extractHwpText → async, PDF/DOC/HWPX 읽기)
- [x] T29.2: innerHTML XSS 보안 리뷰 — 378개 사용처 분석 (JS 185 + HTML 193), 66개 RISKY 식별
- [x] T29.3: innerHTML XSS 수정 14파일 — sanitizeHtml/escapeHtml 적용
  - HTML 4파일: db-viewer(40+필드), print_template(일정/교통편), export_itinerary(8필드), convert_danang(key/value+alert)
  - JS 10파일: air1/main+saved-flights(고객/항공편), hanatour/main(패키지 목록/상세/편집폼), in/invoice-editor+templates(항목명/템플릿명), cost-calculator(운임명), iframe-bridge(에러메시지), data-binding(위험패턴→escape+br), data-loader-1(줄바꿈)
- [x] T29.4: 테스트 통과 (Backend 133, Frontend 132) + ESLint 0 errors 0 warnings

### Phase 30: CSS 미사용 스타일 정리 ✅
- [x] T30.1: CSS 선택자 사용 여부 분석 — style.css 258개 클래스, 12 HTML + 11 JS 참조 파일 대조
- [x] T30.2: 미사용 CSS 34개 클래스 제거 (372줄 삭제, 3,070 → 2,698줄)
  - quote-header/section/info/info-item/info-label/info-value/total/total-amount (66줄)
  - notification-item/icon/content/message/meta/type/unread-dot (64줄)
  - passport-lightbox/lightbox-close (38줄)
  - security-toggle + 반응형 (33줄)
  - schedule-destination/location/transport (19줄)
  - product-badges/badge + badge-guide/hotel/vehicle + product-date-inline (37줄)
  - btn-outline/btn-outline-warning (20줄)
  - legend-dot (3개 위치, 28줄)
  - charts-grid, events-container, todo-indicator/info/actions (미디어 쿼리 내, 46줄)
  - group-customer-radio, selected-row (13줄)
- [x] T30.3: 테스트 통과 (Backend 133, Frontend 132) + ESLint 0 errors 0 warnings

### Phase 31: npm 패키지 정리 + 보안 감사 ✅
- [x] T31.1: 미사용 패키지 제거 — `docx`, `pdf-parse` (소스 참조 0건)
- [x] T31.2: 누락 패키지 추가 — `winston` (logger.js에서 사용, package.json 누락)
- [x] T31.3: `node-fetch` → Node.js 내장 `fetch` 전환 (v24+, 의존성 1개 감소)
- [x] T31.4: `npm audit fix` — qs/express 취약점 수정 (31 → 27 high)
  - 잔여: xlsx (Prototype Pollution + ReDoS, fix 없음), minimatch (jest/swagger-jsdoc devDep 경유), tar (sqlite3/node-gyp 경유)
- [x] T31.5: Phase 29 누락분 XSS 수정 포함 (edit-schedule, invoice-list/preview, app, ui, landing, select-group/schedules — 9파일)
- [x] T31.6: 테스트 통과 (Backend 133, Frontend 132) + ESLint 0 errors 0 warnings

### Phase 32: 루트 일회성 유틸 스크립트 정리 ✅
- [x] T32.1: 루트 레벨 JS 파일 49개 삭제 (5,803줄 제거)
  - check-* 16개, test-* 7개, verify-* 5개, create-* 4개, delete-* 3개, fix-* 2개, force-* 2개, migrate/resync/cleanup/run/update/find 각 1개
  - 디버깅/마이그레이션/검증용 일회성 스크립트, HTML/소스 참조 없음
  - localhost:5000 하드코딩 91건 일괄 제거 효과
- [x] T32.2: eslint.config.js 유지 확인 (프로젝트 설정 파일)
- [x] T32.3: 테스트 통과 (Backend 133, Frontend 132)

### Phase 33: 잔여 레거시/빈 파일 정리 + localhost 환경변수화 ✅
- [x] T33.1: `hanatour/travel-advanced-original.html` 삭제 (2,489줄, 백업 파일, 참조 0건)
- [x] T33.2: `quote-editor-v1/css/editor.css` 삭제 (0줄, 빈 파일, 참조 0건)
- [x] T33.3: `localhost:5000` 하드코딩 환경변수화 — notify.js, swagger.js → `process.env.APP_URL || 'http://localhost:5000'`
  - 잔여 3건 유지: server.js (이미 CORS_ORIGINS), iframe-bridge.js (window.location.origin 우선), sync-storage.html (설명 텍스트)
- [x] T33.4: 테스트 통과 (Backend 133) + ESLint 0 errors 0 warnings

### Phase 34: 서브디렉토리 CSS 미사용 스타일 정리 ✅
- [x] T34.1: 4개 서브디렉토리 CSS 분석 (hanatour 702줄, in 443줄, quote-editor 959줄, doc-template 771줄)
- [x] T34.2: 미사용 14개 클래스 제거 (87줄 삭제)
  - in/css/invoice.css: price-row, total-display (443→422줄, -21줄)
  - quote-editor-v1/css/itinerary.css: edit-mode (297→283줄, -14줄)
  - doc-template-1/styles/screen.css: text-center/left/right, mb-sm/md/lg (456→429줄, -27줄)
  - doc-template-1/styles/print.css: print-hide/show, page-break-before/after/avoid (315→290줄, -25줄)
  - hanatour/css/style.css: 미사용 0개 (변경 없음)
- [x] T34.3: 테스트 통과 (Backend 133, Frontend 132)

### Phase 35: 중복 ESM wrapper 통합 (9쌍 → 단일화) ✅
- [x] T35.1: Tier 1 — ESM 소비자 없는 4개 wrapper 삭제 (auto-backup, conflict-resolver, group-sync-manager, product-matcher)
- [x] T35.2: Tier 2 — ESM 소비자 있는 5쌍 import 변환 + wrapper 삭제
  - airline-codes (1곳: air1/main.js), airport-database (1곳: flight-schedule-app.js)
  - fetch-utils (2곳: app.js, invoice-editor.js), flight-sync-manager (3곳: app.js, flight-schedule-app.js, invoice-editor.js)
  - toast (12곳: app.js, flight-schedule-app.js, air1/ 5개, in/ 3개, hanatour/ 3개)
  - `import { X } from './modules/X.js'` → `const { X } = window;` 변환
- [x] T35.3: js/modules/ 17→8파일, 잔여 import 0건, 테스트 통과 (Backend 133, Frontend 132)

### Phase 36: img alt 접근성 개선 ✅
- [x] T36.1: alt 속성 누락 img 태그 22개 수정 (4개 파일)
  - hanatour/travel-advanced.html: 9개 (HTML 6 + JS innerHTML 3)
  - hanatour/travel-simple.html: 10개 (HTML 7 + JS innerHTML 3)
  - hanatour/travel-free.html: 1개
  - hanatour-converter/debug_list_page.html: 2개 (tracking pixel, alt="")
- [x] T36.2: 테스트 통과 (Backend 133, Frontend 132)

### Phase 37: 중복 함수 통합 + unused vars 정리 ✅
- [x] T37.1: `formatPhoneNumber()` 중복 제거 — iframe-bridge.js 정의 삭제 → eventHandlers.js에서 export + import
- [x] T37.2: Phase 35 누락 broken import 6건 수정 — js/modules/ 내부 파일의 삭제된 sibling wrapper 참조 → `const { X } = window;`
  - eventHandlers.js: toast(2), fetchJSON(1, unused 제거), FlightSyncManager(1), GroupSyncManager(1)
  - iframe-bridge.js: toast(2), fetchJSON(1, unused 제거)
- [x] T37.3: unused vars 3건 제거 — air1/main.js (`showConfirmModal`, `AIRLINE_CODES`), storage-manager.js (`showToast`)
- [x] T37.4: 테스트 통과 (Backend 133, Frontend 132)

### Phase 38: 루트 ESLint config 수정 (191→0) ✅
- [x] T38.1: ignores 추가 — `tourworld1/` (서브모듈, 자체 ESLint), `123/` (별도 프로젝트), `util/`, `contract/`
- [x] T38.2: config 블록 추가 — `doc-template-1/`, `shared/`, `server/shared/` (CJS+browser, no-undef off)
- [x] T38.3: `server/tests/` config 블록 추가 (vitest 환경, no-explicit-any off)
- [x] T38.4: `client/src/` no-console → `allow: ['error', 'warn']` 통일 + console.log 1건 제거 + 엔티티 이스케이프
- [x] T38.5: unused vars 수정 — flight-schedule-app.js, imageService.ts, server/tests/ 3파일
- [x] T38.6: 최종 결과 — 루트+백엔드 ESLint 0 errors 0 warnings, 테스트 통과 (Backend 133, Frontend 132)

### Phase 39: npm 패키지 업데이트 + .gitignore 보완 + innerHTML 최적화 ✅
- [x] T39.1: npm minor 업데이트 — cors 2.8.5→2.8.6, dotenv 17.2.3→17.3.1
- [x] T39.2: .gitignore 보완 — `*.log` 글로브, `.DS_Store`, `Thumbs.db`, editor swap (`*.swp`, `*.swo`, `*~`), 중복 항목 정리
- [x] T39.3: ui.js innerHTML += 루프 → `map().join()` 일괄 할당 (DOM 리파싱 O(n²) 제거)
- [x] T39.4: 테스트 통과 (Backend 133, Frontend 132) + ESLint 0 errors 0 warnings

### Phase 40: setInterval 누수 방지 + ID 생성 패턴 통합 ✅
- [x] T40.1: flight-schedule-app.js — setInterval ID 저장 (`_alarmIntervalId`, `_expiredIntervalId`) + 중복 호출 시 clearInterval
- [x] T40.2: backend/server.js — rate limiter cleanupInterval에 `.unref()` 추가 + `return limiter` 누락 수정
- [x] T40.3: app.js — `generateId()` 유틸 함수 생성, 2곳 `Date.now()+Math.random()` → `generateId()` 통합
- [x] T40.4: 테스트 통과 (Backend 133, Frontend 132) + ESLint 0 errors 0 warnings

### Phase 41: button type 속성 누락 수정 ✅
- [x] T41.1: 35개 HTML 파일에서 type 속성 없는 `<button>` 331개에 `type="button"` 추가
  - 주요: index.html(38), group-roster-manager-v2(38), preview-mobile(34), preview(30)
  - air1/(26), hanatour/(103), in/(10), cost-calculator(16), flight-schedule(12)
- [x] T41.2: 제외 대상 — tourworld1/, 123/, samples/, api/, frontend/ (별도 프로젝트)
- [x] T41.3: 잔여 누락 0건, 테스트 통과 (Backend 133, Frontend 132) + ESLint 0 errors 0 warnings

### Phase 42: CSS !important 정리 ✅
- [x] T42.1: 전체 CSS !important 분석 — ~85건 중 제거 가능 3건 식별
  - 대부분 @media print (53건) 또는 coverage/생성 파일 — 정당한 사용
- [x] T42.2: 불필요한 !important 3건 제거
  - `css/style.css:901` `.empty-message padding` — 경합 규칙 없음
  - `css/style.css:1981` `.products-grid grid-template-columns` — 동일 breakpoint source order 우선
  - `css/wizard.css:233` `.wizard-button:disabled transform` — :disabled가 :hover 뒤 선언으로 cascade 승리
- [x] T42.3: 테스트 통과 (Backend 133, Frontend 132) + ESLint 0 errors 0 warnings

### Phase 43: parseInt NaN 방어 + localStorage 안전 + ID 통합 + 키보드 접근성 ✅
- [x] T43.A: parseInt/parseFloat `|| 0` fallback 10건 추가
  - app.js: Excel import 인원/총금액(2건), 견적 미리보기/인쇄 participants/additionalPrice(4건)
  - eventHandlers.js: productDuration/Price(2건), bookingParticipants/TotalPrice(2건)
- [x] T43.B: localStorage try-catch 방어 5곳
  - cost-calculator.js: saveCostTemplate setItem, loadCostTemplate getItem, convertCostToQuote setItem
  - ui.js: loadQuoteDataFromCost getItem을 기존 try 블록 안으로 이동
  - app.js: group-roster-data setItem, auto-backup.js: clearAllBackups removeItem
- [x] T43.C: iframe-bridge.js 개선
  - TEMP ID 생성: `Date.now()+Math.random()` → `crypto.randomUUID()` (UUID v4)
  - postMessage origin 검증: 하드코딩 localhost:5000/5505 → 동적 localhost 패턴 매칭
- [x] T43.D: 키보드 접근성 — role="button" onkeydown 핸들러 8파일 20개 요소
  - Enter/Space 키로 toggleSubmenu 실행 가능 (this.click() 위임)
  - index, schedules, flight-schedule, cost-calculator, air1/index, hanatour 3파일
- [x] T43.E: 테스트 통과 (Backend 133, Frontend 132) + ESLint 0 errors 0 warnings

### Phase 44: Helmet 보안 헤더 + Rate Limiting + 모달 포커스 트래핑 ✅
- [x] T44.A: helmet 미들웨어 추가 (X-Content-Type-Options, X-Frame-Options: SAMEORIGIN 등)
  - CSP 비활성화 (인라인 스크립트 + CDN 사용), 기존 수동 CSP 미들웨어 제거
- [x] T44.B: Rate Limiting 2개 추가
  - `/api/auth/login`: 5회/분 (브루트포스 방어)
  - `/api` 전역: 100회/분 (기존 upload 10회/분, sync 20회/분은 유지)
- [x] T44.C: 모달 포커스 트래핑 (WCAG 2.1 AA)
  - `setupFocusTrap()` 헬퍼: Tab/Shift+Tab 순환, `role="dialog"`, `aria-modal="true"`
  - showPromptModal: 포커스 트래핑 + 닫기 시 이전 포커스 복원
  - showConfirmModal: 확인 버튼 자동 포커스 + 트래핑 + 이전 포커스 복원
- [x] T44.D: 테스트 통과 (Backend 133, Frontend 132) + ESLint 0 errors 0 warnings

### Phase 45: script defer + 프론트엔드/백엔드 테스트 확장 ✅
- [x] T45.A: script defer 최적화 — 15개 `<script src>` 태그에 `defer` 추가
  - index.html: chart.js, xlsx.js CDN + flight-sync-manager, indexed-db, toast, fetch-utils, auto-backup, group-sync-manager, conflict-resolver, product-matcher, cost-calculator (11개)
  - flight-schedule.html: toast.js, airport-database.js, flight-sync-manager.js (3개)
  - cost-calculator.html: cost-calculator.js (1개)
  - 제외: Tailwind CDN (FOUC/인라인 config 의존), type="module" (이미 deferred)
- [x] T45.B: excelParser.js 프론트엔드 테스트 — 14 cases
  - `__tests__/js/excel-parser.test.js` 신규 (mapToProductData 12건 + parseProductExcel 2건)
  - `__tests__/js/esm-transform.cjs` 신규 — ESM export/import 키워드 제거 변환기
  - `jest.config.cjs` — transform 패턴 추가 (Windows 백슬래시 호환)
  - `js/modules/excelParser.js` — CJS module.exports 조건부 추가
- [x] T45.C: notify.js 백엔드 테스트 — 14 cases
  - `backend/__tests__/services/notify.test.js` 신규
  - initEmail: 환경변수 없음 경고, transporter 생성, verify 성공/실패 (4건)
  - sendLoginNotification: 이메일 발송 성공/실패, NOTIFY_EMAIL_TO, transporter 없음, x-forwarded-for (5건)
  - 카카오톡: 토큰 없음 skip, API 호출 성공/실패, fetch 예외, APP_URL 반영 (5건)
- [x] T45.D: 테스트 통과 — Backend **147** (133+14), Frontend **146** (132+14)

### Phase 46: 백엔드 성능 + 코드 품질 개선 ✅
- [x] T46.A: DB 인덱스 5개 추가 (`database.js`)
  - `idx_customers_name_birth` (name_kor, birth_date), `idx_customers_phone`, `idx_schedules_group_name`, `idx_schedules_event_date`, `idx_products_destination` (destination, status)
- [x] T46.B: `findExistingCustomer()` SELECT * → 명시적 컬럼 (`server.js`)
  - `CUSTOMER_COLS_NO_BLOB` 상수: passport_file_data(BLOB) 제외하여 동기화 쿼리 성능 최적화
- [x] T46.C: Graceful Shutdown 구현 (`server.js`)
  - SIGTERM/SIGINT 핸들러 → server.close() → db.close() → process.exit(0)
- [x] T46.D: 배치 동기화 트랜잭션 래핑 (`server.js`)
  - 멤버 동기화 for 루프를 BEGIN TRANSACTION / COMMIT으로 감싸 500명 일괄 처리 성능 개선
- [x] T46.E: SQLite WAL 모드 + 캐시 최적화 (`database.js`)
  - `PRAGMA journal_mode = WAL`, `PRAGMA cache_size = -8000` (8MB)
  - `console.error` → `logger.error` (uncaughtException 핸들러)
- [x] T46.F: 매직넘버 상수화 + dead code 제거
  - `cost-calculator.js`: 환율 기본값 3개 상수화 (USD=1300, EUR=1450, JPY=950) × 9곳
  - `app.js`: 미사용 함수 3개 삭제 (handleBookingFileUpload, showDayDetails, handleTodoSubmit)
- [x] 테스트 통과 — Backend **147**, Frontend **146**

### Phase 47: 백엔드 정리 + 테스트 확장 ✅
- [x] T47.A: backup 중복 코드 → `buildBackupData(db)` 헬퍼 통합 (`server.js`)
  - `/api/backup/database`와 `/api/backup/download` 두 핸들러의 중복 Promise.all+객체 조립 코드 통합
- [x] T47.B: backup/file sync fs → `fs.promises` 전환 (`server.js`)
  - `fs.copyFileSync` → `fs.promises.copyFile`, `fs.readdirSync` → `fs.promises.readdir`, `fs.statSync` → `fs.promises.stat`
- [x] T47.C: `bank-accounts.js` 문자열 길이 검증 추가 (`routes/bank-accounts.js`)
  - POST/PUT에 bank_name, account_number, account_holder 100자 이내 제한
- [x] T47.D: `DEFAULT_SCHEDULE_COLOR` 상수화 (`routes/schedules.js`)
  - `'#7B61FF'` 2곳 → 상수로 대체 (schedules 라우트 분리 과정에서 함께 처리)
- [x] T47.E: `schedules.test.js` 신규 작성 — 19 cases (`backend/__tests__/routes/schedules.test.js`)
  - GET/POST/PUT/DELETE/:id, GET /date/:date, GET /export — 7개 엔드포인트 커버
  - schedules 라우트를 `routes/schedules.js`로 분리 (test-app.js 등록 포함)
  - `test-helpers.js`에 `sampleSchedule()` 팩토리 추가
- [x] 테스트 통과 — Backend **166** (147+19), Frontend **146**

### Phase 48: 라우트 분리 + 테스트 확장 + 접근성 ✅
- [x] T48.A: `cost-calculations.test.js` 신규 작성 — 17 cases
  - GET /, GET /:id, POST (생성/업데이트/검증 9건), DELETE
- [x] T48.B: `cost-calculations` POST 입력 검증 보강 (`routes/cost-calculations.js`)
  - name 200자 제한, departure_date/arrival_date YYYY-MM-DD 형식 검증, adults/children/infants 음수·소수 방어
- [x] T48.C: `cost-calculations` + `tables` 라우트 분리 (`server.js` -280줄)
  - `routes/cost-calculations.js`, `routes/tables.js` 신규 생성
  - `test-app.js` 두 라우터 등록
- [x] T48.D: `js/app.js` console.error 20개 제거 (모두 showToast/showNotification과 중복)
- [x] T48.E: pagination `aria-current="page"` 추가 (`js/modules/ui.js`)
- [x] 테스트 통과 — Backend **183** (166+17), Frontend **146**

### Phase 49: 테스트 확장 + 라우트 추출 + console.error 정리 ✅
- [x] T49.A: `tables.test.js` 신규 작성 — 22 cases (tables 라우트 100% 커버)
- [x] T49.B: console.error 19개 제거 — `iframe-bridge.js` 8개, `flight-sync-manager.js` 4개, `invoice-editor.js` 7개 (showToast 중복 or throw 직전 redundant)
- [x] T49.C: `routes/sync.js` 추출 (`server.js` -318줄) — `findExistingCustomer`, `logSyncEvent`, POST `/api/sync/customers/batch`, POST `/api/sync/validate`, GET `/api/sync/history`
- [x] T49.D: `routes/products.js` 추출 (`server.js` -80줄) — `calculateSimilarity`, GET `/api/products/match`
  - `server.js`: 1546줄 → 1107줄
- [x] 테스트 통과 — Backend **205** (183+22), Frontend **146**

### Phase 50: console.error 정리 + backup 라우트 추출 + 접근성 ✅
- [x] T50.A: console.error 10개 제거 — `auto-backup.js` 4개, `cost-calculator.js` 4개, `group-sync-manager.js` 1개, `modals.js` 1개 (showToast 중복 or throw 전 redundant)
- [x] T50.B: `routes/backup.js` 신규 (88줄) — `buildBackupData` 헬퍼 + GET `/database`, `/download`, `/file` / `server.js` 1107→1021줄
- [x] T50.C: `in/invoice-editor.html` aria-label 12개 추가 (모든 input/select)
- [x] 테스트 통과 — Backend **205**, Frontend **146**

### Phase 51: console.error 정리 + upload 라우트 추출 ✅
- [x] T51.A: `js/modules/eventHandlers.js` console.error 2개 제거 (showToast/showNotification 중복)
- [x] T51.B: `js/flight-schedule-app.js` console.error 3개 제거 (showToast 중복)
- [x] T51.C: `routes/upload.js` 신규 (659줄) — multer + Gemini AI + parse-product-file + passport-ocr + `/api/upload` / `server.js` 1021→265줄 (-756줄)
  - `createUploadRoutes({ uploadRateLimit, getDbInstance })` factory 패턴
- [x] T51.D: `air1/js/`, `hanatour/js/` console.error 11개 제거 (showToast 중복)
- [x] 테스트 통과 — Backend **205**, Frontend **146**

### Phase 52: 테스트 확장 + 문서화 + 접근성 ✅
- [x] T52.A: TASKS.md Phase 49–51 완료 항목 추가 (누락 기록 보완)
- [x] T52.B: `routes/backup.test.js` 신규 — 10 cases (GET /database 4건, /download 4건, /file 1건)
- [x] T52.C: `routes/sync.test.js` 신규 — 20 cases
  - POST /customers/batch 9건 (400 검증 5건 + 200 생성/업데이트/skipped/혼합/total)
  - POST /validate 4건 (400 + valid/invalid/duplicates)
  - GET /history 4건 (빈목록/이력조회/limit/details파싱)
  - `test-db.js`: customers, products, bookings, notifications, todos, sync_logs 테이블 추가
  - `test-helpers.js`: `sampleMember()` 팩토리 추가
- [x] T52.D: `upload.html` landingPageUrl input `aria-label="랜딩 페이지 URL"` 추가
- [x] 테스트 통과 — Backend **235** (205+30), Frontend **146**

### Phase 53: 테스트 확장 + 접근성 ✅
- [x] T53.A: `routes/products.test.js` 신규 — 8 cases (인증 1 + GET /match 7건)
  - exact/similar/없음/비활성/우선순위 매칭 로직 커버
  - `test-app.js` products 라우트 등록
- [x] T53.B: `schedules.html` 필터/폼 접근성 — searchInput/groupFilter/filterDate aria-label + 폼 label for 연결 7건
- [x] T53.C: `index.html` groupDropdown `aria-label="단체 선택"` 추가
- [x] T53.D: TASKS.md Phase 52 기록 추가
- [x] 테스트 통과 — Backend **243** (235+8), Frontend **146**

### Phase 54: 브랜치 커버리지 개선 ✅
- [x] T54.A: `flight-schedule.html` 접근성 검증 — 19개 inputs 모두 `<label for="id">` 연결 완료 (Phase 11에서 처리, 추가 조치 불필요)
- [x] T54.B: 500 에러 경로 테스트 10건 추가 (3개 파일)
  - `backup.test.js`: GET /database 500, GET /download 500 (+2 cases)
  - `cost-calculations.test.js`: GET / 500, GET /:id 500, POST / 500, DELETE /:id 500 (+4 cases)
  - `schedules.test.js`: GET / 500, GET /date/:date 500, GET /export 500, POST / 500 (+4 cases)
  - `jest.spyOn(db, method).mockRejectedValueOnce` + 내부 `afterEach(() => jest.restoreAllMocks())` 패턴
- [x] T54.C: TASKS.md Phase 53 기록 추가
- [x] 커버리지: Statements 91.01% → 92.03%, Lines 91.79% → 92.85%
- [x] 테스트 통과 — Backend **253** (243+10), Frontend **146**

### Phase 55: 커버리지 개선 + 접근성 추가 ✅
- [x] T55.A: HTML 접근성 보완 — 4개 파일 13개 inputs
  - `login.html`: `<label for="loginEmail">`, `<label for="loginPassword">` (+2)
  - `db-viewer.html`: `<label for="schedule-filter|group-search|booking-filter|customer-search">` (+4)
  - `backup-manager.html`: `<input ... aria-label="백업 파일 선택">` (+1)
  - `edit-schedule.html`: JS 템플릿 리터럴 내 6개 inputs에 `aria-label` 추가 (+6)
- [x] T55.B: 500 에러 경로 테스트 10건 추가 (2개 파일)
  - `schedules.test.js`: GET /:id 500, PUT /:id 500, DELETE /:id 500 (+3 cases)
  - `tables.test.js`: 400(GET /:tableName/:id 허용안됨) + 500×6(all CRUD methods) (+7 cases)
  - 커버 대상: `schedules.js` lines 94/160/174, `tables.js` lines 47/55/65/87/116/142/159
- [x] 커버리지: Statements 92.03% → 92.88%, Branches 85.48% → 85.63%
- [x] 테스트 통과 — Backend **263** (253+10), Frontend **146**

### Phase 56: sync.js + cost-calculations.js 커버리지 개선 ✅
- [x] T56.A: `sync.js` — 미커버 13개 경로 테스트 (+10 cases)
  - 전화번호 일치 경고 (`logger.warn` line 42)
  - nameKor/nameEn 모두 없는 멤버 — batch(L127) + validate(L293)
  - 개별 멤버 INSERT 실패 inner catch (L229-235) — `mockImplementation` 패턴
  - `group_id` 제공 시 groups UPDATE (L255)
  - BEGIN TRANSACTION 실패 outer catch (L267-268)
  - validate 500 (L327-328), history `group_id`/`sync_type` 필터 (L341-347), history 500 (L367-368)
- [x] T56.B: `cost-calculations.js` — 미커버 브랜치 테스트 (+3 cases)
  - JSON 필드(flight_data/etc_costs/land_cost_1/land_cost_2) 저장+조회 (L27-30, L73-76)
  - 동월 두 번째 자동코드 생성 시 번호 증가 (L136-141)
  - `tc=0` 전달 시 `tc || 0` 분기 (L95, L156)
- [x] 커버리지 향상:
  - `sync.js`: Stmts 86.15%→99.23%, Lines 86.29%→100%, Branches 81.19%→88.03%
  - `cost-calculations.js`: Stmts 91.01%→95.5%, Branches 78.18%→94.54%
  - **All files**: Stmts 92.88%→**94.66%**, Branches 85.63%→**88.09%**
- [x] 테스트 통과 — Backend **276** (263+13)

### Phase 57: bank-accounts.js + schedules.js 커버리지 개선 ✅
- [x] T57.A: `bank-accounts.js` — 미커버 6개 범위 테스트 (+6 cases)
  - POST 100자 초과 검증 (L202)
  - PUT `is_default=true` 기존 기본 계좌 해제 (L310-311)
  - PUT 문자열 필드 100자 초과 (L324)
  - PUT/set-default/DELETE 500 에러 catch (L337-338, L396-397, L444-445)
- [x] T57.D: `schedules.js` — PUT `|| null` 분기 커버 (+1 case)
  - 선택 필드 없이 PUT → `group_name || null` 등 7개 falsy 분기 커버 (L141-148)
- [x] 커버리지 향상:
  - `bank-accounts.js`: Stmts 88.29%→98.93%, Branches 87.5%→96.87%, Lines→**100%**
  - `schedules.js`: Branches 84.78%→**100%** (Stmts/Lines 이미 100%)
  - **All files**: Stmts 94.66%→**95.5%**, Branches 88.09%→**89.55%**
- [x] 테스트 통과 — Backend **283** (276+7)

### Phase 58: invoices.js + backup.js 커버리지 개선 ✅
- [x] T58.A: `invoices.js` — 미커버 범위 테스트 (+5 cases)
  - GET /:id `additional_items` malformed JSON → 빈 배열 대체 (L401-402)
  - PUT /:id 공백 id (URL 인코딩 `%20`) → 400 (L800)
  - PUT /:id 응답에서 `additional_items` malformed JSON → 빈 배열 (L878-879)
  - PUT /:id 500 catch (L885-886), DELETE /:id 500 catch (L933-934)
  - ※ L862 (`safeKeys.length === 0`)은 `updated_at` 자동 주입으로 도달 불가 (dead code)
- [x] T58.C: `backup.js` — `/file` 라우트 500 catch 테스트 (+1 case)
  - `fs.promises.copyFile` mock으로 파일 복사 실패 → 500 (L91)
- [x] 커버리지 향상:
  - `invoices.js`: 미커버 분기 감소
  - `backup.js`: Lines→**100%**
  - **All files**: Backend **289** (283+6)
- [x] 테스트 통과 — Backend **289** (283+6)

### Phase 59: flight-schedules.js + backup.js 커버리지 개선 ✅
- [x] T59.A: `flight-schedules.js` — 미커버 9개 범위 테스트 (+11 cases)
  - POST `departure_date` 필수 누락 → 400 (L35)
  - POST `arrival_date` 형식 오류 → 400 (L47)
  - POST `arrival_time` 형식 오류 → 400 (L67)
  - GET `group_id` 필터링 (L245-246)
  - GET `departure_date_to` 필터링 (L253-254)
  - GET /:id 500 catch (L367-368)
  - PUT /:id 500 catch (L671-672)
  - DELETE /cleanup/expired 500 catch (L815-816)
  - DELETE /:id 500 catch (L863-864)
- [x] T59.D: `backup.js` — 7개 초과 파일 삭제 분기 + 7개 이하 분기 (+2 cases, L78 both branches)
  - fs.promises 전체 mock으로 8개 파일 → unlink 1회 (true branch)
  - fs.promises mock으로 3개 파일 → unlink 없음 (false branch)
- [x] 커버리지 향상:
  - `flight-schedules.js`: Stmts 89.67%→**99.35%**, Lines 90%→**100%**
  - `backup.js`: Branch 50%→**100%** (모든 지표 100%)
  - **All files**: Stmts 96.35%→**97.62%**, Lines 96.99%→**98.32%**
- [x] 테스트 통과 — Backend **300** (289+11)

### Phase 60: auth.js + tables.js + products.js 커버리지 개선 ✅
- [x] T60.A: `auth.js` — 미커버 8개 범위 테스트 (+8 cases)
  - 로그인 알림 발송 실패 시 `.catch` 분기 커버 (L125)
  - GET /me 세션 유효 + DB에서 사용자 삭제 → 401 (L218-219)
  - POST /login 500 catch (L136-137)
  - GET /users requireAdmin 500 catch (L243-244)
  - PUT /:id/password 500 catch (L505-506)
  - PUT /:id/toggle 500 catch (L577-578)
  - DELETE /:id 500 catch (L654-655)
  - ※ L170-171 (logout session.destroy 에러)는 MemoryStore 특성상 테스트 불가
- [x] T60.C: `tables.js` — 미커버 분기 2개 테스트 (+2 cases)
  - 허용되지 않은 sort/order/limit → 기본값 폴백 (L27-29)
  - 유효하지 않은 filter 컬럼명 → WHERE 절 생략 (L37)
- [x] T60.D: `products.js` — GET /match 500 catch 테스트 (+1 case, L83-84)
- [x] 커버리지 향상:
  - `auth.js`: Stmts 86.72%→**98.23%**, Lines 86.72%→**98.23%**
  - `tables.js`: Branch 90%→**100%** (모든 지표 100%)
  - `products.js`: Lines 94.11%→**100%**, Branch→**100%**
  - **All files**: Stmts 97.62%→**98.89%**, Lines 98.32%→**99.64%**
- [x] 테스트 통과 — Backend **310** (300+10)

### Phase 61: group-roster React 앱 분리 ✅
- [x] T61.1: Vite + React 18 + TypeScript 프로젝트 스캐폴드 (`group-roster/`) — 9 tests (d765af2)
- [x] T61.2: 컴포넌트 마이그레이션 — MemberTable, MemberForm, SearchFilter, GroupSelector, ExcelImportExport, PassportScanner, Statistics (8591b6c)
  - Zustand 스토어 2개 (memberStore, groupStore)
  - 유틸리티 (날짜 파싱, 성별 정규화, ID 생성)
  - **106/106 Vitest 테스트 통과**, TypeScript 0 에러

### Phase 62: Docker 컨테이너화 (레거시 백엔드) ✅
- [x] T62.1: `docker-compose.legacy.yml` — backend(Express+SQLite) + frontend(Nginx) 2-service 구성 (82edeb8)
- [x] T62.2: `Dockerfile.frontend` — nginx:1.27-alpine, 정적 파일 서빙
- [x] T62.3: `nginx.conf` — API 프록시(/api/ → backend:5000), 보안 헤더, gzip, 캐싱
- [x] T62.4: `.dockerignore` + `.env.docker.example`
  - SQLite 볼륨 마운트 (data/uploads/backups/logs)
  - 헬스체크, 로그 로테이션 설정

### Phase 63: E2E 테스트 확장 (Playwright) ✅
- [x] T63.1: Page Object Model 5개 클래스 — LoginPage, DashboardPage, SchedulePage, InvoicePage, FlightSchedulePage (1f8c793)
- [x] T63.2: 테스트 데이터 fixture (`e2e/fixtures/test-data.cjs`)
- [x] T63.3: E2E 스펙 5개 신규 — navigation(6), schedule(5), customer(5), invoice(5), flight-schedule(6)
  - 기존 auth(5) + smoke(5) 포함 **총 37 E2E 테스트 케이스**
  - 실패 시 스크린샷/비디오/트레이스 자동 캡처

---

## 기술 스택
- Backend: Node.js + Express + SQLite
- Frontend: Vanilla JS + HTML / group-roster: React 18 + Vite + TypeScript + Zustand
- Toast/Modal: js/toast.js (전역 사용)
- 서버: backend/server.js (메인), backend/routes/ (라우트), backend/database.js (DB)
- 인프라: Docker (docker-compose.legacy.yml), Nginx
- 테스트: Backend 310 (Jest) + Frontend 146 (Jest) + group-roster 106 (Vitest) + E2E 37 (Playwright)
