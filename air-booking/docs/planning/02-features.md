# 02-features.md — 기능 목록 (우선순위)

**프로젝트명**: DB 통합 및 서버 일원화
**버전**: 1.0
**작성일**: 2026-04-01

---

## 개요

**핵심 설계 원칙: 원데이터 하나 → 두 가지 뷰**

```
DB에는 PNR 원본 데이터 1개만 저장.
이 하나의 데이터를 두 가지 화면으로 보여줍니다:

• 고객용 뷰: 도시명, 읽기 쉬운 형식, 이미지/랜딩카드 (카톡/메일 전달용)
• 예약장부용: 공항코드, 마감일, 정산, 발권 (내부 관리용)

데이터는 하나, 보여주는 방식만 다르다. 중복 입력 금지.
```

---

이 문서는 DB 통합 프로젝트의 모든 기능을 우선순위별로 정렬한 것입니다.

- **P0**: Phase 0 ~ 2 완료 시 필수 (핵심 기능)
- **P1**: Phase 3 ~ 5 완료 시 필수 (통합 기능)
- **P2**: Phase 6에서 추가 (개선 기능)

---

## P0 — Phase 0~2: 핵심 기능 (서버 & DB 통합)

### P0-F01: 통합 서버 구축 [Phase 1]

**설명**: main(JS) + air-booking(TS) → 하나의 Express+TypeScript 서버

**요구사항**:
- Express 4.x + TypeScript
- SQLite 드라이버 (better-sqlite3 또는 sqlite)
- 포트: 5001 또는 새로운 통합 포트
- 핫 리로드 지원 (개발 환경)

**완료 조건**:
- [ ] Express 서버 기동 가능
- [ ] TypeScript 컴파일 성공
- [ ] 기본 라우트 응답 확인

---

### P0-F02: 통합 DB 테이블 설계 [Phase 1]

**설명**: flight_saves + flight_schedules + air_bookings → flight_bookings 통합

**테이블 구조**:

```sql
flight_bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  -- 기본 정보
  pnr VARCHAR(6) NOT NULL UNIQUE,
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW(),
  source ENUM('converter', 'booking', 'schedule') NOT NULL,

  -- 항공편 정보
  airline VARCHAR(3),
  flight_number VARCHAR(6),
  route_from VARCHAR(3),
  route_to VARCHAR(3),
  departure_date DATE,
  arrival_date DATE,

  -- 탑승객 정보 (JSON 배열)
  passengers JSON,

  -- 예약 상태
  status ENUM('saved', 'booked', 'ticketed', 'cancelled') DEFAULT 'saved',

  -- 마감/정산
  nmtl_date DATE,
  tl_date DATE,

  -- 여행사 정보
  agency VARCHAR(100),
  group_id INT,

  -- 추가 정보
  remarks TEXT,
  data JSON
)
```

**완료 조건**:
- [ ] 테이블 생성 SQL 작성
- [ ] 기존 데이터와 호환성 확인
- [ ] 인덱스 정의 (pnr, departure_date, status)

---

### P0-F03: 기본 CRUD API [Phase 1]

**설명**: flight_bookings 테이블의 기본 Create/Read/Update/Delete API

**엔드포인트**:

```
POST   /api/bookings           → 예약 생성
GET    /api/bookings           → 목록 조회 (필터/정렬)
GET    /api/bookings/:id       → 상세 조회
PUT    /api/bookings/:id       → 수정
DELETE /api/bookings/:id       → 삭제
```

**요청/응답 예시**:

```json
// POST /api/bookings
{
  "pnr": "ABC123",
  "airline": "KE",
  "flight_number": "1001",
  "route_from": "ICN",
  "route_to": "NRT",
  "departure_date": "2026-04-15",
  "passengers": [
    {
      "name_kr": "김철수",
      "name_en": "KIM CHULSU",
      "passport_number": "M12345678",
      "seat_number": "1A"
    }
  ],
  "status": "booked",
  "nmtl_date": "2026-04-10",
  "tl_date": "2026-04-13"
}

// Response 200
{
  "id": 1,
  "pnr": "ABC123",
  "created_at": "2026-04-01T10:00:00Z",
  ...
}
```

