# 여행사 계약·견적·일정 자동화 인트라넷 - 프로젝트 문서

## 📁 폴더 구조

### `/docs` - 기획 및 설계 문서
프로젝트의 핵심 기획 및 설계 문서들이 포함되어 있습니다.

- **여행사_계약_견적_일정_자동화_인트라넷_prd.md** - Product Requirements Document (제품 요구사항 정의서)
- **여행사_계약_견적_일정_자동화_인트라넷_task.md** - 초기 작업 목록
- **여행사_계약_견적_일정_자동화_인트라넷_task_v2.md** - 최신 작업 목록 및 진행 현황 (⭐ 메인 문서)
- **여행사_계약_견적_일정_자동화_인트라넷_trd.md** - Technical Requirements Document (기술 요구사항 정의서)
- **database-design.md** - 데이터베이스 설계 문서
- **design-system.md** - 디자인 시스템 가이드
- **user-flow.md** - 사용자 플로우 정의
- **wireframe.md** - 와이어프레임 및 UI 설계

### `/testing` - 테스트 관련
테스트 실행 및 결과 관련 파일들

- **TESTING.md** - 테스트 가이드 및 현황
- **run_tests.bat** - 통합 테스트 실행 스크립트 (Windows)
- **server.log** - 서버 실행 로그

### `/dev-notes` - 개발 노트
개발 중 발견한 이슈, 해결 방법, 참고 사항 등

- **CURSOR_CHAT_FIX.md** - Cursor 채팅 관련 수정 사항
- **VS_CODE_EXTENSION_FIX.md** - VS Code 확장 프로그램 이슈 해결
- **GEMINI.md** - Gemini AI 연동 관련 메모
- **info.txt** - Excel to HTML 변환 관련 정보
- **schedules_README.md** - 일정표 기능 설명

### `/resources` - 리소스 파일
프로젝트에서 사용하는 템플릿, 이미지 등

- **일정표_템플릿_v*.xlsx** - 일정표 Excel 템플릿 (v1, v2, v3)
- **1211.xlsx** - 샘플 데이터
- **logo.jpg** - 로고 이미지

### `/legacy-html` - 레거시 HTML 파일
초기 프로토타입 및 오래된 HTML 파일들 (참고용)

- 각종 초기 버전 HTML 파일들

### `/backups` - 백업 파일
코드 수정 전 백업 파일들

- 라우터 백업 파일들 (*.bak)

## 📌 주요 참고 문서

1. **프로젝트 전체 개요**: `/docs/여행사_계약_견적_일정_자동화_인트라넷_prd.md`
2. **최신 작업 현황**: `/docs/여행사_계약_견적_일정_자동화_인트라넷_task_v2.md` ⭐
3. **기술 스펙**: `/docs/여행사_계약_견적_일정_자동화_인트라넷_trd.md`
4. **테스트 현황**: `/testing/TESTING.md`

## 🔄 최근 작업 내역

- **2024-12-24**: 백엔드 통합 테스트 수정 완료 (88.2% 통과)
  - Itinerary 생성 API 수정 (day_no 자동 부여)
  - Cancel rule 생성 API 수정 (cancel_date 자동 계산)
  - 다중 서버 프로세스 이슈 해결

- **2024-12-23**: 프론트엔드-백엔드 통합 테스트 구축
  - FastAPI + SQLAlchemy 백엔드 구현
  - 그룹, 일정, 취소규정, 포함/불포함 항목 CRUD API
  - PDF 문서 생성 기능 (견적서, 계약서, 일정표)

## 📂 프로젝트 루트 구조

```
/main
├── /api              # FastAPI 백엔드
├── /frontend         # 프론트엔드 (HTML/CSS/JS)
├── /tests            # 통합 테스트
├── /contract         # 📁 이 폴더 (문서 및 리소스)
├── /database         # SQLite 데이터베이스
└── README.md         # 프로젝트 메인 README
```

## 🚀 다음 단계

현재 진행 중인 작업은 `/docs/여행사_계약_견적_일정_자동화_인트라넷_task_v2.md`를 참고하세요.
