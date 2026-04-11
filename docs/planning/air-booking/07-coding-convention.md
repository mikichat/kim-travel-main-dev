# 항공 예약 관리 시스템 코딩 컨벤션

## 1. 파일 구조

```
air-booking/
├── client/
│   ├── src/
│   │   ├── components/        # 재사용 컴포넌트
│   │   │   ├── common/        # Button, Input, Modal, Toast
│   │   │   ├── layout/        # Sidebar, Header
│   │   │   └── booking/       # BookingTable, BookingRow, PnrInput
│   │   ├── pages/             # 페이지 컴포넌트
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Bookings.tsx
│   │   │   ├── Calendar.tsx
│   │   │   ├── Settlements.tsx
│   │   │   ├── Customers.tsx
│   │   │   ├── Vendors.tsx
│   │   │   └── Settings.tsx
│   │   ├── services/          # API 호출
│   │   ├── hooks/             # 커스텀 훅
│   │   ├── types/             # TypeScript 타입
│   │   ├── utils/             # 유틸리티 함수
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── index.html
│   └── vite.config.ts
├── server/
│   ├── src/
│   │   ├── routes/            # API 라우트
│   │   ├── services/          # 비즈니스 로직
│   │   ├── middleware/        # 인증, 에러 핸들러
│   │   ├── utils/             # PNR 파서, 알림
│   │   └── index.ts
│   ├── air-booking.db         # SQLite DB
│   └── tsconfig.json
└── package.json
```

## 2. 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `BookingTable`, `PnrInput` |
| 파일 (컴포넌트) | PascalCase.tsx | `BookingTable.tsx` |
| 파일 (유틸) | camelCase.ts | `pnrParser.ts` |
| 변수 | camelCase | `bookingList`, `nmtlDate` |
| 상수 | UPPER_SNAKE_CASE | `MAX_PNR_LENGTH`, `ALERT_HOURS` |
| API 라우트 | kebab-case | `/api/bookings`, `/api/bsp-dates` |
| DB 테이블 | snake_case | `bookings`, `bsp_dates` |
| CSS Module | camelCase | `styles.bookingRow` |

## 3. TypeScript 규칙

- `strict: true` 활성화
- `any` 사용 금지 (불가피한 경우 주석으로 이유 명시)
- 인터페이스 > 타입 별칭 (확장성)
- API 응답 타입은 `types/` 폴더에 정의

## 4. API 규칙

| 메서드 | 용도 | 예시 |
|--------|------|------|
| GET | 조회 | `GET /api/bookings` |
| POST | 생성 | `POST /api/bookings` |
| PATCH | 수정 | `PATCH /api/bookings/:id` |
| DELETE | 삭제 | `DELETE /api/bookings/:id` |

- 응답 형식: `{ success: boolean, data?: T, error?: string }`
- 에러 코드: HTTP 표준 (400, 401, 404, 500)

## 5. Git 커밋 메시지

```
feat: 새 기능 추가
fix: 버그 수정
docs: 문서 수정
refactor: 리팩토링
style: 코드 포맷팅
test: 테스트 추가
chore: 빌드, 설정 변경
```

## 6. Lint / Formatter

- **ESLint**: `@typescript-eslint/recommended`
- **Prettier**: `printWidth: 100, singleQuote: true, semi: true`
