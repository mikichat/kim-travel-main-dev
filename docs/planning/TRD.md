# TRD: Travel World CMS

## MVP 캡슐

| 항목 | 내용 |
|------|------|
| **목표** | 여행 데이터 입력 → PDF 브로슈어 출력 올인원 도구 |
| **페르소나** | 여행사 대표/관리자 |
| **핵심 기능** | FEAT-2: 일정표 편집기 |
| **성공 지표** | 브로슈어 제작 시간 30분 → 5분 이내 |

---

## 1. 기술 스택

### 1.1 프론트엔드
| 기술 | 선택 이유 |
|------|----------|
| **React 18+** | 컴포넌트 기반 개발, 풍부한 생태계 |
| **Vite** | 빠른 빌드, HMR 지원 |
| **TypeScript** | 타입 안정성, 코드 품질 향상 |
| **React-DnD** | Canva 스타일 드래그앤드롭 구현 |

### 1.2 백엔드
| 기술 | 선택 이유 |
|------|----------|
| **Node.js 20+** | JavaScript 통일, 비동기 처리 |
| **Express.js** | 경량, 빠른 API 개발 |
| **TypeScript** | 프론트엔드와 타입 공유 |

### 1.3 데이터베이스
| 기술 | 용도 |
|------|------|
| **PostgreSQL** | 메인 DB (클라우드 동기화용) |
| **LocalStorage/IndexedDB** | 로컬 캐시 (오프라인 작업) |

### 1.4 외부 서비스
| 서비스 | API |
|--------|-----|
| Google Maps | Maps JavaScript API |
| Google Drive | Drive API v3 |
| Dropbox | Dropbox API v2 |

---

## 2. 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                      클라이언트 (React)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ 일정편집기 │  │ 호텔관리  │  │ 이미지    │  │ PDF생성  │    │
│  │ (FEAT-2) │  │ (FEAT-1) │  │ 갤러리   │  │ (v2)    │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                        │                                    │
│              ┌─────────┴─────────┐                         │
│              │  LocalStorage     │                         │
│              │  (오프라인 캐시)   │                         │
│              └─────────┬─────────┘                         │
└─────────────────────────┼───────────────────────────────────┘
                          │ REST API
┌─────────────────────────┼───────────────────────────────────┐
│                      서버 (Express)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ 일정 API  │  │ 호텔 API  │  │ 이미지 API │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                        │                                    │
│              ┌─────────┴─────────┐                         │
│              │    PostgreSQL     │                         │
│              └───────────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. API 설계

### 3.1 일정표 API (FEAT-2)
```
// 일정 조회
GET    /api/itineraries
GET    /api/itineraries/:id

// 일정 생성/수정/삭제
POST   /api/itineraries
PUT    /api/itineraries/:id
DELETE /api/itineraries/:id

// 일정 항목 (개별 일정)
GET    /api/itineraries/:id/items
POST   /api/itineraries/:id/items
PUT    /api/itineraries/:id/items/:itemId
DELETE /api/itineraries/:id/items/:itemId
```

### 3.2 호텔 API (FEAT-1)
```
// 호텔 정보
GET    /api/hotels
GET    /api/hotels/:id
POST   /api/hotels
PUT    /api/hotels/:id
DELETE /api/hotels/:id

// 호텔 이미지
POST   /api/hotels/:id/images
DELETE /api/hotels/:id/images/:imageId
```

### 3.3 이미지 갤러리 API (FEAT-3)
```
// 이미지 관리
GET    /api/images
GET    /api/images/:id
POST   /api/images/upload
DELETE /api/images/:id

// 카테고리
GET    /api/images/categories
POST   /api/images/categories
```

---

## 4. 하이브리드 저장 전략

### 4.1 데이터 흐름
```
사용자 입력 → LocalStorage 저장 → 백그라운드 동기화 → PostgreSQL
```

### 4.2 동기화 규칙
| 상황 | 동작 |
|------|------|
| 온라인 | 입력 즉시 서버 동기화 |
| 오프라인 | LocalStorage에 큐잉, 온라인 복귀 시 동기화 |
| 충돌 시 | 최신 타임스탬프 우선 (사용자 확인 옵션) |

---

## 5. 보안 요구사항

| 항목 | 구현 |
|------|------|
| 인증 | JWT 기반 인증 |
| API 보호 | Rate Limiting, CORS |
| 데이터 암호화 | HTTPS 필수, 민감정보 암호화 저장 |

---

## 6. 성능 요구사항

| 지표 | 목표값 |
|------|--------|
| 페이지 로드 | < 3초 |
| 드래그앤드롭 반응 | < 100ms |
| 이미지 업로드 | < 5초 (10MB 기준) |
| 동기화 지연 | < 2초 |

---

## 7. 개발 환경

### 7.1 필수 도구
- Node.js 20+
- PostgreSQL 15+
- Git

### 7.2 권장 IDE
- VS Code + 추천 확장:
  - ESLint
  - Prettier
  - TypeScript Hero
