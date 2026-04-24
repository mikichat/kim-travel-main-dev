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
- **Frontend (Next.js 16 + React 18)**: App Router 기반의 SSR/CSR 혼합 아키텍처와 **Zustand** 상태 관리. **Tailwind CSS** 디자인 시스템.
- **Backend (Express + Prisma + SQLite)**: **Prisma ORM**과 **SQLite**를 통해 파일 기반의 경량 데이터베이스로 간단한 배포와 높은 이식성을 제공합니다.
- **Shared Workspace**: `shared` 폴더를 통해 클라이언트와 서버가 동일한 **TypeScript 타입 정의(DTO)**와 비즈니스 로직 유틸리티를 공유함으로써, API 규격 변경에 따른 휴먼 에러를 원천 차단합니다.
- **Full TypeScript**: 전 계층에 걸쳐 엄격한 타입을 적용하여 개발 단계에서 오류를 탐지하고 코드 자가 문서화를 실현합니다.

**최종 요청 흐름:**
```
Client (3000) → Gateway (8080) → /api/* → Next-Gen Server (3001)
```

## graphify

이 프로젝트에는 graphify 기반 지식 그래프가 graphify-out/ 디렉터리에 있습니다.

규칙:
- 아키텍처나 코드베이스 질문에 답변하기 전에 graphify-out/GRAPH_REPORT.md를 읽고 주요 노드와 커뮤니티 구조를 확인하세요.
- graphify-out/wiki/index.md가 있으면 원본 파일 대신 위키를 탐색하세요.
- 이 세션에서 코드 파일을 수정한 후 `graphify update .`를 실행하여 그래프를 최신 상태로 유지하세요 (AST 전용, API 비용 없음).

## Skill 라우팅

사용자의 요청이 사용 가능한 skill과 일치하면, 항상 첫 번째 동작으로 Skill 도구를 사용하여 호출하세요. 직접 답변하지 말고, 다른 도구를 먼저 사용하지 마세요.
Skill은 특정 워크플로우를 제공하여 임시 답변보다 더 나은 결과를 생성합니다.

주요 라우팅 규칙:
- 제품 아이디어, "이것을 만드는 것이值得한가", 브레인스토밍 → office-hours 호출
- 버그, 오류, "왜 이것이 고장났는지", 500 오류 → investigate 호출
- Ship, 배포, 푸시, PR 생성 → ship 호출
- QA, 사이트 테스트, 버그 찾기 → qa 호출
- 코드 리뷰, diff 확인 → review 호출
- 배송 후 문서 업데이트 → document-release 호출
- 주간 회고 → retro 호출
- 디자인 시스템, 브랜드 → design-consultation 호출
- 비주얼 감사, 디자인 다듬기 → design-review 호출
- 아키텍처 리뷰 → plan-eng-review 호출
- 진행 상황 저장, 체크포인트, 재개 → checkpoint 호출
- 코드 품질, 상태 확인 → health 호출
