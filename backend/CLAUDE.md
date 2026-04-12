# TourWorld Backend (Current Production)

## 개요
현재 운영 중인 Express + SQLite 기반 백엔드 시스템. 고품질 테스트 커버리지(99%+)와 보안 체계가 적용되어 있음.

## 기술 스택
- **Runtime**: Node.js 18+
- **Framework**: Express 4.x
- **Database**: SQLite3 (파일 기반)
- **Authentication**: Session-based (express-session + connect-sqlite3)
- **Logging**: Winston (파일/콘솔 로깅)
- **Security**: Helmet, Rate Limiting
- **Testing**: Jest + Supertest

## 주요 의존성
```
express, helmet, cors, bcryptjs, sqlite3, winston,
swagger-jsdoc, swagger-ui-express, xlsx, mammoth,
puppeteer-core, multer, nodemailer, uuid
```

## 디렉토리 구조
```
backend/
├── server.js          # 앱 엔트리 포인트 (Graceful Shutdown)
├── database.js        # SQLite 인메모리 관리 및 인덱스 최적화
├── middleware/        # 보안 미들웨어 (Rate Limiting, CORS 등)
├── routes/            # 도메인별 라우터 (auth, schedules, upload, sync)
├── services/          # 외부 연동 (알림톡, 메일, Gemini AI)
├── __tests__/         # Integration 테스트 (99% 커버리지)
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   └── setup/
├── migrations/        # DB 마이그레이션
├── db/               # SQLite 데이터 파일
└── data/             # 백업 및 임시 데이터
```

## API 문서
- Swagger UI: `http://localhost:3000/api-docs`

## 실행 명령어
```bash
cd backend
npm install
npm run dev          # 개발모드 (nodemon)
npm start            # 프로덕션 모드
PORT=5001 npm start  # 포트 지정
npm test             # 테스트 실행
npm run test:coverage # 커버리지 리포트
```

## Git 워크플로우
1. 파일 수정 전: `git pull`
2. 파일 수정 후: `git push`
3. 커밋 메시지: **반드시 한국어**

## 현재 상태
- Phase 60+ 리팩터링 완료
- 분기 커버리지 > 88%, 구문 커버리지 > 98.8%
- Production 준비 완료