**완료 조건**:
- [ ] 5개 엔드포인트 구현
- [ ] Request 검증 (pnr 필수, 중복 체크)
- [ ] Response 형식 통일

---

### P0-F04: 데이터 마이그레이션 [Phase 2]

**설명**: 기존 데이터(flight_saves, flight_schedules, air_bookings) → flight_bookings

**마이그레이션 전략**:

1. **flight_saves** → flight_bookings
   - source = 'converter'
   - data 필드에 원본 저장

2. **flight_schedules** → flight_bookings
   - source = 'schedule'
   - group_id 유지

3. **air_bookings** → flight_bookings
   - source = 'booking'
   - pax_count, agency 등 매핑

**중복 제거**:
- 같은 PNR + 같은 departure_date → 최신 데이터 유지
- 나머지는 archive 테이블로 이동 (선택사항)

**완료 조건**:
- [ ] 마이그레이션 스크립트 작성
- [ ] 데이터 검증 쿼리 (행 수, 중복 확인)
- [ ] 롤백 계획 문서화

---

### P0-F05: 항공편 관리 API [Phase 1]

**설명**: flight_schedules 테이블의 CRUD API (기본 정보 + 탑승자 관리)

**엔드포인트**:

```
POST   /api/schedules          → 항공편 추가
GET    /api/schedules          → 항공편 목록 (필터)
GET    /api/schedules/:id      → 항공편 상세
PUT    /api/schedules/:id      → 항공편 수정
DELETE /api/schedules/:id      → 항공편 삭제
```

**완료 조건**:
- [ ] 5개 엔드포인트 구현
- [ ] 항공사/편명 자동완성 (GET /api/schedules/search)
- [ ] 만료 항공편 정리 API

---

### P0-F06: PNR 메모/원본 보존 [Phase 1]

**설명**: PNR을 변환기/예약장부에 입력 시 메모 칸에 원본 PNR 텍스트 보존 → 불러오기 시 재변환 가능

**요구사항**:
- PNR 변환 시 메모(remarks)에 원본 PNR 텍스트 저장
- 저장된 예약을 불러올 때 메모에서 원본 PNR 추출
- 수정 시 원본 PNR 편집 → 재변환 → 저장 기능

**DB 필드**:
- `flight_bookings.remarks` — 원본 PNR 및 비고 저장

**완료 조건**:
- [ ] PNR 파싱 후 메모에 원본 저장
- [ ] 메모에서 원본 추출 및 재파싱 가능
- [ ] UI에 메모 입력 필드 추가

---

### P0-F07: arrival_date 파싱 및 도착일 표시 [Phase 1]

**설명**: 현재 air_booking_segments.arrival_date가 전부 NULL → PNR 파서에서 도착일 추출, 도시명 변환

**요구사항**:
- PNR 파싱 시 도착일(arrival_date) 자동 추출
- 예약장부에서 도착일 표시
- 도착일을 모르면 표시 안 함
- PNR 파싱에서 확인된 익일(다음날 도착) 시에만 빨간색 표시
- 공항코드(ICN) → 도시명(인천) 변환 규칙 적용

**변환 예시**:
- ICN → 인천
- NRT → 나리타
- LAX → 로스앤젤레스

**완료 조건**:
- [ ] PNR 파서에서 도착일 추출 로직 구현
- [ ] 공항코드→도시명 변환 매핑 테이블 작성
- [ ] 익일 도착 시 빨간색 표시 로직

---

### P0-F08: localStorage 완전 제거 [Phase 2]

**설명**: 브라우저에 데이터 저장 금지, 서버 DB 공용 사용. 어떤 PC, 어떤 브라우저에서든 로그인하면 동일한 데이터

**미전환 4개 항목**:
1. 버스예약 (`/api/bus-reservations`) — 서버 DB 전환
2. 안내문 (`/api/announcements`) — 서버 DB 전환
3. 견적서 (`/api/estimates`) — 서버 DB 전환 (인증 제거)
4. 단체명단 (`/api/group-list`) — 서버 DB 전환

