# TWAIB (TravelWorld AI-Landing Builder) — PRD

## 프로젝트 개요

**목표**: 여행 지역과 날짜 입력 시 AI가 자동으로 안내 컨텐츠(날씨, 복장, 준비물, 환율 등)를 생성하고, 웹 랜딩 페이지로 렌더링한 후 이미지로 캡처하여 카톡으로 전달하는 자동화 시스템

**현황 문제**:
- 매 여행마다 안내 컨텐츠(공지사항) 수동 작성: 30분~1시간/건
- 월 10건 이상 → 연간 60~120시간 소요
- 기존 Notices 컴포넌트는 텍스트 입력만 지원 (템플릿 없음)
- 고객 문의: 날씨? 뭘 입혀야 돼? 환율은? → 매번 반복 대답

**목표 달성**:
- 안내문 생성 시간 5분 이내 (90% 단축)
- 고객 자동 안내로 문의 30% 감소
- 전문 디자인 이미지로 브랜드 신뢰도 상승
- 관리자 부담 경감

---

## 타겟 사용자

### 1. 생성자 (관리자)
- **역할**: 여행사 대표, 직원
- **현황**: 1인 (추후 다중 사용자)
- **숙련도**: 기본 사무 능력, PC 작업 가능

### 2. 수신자 (고객)
- **연령대**: 40대 이상 중심 (70대까지)
- **수신 방법**: 카톡 이미지
- **특성**: 큰 글씨, 높은 대비, 버튼 최소화 선호
- **기기**: 모바일, 태블릿 (카톡 기본)

---

## 핵심 가치 제안

| 항목 | 기존 (수동) | TWAIB (AI) |
|------|-----------|-----------|
| 제작 시간 | 30분~1시간 | 5분 |
| 일관성 | 저 (개인 편차) | 높음 (AI 템플릿) |
| 고객 문의 | 높음 | 낮음 (사전 안내) |
| 이미지 품질 | 한정적 | 전문적 |
| 다국어 지원 | 수동 번역 | Gemini로 자동 |

---

## 주요 기능 (우선순위)

### Phase 0: 필수 기능 (MVP)
1. **AI 안내문 생성** (P0-T1)
   - 여행지 + 날짜 입력 → Google Gemini API 호출
   - 결과: 날씨, 복장, 준비물, 환율 자동 생성
   - 환각 방지: 검증된 정보만, "확실하지 않은 정보는 생략" 프롬프트

2. **항공편 불러오기** (P0-T2)
   - air-booking의 flight_schedules 팝업
   - 선택 후 출발지, 출발시간, 비용 자동 채움

3. **이미지 캡처 & 복사** (P0-T3)
   - html2canvas로 미리보기 이미지 생성
   - 클립보드 복사 → 카톡 바로 붙여넣기

### Phase 1: 편의 기능
4. **인라인 편집** (P1-T1)
   - AI 생성 결과를 미리보기에서 직접 클릭 → 수정 모달
   - 실시간 미리보기 반영

5. **섹션 토글** (P1-T2)
   - 날씨/준비물/환율/수하물/커스텀 공지 On/Off
   - 필요 섹션만 표시

6. **저장 & 재사용** (P1-T3)
   - DB 저장: travel_guides 테이블
   - 이전 안내문 불러오기 (복붙 대신 재활용)

7. **모바일 일정표** (P1-T4)
   - tourworld1 schedules API → 항공편+버스 일정표
   - 모바일 최적화 테이블 렌더링

### Phase 2: 고도화
8. **배경 이미지 자동 설정** (P2-T1)
   - Unsplash API → 여행지 관련 이미지 자동 매칭
   - 우아한 히어로 섹션

9. **커스텀 공지사항** (P2-T2)
   - 여행사 브랜드별 고유 공지 섹션 추가
   - (예: "선물 추천", "현지 카드 정보" 등)

---

## 화면 구조

**위치**: air-booking 변환기의 "안내문" 탭
- PnrConverter.tsx의 4번째 탭
- 기존 Notices 컴포넌트 교체

