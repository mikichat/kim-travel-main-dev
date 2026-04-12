# TourWorld Shared (Next-Gen 공통 라이브러리)

## 개요
클라이언트와 서버가 공유하는 TypeScript 타입 정의(DTO)와 비즈니스 로직 유틸리티. API 규격 변경에 따른 휴먼 에러를 원천 차단.

## 기술 스택
- **Language**: TypeScript 5.x
- **Build**: tsc (TypeScript Compiler)

## 구조
```
shared/
├── src/
│   ├── index.ts         # 메인エクスポート
│   ├── types/           # DTO 타입 정의
│   │   ├── tour.ts       # 여행 상품 타입
│   │   ├── schedule.ts  # 일정 타입
│   │   ├── user.ts      # 사용자 타입
│   │   └── index.ts     # 전체 타입エクスポート
│   └── utils/           # 공통 유틸리티
│       ├── validation.ts # 밸리데이션 유틸
│       ├── formatting.ts# 포맷팅 유틸
│       └── index.ts
├── dist/                # 컴파일 출력 (npm 패키지)
└── package.json
```

## 사용법

### 설치 (workspace 의존성)
```json
// client/package.json 또는 server/package.json
{
  "dependencies": {
    "@tourworld/shared": "*"
  }
}
```

### 타입 사용
```typescript
import { Tour, Schedule } from '@tourworld/shared/types';
import { validateEmail } from '@tourworld/shared/utils';
```

## 빌드 명령어
```bash
cd shared
npm run build    # TypeScript 컴파일 → dist/
npm run dev      # Watch 모드
npm run clean    # dist/ 삭제
```

## 패키지エクスポート
```json
{
  "name": "@tourworld/shared",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./types": {
      "import": "./dist/types/index.js",
      "types": "./dist/types/index.d.ts"
    }
  }
}
```

## Git 워크플로우
1. 파일 수정 전: `git pull`
2. 파일 수정 후: `git push`
3. 커밋 메시지: **반드시 한국어**