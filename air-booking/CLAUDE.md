# Air-Booking 프로젝트 규칙

## 작업 저장 규칙 (필수)
- 모든 작업은 반드시 **외장형 메모리**(`.claude/memory/`)에 기록할 것
- 작업 완료 후 반드시 **git commit** 할 것
- commit 후 반드시 **GitHub에 push** 할 것
- 순서: 작업 → 메모리 저장 → git add → git commit → git push

## 프로젝트 구조
- `server/` — Express + TypeScript + SQLite 백엔드
- `client/` — 프론트엔드
- 서버 실행: `cd server && npm run dev`