```
┌─────────────────────────────────────┐
│ [변환기] [저장된항공편] [버스예약] [안내문] ◄─── 새 탭
└─────────────────────────────────────┘

[안내문] 탭 내용:
┌─────────────────────────────────────┐
│ 입력 영역                             │
│  - [항공편 불러오기] 버튼             │
│  - 여행지: _____ 기간: ____ ~ ____   │
│  - 항공편: (자동 채움)                │
│  - 출발지: _____ 출발시간: _____      │
│  - 경비: _____ 원/인                  │
│  - [x] 날씨  [x] 복장  [x] 준비물    │
│  - [x] 환율  [x] 수하물              │
│                                     │
│ [AI 안내문 생성] 버튼 (진행바)        │
├─────────────────────────────────────┤
│ 미리보기 (인라인 편집 가능)            │
│  ┌─────────────────────────────────┐ │
│  │ [배경] 필리핀 5일 여행 🌴        │ │
│  │                                   │ │
│  │ 안내 사항                         │ │
│  │ 필리핀은 따뜻하고...              │ │
│  │ [수정]                            │ │
│  │                                   │ │
│  │ 날씨 (12월)                       │ │
│  │ 평균: 28°C, 습도: 75%           │ │
│  │ 복장: 반팔, 선글라스...           │ │
│  │ [수정]                            │ │
│  │                                   │ │
│  │ 준비물 필수 (2단계)               │ │
│  │ ✓ 여권 ✓ 예방접종...             │ │
│  │ [수정]                            │ │
│  │                                   │ │
│  │ 환율 (기준: 3월)                  │ │
│  │ 1필리핀 페소 ≈ 24원               │ │
│  │ [수정]                            │ │
│  │                                   │ │
│  │ 푸터 (여행사 로고)                │ │
│  └─────────────────────────────────┘ │
│                                     │
│ [안내문 이미지 복사] [일정표 이미지 복사] │
│ [저장] [저장된 안내문 목록]           │
│                                     │
│ 일정표 (모바일 렌더링)                │
│ 날짜 | 항공편 | 도시 | 버스           │
├─────────────────────────────────────┤
└─────────────────────────────────────┘
```

---

## 기술 스택

| 계층 | 기술 | 용도 |
|------|------|------|
| Frontend | React + TypeScript + TailwindCSS | 기존 air-booking 통합 |
| 이미지 캡처 | html2canvas | 미리보기 → 이미지 |
| 클립보드 | Web Clipboard API | 클립보드 복사 |
| Backend | Express + TypeScript | 기존 air-booking API 확장 |
| Database | SQLite (air-booking.db) | travel_guides 테이블 |
| AI | Google Gemini API (@google/generative-ai) | 안내문 생성 |
| 배경 이미지 | Unsplash API (선택사항) | 히어로 섹션 |
| 일정표 | tourworld1 API + React | 모바일 최적화 렌더링 |

---

## 데이터 모델

### travel_guides 테이블
```sql
CREATE TABLE travel_guides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,                -- "필리핀 5일 여행"
  destination TEXT NOT NULL,          -- "필리핀"
  start_date TEXT NOT NULL,           -- "2024-12-18" (ISO 8601)
  end_date TEXT NOT NULL,             -- "2024-12-22"
  flight_schedule_id INTEGER,         -- FK → flight_schedules.id
  departure_place TEXT,               -- "함열스포츠센터"
  departure_time TEXT,                -- "02:00"
  cost_per_person INTEGER,            -- 2380000 (원)
  sections_config TEXT,               -- JSON: {"weather": true, "checklist": true, ...}
  ai_content TEXT,                    -- JSON: Gemini 생성 결과
  custom_content TEXT,                -- JSON: 관리자 수정 내용
  background_url TEXT,                -- 히어로 배경 이미지 URL (선택)
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime')),
  created_by TEXT,                    -- 사용자 ID (추후 다중 사용자)
  is_archived INTEGER DEFAULT 0       -- 0: 활성, 1: 보관됨
);
```

