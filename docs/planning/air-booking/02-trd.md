# 항공 예약 관리 시스템 TRD

## 1. 기술 스택

### 결정 방식
- **사용자 레벨**: L3 (경험자)
- **결정 방식**: 사용자 선택 (옵션 B — landing과 동일 스택)

### 1.1 프론트엔드

| 항목 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | React 18 + TypeScript | landing 프로젝트와 동일, 학습 비용 최소화 |
| 빌드 도구 | Vite | 빠른 HMR, landing과 동일 |
| 상태 관리 | React Context + useReducer | 소규모 앱, 외부 라이브러리 불필요 |
| 스타일링 | CSS Modules | landing과 동일 패턴 |
| 달력 라이브러리 | FullCalendar React | 월간/주간 뷰, 이벤트 색상 구분 지원 |

### 1.2 백엔드

| 항목 | 선택 | 이유 |
|------|------|------|
| 런타임 | Node.js | Express 경험 있음 |
| 프레임워크 | Express.js + TypeScript | landing과 동일 |
| 인증 | express-session + connect-sqlite3 | main과 동일 패턴 |
| 알림 | node-cron + Nodemailer | 스케줄 알림, 이메일 발송 |

### 1.3 데이터베이스

| 항목 | 선택 | 이유 |
|------|------|------|
| DB | SQLite (better-sqlite3) | 파일 기반, 설치 불필요, main/landing과 동일 |
| ORM | 없음 (직접 쿼리) | 단순 CRUD, ORM 오버헤드 불필요 |

### 1.4 인프라

| 항목 | 선택 | 이유 |
|------|------|------|
| 배포 | 사무실 LAN (Windows PC → Mac Mini) | tourworld-deploy와 동일 방식 |
| 정적 파일 | Express static serving | landing 배포와 동일 패턴 |

### Decision Log

| 결정 | 대안 | 선택 이유 |
|------|------|----------|
| React + Vite | Vanilla JS (기존 main) | landing과 동일 스택, 컴포넌트 재사용 |
| SQLite | PostgreSQL | 사무실 내부 사용, 설치 간편, 확장성은 추후 판단 |
| CSS Modules | Tailwind | landing과 동일 패턴 유지 |
| FullCalendar | 자체 구현 | 달력 기능이 핵심, 검증된 라이브러리 활용 |

---

## 2. 아키텍처

- **구조**: Monolith (프론트엔드 + 백엔드 단일 프로젝트)
- **패턴**: MVC (Model-View-Controller)
- **프로젝트 구조**: landing과 동일한 client/server 분리

```
air-booking/
├── client/          # React + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.tsx
│   └── vite.config.ts
├── server/          # Express + TypeScript
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   └── index.ts
│   └── tsconfig.json
└── package.json
```

---

## 3. 보안 요구사항

- **인증**: 세션 기반 로그인 (express-session) — main과 동일
- **인가**: 역할 기반 (관리자/일반 직원) — 등록/수정/조회 권한 분리
- **데이터 보호**: 고객 개인정보(여권번호, 연락처) 암호화 저장

---

## 4. 성능 요구사항

- **응답 시간**: < 500ms (LAN 환경)
- **동시 접속**: 3~5명 (사무실 직원)
- **데이터량**: 월 100~500건 예약

---

## 5. 개발 환경

- **Node.js**: 18+ (LTS)
- **TypeScript**: 5.x
- **패키지 매니저**: npm
- **에디터**: VSCode + Claude Code
