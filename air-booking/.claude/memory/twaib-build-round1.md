# TWAIB Build Round 1 완료

## 구현된 기능

### P0 (MVP)
1. **서버: travel_guides 테이블 + CRUD API + Gemini 생성 API**
   - `server/src/services/travel-guides.service.ts` — DB 테이블 자동 생성, CRUD, Gemini 프롬프트
   - `server/src/routes/travel-guides.ts` — REST API (GET/POST/PUT/DELETE + POST /generate)
   - `server/src/index.ts` — 라우트 등록 완료
   - `@google/generative-ai` 패키지 설치, .env에 GEMINI_API_KEY 플레이스홀더 추가

2. **클라이언트: TravelGuide 컴포넌트**
   - `client/src/pages/TravelGuide.tsx` — PnrConverter 4번째 탭 교체 (Notices -> TravelGuide)
   - 입력: 여행지, 시작일, 종료일, 출발장소, 출발시간, 경비, 항공편
   - 항공편 불러오기 모달 -> flight_schedules API -> 선택 -> 자동 채움
   - AI 안내문 생성 -> Gemini API 호출 -> 미리보기

3. **안내문 랜딩 페이지 디자인**
   - 40대+ 친화 디자인 (아이보리 #FAFAF5 + 네이비 #1B3A5C + 골드 #C8A45E)
   - 히어로 / 안내사항 / 날씨복장 / 준비물 / 환율시차 / 수하물경비 / 여행세상 푸터
   - max-w 448px 모바일 기준

4. **이미지 캡처 & 클립보드 복사**
   - html2canvas -> PNG -> clipboard.write (실패 시 다운로드 폴백)

### P1 (편의 기능)
5. **인라인 편집** — contentEditable로 텍스트 클릭 -> 편집 가능
6. **섹션 토글** — 날씨/준비물/환율/수하물 체크박스 On/Off
7. **저장 & 불러오기** — DB 저장, 목록 모달에서 불러오기/삭제

### 미구현
8. **모바일 일정표** — tourworld1 backend schedules API 연동 (별도 구현 필요)

## 주의사항
- GEMINI_API_KEY를 .env에 실제 키 입력 필요
- Notices.tsx는 삭제하지 않고 import만 변경
