# 통합 테스트 실행 가이드

## 빠른 시작 (Windows)

```bash
# 프로젝트 루트에서 실행
run_tests.bat
```

이 스크립트는 자동으로:
1. Python 의존성 설치
2. 백엔드 서버 시작
3. 브라우저에서 프론트엔드 열기

## 수동 실행

### 1. 의존성 설치

```bash
cd api
pip install -r requirements.txt
```

### 2. 백엔드 서버 시작

```bash
cd api
python main.py
```

또는:

```bash
cd api
uvicorn main:app --reload --port 8000
```

### 3. 브라우저에서 접속

- **프론트엔드**: http://localhost:8000/pages/group_list.html
- **API 문서**: http://localhost:8000/docs
- **헬스 체크**: http://localhost:8000/health

## 자동화된 통합 테스트

```bash
# 서버가 실행 중인 상태에서
cd tests
python integration_test.py
```

## 테스트 범위

### ✅ 백엔드 API (26개 엔드포인트)

- **단체 관리** (6개)
  - GET /api/groups - 목록 조회 (검색, 필터링, 페이징)
  - POST /api/groups - 생성 (자동 계산)
  - GET /api/groups/{id} - 상세 조회
  - PUT /api/groups/{id} - 수정
  - PATCH /api/groups/{id}/status - 상태 변경
  - POST /api/groups/{id}/recalculate - 재계산
  - DELETE /api/groups/{id} - 삭제

- **일정 관리** (5개)
  - POST /api/groups/{id}/itineraries
  - GET /api/groups/{id}/itineraries
  - GET /api/groups/{id}/itineraries/{itinerary_id}
  - PUT /api/groups/{id}/itineraries/{itinerary_id}
  - DELETE /api/groups/{id}/itineraries/{itinerary_id}

- **취소 규정** (5개)
  - POST /api/groups/{id}/cancel-rules
  - GET /api/groups/{id}/cancel-rules
  - GET /api/groups/{id}/cancel-rules/{rule_id}
  - PUT /api/groups/{id}/cancel-rules/{rule_id}
  - DELETE /api/groups/{id}/cancel-rules/{rule_id}

- **포함/불포함** (5개)
  - POST /api/groups/{id}/includes
  - GET /api/groups/{id}/includes
  - GET /api/groups/{id}/includes/{include_id}
  - PUT /api/groups/{id}/includes/{include_id}
  - DELETE /api/groups/{id}/includes/{include_id}

- **문서 생성** (5개)
  - POST /api/groups/{id}/documents/generate
  - GET /api/groups/{id}/documents
  - GET /api/groups/{id}/documents/{doc_id}
  - GET /api/groups/{id}/documents/{doc_id}/download
  - DELETE /api/groups/{id}/documents/{doc_id}

### ✅ 프론트엔드 UI (8개 화면)

- T-UI-01: 단체 목록 페이지
- T-UI-02: 단체 입력/수정 페이지
- T-UI-03: 일정 관리 페이지
- T-UI-04: 취소 규정 관리
- T-UI-05: 포함/불포함 관리
- T-UI-06: 문서 출력 버튼
- T-UI-07: 상태 변경 UI
- T-UI-08: 알림 시스템

### ✅ 핵심 기능

- **자동 계산**
  - 박수 = 도착일 - 출발일
  - 일수 = 박수 + 1
  - 총액 = 인원 × 1인당 요금
  - 잔액 = 총액 - 계약금
  - 완납일 = 출발일 - 7일
  - 취소 기준일 = 출발일 - days_before
  - 일정 날짜 = 출발일 + (day_no - 1)

- **수동 수정**
  - 자동 계산값 수동 변경 가능
  - 자동/수동 시각적 구분 (파란색/노란색)
  - 자동 계산으로 되돌리기

- **문서 생성**
  - 견적서 PDF
  - 계약서 PDF
  - 일정표 PDF
  - 통합 문서 PDF (3종 통합)

## 테스트 시나리오

상세한 테스트 시나리오는 `tests/INTEGRATION_TEST_GUIDE.md`를 참조하세요.

### 기본 시나리오

1. **단체 생성**
   - 프론트엔드에서 단체 생성 폼 작성
   - 자동 계산 결과 확인
   - 저장 성공 확인

2. **단체 관리**
   - 단체 목록 조회
   - 검색 및 필터링
   - 단체 클릭하여 대시보드 접근

3. **상세 기능 테스트**
   - 일정 추가/수정/삭제
   - 취소 규정 추가/삭제
   - 포함/불포함 항목 추가/삭제

4. **문서 생성**
   - 각 문서 타입별 PDF 생성
   - 다운로드 확인
   - PDF 내용 확인 (한글, 포맷)

5. **상태 관리**
   - 견적 → 계약 → 확정 상태 변경
   - 각 상태별 UI 확인

## 예상 결과

### 성공 케이스

- ✅ 모든 API 엔드포인트가 200/201/204 응답 반환
- ✅ 자동 계산이 정확하게 수행됨
- ✅ 프론트엔드가 정상적으로 로드됨
- ✅ PDF 문서가 정상적으로 생성됨
- ✅ 한글이 PDF에 정상 표시됨

### 테스트 통과 기준

- API 테스트: **100% 통과**
- 프론트엔드 로드: **모든 페이지 200 OK**
- 자동 계산: **모든 계산 정확**
- 문서 생성: **4종 모두 성공**
- 통합 기능: **프론트엔드 ↔ 백엔드 정상 통신**

## 문제 해결

### 서버 시작 실패

```bash
# 포트 충돌 확인
netstat -ano | findstr :8000

# 프로세스 종료
taskkill /PID <PID> /F
```

### 의존성 설치 실패

```bash
# Python 버전 확인 (3.8 이상 필요)
python --version

# 가상 환경 사용 권장
python -m venv venv
venv\Scripts\activate
pip install -r api/requirements.txt
```

### PDF 생성 실패

Windows에서 WeasyPrint 사용 시 GTK+ 설치 필요:
https://weasyprint.readthedocs.io/en/stable/install.html

또는 SQLite 사용:
```env
# api/.env
DATABASE_URL=sqlite:///./travel_agency.db
```

## 테스트 보고서

테스트 완료 후 다음 체크리스트를 확인하세요:

### 백엔드
- [ ] 헬스 체크 성공
- [ ] 단체 CRUD 모두 성공
- [ ] 일정 CRUD 모두 성공
- [ ] 취소 규정 CRUD 모두 성공
- [ ] 포함/불포함 CRUD 모두 성공
- [ ] 상태 변경 성공
- [ ] 재계산 성공
- [ ] 문서 생성 4종 모두 성공

### 프론트엔드
- [ ] 모든 페이지 로드 성공
- [ ] 검색/필터링 작동
- [ ] 페이징 작동
- [ ] 폼 유효성 검증 작동
- [ ] 자동 계산 작동
- [ ] 수동 수정 작동
- [ ] 모달/토스트 작동
- [ ] API 호출 성공

### 통합
- [ ] 프론트엔드 → API 호출 성공
- [ ] API → 프론트엔드 응답 성공
- [ ] 에러 처리 정상
- [ ] PDF 다운로드 정상

## 추가 리소스

- **API 문서**: http://localhost:8000/docs
- **통합 테스트 가이드**: `tests/INTEGRATION_TEST_GUIDE.md`
- **통합 테스트 스크립트**: `tests/integration_test.py`
- **프론트엔드 README**: `frontend/README.md`
- **백엔드 README**: `api/README.md`
