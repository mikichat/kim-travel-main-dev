# TourWorld Gateway (인증 게이트웨이)

## 개요
Express 기반 인증 게이트웨이. 세션 기반 인증과 SQLite를 사용한 세션 저장소 제공.

## 기술 스택
- **Runtime**: Node.js 18+
- **Framework**: Express 4.x
- **Session Store**: express-session + connect-sqlite3
- **Database**: SQLite3
- **Auth**: bcrypt(password hashing)
- **Proxy**: http-proxy-middleware

## 디렉토리 구조
```
gateway/
├── src/
│   └── index.ts      # 게이트웨이 엔트리
├── package.json
└── tsconfig.json
```

## 환경 변수
```env
PORT=3000
SESSION_SECRET=your-session-secret
```

## 실행 명령어
```bash
cd gateway
npm install
npm run dev      # tsx watch 모드
npm start        # 프로덕션
```

## 주요 기능
- 인증 세션 관리
- 백엔드 서비스への 프록시
- CORS 처리

## Git 워크플로우
1. 파일 수정 전: `git pull`
2. 파일 수정 후: `git push`
3. 커밋 메시지: **반드시 한국어**