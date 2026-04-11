# 여행사 계약·견적·일정 자동화 인트라넷 API

## 개요

단체 여행의 계약서, 견적서, 일정표를 자동으로 생성하는 시스템의 백엔드 API입니다.

## 기술 스택

- **Framework**: FastAPI 0.109.0
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy 2.0
- **Validation**: Pydantic 2.5

## 설치 및 실행

### 1. 의존성 설치

```bash
cd api
pip install -r requirements.txt
```

### 2. 환경 변수 설정

`.env.example`을 복사하여 `.env` 파일 생성:

```bash
cp .env.example .env
```

`.env` 파일을 수정하여 데이터베이스 연결 정보 입력:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

### 3. 데이터베이스 스키마 생성

PostgreSQL 데이터베이스에 스키마를 적용:

```bash
psql -U your_username -d your_database_name -f ../database/schema.sql
```

### 4. 서버 실행

```bash
# 개발 모드 (자동 리로드)
uvicorn main:app --reload --port 8000

# 또는
python main.py
```

## API 문서

서버 실행 후 다음 URL에서 API 문서를 확인할 수 있습니다:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 주요 API 엔드포인트

### 단체 관리

- `GET /api/groups` - 단체 목록 조회
- `GET /api/groups/{group_id}` - 단체 상세 조회
- `POST /api/groups` - 단체 생성
- `PUT /api/groups/{group_id}` - 단체 수정
- `DELETE /api/groups/{group_id}` - 단체 삭제

## 프로젝트 구조

```
api/
├── main.py                 # FastAPI 앱
├── database.py             # DB 연결 설정
├── models.py               # SQLAlchemy 모델
├── schemas.py              # Pydantic 스키마
├── routers/
│   ├── __init__.py
│   └── groups.py           # 단체 관리 API
├── tests/
│   └── test_groups_api.py  # API 테스트
├── requirements.txt        # 의존성
├── .env.example            # 환경 변수 예제
└── README.md               # 이 파일
```

## 개발 진행 상황

### 완료된 Task

**데이터베이스 (Phase 1):**
- [x] **T-DB-01**: 기본 테이블 생성 (groups, itinerary, cancel_rules, includes, documents, audit_logs)
- [x] **T-DB-02**: 자동/수동 플래그 컬럼 추가 (T-DB-01에 포함)
- [x] **T-DB-03**: 상태 제어 컬럼 (T-DB-01에 포함)
- [x] **T-DB-04**: 감사 로그 테이블 생성 (T-DB-01에 포함)

**단체 관리 API (Phase 2):**
- [x] **T-API-01**: 단체 목록 조회 API (필터링, 페이징)
- [x] **T-API-02**: 단체 상세 조회 API (관계 데이터 eager loading)
- [x] **T-API-03**: 단체 생성 API (자동 계산)
- [x] **T-API-04**: 단체 수정 API (manual 플래그 처리)
- [x] **T-API-05**: 상태 변경 API (전환 규칙 검증)
- [x] **T-API-06**: 자동 계산 트리거 API (선택적 재계산)

**하위 리소스 API (Phase 3):**
- [x] **T-API-07**: 일정 관리 API (CRUD, day_no 자동 부여)
- [x] **T-API-08**: 취소 규정 관리 API (날짜 자동 계산)
- [x] **T-API-09**: 포함/불포함 항목 관리 API (display_order 관리)

**에러 처리 (Phase 4):**
- [x] **T-API-11**: 에러 처리 미들웨어 (전역 exception handler, 로깅)

**계산 로직 서비스 (Phase 5):**
- [x] **T-CALC-01**: 기간 계산 로직 (박수, 일수)
- [x] **T-CALC-02**: 금액 계산 로직 (총액, 잔액)
- [x] **T-CALC-03**: 잔액 완납일 계산 로직
- [x] **T-CALC-04**: 취소 규정 날짜 계산 로직
- [x] **T-CALC-05**: 일정 날짜 자동 재배치 로직
- [x] **T-CALC-06**: 통합 재계산 로직

**문서 생성 시스템 (Phase 6):**
- [x] **T-API-10**: 문서 출력 API (PDF 생성 및 다운로드)
- [x] **PDF 생성 서비스**: WeasyPrint 기반 HTML to PDF 변환
- [x] **템플릿 시스템**: Jinja2 기반 HTML 템플릿 렌더링
- [x] **파일 관리**: 문서 저장 및 다운로드 유틸리티
- [x] **견적서 템플릿**: 기본 정보, 요금, 일정, 포함/불포함 사항
- [x] **계약서 템플릿**: 계약 조건, 취소 규정, 서명란
- [x] **일정표 템플릿**: 일자별 상세 일정
- [x] **통합 문서 템플릿**: 견적서 + 계약서 + 일정표

**프론트엔드 UI (Phase 7):**
- [x] **T-UI-01**: 단체 선택 화면 (목록, 검색, 필터링, 페이징)
- [x] **T-UI-02**: 단체 입력 화면 (자동 계산, 수동 수정, 실시간 표시)
- [x] **T-UI-03**: 일정 관리 화면 (CRUD, day_no 자동 부여)
- [x] **T-UI-04**: 취소 규정 관리 화면 (CRUD, 날짜 자동 계산)
- [x] **T-UI-05**: 포함/불포함 항목 관리 화면 (CRUD, display_order 관리)
- [x] **T-UI-06**: 문서 출력 버튼 영역 (4종 문서 생성 및 다운로드)
- [x] **T-UI-07**: 상태 변경 UI (견적 → 계약 → 확정)
- [x] **T-UI-08**: 사용자 알림 시스템 (토스트, 모달)

### 다음 Task

- [ ] T-TEST-01~05: 통합 테스트
- [ ] 배포 및 운영 설정
- [ ] 인증 및 권한 관리

## 라이선스

Internal Use Only
