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

**TourWorld(여행세상)**는 여행사의 핵심 업무인 **단체 명단 관리, 견적서 작성, 일정표 생성, 복잡한 항공 스케줄 관리 및 원가 산출**을 디지털로 통합하고 AI를 통해 자동화하는 Full-stack 솔루션입니다.

**Next-Gen Monorepo** 아키텍처를 채택하여 client/, server/, shared/, gateway/로 구성된 모던 스택으로 유지보수성과 확장성을 극대화했습니다.

---

## ✨ 핵심 기능

### 1. 📋 일정 및 여행 상품 관리
- **Itinerary**: 여행 일정 생성 및 관리
- **Hotel**: 호텔 정보 등록 및 관리
- **Tour/Product**: 여행 상품 등록 및 관리

### 2. 👥 고객 및 단체 관리
- **Customer**: 고객 정보 관리 (여권번호 기반)
- **Group**: 단체 여행 정보 관리
- **Schedule**: 일정별 세부 계획 관리

### 3. 💰 인보이스 및 원가 계산
- **Invoice**: 청구서 생성 및 관리
- **FlightSchedule**: 항공 스케줄 관리
- **CostCalculation**: 원가 계산 및 관리

### 4. 🔐 인증 및 보안
- **JWT 인증**: Next-Gen Server API 보안
- **Rate Limiting**: DDoS/브루트포스 방지
- **Helmet**: HTTP 보안 헤더

---

## 🏗️ 프로젝트 구조

```text
tourworld-root/
├── gateway/              # 🚪 통합 진입점 (포트 8080)
│   └── src/index.ts      # 세션/JWT 인증 + 프록시 라우팅
│
├── client/               # 🚀 Next-Gen Frontend (Next.js 16 + React 18 + Zustand)
├── server/               # 🚀 Next-Gen Backend (Express + Prisma + SQLite, 포트 3001)
├── shared/               # 🔗 공통 타입/유틸 라이브러리
│
├── docs/                 # 📚 프로젝트 문서 (설계, 분석, 리포트)
└── .github/workflows/     # 🤖 GitHub Actions CI 연동
```

---

## 🛡️ 기술 스택

### **Next-Gen 아키텍처 (차세대 모던 스택)**

- **Gateway (포트 8080)**: 통합 진입점. 세션/JWT 인증 및 서비스별 프록시 라우팅
- **Frontend (Next.js 16 + React 18)**: App Router 기반의 SSR/CSR 혼합架构와 **Zustand** 상태 관리. **Tailwind CSS** 디자인 시스템.
- **Backend (Express + Prisma + SQLite)**: **Prisma ORM**과 **SQLite**를 통해 파일 기반의轻型 데이터베이스로 간단한 배포와 높은 이식성을 제공합니다.
- **Shared Workspace**: `shared` 폴더를 통해 클라이언트와 서버가 동일한 **TypeScript 타입 정의(DTO)**와 비즈니스 로직 유틸리티를 공유합니다.
- **Full TypeScript**: 전 계층에 걸쳐 엄격한 타입을 적용하여 개발 단계에서 오류를 탐지하고 코드 자가 문서화를 실현합니다.

기존의 안정적인 바닐라 스택을 넘어, 대규모 확장성과 유지보수성을 극대화하기 위해 설계된 차세대 아키텍처입니다.

- **Gateway (포트 8080)**: 통합 진입점. 세션/JWT 인증 및 서비스별 프록시 라우팅
  - `/api/sales/*` → Current Stable (포트 5000)
  - `/api/nextgen/*` → Next-Gen Server (포트 3001)
- **Frontend (Next.js 16 + React 18)**: App Router 기반의 SSR/CSR 혼합架构와 **Zustand** 상태 관리. **Tailwind CSS** 디자인 시스템.
- **Backend (Express + Prisma + SQLite)**: **Prisma ORM**과 **SQLite**를 통해 파일 기반의轻型 데이터베이스로 간단한 배포와 높은 이식성을 제공합니다.
- **Shared Workspace**: `shared` 폴더를 통해 클라이언트와 서버가 동일한 **TypeScript 타입 정의(DTO)**와 비즈니스 로직 유틸리티를 공유함으로써, API 규격 변경에 따른 휴먼 에러를 원천 차단합니다.
- **Full TypeScript**: 전 계층에 걸쳐 엄격한 타입을 적용하여 개발 단계에서 오류를 탐지하고 코드 자가 문서화를 실현합니다.

**최종 요청 흐름:**
```
Client (3000) → Gateway (8080) → /api/nextgen/* → Next-Gen Server (3001)
```

---

## 🚀 설치 및 실행 방법

### 1단계: 필수 환경 전제조건
- Node.js v18.x 이상
- npm v10.x 이상

### 2단계: 환경 변수 설정
`server/` 경로에 `.env.example`을 복사하여 `.env`를 만듭니다.
```env
# server/.env
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

`gateway/` 경로에 `.env`를 만듭니다.
```env
# gateway/.env
PORT=8080
SESSION_SECRET=your-session-secret
```

### 3단계: 시스템 실행

```bash
# Gateway 실행 (포트 8080)
cd gateway && npm install && npm run dev

# Next-Gen Server 실행 (포트 3001) - 별도 터미널
cd server && npm install && npm run dev

# Next-Gen Client 실행 (포트 3000) - 별도 터미널
cd client && npm install && npm run dev
```

**실행 확인:**
- Gateway: http://localhost:8080/api/health
- Next-Gen Server: http://localhost:3001/api/health
- Next-Gen Client: http://localhost:3000

**API 테스트 (Gateway 경유):**
```bash
# Login
curl -X POST http://localhost:8080/api/nextgen/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tourworld.com","password":"change-this-password"}'

# Hotels
curl http://localhost:8080/api/nextgen/hotels
```

---

## 🔧 주요 시스템 참고 사항

- **DB 백업**: 로컬 SQLite 활용 시 `server/prisma/` 폴더에 `dev.db` 파일이 자동 저장됩니다.
- **Swagger Docs**: Server 실행 후 `http://localhost:3001/api-docs` 로 접속 시 전체 RESTful API를 조회하고 테스트 해볼 수 있습니다.

---

## 🚧 개발 진행 로드맵

- ✅ **Phase 1~2 완료**: 기본 기능(견적서, 예약) 완료 및 파일럿 테스트용 Vanilla 프레임워크 완성, 백엔드 테스트/ESM/CI 체계 도입 완수.
- ✅ **Phase 3 (Next-Gen 전환)**: Next.js + React 기반의 차세대 모노레포 구축 및 SQLite 기반 로컬 DB 연동 완료.
- ✅ **Phase 5 (마이그레이션 완료)**: Legacy 시스템 삭제 및 Next-Gen Monorepo 정리 완료.
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
