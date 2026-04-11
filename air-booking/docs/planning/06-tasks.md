# TASKS: Air-Booking Screen Spec v2.0 Gap Implementation

> Domain-Guarded Tasks Generator v2.0
> 생성일: 2026-04-03
> 입력: specs/screens/*.yaml + specs/domain/resources.yaml + 기존 코드베이스 Gap 분석

## MVP 캡슐

| # | 항목 | 내용 |
|---|------|------|
| 1 | **목표** | Screen Spec v2.0 명세와 기존 코드 사이의 Gap 해소 |
| 2 | **문제** | 공통 컴포넌트 미구현, 화면 통합 미완, 신규 화면 미구현, localStorage 잔여 |
| 3 | **해결** | 공통 컴포넌트 → Backend 마이그레이션 → Frontend 화면 개선/신규 → 검증 |
| 4 | **성공 지표** | 8개 화면 명세 100% 구현, PNR 중복 방지, 마감일 시각화, 모바일 카드 |

---

## Phase 0: 프로젝트 셋업 — 완료

> 기존 프로젝트 (Express+React+SQLite) 이미 동작 중

### [x] P0-T0.1: 프로젝트 초기 셋업
- 서버: Express + TypeScript + SQLite (완료)
- 클라이언트: React 18 + Vite + TypeScript (완료)
- DB: air-booking.db + travel_agency.db 이중 구조 (완료)

---

## Phase 1: 공통 컴포넌트 + Backend 마이그레이션 — 완료

> 모든 화면에서 사용하는 공통 컴포넌트 3개 + localStorage→DB 전환 3개
> Resource 태스크(R)와 Screen 태스크(S0)는 서로 의존하지 않으므로 병렬 가능

### [x] P1-S0-T1: DeadlineIndicator 공통 컴포넌트
- **파일**: `client/src/components/shared/DeadlineIndicator.tsx`
- **명세**: `specs/shared/components.yaml` → DeadlineIndicator
- **기능**:
  - NMTL/TL 마감일 색상 계산 (D-7: 밝은 빨강, D-3: 진한 빨강, D-0: 검은 배경+흰색)
  - props: `date: string, type: 'nmtl' | 'tl'`
  - 오늘 기준 남은 일수 계산 → 색상 반환
- **TDD**: 날짜별 색상 반환 테스트 (D-7, D-3, D-0, 만료)
- **사용처**: booking-list, reservation-card

### [x] P1-S0-T2: PnrDuplicateWarning 공통 컴포넌트
- **파일**: `client/src/components/shared/PnrDuplicateWarning.tsx`
- **명세**: `specs/shared/components.yaml` → PnrDuplicateWarning
- **기능**:
  - PNR 중복 감지 시 경고 표시
  - 옵션: 기존 예약 보기 / UPDATE / 새 항공편 등록 / 취소
  - API: `GET /api/bookings/check-pnr/:pnr` (이미 존재)
- **TDD**: 중복 PNR 입력 시 경고 표시, 옵션 선택 콜백 테스트
- **사용처**: booking-list (PNR 등록), converter (저장), flight-schedule (저장)

### [x] P1-S0-T3: ImageCopyButton 공통 컴포넌트
- **파일**: `client/src/components/shared/ImageCopyButton.tsx`
- **명세**: `specs/shared/components.yaml` → ImageCopyButton
- **기능**:
  - html2canvas로 DOM → PNG → 클립보드 복사
  - HTTPS 실패 시 새 탭에서 이미지 표시 (폴백)
  - props: `targetRef: RefObject<HTMLElement>`
- **TDD**: 클릭 시 html2canvas 호출, 에러 시 폴백 실행 테스트
- **사용처**: converter (모바일카드), converter-saved (미리보기), reservation-card

### [x] P1-R1-T1: bus_reservations DB 마이그레이션
- **Backend**: 테이블 생성 + CRUD API
- **명세**: `specs/domain/resources.yaml` → bus_reservations
- **테이블**: `bus_reservations (id, data JSON, created_at, updated_at)`
- **API**:
  - `GET /api/bus-reservations` — 목록 조회
  - `POST /api/bus-reservations` — 생성
  - `PATCH /api/bus-reservations/:id` — 수정
  - `DELETE /api/bus-reservations/:id` — 삭제
- **서비스**: `server/src/services/bus-reservations.service.ts`
- **라우트**: `server/src/routes/bus-reservations.ts`
- **TDD**: CRUD API 테스트

### [x] P1-R2-T1: saved_notices DB 마이그레이션
- **Backend**: 테이블 생성 + CRUD API
- **명세**: `specs/domain/resources.yaml` → saved_notices
- **테이블**: `saved_notices (id, data JSON, created_at, updated_at)`
- **API**:
  - `GET /api/saved-notices` — 목록 조회
  - `POST /api/saved-notices` — 생성
  - `PATCH /api/saved-notices/:id` — 수정
  - `DELETE /api/saved-notices/:id` — 삭제
- **서비스**: `server/src/services/saved-notices.service.ts`
- **라우트**: `server/src/routes/saved-notices.ts`
- **TDD**: CRUD API 테스트

### [x] P1-R3-T1: group_rosters DB 마이그레이션
- **Backend**: 테이블 생성 + CRUD API
- **명세**: `specs/domain/resources.yaml` → group_rosters
- **테이블**: `group_rosters (id, name, data JSON, created_at, updated_at)`
- **API**:
  - `GET /api/group-rosters` — 목록 조회
  - `POST /api/group-rosters` — 생성
  - `PATCH /api/group-rosters/:id` — 수정
  - `DELETE /api/group-rosters/:id` — 삭제
- **서비스**: `server/src/services/group-rosters.service.ts`
- **라우트**: `server/src/routes/group-rosters.ts`
- **TDD**: CRUD API 테스트

---

## Phase 2: 핵심 화면 개선 + 신규 — 완료

> Phase 1 공통 컴포넌트 완료 후 진행
> R 태스크와 S 태스크는 독립적이므로 같은 Phase 내 병렬 가능

### [x] P2-S1-T1: booking-list 개선 — 날짜 범위 필터
- **파일**: `client/src/pages/Bookings.tsx`
- **명세**: `specs/screens/booking-list.yaml` → filters.departure_date
- **기능**:
  - 출발일 범위 필터 (시작일~종료일 date picker)
  - 기존 검색/상태 필터와 조합 동작
- **의존**: 없음 (기존 코드에 추가)
- **TDD**: 날짜 범위 선택 → 필터링 결과 확인

### [x] P2-S1-T2: booking-list 개선 — 마감일 색상 표시
- **파일**: `client/src/pages/Bookings.tsx`
- **명세**: `specs/screens/booking-list.yaml` → deadlines
- **기능**:
  - NMTL/TL 열에 DeadlineIndicator 컴포넌트 적용
  - D-7: 밝은 빨강, D-3: 진한 빨강, D-0: 검은 배경
  - imminent_days: 7일 이내 강조
- **의존**: P1-S0-T1 (DeadlineIndicator)
- **TDD**: 마감일 근접 행에 색상 클래스 적용 확인

### [x] P2-S2-T1: converter 4탭 통합 + 라우트 변경
- **파일**: `client/src/pages/PnrConverter.tsx` → 리팩토링
- **명세**: `specs/screens/converter.yaml` → layout.tabs
- **기능**:
  - 라우트 변경: `/pnr-converter` → `/converter` (App.tsx 수정)
  - 4탭 레이아웃: 변환기 | 저장된 항공편 | 버스예약 | 안내문
  - 기존 변환기 코드를 첫 번째 탭으로 이동
  - 나머지 탭은 별도 컴포넌트 로드 (P2-S3, P3-S7, P3-S8)
- **의존**: 없음 (탭 프레임만 구성, 내부 컴포넌트는 후속 태스크)
- **TDD**: 탭 전환 동작, 라우트 매핑 테스트

### [x] P2-S3-T1: SavedFlights 신규 화면
- **파일**: `client/src/pages/SavedFlights.tsx` (신규)
- **명세**: `specs/screens/converter-saved.yaml`
- **기능**:
  - DB 저장 항공편 카드 리스트 표시
  - 검색 (항공사, 항공편, 경로)
  - 불러오기: original_pnr_text를 변환기에 채움
  - AB- prefix 삭제 방지
  - 팀 병합 (여러 항공편 → 하나로 합치기)
  - 일괄 삭제 (AB- 자동 제외)
  - 미리보기 모달 (MobileCard + 카드 복사)
- **의존**: P2-S2-T1 (converter 탭 프레임에 탑재)
- **TDD**: 목록 로드, 불러오기, AB- 보호, 병합 테스트

### [x] P2-R4-T1: flight-schedules API 개선
- **Backend**: PNR 매칭 + CSV import/export API
- **파일**: `server/src/routes/flight-schedules.ts`, `server/src/services/flight-schedules.service.ts`
- **명세**: `specs/screens/flight-schedule.yaml` → actions, import_export
- **기능**:
  - `POST /api/flight-schedules` — 스케줄 생성 (+ PNR 매칭 경고 반환)
  - `PATCH /api/flight-schedules/:id` — 스케줄 수정
  - `DELETE /api/flight-schedules/:id` — 삭제 (관련 예약 있으면 거부)
  - `POST /api/flight-schedules/import` — CSV 일괄 가져오기
  - `GET /api/flight-schedules/export` — CSV 내보내기
  - `GET /api/flight-schedules/:id/bookings` — 관련 예약 목록
- **TDD**: CRUD + PNR 매칭 + CSV 파싱 테스트

---

## Phase 3: 추가 화면 + 통합 — 완료

> Phase 2 핵심 화면 완료 후 진행
> 각 S 태스크는 서로 독립적이므로 병렬 가능

### [x] P3-S4-T1: ReservationCard 신규 화면 (모바일 랜딩카드)
- **파일**: `client/src/pages/ReservationCard.tsx` (신규)
- **명세**: `specs/screens/reservation-card.yaml`
- **기능**:
  - 라우트: `/reservation/:id` (인증 불필요)
  - 모바일-first 카드 레이아웃 (max-width: 480px)
  - PNR, 항공사, 항공편 정보 표시
  - 3코드 → 도시명 변환 (getAirportName)
  - 탑승객 목록
  - 왕복편 조건부 표시 (return_date 있으면)
  - html2canvas 이미지 캡처 (ImageCopyButton 사용)
  - HTTPS 폴백
- **의존**: P1-S0-T3 (ImageCopyButton)
- **TDD**: 데이터 로드, 공항명 변환, 이미지 복사 테스트
- **보안**: 고객 데이터만 표시 (행정정보 제외)

### [x] P3-S5-T1: FlightSchedule 개선 (2탭 + CSV + PNR 매칭)
- **파일**: `client/src/pages/FlightSchedules.tsx`
- **명세**: `specs/screens/flight-schedule.yaml`
- **기능**:
  - 2탭 레이아웃: 스케줄 | 예약장부
  - 스케줄 CRUD 모달 (add-edit-schedule)
  - PNR 매칭 경고 모달 (저장 시 자동)
  - CSV 가져오기/내보내기 버튼
  - 관련 예약 조회 (row action → 예약 목록)
  - 관련 예약 있는 스케줄 삭제 방지
- **의존**: P2-R4-T1 (flight-schedules API 개선)
- **TDD**: 탭 전환, CRUD 모달, PNR 경고, CSV import/export 테스트

### [x] P3-S6-T1: EstimateEditor 통합 (3페이지 → 1탭 에디터)
- **파일**: `client/src/pages/EstimateEditor.tsx` (리팩토링)
- **명세**: `specs/screens/estimate-editor.yaml`
- **기능**:
  - 3개 분리 페이지(estimate/domestic/delivery) → 1개 탭 에디터로 통합
  - 라우트 통합: `/estimate-editor` (탭으로 유형 선택)
  - 3탭: 국내견적서 | 해외견적서 | 정산/배송
  - 기존 HTML iframe 방식 유지 (각 탭에서 해당 HTML 로드)
  - 문서 불러오기 모달 (DB 저장 문서 목록)
  - 문서 저장/상태 관리 (draft/sent/confirmed)
  - 인쇄 미리보기
- **의존**: 없음 (기존 HTML 에디터 + estimates API 활용)
- **TDD**: 탭 전환, 문서 저장/불러오기, 상태 변경 테스트
- **참고**: auth: false (내부망 전용, 인증 불필요)

### [x] P3-S7-T1: BusReservation 화면 (converter 탭 3)
- **파일**: `client/src/pages/BusReservation.tsx` (신규)
- **명세**: `specs/screens/index.yaml` → bus-reservation
- **기능**:
  - converter의 3번째 탭으로 탑재
  - 버스예약 CRUD (DB 기반)
  - JSON 데이터 편집 폼
  - 목록 표시 + 검색
- **의존**: P1-R1-T1 (bus_reservations API), P2-S2-T1 (converter 탭 프레임)
- **TDD**: CRUD 동작, 검색 테스트

### [x] P3-S8-T1: Notices 화면 (converter 탭 4)
- **파일**: `client/src/pages/Notices.tsx` (신규)
- **명세**: `specs/screens/index.yaml` → notices
- **기능**:
  - converter의 4번째 탭으로 탑재
  - 안내문 CRUD (DB 기반)
  - JSON 데이터 편집 폼
  - 목록 표시 + 검색
- **의존**: P1-R2-T1 (saved_notices API), P2-S2-T1 (converter 탭 프레임)
- **TDD**: CRUD 동작, 검색 테스트

---

## Phase 4: 통합 검증 — 완료

> 모든 화면 구현 완료 후 진행
> 각 검증 태스크는 독립적이므로 병렬 가능

### [x] P4-S1-V: booking-list 연결점 검증
- **대상**: booking-list 화면
- **검증 항목**:
  - [ ] 검색 필터 동작 (PNR, 항공사, 루트, 대리점)
  - [ ] 상태 필터 동작 (pending/confirmed/ticketed/cancelled)
  - [ ] 출발일 범위 필터 동작
  - [ ] DeadlineIndicator 색상 (D-7/D-3/D-0)
  - [ ] PNR 등록 모달 → PnrDuplicateWarning 동작
  - [ ] 행 확장 → segments/passengers 표시
  - [ ] 키보드 단축키 (ctrl+k, ctrl+shift+n)

### [x] P4-S2-V: converter + saved 연결점 검증
- **대상**: converter, converter-saved 화면
- **검증 항목**:
  - [ ] 4탭 전환 동작 (변환기/저장된 항공편/버스예약/안내문)
  - [ ] PNR 파싱 → 결과 표시
  - [ ] DB 저장 → PnrDuplicateWarning 동작
  - [ ] 저장된 항공편 → 불러오기 → 변환기에 채움
  - [ ] AB- prefix 삭제 방지
  - [ ] 팀 병합 동작
  - [ ] MobileCard 복사 (ImageCopyButton)

### [x] P4-S4-V: ReservationCard 연결점 검증
- **대상**: reservation-card 화면
- **검증 항목**:
  - [ ] /reservation/:id 라우트 접근 (인증 없이)
  - [ ] 3코드 → 도시명 변환
  - [ ] 왕복편 조건부 표시
  - [ ] 이미지 캡처 + 클립보드 복사
  - [ ] HTTPS 폴백 동작
  - [ ] 모바일 반응형 레이아웃

### [x] P4-S5-V: FlightSchedule 연결점 검증
- **대상**: flight-schedule 화면
- **검증 항목**:
  - [ ] 2탭 전환 (스케줄/예약장부)
  - [ ] 스케줄 CRUD 모달
  - [ ] PNR 매칭 경고 모달
  - [ ] CSV 가져오기/내보내기
  - [ ] 관련 예약 조회
  - [ ] 삭제 방지 (관련 예약 존재 시)

### [x] P4-S6-V: EstimateEditor 연결점 검증
- **대상**: estimate-editor 화면
- **검증 항목**:
  - [ ] 3탭 전환 (국내/해외/정산)
  - [ ] 문서 저장/불러오기 (DB)
  - [ ] 상태 변경 (draft/sent/confirmed)
  - [ ] 인쇄 미리보기
  - [ ] 인증 없이 접근 가능

---

## Phase 5: 보안 + 품질 개선 — 완료

> 감사/코드리뷰 결과 기반 개선 태스크
> 모든 태스크 독립적, 병렬 가능

### [x] P5-T1: 프로덕션 환경변수 필수화
- **파일**: `server/src/services/crypto.service.ts`, `server/src/index.ts`
- **기능**:
  - `ENCRYPTION_KEY` 미설정 시 프로덕션에서 서버 시작 차단
  - `SESSION_SECRET` 체크를 createApp() 최상단으로 이동
  - `.env.example` 파일 생성 (필수 환경변수 목록)
- **완료 조건**: `NODE_ENV=production`에서 환경변수 없이 시작 시 에러 throw

### [x] P5-T2: PnrDuplicateWarning converter 연동
- **파일**: `client/src/pages/PnrConverter.tsx`
- **기능**:
  - `handleSaveToDb` 시 `/api/bookings/check-pnr/:pnr` 호출
  - 중복 감지 시 PnrDuplicateWarning 컴포넌트 표시
  - UPDATE/신규 등록/취소 선택 가능
- **의존**: P1-S0-T2 (PnrDuplicateWarning 컴포넌트)
- **완료 조건**: 기존 PNR 재저장 시 경고 모달 표시

### [x] P5-T3: original_pnr_text 저장 로직
- **파일**: `server/src/services/bookings.service.ts`, `client/src/pages/PnrConverter.tsx`
- **기능**:
  - bookings POST/PATCH에 `original_pnr_text` 필드 저장
  - converter에서 DB 저장 시 textarea 원본 텍스트 함께 전송
  - SavedFlights에서 불러오기 시 원본 텍스트 표시
- **완료 조건**: PNR 변환 → 저장 → SavedFlights 불러오기 → 원본 텍스트 복원

### [x] P5-T4: 세션 고정 공격 방어
- **파일**: `server/src/routes/auth.ts`
- **기능**:
  - 로그인 성공 시 `req.session.regenerate()` 호출
  - 새 세션에 userId 설정
- **완료 조건**: 로그인 전후 세션 ID가 변경됨

### [x] P5-T5: CSV import 기능
- **파일**: `server/src/routes/flight-schedules.ts`, `client/src/pages/FlightSchedules.tsx`
- **기능**:
  - Backend: `POST /api/flight-schedules/import` (CSV 파싱 → 일괄 등록)
  - Frontend: 파일 업로드 버튼 + 결과 토스트
- **완료 조건**: CSV 파일 업로드 → 스케줄 일괄 등록

### [x] P5-T6: 번들 사이즈 최적화 (코드 스플리팅)
- **파일**: `client/src/App.tsx`
- **기능**:
  - `React.lazy` + `Suspense`로 라우트별 동적 import
  - 대상: Bookings, FlightSchedules, EstimateEditor, PnrConverter, ReservationCard 등
  - `LoadingSpinner`를 Suspense fallback으로 사용
- **완료 조건**: `vite build` 후 메인 번들 500KB 이하

### [x] P5-T7: 신규 서비스 테스트 추가
- **파일**: `server/src/__tests__/bus-reservations.test.ts` (신규), `server/src/__tests__/saved-notices.test.ts` (신규), `server/src/__tests__/group-rosters.test.ts` (신규)
- **기능**:
  - 3개 신규 서비스 CRUD 테스트
  - 인트라넷 DB mock 헬퍼 사용
- **완료 조건**: 테스트 커버리지 서비스 80% 이상

---

## Phase 6: 잔여 Gap 해소 — 완료

> 코드리뷰/감사에서 발견된 나머지 항목
> 모든 태스크 독립적, 병렬 가능

### [x] P6-T1: FlightSchedule CSV import UI 버튼
- **파일**: `client/src/pages/FlightSchedules.tsx`
- **기능**: CSV 파일 업로드 input + import API 호출 + 결과 토스트

### [x] P6-T2: Vite manualChunks 설정 (500KB 경고 해소)
- **파일**: `client/vite.config.ts`
- **기능**: FullCalendar, html2canvas 등 대형 라이브러리를 별도 청크로 분리

### [x] P6-T3: ESLint 설정 복구
- **작업**: `npm install -D @eslint/js` (루트 프로젝트)

### [x] P6-T4: CSV export 이스케이핑
- **파일**: `server/src/routes/flight-schedules.ts`
- **기능**: 쉼표/따옴표/줄바꿈 포함 데이터 이스케이핑

### [x] P6-T5: PDF 테스트 복원
- **파일**: `server/src/__tests__/invoices.test.ts`
- **기능**: skip된 PDF 테스트를 실제 동작하도록 수정

---

---

## Phase 8: DB 안정화 — 완료

> travel_agency.db 인덱스 손상 복구 + 동시 쓰기 안전 + 데이터 정합성 + 예방 관리

### [x] P8-T1: 인덱스 복구 + WAL 체크포인트 (즉시)
- REINDEX 실행, PRAGMA wal_checkpoint, integrity_check 확인

### [x] P8-T2: busy_timeout + createBooking 트랜잭션 (단기)
- PRAGMA busy_timeout = 5000 설정
- createBooking에 BEGIN/COMMIT 트랜잭션 래핑

### [x] P8-T3: FK 제약 + 헬스체크 개선 (중기)
- passengers/segments에 FOREIGN KEY 추가 (기존 데이터 호환)
- /api/health에 DB 연결 + integrity 확인

### [x] P8-T4: 자동 무결성 검증 + 백업 검증 (장기)
- 스케줄러에 주간 integrity_check 추가
- 백업 후 무결성 검증

---

## Phase 7: 보안 로깅 + E2E 테스트 — 완료

> Rate Limit/Helmet 완료 후 진행
> 두 태스크는 독립적, 병렬 가능

### [x] P7-T1: 보안 이벤트 로깅 (audit_logs 테이블)
- **파일**: `server/src/db/intranet.ts`, `server/src/middleware/audit-log.ts` (신규), `server/src/routes/auth.ts`
- **기능**:
  - `audit_logs` 테이블 생성 (user_id, action, resource, details, ip, timestamp)
  - 로그인 성공/실패 기록
  - 데이터 삭제(DELETE) 기록
  - `GET /api/audit-logs` 관리자 조회 API
- **완료 조건**: 로그인 → audit_logs에 기록 확인, 테스트 통과

### [x] P7-T2: Playwright E2E 테스트
- **파일**: `e2e/` 디렉토리 (신규)
- **기능**:
  - Playwright 설치 + 설정
  - 시나리오 1: 로그인 → 대시보드 접근
  - 시나리오 2: 예약장부 → PNR 검색 → 행 확장
  - 시나리오 3: /converter → PNR 변환 → 탭 전환
  - 시나리오 4: /reservation/:id → 모바일 카드 표시
- **완료 조건**: 4개 시나리오 통과

---

## 의존성 그래프

```
P0 (완료)
  │
  ├── P1-S0-T1 (DeadlineIndicator) ─────────────── P2-S1-T2 (booking-list deadline)
  ├── P1-S0-T2 (PnrDuplicateWarning) ──────────┐
  ├── P1-S0-T3 (ImageCopyButton) ───────────────┼── P3-S4-T1 (ReservationCard)
  │                                              │
  ├── P1-R1-T1 (bus_reservations API) ──────────┼── P3-S7-T1 (BusReservation)
  ├── P1-R2-T1 (saved_notices API) ─────────────┼── P3-S8-T1 (Notices)
  ├── P1-R3-T1 (group_rosters API) ─────────────┘
  │
  ├── P2-S1-T1 (booking-list date filter) ──────┐
  ├── P2-S1-T2 (booking-list deadline) ─────────┤
  ├── P2-S2-T1 (converter 4탭) ────────────────┼── P2-S3-T1 (SavedFlights)
  │                                    │         │        │
  │                                    │         │   P3-S7-T1 (BusReservation)
  │                                    │         │   P3-S8-T1 (Notices)
  │                                    │         │
  ├── P2-R4-T1 (flight-schedules API) ─┼────────┼── P3-S5-T1 (FlightSchedule)
  │                                              │
  ├── P3-S6-T1 (EstimateEditor 통합) ───────────┤
  │                                              │
  └── Phase 4 Verification (모든 S 완료 후) ─────┘
```

## 병렬 실행 가이드

| 그룹 | 병렬 가능 태스크 | 조건 |
|------|----------------|------|
| A | P1-S0-T1, P1-S0-T2, P1-S0-T3 | 공통 컴포넌트 (독립) |
| B | P1-R1-T1, P1-R2-T1, P1-R3-T1 | Backend 마이그레이션 (독립) |
| C | P2-S1-T1, P2-S2-T1, P2-R4-T1 | Phase 2 독립 태스크 |
| D | P3-S4-T1, P3-S5-T1, P3-S6-T1 | Phase 3 독립 화면 |
| E | P4-S1-V ~ P4-S6-V | 모든 검증 (독립) |

> 그룹 A와 B는 완전 병렬 가능
> 그룹 C는 Phase 1 완료 후 (P2-S1-T2는 P1-S0-T1 의존)
> 그룹 D는 Phase 2 완료 후 (각각 의존성 확인)
> 그룹 E는 모든 S 태스크 완료 후
