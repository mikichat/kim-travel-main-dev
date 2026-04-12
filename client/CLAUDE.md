# TourWorld Client (Next-Gen Frontend)

## 개요
차세대 React 18 + Next.js 14 기반 프론트엔드. App Router의 SSR/CSR 혼합架构와 Zustand 상태 관리 사용.

## 기술 스택
- **Framework**: Next.js 16.2.3 (App Router)
- **UI Library**: React 18.3.1
- **State Management**: Zustand 5.x
- **Styling**: Tailwind CSS 3.4
- **Drag & Drop**: @dnd-kit/core, @dnd-kit/sortable
- **Icons**: lucide-react
- **HTTP Client**: axios
- **Testing**: Vitest

## 디렉토리 구조
```
client/
├── app/                    # Next.js App Router pages
│   ├── (air-booking)/      # 항공 예약 라우트 그룹
│   ├── (auth)/             # 인증 라우트 그룹
│   ├── (dashboard)/        # 대시보드 라우트 그룹
│   ├── (group-roster)/     # 단체 명단 라우트 그룹
│   └── (legacy)/           # 레거시 페이지 라우트 그룹
├── components/             # React 컴포넌트
├── stores/                # Zustand 스토어
├── hooks/                 # 커스텀 React Hooks
├── utils/                 # 유틸리티 함수
├── types/                 # TypeScript 타입 정의
└── public/                # 정적 리소스
```

## 환경 변수
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 실행 명령어
```bash
cd client
npm install
npm run dev        # 개발 서버 (포트 3000)
npm run build      # 프로덕션 빌드
npm run lint       # 린트 체크
npm test           # 테스트 실행
```

## 공유 타입 사용
`@tourworld/shared` 패키지를 통해 서버와 타입을 공유:
```typescript
import { Tour, Schedule } from '@tourworld/shared/types';
```

## Git 워크플로우
1. 파일 수정 전: `git pull`
2. 파일 수정 후: `git push`
3. 커밋 메시지: **반드시 한국어**

## 현재 상태
- Next-Gen 아키텍처 구축 중
- Phase 3 (Next-Gen 전환) 진행 중