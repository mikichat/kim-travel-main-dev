# 시스템 통합 및 개선 로드맵

> 작성일: 2026-03-16
> 작성자: 김국진 + Claude
> 상태: 기획 (검토 중)

---

## 1. 현재 시스템 구조

```
┌─────────────────────────────────────────────────────────────┐
│                         현재 상태                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  MAIN (포트 5000)                                           │
│  ├── backend/     ← Express + SQLite (travel_agency.db)     │
│  ├── client/      ← 프론트엔드                              │
│  └── 역할: 여행상품 관리, 고객 관리, 매출                     │
│                                                             │
│  AIR-BOOKING (포트 5510)                                    │
│  ├── server/      ← Express + SQLite (travel_agency.db 공유)│
│  ├── client/      ← React + Vite                            │
│  └── 역할: 항공 예약장부, 발권, 티켓, 인보이스                │
│                                                             │
│  TOURWORLD1/LANDING (포트 5505)                             │
│  ├── server/      ← Express + Prisma + SQLite               │
│  ├── client/      ← React + Vite                            │
│  └── 역할: 여행 브로슈어, 일정표, 호텔, PDF 생성             │
│                                                             │
│  문제점:                                                    │
│  ❌ 서버 3개 따로 실행                                       │
│  ❌ 로그인이 각각 따로                                       │
│  ❌ 직원별 접근 권한 없음                                    │
│  ❌ UI 이동이 불편 (각각 다른 URL)                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 목표 구조: 통합 시스템

```
┌─────────────────────────────────────────────────────────────┐
│                       목표 상태                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  통합 프론트엔드 (1개)                                       │
│  ├── / (대시보드) ← 전체 현황                                │
│  ├── /sales       ← MAIN 기능 (여행상품/고객/매출)           │
│  ├── /air         ← AIR-BOOKING 기능 (예약/발권/인보이스)    │
│  ├── /brochure    ← LANDING 기능 (브로슈어/일정/PDF)         │
│  └── /admin       ← 관리자 (권한/설정)                       │
│                                                             │
│  통합 백엔드 (1개 또는 API Gateway)                          │
│  ├── /api/sales/* ← MAIN API                                │
│  ├── /api/air/*   ← AIR-BOOKING API                         │
│  ├── /api/doc/*   ← LANDING API                             │
│  └── /api/auth/*  ← 통합 인증                                │
│                                                             │
│  공유 DB: travel_agency.db (기존 유지)                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 통합 방식 2가지 (선택)

| 방식 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **A. API Gateway** | nginx로 URL별 라우팅, 백엔드는 그대로 | 기존 코드 변경 최소 | 서버 3개 유지 |
| **B. 완전 통합** | 백엔드 1개로 합치기 | 서버 1개, 관리 편함 | 대규모 작업 |

**권장: A 방식 (API Gateway)** — 기존 코드 건드리지 않고 nginx로 통합

```
nginx (포트 80)
  ├── /api/sales/*  → localhost:5000 (MAIN)
  ├── /api/air/*    → localhost:5510 (AIR-BOOKING)
  ├── /api/doc/*    → localhost:5505 (LANDING)
  └── /*            → 통합 프론트엔드 (새로 만듬)
```

---

## 3. 직원 권한 시스템

### 역할 정의

| 역할 | MAIN | AIR-BOOKING | LANDING | 관리 |
|------|------|-------------|---------|------|
| **admin** (국진님) | 전체 | 전체 | 전체 | 설정/권한 |
| **staff** (직원) | 조회 | 예약조회 | 브로슈어 조회 | - |
| **air_staff** (항공 담당) | 조회 | 전체 | - | - |
| **doc_staff** (문서 담당) | 조회 | - | 전체 | - |

### 구현 방법

```
users 테이블에 role + permissions 추가:

users
├── id
├── email
├── name
├── role: 'admin' | 'staff' | 'air_staff' | 'doc_staff'
├── permissions: JSON
│   ├── main: ['read'] 또는 ['read', 'write', 'delete']
│   ├── air: ['read', 'write']
│   └── landing: ['read']
└── created_at
```

### 통합 로그인 화면

```
┌───────────────────────────────────────┐
│         여행세상 업무 시스템            │
│                                       │
│  이메일: [________________]           │
│  비밀번호: [________________]          │
│                                       │
│         [로그인]                       │
│                                       │
│  로그인 후 권한에 따라 메뉴 표시       │
│  ├── admin → 모든 메뉴                │
│  ├── air_staff → 항공 + 조회          │
│  └── doc_staff → 문서 + 조회          │
│                                       │
└───────────────────────────────────────┘
```

---

## 4. Git Worktree 구조

### 현재
```
C:/Users/kgj12/Root/main/          ← 모든 프로젝트가 한 곳에
```

### 개선 (워크트리 분리)

```
C:/Users/kgj12/Root/
├── main/                          ← 메인 브랜치 (안정)
├── dev-air/                       ← air-booking 개발용 워크트리
├── dev-landing/                   ← landing 개발용 워크트리
├── dev-integration/               ← 통합 작업 워크트리
└── deploy/                        ← 배포용 (깨끗한 상태)
```

### 워크트리 생성 명령

```bash
cd C:/Users/kgj12/Root/main

# air-booking 개발용
git worktree add ../dev-air feature/air-booking

# landing 개발용
git worktree add ../dev-landing feature/landing

# 통합 작업용
git worktree add ../dev-integration feature/integration

# 배포용 (main 브랜치 복사)
git worktree add ../deploy main
```

### 워크트리 장점
- 각 프로젝트를 **독립적으로 개발** 가능
- main 브랜치는 항상 **안정 상태** 유지
- 배포용 폴더는 항상 **깨끗한 상태**

---

## 5. 이미지 수집/관리 시스템 개선

### 현재 문제
```
모든 이미지가 uploads/ 폴더에 무작위 저장
→ 어떤 나라/도시/관광지 이미지인지 알 수 없음
→ 같은 이미지 중복 다운로드
→ 검색/재사용 불가
```

### 개선 구조

```
uploads/
├── images/
│   ├── 이탈리아/
│   │   ├── 로마/
│   │   │   ├── 콜로세움/
│   │   │   │   ├── colosseum-01.jpg
│   │   │   │   └── colosseum-02.jpg
│   │   │   ├── 트레비분수/
│   │   │   └── 바티칸/
│   │   ├── 피렌체/
│   │   └── 베네치아/
│   ├── 오스트리아/
│   │   ├── 잘츠부르크/
│   │   └── 비엔나/
│   └── ...
└── index.json  ← 이미지 메타데이터 인덱스
```

### 이미지 DB 테이블

```sql
CREATE TABLE image_library (
  id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,        -- 'images/이탈리아/로마/콜로세움/colosseum-01.jpg'
  country TEXT,                   -- '이탈리아'
  city TEXT,                      -- '로마'
  spot TEXT,                      -- '콜로세움'
  source TEXT,                    -- 'modetour' | 'hanatour' | 'pexels' | 'manual'
  source_product TEXT,            -- 모두투어 상품명 (원본 출처)
  tags TEXT,                      -- '야경,유적지,관광명소' (쉼표 구분)
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_img_country ON image_library(country);
CREATE INDEX idx_img_city ON image_library(city);
CREATE INDEX idx_img_spot ON image_library(spot);
CREATE INDEX idx_img_source ON image_library(source);
```

### 이미지 수집 흐름 (모두투어)

```
1. 모두투어에서 상품 가져오기
   └── 상품명: "이탈리아 로마 피렌체 7일"
       └── 이미지 20장

2. 상품명에서 나라/도시 추출
   └── 이탈리아 → 로마, 피렌체

3. 이미지를 폴더에 저장
   └── uploads/images/이탈리아/로마/product-image-01.jpg

4. image_library DB에 등록
   └── country: 이탈리아, city: 로마, source: modetour
```

### 이미지 검색/불러오기

```
브로슈어 작성 시:
  1. 일정표에서 "로마" 입력
  2. image_library에서 city='로마' 검색
  3. 매칭되는 이미지 목록 표시
  4. 선택하면 바로 적용

자동 매칭:
  - 타이틀/지역/도시/관광지 이름으로 유사도 검색
  - LIKE '%로마%' 또는 한글-영문 매핑
  - 이전에 사용한 이미지 우선 표시
```

---

## 6. 글쓰기 스킬 현황

### 설치된 글쓰기 관련 스킬

| 스킬 | 설명 | 사용법 |
|------|------|--------|
| `/soul-drill` | 주제 발굴 — Why 질문으로 진짜 이야기 발굴 | "영혼 굴착 해줘" |
| `/research` | 주제 기반 자료 수집 | "~에 대해 리서치해줘" |
| `/deep-research` | 5개 검색 API 병렬 심층 조사 | "~에 대해 깊이 조사해줘" |
| `/draft-assist` | 초안 작성 지원 (질문으로 유도) | "초안 작성 도와줘" |
| `/structure` | 글 구조 설계 (도입-전개-결론) | "글 구조 잡아줘" |
| `/style-learn` | 작가 스타일 학습 (2000자+ 분석) | "내 글 스타일 분석해줘" |
| `/red-pen` | 편집장의 빨간펜 교정 | "글 교정해줘" |

### 사용 예시

```
1. 여행 상품 소개글 작성:
   "이탈리아 로마 피렌체 7일 상품 소개글 작성해줘"

2. 고객 안내문 작성:
   "출발 전 안내문 작성해줘"

3. 블로그/SNS 글:
   "/draft-assist" → 질문에 답하면 초안 생성
```

---

## 7. 우선순위 로드맵

### Phase 1: 즉시 (이번 주)
- [ ] Git Worktree 생성 (dev-air, dev-landing, deploy)
- [ ] 이미지 라이브러리 DB 테이블 생성
- [ ] 모두투어 이미지 수집 시 폴더 구조화

### Phase 2: 단기 (1-2주)
- [ ] 통합 로그인 + 권한 시스템 설계
- [ ] nginx API Gateway 설정
- [ ] 이미지 검색/매칭 기능

### Phase 3: 중기 (3-4주)
- [ ] 통합 프론트엔드 (대시보드 + 메뉴)
- [ ] 직원 계정 생성/관리 UI
- [ ] 이미지 자동 태깅 (AI)

### Phase 4: 장기 (1-2개월)
- [ ] 모바일 대응
- [ ] 배포 자동화 (CI/CD)
- [ ] 백업 자동화

---

## 8. 논의 필요 사항

| # | 주제 | 결정 필요 |
|---|------|----------|
| 1 | 통합 방식 | A(API Gateway) vs B(완전 통합) |
| 2 | 직원 수 | 몇 명이 사용? 역할은? |
| 3 | 배포 환경 | 사무실 LAN? 외부 접속? |
| 4 | 도메인 | 도메인 사용? (예: tourworld.co.kr) |
| 5 | 이미지 저장소 | 로컬 vs 클라우드(S3) |
| 6 | 모두투어 외 | 하나투어 이미지도 같은 방식? |
