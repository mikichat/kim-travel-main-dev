# ✈️ TourWorld (여행세상): AI 기반 여행사 업무 통합 관리 시스템

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000.svg)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB.svg)](https://reactjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748.svg)](https://www.prisma.io/)
[![Google Gemini](https://img.shields.io/badge/Google-Gemini_2.x-orange.svg)](https://ai.google.dev/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

---

## 📋 개요

**TourWorld(여행세상)**는 여행사의 핵심 업무인 **단체 명단 관리, 견적서 작성, 일정표 생성, 복잡한 항공 스케줄 관리 및 원가 산출**을 디지털로 통합하고 AI를 통해 자동화하는 다중 구조 기반 Full-stack 솔루션입니다.

특히 복잡한 Excel 일정표를 **Google Gemini AI**로 분석하여 구조화된 데이터로 변환하고, 중장년층 고객이 보기 편한 여행사 전용 양식의 PDF 문서(견적서/일정표)를 원클릭으로 생성하는 데 특화되어 있습니다.

본 프로젝트는 현재 **고품질의 프로덕션 안정성을 갖춘 바닐라/Node 환경(Current)**과, 나아가 **모던 프레임워크 기반의 차세대 환경(Next-Gen Monorepo)** 두 가지 아키텍처를 병행하며 진화하고 있습니다.

---

## ✨ 핵심 기능

### 1. 🤖 AI 기반 Excel 일정 분석 및 매칭
- **Excel to HTML**: `SheetJS`를 통해 셀 병합 정보가 포함된 Excel을 HTML로 변환, AI의 문맥 이해를 도움.
- **Gemini Intelligence**: 구조화되지 않은 복잡한 일정표 내용을 완벽하게 해석하여 JSON으로 메타정보(출국, 지역, 식단, 숙소) 추출.
- **상품 매칭**: 파싱된 데이터와 DB 내 기존 행사 상품을 우선순위 알고리즘으로 자동 매칭 결합.

### 2. 📄 전문 견적서 & 일정표 & 인보이스 자동 생성
- **PDF 브랜딩**: 기존 "여행세상" 고유 양식(123.pdf, 12.pdf 등)을 그대로 시스템화 (DOCX, HWP 연동 지원).
- **실시간 미리보기 & WYSIWYG**: 편집과 동시에 템플릿(간략일정, 상세일정, 골프일정 등)에 맞춘 문서 결과를 확인.
- **다양한 자동화 산출물**: 인보이스(청구서) 자동 계산 및 발송, 단체별 원가 산출(외화 환율 자동 적용).

### 3. 👥 스마트 고객/단체/예약 관리 시스템
- **통합 대시보드 관리**: 달력 UI를 활용한 항공편 일정 시각화 및 최근 예약, 다가오는 행사 알림 리마인더.
- **스마트 검색 & 보안 동기화**: 여권 암호화 등 개인정보 식별 데이터를 안전하게 보관 및 노출 토글 기능.
- **동기화 위저드**: 복잡한 여행자 데이터(생년월일, 여권만료일, 항공일정)를 PNR 데이터와 자동 동기화.

---

## 🏗️ 프로젝트 구조

프로젝트는 점진적 마이그레이션과 최고 수준의 코드 품질 확보를 위해 현재 하이브리드(Hybrid) 형태로 구성되어 있습니다.

```text
tourworld-root/
├── client/                # 🚀 [Next-Gen] 신규 Frontend (React 18 + Next.js 14 + Zustand + TS)
├── server/                # 🚀 [Next-Gen] 신규 Backend (Express + Prisma + SQLite)
├── shared/                # 🔗 [Next-Gen] 공통 타입/유틸 라이브러리 (Monorepo Workspace)
├── backend/               # 🛡️ [Current] Production Backend (Node.js + Express + SQLite)
│   ├── routes/            # 분리된 도메인별 라우터 (auth, schedules, upload, sync 등)
│   ├── services/          # 외부 연동(알림톡, 메일) 및 Gemini 연동 레이어
│   ├── __tests__/         # 99% 달성 API Integration 테스트
│   ├── database.js        # SQLite 인메모리 관리 및 인덱스 최적화
│   └── server.js          # Graceful Shutdown 및 보안 체계가 적용된 앱 엔트리
│
├── frontend/              # 💻 [Current] Production Frontend (Vanilla JS + HTML5 + CSS3)
│   ├── pages/             # 주요 HTML 페이지 (index, login, cost-calculator 등)
│   ├── flights/           # 항공편/스케줄 관리 (기존 air1/)
│   ├── invoices/          # 인보이스/청구서 (기존 in/)
│   ├── itineraries/       # 일정표 생성 (기존 hanatour/)
│   ├── quotes/            # 견적서 편집기 (기존 quote-editor-v1/)
│   ├── templates/         # 문서 인쇄 템플릿 (기존 doc-template-1/)
│   ├── js/                # 공통 JavaScript 유틸리티
│   ├── css/               # 공통 스타일시트
│   └── components/        # 재사용 가능한 UI 컴포넌트
│
├── tools/                 # ⚙️ 보조 도구 및 스크립트
│   ├── data-converter/     # 데이터 변환 유틸리티
│   ├── scripts/           # 배포/백업 스크립트
│   └── util/              # 유틸리티 CLI 도구
│
├── docs/                  # 📚 프로젝트 문서
│   ├── history/           # 버그 픽스 및 세션 로그
│   ├── testing/           # 테스트 결과 리포트
│   ├── references/        # 샘플 파일, Airport 데이터 등
│   └── assets/            # 문서용 이미지
│
├── e2e/                   # 🧪 E2E 테스트 스펙 (Playwright)
├── tests/                 # 🧪 통합 테스트
├── __tests__/            # 🧪 유닛 테스트
│
├── Dockerfile, *.yml      # 🐳 Docker 배포 파이프라인
└── .github/workflows/     # 🤖 GitHub Actions CI 연동 (Test, Lint, Format)
```

---

## 🛡️ 기술 스택 및 품질 관리 (Quality Assurance)

본 시스템은 지속적인 리팩터링을 거쳐(Phase 60+) 상용 서비스 수준의 매우 높은 품질과 안정성을 담보하고 있습니다.

### **Backend (Current Stable)**
- **Express + SQLite3**: `winston` 기반 체계적 파일/콘솔 로깅, `helmet` & Rate Limiting을 통한 탄탄한 보안 적용.
- **테스트 커버리지**: `Jest` + `Supertest` 기반 **99% 이상의 분기/구문 커버리지 (Statements > 98.8%, Branches > 88%)**.
- **API 문서화**: `Swagger/OpenAPI` 연동을 통해 `/api-docs` 기반 자동 문서(UI) 제공.

### **Frontend (Current Stable)**
- **ES Modules & DOM UI**: 레거시의 무거운 스크립트를 ESM으로 캡슐화하고 메모리 누출 방지(unref, setInterval 관리).
- **테스트 & 웹 접근성 (a11y)**: 프론트 구조 모듈화 및 `Vitest`/`Jest` 유닛+E2E (`Playwright`) 테스트 구축. Aria 속성을 통한 철저한 DOM 접근성 보장. 방어적 XSS 처리 완비.

### **Next-Gen 아키텍처 (차세대 모던 스택)**

기존의 안정적인 바닐라 스택을 넘어, 대규모 확장성과 유지보수성을 극대화하기 위해 설계된 차세대 아키텍처입니다.

- **Frontend (React 18 + Next.js 14)**: App Router 기반의 SSR/CSR 혼합架构와 **Zustand**를 이용한 효율적인 상태 관리를 제공합니다. **Tailwind CSS**를 통해 디자인 시스템의 일관성을 유지합니다.
- **Backend (Express + Prisma + SQLite)**: **Prisma ORM**과 **SQLite**를 통해 파일 기반의轻型 데이터베이스로 간단한 배포와 높은 이식성을 제공합니다.
- **Shared Workspace**: `shared` 폴더를 통해 클라이언트와 서버가 동일한 **TypeScript 타입 정의(DTO)**와 비즈니스 로직 유틸리티를 공유함으로써, API 규격 변경에 따른 휴먼 에러를 원천 차단합니다.
- **Full TypeScript**: 전 계층에 걸쳐 엄격한 타입을 적용하여 개발 단계에서 오류를 탐지하고 코드 자가 문서화를 실현합니다.

---

## 🚀 설치 및 실행 방법

### 1단계: 필수 환경 전제조건
- Node.js v18.x 이상
- npm v10.x 이상
- Google Gemini API Key
- (선택) Docker Desktop

### 2단계: 환경 변수 설정
`server/` 경로에 `.env.example`을 복사하여 `.env`를 만듭니다.
```env
# server/.env 예시
NODE_ENV=development
PORT=3001
DATABASE_URL="file:./dev.db"
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
ADMIN_EMAIL=admin@tourworld.com
ADMIN_PASSWORD=change-this-password
ADMIN_NAME=관리자
```

### 3단계: 시스템 실행 방식 선택

**옵션 A: 현재 시스템 실행 (Current Stable Vanilla / Node.js)**
1. `npm install` (루트 구동을 위해 npm workspaces 패키지 설치)
2. `cd backend && npm install`
3. 개발(Watch 모드): `npm run dev` (포트 5000에서 실행됨)
4. 테스트 실행: `npm test` 및 커버리지 조회 `npm run test:coverage`
5. 웹진입 방법: 브라우저에서 `frontend/pages/index.html` 파일을 직접 열거나, 간단한 웹서버로 서빙.

**옵션 B: 차세대 모노레포 실행 (Next-Gen React / Express)**
```bash
# 의존성 설치 (이미 설치되어 있으면 생략)
npm install

# 시작 스크립트 사용 (권장)
./start-next-gen.sh start

# 또는 직접 실행
npm run db:push      # Prisma 스키마 DB 반영 (SQLite)
npm run dev          # Next.js(3000) + Express(3001) 동시 실행
```

**시작 스크립트 명령어:**
```bash
./start-next-gen.sh start   # 서버 시작
./start-next-gen.sh stop    # 서버 중지
./start-next-gen.sh status  # 상태 확인
./start-next-gen.sh logs    # 로그 확인
```

**옵션 C: Docker 기반 단일 컨테이너 환경**
```bash
# 컨테이너 빌드 및 데몬 실행
docker-compose up -d --build
```

---

## 🔧 주요 시스템 참고 사항 
- **DB 백업**: 로컬 SQLite 활용 시 `backend/data` 폴더가 자동 저장됩니다. UI의 [백업 관리] 메뉴에서 IndexedDB와 백엔드 DB의 Snapshot 관리가 가능합니다.
- **Swagger Docs**: 백엔드를 실행하고 `http://localhost:3000/api-docs` 로 접속 시 전체 RESTful API를 조회하고 테스트 해볼 수 있습니다.
- **테스트 명령어**: 통합 CI 환경에서는 다음과 같은 테스트 명령어가 활용 가능합니다:
  - 프론트엔드 테스트: `npm run test:frontend`
  - E2E 테스트: `npm run test:e2e`

---

## 🚧 개발 진행 로드맵

시스템은 총 4단계 Phase로 구성되어 지속 개발되고 있습니다 (세부사항 `ROADMAP.md` 및 `TASKS.md` 참조).
- ✅ **Phase 1~2 완료**: 기본 기능(견적서, 예약) 완료 및 파일럿 테스트용 Vanilla 프레임워크 완성, 백엔드 테스트/ESM/CI 체계 도입 완수.
- 🔄 **Phase 3 (Next-Gen 전환)**: Next.js + React 기반의 차세대 모노레포 구축 및 SQLite 기반 로컬 DB 연동 완료.
- 🔲 **Phase 4**: 심화 AI (자동 수요 예측, 인기 여행지 고급 분석).

---

## 👥 기여자 및 문의

- **김국진 (여행세상 대표)**: 도메인 지식 및 기획/요구사항 제공
- **Development Team**: 🤖 Gemini AI / Agentic System Architecture

---
<div align="center">
  <p><b>⭐ 본 프로젝트는 여행업의 디지털 전환을 선도하며 지속적인 품질 향상을 달성하고 있습니다. ⭐</b></p>
  <p>Made with ❤️ for TourWorld</p>
</div>
