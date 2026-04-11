# TWAIB Spec — AI 여행 안내 랜딩 페이지 자동 생성

## 목표
여행지+날짜 입력 → Gemini AI가 안내 콘텐츠 자동 생성 → 고급 랜딩 페이지 렌더링 → 이미지 캡처 → 카톡 전달

## 위치
air-booking 변환기(PnrConverter.tsx)의 4번째 "안내문" 탭. 기존 Notices 컴포넌트 교체.

## 핵심 흐름
1. [항공편 불러오기] → flight_schedules 모달 → 선택 → 자동 채움
2. 출발 장소/시간, 경비 직접 입력
3. 섹션 토글 (날씨/준비물/환율/수하물)
4. [AI 안내문 생성] → Gemini API → 미리보기
5. 인라인 편집 (클릭 → 수정)
6. [이미지 복사] → html2canvas → 클립보드 → 카톡

## 디자인
- 타겟: 40대+ 고객
- 컬러: 아이보리(#FAFAF5) + 네이비(#1B3A5C) + 골드(#C8A45E)
- 큰 글씨 (본문 16px+, 제목 24px+), 높은 대비
- No-Icon 텍스트 중심, 넉넉한 여백
- 히어로 → 안내사항 카드 → 날씨 카드 → 준비물 카드 → 환율 카드 → 푸터

## API
- POST /api/travel-guides/generate — Gemini AI 생성
- GET/POST/PUT/DELETE /api/travel-guides — CRUD
- GET /api/flight-schedules — 항공편 목록 (기존)

## DB
travel_guides 테이블 (SQLite):
- id, title, destination, start_date, end_date, days_count
- flight_schedule_id, departure_airport, arrival_airport
- departure_place, departure_time, cost_per_person
- sections_config (JSON), ai_content (JSON), custom_content (JSON)
- background_url, created_at, updated_at

## AI 프롬프트 핵심 룰
- 환각 방지: 불확실하면 생략, 범위만 제공
- 간결: 섹션당 3~5줄
- 톤: 따뜻하고 전문적, 40대+ 대상
- 출력: JSON (weather, outfit, checklist, currency)

## 기존 코드 참조
- PnrConverter.tsx — 탭 구조, html2canvas 패턴
- flight-schedules.ts — 항공편 API
- tourworld1/backend/routes/upload.js — Gemini 연동 패턴
- landing.html — 일정표 테이블

## 기술 스택
React + TypeScript + TailwindCSS + Express + SQLite + Gemini API + html2canvas

## Gemini API 설정
- 패키지: @google/generative-ai
- 모델: gemini-2.0-flash (또는 최신 flash)
- API 키: .env의 GEMINI_API_KEY
