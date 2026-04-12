# Group Roster (단체 명단 관리)

## 개요
React + Vite + TypeScript 기반 단체 명단 관리 시스템. 엑셀 파일 Import/Export 기능과 Zustand 상태 관리 사용.

## 기술 스택
- **Framework**: React 19.2.4
- **Build Tool**: Vite 8.x
- **Language**: TypeScript 5.9.x
- **State Management**: Zustand 5.x
- **Excel**: xlsx (SheetJS)
- **Notifications**: react-hot-toast
- **Testing**: Vitest + Testing Library

## 디렉토리 구조
```
group-roster/
├── src/
│   ├── components/     # React 컴포넌트
│   ├── stores/         # Zustand 스토어
│   ├── hooks/          # 커스텀 Hooks
│   ├── utils/          # 유틸리티
│   ├── types/          # TypeScript 타입
│   ├── App.tsx         # 메인 앱
│   └── main.tsx        # 엔트리 포인트
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── eslint.config.js
```

## 실행 명령어
```bash
cd group-roster
npm install
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run lint     # 린트 체크
npm test         # 테스트
```

## 주요 기능
- 단체 명단 CRUD
- 엑셀 파일 Import/Export
- 상태 관리 (Zustand)

## Git 워크플로우
1. 파일 수정 전: `git pull`
2. 파일 수정 후: `git push`
3. 커밋 메시지: **반드시 한국어**