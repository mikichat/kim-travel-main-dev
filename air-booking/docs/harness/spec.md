# EstimateEditor React 전환 사양

## 목표
3개 standalone HTML 에디터(estimate-editor.html, domestic-editor.html, delivery-claim-editor.html)를
하나의 React 컴포넌트(EstimateEditor.tsx)로 통합 전환.

## 현재 상태
- EstimateEditor.tsx가 3탭으로 각각 iframe을 로드
- 각 HTML 파일은 독립적인 JS로 /api/estimates API 호출
- DB 저장/불러오기 동작 중

## 전환 범위
기존 iframe 방식을 유지하되, **React 래퍼를 강화**하여:
1. 문서 목록 사이드바 추가 (DB 저장된 문서 목록)
2. 문서 상태(draft/sent/confirmed) 관리 UI
3. 인쇄 미리보기 버튼
4. 신규 문서 생성 버튼

## 기술 결정
- HTML 에디터 자체는 iframe 유지 (6,218줄 전환은 리스크 큼)
- React 래퍼에서 문서 관리(CRUD) 기능을 추가
- iframe ↔ React 간 postMessage 통신

## API
- GET /api/estimates?doc_type={type} — 문서 목록
- GET /api/estimates/:id — 문서 조회
- POST /api/estimates — 문서 생성
- PATCH /api/estimates/:id — 문서 수정
- DELETE /api/estimates/:id — 문서 삭제

## 라우트
- /estimate-editor (3탭 통합, 인증 불필요)
