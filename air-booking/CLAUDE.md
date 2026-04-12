# Air-Booking (항공권 예약 시스템)

## 개요
독립적인 항공권 예약 서브모듈로, 자체 client/와 server/ 구조를 가짐. 이 디렉토리는 별도의 repo로 분리되어 있을 수 있음.

## 기술 스택
- **Backend**: Express + TypeScript + SQLite
- **Frontend**: 자체 프론트엔드 (client/)
- **Testing**: Playwright (E2E)
- **Language**: CommonJS (서버), ESM (클라이언트)

## 디렉토리 구조
```
air-booking/
├── server/            # Express 백엔드
│   ├── src/
│   ├── data/
│   ├── coverage/
│   └── node_modules/
├── client/            # 자체 프론트엔드
│   ├── public/
│   └── src/
├── design/            # 디자인 문서
├── docs/             # 문서
├── e2e/              # E2E 테스트 스펙
├── specs/            # 테스트 스펙
│   ├── domain/
│   ├── screens/
│   └── shared/
├── package.json
└── .claude/          # 로컬 메모리
```

## 로컬 메모리
이 프로젝트는 자체 `.claude/memory/`를 사용하여 작업 기록을 유지함.

## 실행 명령어
```bash
cd air-booking
cd server && npm run dev    # 백엔드 실행
cd client && npm run dev    # 프론트엔드 실행
```

## Git 워크플로우
1. 파일 수정 전: `git pull`
2. 파일 수정 후: `git push`
3. 커밋 메시지: **반드시 한국어**

## 주의
air-booking은 자체 `.claude/` 디렉토리와 메모리 시스템을 가짐.