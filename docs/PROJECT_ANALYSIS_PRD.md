# 여행사 관리 시스템 - 프로젝트 분석 PRD
# Project Analysis - Product Requirements Document

**작성일**: 2026-01-03
**버전**: v1.0
**프로젝트**: 여행사 관리 시스템 (Travel Agency Management System)
**서버**: http://localhost:5000

---

## 1. 프로젝트 개요

### 1.1 시스템 구성

| 구성 요소 | 기술 스택 | 설명 |
|-----------|----------|------|
| Backend | Node.js + Express | API 서버 (1341줄, server.js) |
| Database | SQLite | travel_agency.db |
| Frontend | HTML + Tailwind CSS | 다중 HTML 페이지 (86개 파일) |
| AI 연동 | Google Gemini API | 일정표 자동 파싱 |

### 1.2 주요 기능

| 기능 | 상태 | 경로 |
|------|------|------|
| 대시보드 | ✅ 작동 | `/` (index.html) |
| 고객 관리 | ✅ 작동 | 내장 페이지 |
| 예약 관리 | ✅ 작동 | 내장 페이지 |
| 상품 관리 | ✅ 작동 | 내장 페이지 |
| 일정 관리 | ✅ 작동 | `/schedules.html` |
| 인보이스 시스템 | ✅ 작동 | `/in/invoice-editor.html` |
| 원가 계산서 | ✅ 작동 | `/cost-calculator.html` |
| 단체명단 | ✅ 작동 | 내장 iframe |
| 항공편 변환기 | ✅ 작동 | `/air1/index.html` |
| 견적서 생성 | ✅ 작동 | `/quote-editor-v1/index.html` |

---

## 2. 발견된 문제점

### 2.1 보안 취약점 (Critical)

| # | 문제 | 위치 | 심각도 | 설명 |
|---|------|------|--------|------|
| S1 | CORS 전체 허용 | server.js:90 | 🔴 높음 | `app.use(cors())` - 모든 Origin 허용 |
| S2 | SQL Injection 위험 | server.js:365-464 | 🔴 높음 | 동적 테이블 라우트에서 테이블명 검증 없음 |
| S3 | 인증/인가 없음 | 전체 | 🔴 높음 | API 보호 없이 모든 요청 허용 |
| S4 | Rate Limiting 없음 | 전체 | 🟡 중간 | DDoS 공격에 취약 |
| S5 | CSRF 보호 없음 | 전체 | 🟡 중간 | 크로스 사이트 요청 위조 가능 |
| S6 | 루트 디렉토리 노출 | server.js:114 | 🟡 중간 | 프로젝트 루트가 정적 파일로 노출 |

### 2.2 코드 품질 문제 (High)

| # | 문제 | 위치 | 설명 |
|---|------|------|------|
| C1 | 서버 파일 과대 | server.js | 1341줄 - 모듈화 필요 |
| C2 | 관심사 혼재 | server.js | API, 파일처리, DB 로직 혼재 |
| C3 | DB 초기화 콜백 내 라우트 | server.js:358-1337 | 구조적 문제 |
| C4 | console.log 로깅 | 전체 | 프로덕션 로거 필요 |
| C5 | 에러 핸들링 미흡 | API 전체 | 일관된 에러 응답 부재 |

### 2.3 아키텍처 문제 (Medium)

| # | 문제 | 설명 |
|---|------|------|
| A1 | 파일 구조 혼란 | 86개 HTML 중 테스트 파일 다수 혼재 |
| A2 | 레거시 파일 | `/contract/legacy-html/` 정리 필요 |
| A3 | 중복 파일 | 동일 기능 파일 다수 존재 |
| A4 | 라우트 조직화 부재 | 일부 라우트만 분리됨 |

### 2.4 기능 개선 필요

| # | 기능 | 현재 상태 | 개선 필요 |
|---|------|----------|----------|
| F1 | 백업 시스템 | 수동 백업만 | 자동 백업 스케줄링 |
| F2 | 에러 알림 | 없음 | 사용자 친화적 에러 메시지 |
| F3 | 검색 기능 | 기본 필터 | 고급 검색 (전문 검색) |
| F4 | 다국어 지원 | 한국어만 | i18n 고려 |

---

## 3. 파일 구조 분석

### 3.1 현재 파일 분포

```
루트 디렉토리/
├── HTML 파일: 40개+ (테스트 파일 포함)
├── JavaScript 파일: 다수
├── 테스트 스크립트: 20개+
└── 문서 파일: 다수
```

### 3.2 문제가 되는 파일들

| 카테고리 | 파일 예시 | 권장 조치 |
|----------|----------|----------|
| 테스트 HTML | `test-*.html` (15개+) | `/tests/` 폴더로 이동 |
| 디버그 스크립트 | `check-*.js`, `verify-*.js` | `/scripts/debug/` 이동 |
| 레거시 파일 | `contract/legacy-html/` | 아카이브 또는 삭제 |
| 임시 파일 | `*-backup.html`, `*-copy.html` | 삭제 |

---

## 4. API 엔드포인트 분석

### 4.1 현재 API 구조

| 카테고리 | 경로 | 메서드 | 상태 |
|----------|------|--------|------|
| 인보이스 | `/api/invoices` | CRUD | ✅ 분리됨 |
| 항공 스케줄 | `/api/flight-schedules` | CRUD | ✅ 분리됨 |
| 은행 계좌 | `/api/bank-accounts` | CRUD | ✅ 분리됨 |
| 일정 | `/api/schedules` | CRUD | ⚠️ server.js 내부 |
| 동기화 | `/api/sync/*` | POST/GET | ⚠️ server.js 내부 |
| 백업 | `/api/backup/*` | GET | ⚠️ server.js 내부 |
| 동적 테이블 | `/tables/:tableName` | CRUD | ❌ 보안 위험 |

### 4.2 동적 테이블 API 위험성

```javascript
// 현재 코드 (server.js:365-374)
app.get('/tables/:tableName', async (req, res) => {
    const { tableName } = req.params;  // ❌ 검증 없음
    const items = await db.all(`SELECT * FROM ${tableName} ...`);
    // SQL Injection 가능!
});
```

---

## 5. 개선 요구사항 요약

### 5.1 우선순위별 분류

#### 🔴 긴급 (1주 이내)
1. SQL Injection 방어 (동적 테이블 라우트)
2. CORS 출처 제한
3. 기본 인증 추가

#### 🟡 중요 (2주 이내)
1. server.js 모듈화 (라우트 분리)
2. 에러 핸들링 통일
3. 테스트 파일 정리

#### 🟢 권장 (1개월 이내)
1. 로깅 시스템 (winston)
2. Rate Limiting
3. API 문서화 (Swagger)

---

## 6. 성공 지표

| 지표 | 현재 | 목표 |
|------|------|------|
| 보안 취약점 | 6개 | 0개 |
| server.js 라인 수 | 1341줄 | <300줄 |
| 테스트 파일 정리 | 0% | 100% |
| API 문서화 | 0% | 100% |
| 에러 핸들링 | 부분적 | 100% |

---

## 7. 참고 문서

- TRD (기술 요구사항): `docs/PROJECT_ANALYSIS_TRD.md`
- Task 목록: `docs/PROJECT_ANALYSIS_TASKS.md`
- 인보이스 시스템: `in/docs/PENDING_TASKS.md`
