# 08-brochure-integration.md — 브로슈어 기반 통합 설계

## 핵심 방향

> **브로슈어 1개 = 안내문 + 일정표의 단일 소스**
> 브로슈어를 잘 만들면 안내문과 일정표가 자동으로 완성된다.

---

## 기존 방식 vs 브로슈어 기반

| 항목 | 기존 (복잡) | 브로슈어 기반 (간편) |
|------|-----------|-------------------|
| 데이터 입력 | 항공편 불러오기 + 수동 입력 | **브로슈어 선택 1번** |
| 일정표 | schedules 그룹 별도 선택 | 브로슈어 itineraryDays에서 자동 |
| 여행지/기간 | 수동 입력 또는 항공편에서 추출 | 브로슈어 destination/period에서 자동 |
| 배경 이미지 | 로컬 업로드 | 브로슈어 mainImage 자동 |
| AI 안내문 | 여행지+날짜 수동 입력 후 생성 | 브로슈어 데이터로 자동 생성 |

---

## 데이터 흐름

```
TourWorld Landing (브로슈어 생성)
    │
    │  Excel/Word/PDF 업로드 → Gemini 자동 파싱
    │  일정 편집, 이미지 설정, 체크리스트 작성
    │
    ▼
브로슈어 1개 완성 (Prisma DB, port 3505)
    │
    │  GET /api/brochures/:id
    │
    ▼
Air Booking 안내문 탭
    │
    ├─ 브로슈어 metadata에서 자동 추출:
    │   ├─ destination → 여행지
    │   ├─ period → 기간/날짜
    │   ├─ itineraryDays → 모바일 일정표
    │   ├─ mainImage → 히어로 배경
    │   ├─ companyInfo → 여행사 정보
    │   ├─ checklistSections → 준비물 (AI 보강)
    │   └─ quotation → 경비 정보
    │
    ├─ Gemini AI 생성 (브로슈어 데이터 기반):
    │   ├─ 날씨/복장 가이드
    │   ├─ 준비물 보강
    │   └─ 환율/시차
    │
    └─ 결과물 (이미지 2장):
        ├─ 안내문 이미지 → 카톡
        └─ 모바일 일정표 이미지 → 카톡
```

---

## Landing API 데이터 구조

### 브로슈어 목록: GET /api/brochures
```json
[
  {
    "id": "67552b60-...",
    "customerName": "축협대의원",
    "destination": "베트남",
    "period": "2026년 04월 19일 ~ 04월 23일",
    "mainImageUrl": "...",
    "metadata": { ... }
  }
]
```

### 브로슈어 상세: GET /api/brochures/:id
```json
{
  "metadata": {
    "mainImage": "data:image/jpeg;base64,...",
    "companyLogo": "data:image/png;base64,...",
    "productName": "익산군산축협 베트남 5일",
    "companyInfo": { "name": "여행세상", "phone": "...", "address": "..." },
    "itineraryDays": [
      {
        "dayNumber": 1,
        "date": "04.19",
        "weekday": "일",
        "regions": "다낭",
        "schedule": [
          { "time": "12:00", "location": "함라", "transport": "리무진", "content": "출발지 집합", "meal": "" },
          { "time": "18:20", "location": "인천", "transport": "KE459", "content": "인천공항 출발", "meal": "" }
        ],
        "meals": { "breakfast": "", "lunch": "", "dinner": "기내식" }
      }
    ],
    "checklistSections": [...],
    "checklistWeather": "...",
    "quotation": { ... }
  }
}
```

---

## 안내문 탭 새 화면 흐름

```
① [브로슈어 불러오기] 버튼
   └→ Landing API에서 브로슈어 목록 로드
   └→ 드롭다운 선택 (예: "축협대의원 | 베트남 | 04.19~04.23")

② 자동 채워짐 (수정 가능)
   ├─ 여행지: 베트남 (destination)
   ├─ 기간: 2026-04-19 ~ 04-23 (period 파싱)
   ├─ 출발편/귀국편: itineraryDays에서 KE459 등 추출
   ├─ 히어로 이미지: mainImage 자동 설정
   ├─ 집합 장소/시간: itineraryDays[0].schedule[0] 참조
   └─ 경비: quotation에서 추출

③ [AI 안내문 생성] → Gemini가 브로슈어 데이터 기반으로 생성
   (날씨/복장/환율은 AI, 일정/준비물은 브로슈어 데이터 우선)

④ 미리보기 (안내문 + 모바일 일정표)
   └─ 일정표는 itineraryDays를 모바일 카드 디자인으로 렌더링

⑤ [안내문 이미지 복사] [일정표 이미지 복사]
   └→ 카톡 전달
```

---

## 모바일 일정표 디자인 (itineraryDays 기반)

### 카드 구조 (네이비+골드 톤)
```
┌─────────────────────────┐
│     ITINERARY            │ ← 네이비 헤더
│   베트남 다낭 5일 일정표   │
│   04/19(일) ~ 04/23(목)   │
├─────────────────────────┤
│                          │
│ (D1) 04/19(일) 다낭       │ ← 날짜 + 지역
│ ┃ 12:00 리무진            │
│ ┃ 출발지 집합              │
│ ┃                        │
│ ┃ 18:20 KE459            │
│ ┃ 인천공항 출발            │
│ ┃                        │
│ ┃ 21:05                  │
│ ┃ 다낭공항 도착            │
│ ┃ 석: 기내식              │
│                          │
│ (D2) 04/20(월) 다낭       │
│ ┃ ...                    │
│                          │
│     여행세상              │ ← 푸터
└─────────────────────────┘
```

### 기존 preview-mobile.html 참조 포인트
- 카드형 레이아웃 (rounded-2xl, shadow-sm)
- DAY 배지 (bg-primary text-white rounded-full)
- 세부 일정은 dot + 들여쓰기
- 숙소/식사는 하단 border-t로 구분
- 다크/라이트 모드 지원 (추후)

---

## 추가 입력 필드 (기존 유지 + 브로슈어 보강)

| 필드 | 소스 | 수정 가능 |
|------|------|----------|
| 여행지 | 브로슈어 destination | O |
| 기간 | 브로슈어 period | O |
| 출발편/귀국편 | itineraryDays에서 항공편 추출 | O |
| 집합 장소 | itineraryDays[0].schedule[0] | O |
| 집합 시간 | itineraryDays[0].schedule[0].time | O |
| 경비 | 브로슈어 quotation | O |
| 공항 미팅자 | 수동 입력 (토글) | O |
| 히어로 이미지 | 브로슈어 mainImage / 로컬 업로드 | O |

---

## 개발 우선순위

1. **브로슈어 목록 불러오기** — Landing API 연동
2. **브로슈어 데이터 → 입력 필드 자동 매핑** — metadata 파싱
3. **모바일 일정표 렌더링** — itineraryDays → 카드 디자인
4. **일정표 이미지 캡처** — html2canvas
5. **기존 항공편 불러오기는 유지** — 브로슈어 없을 때 폴백

---

## 안정성 고려

- Landing 서버(3505) 꺼져 있어도 안내문 기본 기능 동작
- 브로슈어 없이도 수동 입력으로 안내문 생성 가능
- CORS 설정: Landing 서버에서 air-booking 클라이언트 허용 필요
