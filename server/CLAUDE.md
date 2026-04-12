# TourWorld Server (Next-Gen Backend)

## 개요
차세대 Express + Prisma + SQLite 백엔드. JWT 인증과 Zod 밸리데이션 사용.

## 기술 스택
- **Runtime**: Node.js 18+
- **Framework**: Express 4.x
- **ORM**: Prisma 6.x
- **Database**: SQLite (Prisma)
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Zod
- **Testing**: Vitest + Supertest
- **Logging**: Winston

## 의존성
```json
{
  "@prisma/client": "^6.2.1",
  "express": "^4.21.2",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^3.0.3",
  "cors": "^2.8.5",
  "helmet": "^8.0.0",
  "zod": "^3.24.1",
  "@tourworld/shared": "*"
}
```

## 디렉토리 구조
```
server/
├── src/
│   ├── index.ts          # 앱 엔트리 포인트
│   ├── routes/          # API 라우트
│   ├── controllers/     # 요청 핸들러
│   ├── services/        # 비즈니스 로직
│   ├── middleware/      # 미들웨어
│   └── utils/           # 유틸리티
├── prisma/
│   ├── schema.prisma    # DB 스키마
│   └── seed.ts          # 초기 데이터
└── dist/                # 컴파일 출력
```

## 환경 변수 (.env)
```env
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

## 실행 명령어
```bash
cd server
npm install
npm run dev              # 개발 서버 (ts-node-dev)
npm run build            # TypeScript 컴파일
npm start               # 프로덕션 실행
npx prisma studio       # DB GUI 도구
npm run db:generate      # Prisma 클라이언트 생성
npm run db:push          # 스키마 DB 반영
npm run db:migrate       # 마이그레이션 실행
npm run db:seed          # 초기 데이터 삽입
npm test                 # 테스트 실행
```

## API 문서
- Swagger: `http://localhost:3001/api-docs` (설정 시)

## 공유 타입 사용
`@tourworld/shared` 패키지를 통해 클라이언트와 타입을 공유

## Git 워크플로우
1. 파일 수정 전: `git pull`
2. 파일 수정 후: `git push`
3. 커밋 메시지: **반드시 한국어**

## 현재 상태
- Next-Gen 아키텍처 구축 중
- Phase 3 (Next-Gen 전환) 진행 중