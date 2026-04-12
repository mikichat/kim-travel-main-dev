## 사용 언어

**반드시 한국어로 응답**

## Git 워크플로우

1. 파일 수정 전: `git pull` 실행
2. 파일 수정 후: `git push` 실행
3. 커밋 메시지: **반드시 한국어**로 작성

## 저장 방식

db sqlite3

### **Next-Gen 아키텍처 (차세대 모던 스택)**

기존의 안정적인 바닐라 스택을 넘어, 대규모 확장성과 유지보수성을 극대화하기 위해 설계된 차세대 아키텍처입니다.

- **Gateway (포트 8080)**: 통합 진입점. 세션/JWT 인증 및 서비스별 프록시 라우팅
  - `/api/sales/*` → Current Stable (포트 5000)
  - `/api/*` → Next-Gen Server (포트 3001)
- **Frontend (Next.js 16 + React 18)**: App Router 기반의 SSR/CSR 혼합架构와 **Zustand** 상태 관리. **Tailwind CSS** 디자인 시스템.
- **Backend (Express + Prisma + SQLite)**: **Prisma ORM**과 **SQLite**를 통해 파일 기반의轻型 데이터베이스로 간단한 배포와 높은 이식성을 제공합니다.
- **Shared Workspace**: `shared` 폴더를 통해 클라이언트와 서버가 동일한 **TypeScript 타입 정의(DTO)**와 비즈니스 로직 유틸리티를 공유함으로써, API 규격 변경에 따른 휴먼 에러를 원천 차단합니다.
- **Full TypeScript**: 전 계층에 걸쳐 엄격한 타입을 적용하여 개발 단계에서 오류를 탐지하고 코드 자가 문서화를 실현합니다.

**최종 요청 흐름:**
```
Client (3000) → Gateway (8080) → /api/* → Next-Gen Server (3001)
```