**완료 조건**:
- [ ] 4개 API 엔드포인트 구현
- [ ] localStorage 사용 제거
- [ ] /api/flight-saves, /api/estimates 인증 제거 (내부망 전용)
- [ ] PC 재시작/브라우저 변경 후에도 데이터 일치 확인

---

### P0-F09: 내부망 인증 완화 [Phase 2]

**설명**: /api/flight-saves, /api/estimates 인증 없이 접근 가능 (내부망 192.168.0.x 전용)

**화이트리스트 설정**:
- `/api/flight-saves` — 인증 불필요
- `/api/estimates` — 인증 불필요
- 기타 엔드포인트 — 인증 필수 (향후)

**완료 조건**:
- [ ] 인증 화이트리스트 미들웨어 구현
- [ ] 내부망 IP 확인 로직 (192.168.0.x)
- [ ] 외부 접근 시도 로깅

---

## P1 — Phase 3~5: 통합 기능 (UI & 동기화)

### P1-F01: air-booking 예약장부 연동 [Phase 3]

**설명**: air-booking의 예약장부를 새 API와 연결

**변경 사항**:
- 기존 local state → /api/bookings 호출로 변경
- 예약 저장 시 DB에 자동 저장
- 예약 삭제 시 DB에서도 삭제
- 페이지 로드 시 DB에서 전체 목록 조회

**완료 조건**:
- [ ] CRUD 버튼 모두 동작
- [ ] 예약 검색/필터 동작
- [ ] 마감일자 입력/표시 동작

---

### P1-F02: 변환기 저장 기능 통합 [Phase 4]

**설명**: 변환기의 "저장" 버튼 → /api/bookings에 저장

**변경 사항**:
- localStorage 의존 제거
- 저장 버튼 클릭 → POST /api/bookings
- 저장 성공 메시지 표시
- 목록 갱신 (양쪽 동시)

**완료 조건**:
- [ ] PNR 저장 API 호출
- [ ] 저장 성공/실패 피드백
- [ ] 변환기 목록 갱신

---

### P1-F03: 저장된 항공편 통합 목록 [Phase 4]

**설명**: 변환기 "저장된 항공편" 탭 → DB의 모든 예약 표시 (air-booking + 변환기 통합)

**요구사항**:
- air-booking 예약장부의 데이터도 표시
- 항공편별 그룹화 또는 시간순 정렬
- 필터: 항공편, 탑승객, 마감 상태

**완료 조건**:
- [ ] GET /api/bookings 응답으로 목록 표시
- [ ] air-booking 데이터도 표시됨
- [ ] 필터링 동작

---

### P1-F04: 이미지/랜딩카드 생성 (air-booking) [Phase 5]

**설명**: air-booking 예약장부에서 "고객전달" 버튼 추가 → 이미지/랜딩카드 생성

**요구사항**:
- 기존 변환기의 이미지 생성 로직 재사용
- air-booking의 예약 정보로 이미지 생성
- 이미지 다운로드/클립보드 복사

**완료 조건**:
- [ ] "고객전달" 버튼 UI 추가
- [ ] 이미지 생성 동작
- [ ] 다운로드 가능

---

### P1-F05: 실시간 동기화 (Polling) [Phase 5]

**설명**: 한쪽 수정 → 다른 쪽 자동 갱신 (REST Polling 사용)

**구현 방식**:
- air-booking과 변환기에서 1초마다 GET /api/bookings 호출
- 응답 데이터와 로컬 상태 비교
- 변경사항 있으면 UI 갱신

**완료 조건**:
- [ ] Polling 구현
- [ ] 불필요한 재렌더링 최소화
- [ ] 네트워크 에러 처리

---

### P1-F06: 항공편 자동완성 [Phase 3]

**설명**: 예약 입력 시 항공편 자동완성

**요구사항**:
- GET /api/schedules/search?airline=KE&flight=100
- 드롭다운으로 결과 표시

**완료 조건**:
- [ ] 검색 API 동작
- [ ] 자동완성 UI 구현

---

## P2 — Phase 6: 개선 기능 (선택)

### P2-F01: 고급 검색 & 필터링

**설명**: 예약 검색 고도화

**기능**:
- 탑승객명 검색
- 마감 상태별 필터
- 날짜 범위 필터
- 항공사별 집계