---

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/travel-guides/generate` | Gemini AI로 안내문 생성 (저장 안 함) |
| POST | `/api/travel-guides` | 안내문 저장 |
| GET | `/api/travel-guides` | 저장된 안내문 목록 (페이지네이션) |
| GET | `/api/travel-guides/:id` | 안내문 상세 조회 |
| PUT | `/api/travel-guides/:id` | 안내문 수정 (AI 결과 또는 커스텀) |
| DELETE | `/api/travel-guides/:id` | 안내문 삭제 (soft delete: is_archived) |
| GET | `/api/flight-schedules` | 항공편 불러오기 (기존) |
| GET | `/api/flight-schedules/:id` | 항공편 상세 (기존) |

---

## 설계 원칙

### 1. AI 환각 방지 (Critical)
- **날씨**: 해당 월 평균 기온 범위만 (실시간 예보 X)
- **준비물**: 검증된 고정 목록에서 지역 특성에 맞게 선택 (창작 X)
- **환율**: "대략적 환산" 명시, 달러 기준치만 제공
- **프롬프트**: "확실하지 않은 정보는 생략하라"
- **최종 승인**: 관리자 반드시 확인/수정 후 전송 (자동 전송 절대 금지)

### 2. 간결성 (토너스)
- 각 섹션 3~5줄 이내
- 핵심 정보만 (장황한 설명 금지)
- 쉬운 표현, 짧은 문장
- 불릿 포인트 활용

### 3. 디자인 원칙 (타겟: 40대+)
- **컬러**: 아이보리 배경(#FAFAF5) + 네이비(#1B3A5C)/골드(#C8A45E)
- **글씨**: 본문 16px+, 제목 24px+, 높은 대비
- **여백**: 넉넉한 마진/패딩
- **아이콘**: No-Icon, 텍스트 중심
- **톤**: 고급스럽고 따뜻함
- **모바일**: 카톡 축소 시에도 가독성 유지

### 4. 통합 원칙
- air-booking 기존 코드 최대 활용 (중복 최소)
- PnrConverter.tsx의 4번째 탭으로 자연스럽게 통합
- flight_schedules 팝업 재사용
- html2canvas 패턴 따름
- 서버 코드는 express 기존 패턴 따름

### 5. 배포 전략
- **현재 (Phase 0-1)**: HTML → html2canvas → 클립보드 → 카톡
- **추후 (Phase 2)**: 도메인 연결 → 웹 링크 공유 + 체크리스트 인터랙션

---

## 제약 조건

- **개발 체계**: 1인 개발 (현재), 추후 다중 사용자 대비
- **통합 방식**: 별도 앱 X, air-booking 내부 탭
- **의존성**: tourworld1 서버 (일정표만), Gemini API 키는 .env
- **데이터**: air-booking.db 통합 사용 (별도 DB 없음)
- **카톡 연동**: 수동 (API 없음, 복사 → 붙여넣기)

---

## 성공 메트릭

| 지표 | 목표 |
|------|------|
| 안내문 생성 시간 | 5분 이내 |
| 고객 문의 감소율 | 30% |
| 이미지 클립보드 복사 성공률 | 95%+ |
| 관리자 만족도 | 4.5/5 |
| AI 수정 필요율 | 30% 이하 |

---

## 일정

| Phase | 기간 | 결과물 |
|-------|------|--------|
| Phase 0 (계약/테스트) | 1주 | DB 스키마, API 명세, 테스트 설계 |
| Phase 1 (MVP) | 2주 | AI 생성 + 이미지 캡처 + 저장 |
| Phase 2 (고도화) | 1주 | 배경 이미지 + 커스텀 공지 |

---

## 참고 자료

- air-booking/client/src/pages/PnrConverter.tsx — 탭 통합 패턴
- air-booking/server/src/routes/flight-schedules.ts — API 패턴
- /projects/main/backend/routes/upload.js — Gemini 연동 참조
- /projects/main/landing.html — 일정표 렌더링 참조
