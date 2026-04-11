# Architecture Decision Records

## ADR-001: MVP 범위 결정
- 일자: 2026-01-30
- 결정: 단일 하나투어 URL → 엑셀 변환으로 시작
- 이유: "한개만 만들고 잘만들어지면 진행" (사용자 요청)
- 상태: 승인됨

## ADR-002: 기술 스택 선정
- 일자: 2026-01-30
- 결정: FastAPI + Playwright + openpyxl
- 이유: 동적 웹페이지 스크래핑에 Playwright 필수, Python 생태계 활용
- 상태: 승인됨