---

### P2-F02: 발권/요금증명서 생성 (기존 유지)

**설명**: 기존 기능 그대로 유지, UI만 통합

**완료 조건**:
- [ ] air-booking 발권 페이지 동작
- [ ] 요금증명서 PDF 생성
- [ ] 견적서 출력

---

### P2-F03: 엑셀 불러오기 (기존 유지)

**설명**: 변환기의 엑셀 불러오기 기능 유지

**완료 조건**:
- [ ] 엑셀 파일 읽기
- [ ] 행별 예약 생성
- [ ] 오류 처리

---

### P2-F04: 모바일 반응형

**설명**: 변환기 모바일 최적화

**요구사항**:
- 320px 이상 지원
- 터치 UI 최적화

---

### P2-F05: 대시보드 & 달력

**설명**: 마감 알림, BSP 입금일

**기능**:
- 마감 임박 예약 알림
- 달력 보기
- 통계

---

### P2-F06: 감사 로그 (Audit Log)

**설명**: 모든 변경 기록

**테이블**:
```sql
audit_logs (
  id INT PRIMARY KEY,
  user_id INT,
  action VARCHAR(20),  -- CREATE, UPDATE, DELETE
  table_name VARCHAR(50),
  record_id INT,
  old_data JSON,
  new_data JSON,
  created_at DATETIME
)
```

---

## 기능별 의존성 그래프

```
P0-F01 (서버 구축)
  ↓
P0-F02 (DB 설계)
  ├→ P0-F03 (CRUD API)
  │  ├→ P1-F01 (air-booking 연동)
  │  ├→ P1-F02 (변환기 저장 통합)
  │  └→ P1-F03 (통합 목록)
  │
  ├→ P0-F04 (데이터 마이그레이션)
  │  └→ P0-F06 (PNR 메모 보존)
  │
  ├→ P0-F05 (항공편 관리)
  │  └→ P1-F06 (자동완성)
  │
  ├→ P0-F06 (PNR 메모 보존)
  │
  ├→ P0-F07 (arrival_date 파싱)
  │
  ├→ P0-F08 (localStorage 제거)
  │
  ├→ P0-F09 (내부망 인증 완화)
  │
  └→ P1-F05 (동기화)

P1-F03 (통합 목록)
  └→ P1-F04 (이미지/랜딩카드)

P2-F01 (검색/필터) → 기타 P2 기능들
```

---

## 기능별 담당자 & 일정

| 기능 | Phase | 담당 | 기간 | 상태 |
|------|-------|------|------|------|
| P0-F01 | 1 | backend-specialist | 1일 | 미배정 |
| P0-F02 | 1 | database-specialist | 0.5일 | 미배정 |
| P0-F03 | 1 | backend-specialist | 1.5일 | 미배정 |
| P0-F04 | 2 | database-specialist | 1일 | 미배정 |
| P0-F05 | 1 | backend-specialist | 1일 | 미배정 |
| P0-F06 | 1 | backend-specialist | 0.5일 | 미배정 |
| P0-F07 | 1 | backend-specialist | 0.5일 | 미배정 |
| P0-F08 | 2 | backend-specialist | 1.5일 | 미배정 |
| P0-F09 | 2 | backend-specialist | 0.5일 | 미배정 |
| P1-F01 | 3 | frontend-specialist | 1.5일 | 미배정 |
| P1-F02 | 4 | frontend-specialist | 0.5일 | 미배정 |
| P1-F03 | 4 | frontend-specialist | 1일 | 미배정 |
| P1-F04 | 5 | frontend-specialist | 1day | 미배정 |
| P1-F05 | 5 | backend-specialist | 1일 | 미배정 |
| P1-F06 | 3 | backend-specialist | 0.5일 | 미배정 |
| P2-F01 | 6 | frontend-specialist | 1일 | 미배정 |
| P2-F02 | 6 | frontend-specialist | 0.5일 | 미배정 |

---

## 참고 자료

- [01-prd.md](./01-prd.md) — 제품 요구사항
- [05-tech-spec.md](./05-tech-spec.md) — 기술 명세
- [06-tasks.md](./06-tasks.md) — 구현 태스크
