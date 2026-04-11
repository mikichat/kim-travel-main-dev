# 데이터 설계서 (Database Design)

**문서 버전**: 1.0 | **작성일**: 2026-02-18 | **저장소**: localStorage

---

## MVP 캡슐

| 항목 | 내용 |
|------|------|
| **저장소** | localStorage (클라이언트 기반) |
| **키 구조** | freetravel_saves_v1 (여행사), LZString (고객) |
| **최대 저장** | 10개 자동 저장 (이전 저장 자동 삭제) |
| **압축** | LZString 60% 이상 감소 |

---

## 1. 저장소 개요

### localStorage 키 목록

| 키 | 용도 | 크기 | 형식 | 비고 |
|----|------|------|------|------|
| `freetravel_saves_v1` | 여행사 직원 저장 | 1-5MB | JSON Array | 최대 10개 |
| `freetravel_company_default` | 회사정보 기본값 | 100KB | JSON | 선택사항 |
| `__preview_images_free__` | 미리보기 이미지 (임시) | 1MB | Base64 | 임시 |

---

## 2. 데이터 스키마 (JSON)

### 메인 문서: TravelBooking

```json
{
  "recipient": "이귀운 권사님",
  "sender": "여행세상",
  "createdDate": "2025-01-06",
  "destination": "제주도",
  "travelPeriod": {
    "start": "2025-01-28",
    "end": "2025-02-01"
  },
  "sections": {
    "flights": true,
    "hotels": true,
    "rentcar": true,
    "golf": false,
    "custom": ["custom_1"],
    "payment": true,
    "company": true
  },
  "flights": { ... },
  "hotels": [ ... ],
  "rentcars": [ ... ],
  "golf": [ ... ],
  "customSections": [ ... ],
  "payment": { ... },
  "company": { ... }
}
```

### 상세 필드

#### 기본정보

```json
{
  "recipient": "String (최대 50자)",
  "sender": "String (최대 50자)",
  "createdDate": "YYYY-MM-DD",
  "destination": "String (최대 100자)",
  "travelPeriod": {
    "start": "YYYY-MM-DD",
    "end": "YYYY-MM-DD"
  }
}
```

#### 항공편 (flights)

```json
{
  "passengerGroups": [
    {
      "passengers": [
        {
          "name": "String (최대 50자)",
          "color": "#3B82F6 (16진수 컬러)"
        }
      ],
      "label": "String (성인, 소아, 유아 등)",
      "legs": [
        {
          "flightNo": "String (최대 10자, 편명)",
          "date": "YYYY-MM-DD",
          "depAirport": "String (인천, 김포 등)",
          "depCode": "String (ICN, GMP 등 3자리 코드)",
          "depTime": "HH:MM (24시간 형식)",
          "arrAirport": "String",
          "arrCode": "String",
          "arrTime": "HH:MM"
        }
      ]
    }
  ]
}
```

#### 숙박 (hotels)

```json
[
  {
    "name": "String (최대 100자, 숙소명)",
    "checkIn": "YYYY-MM-DD",
    "nights": "Number (박수)",
    "booker": "String (최대 50자, 예약자)"
  }
]
```

#### 렌트카 (rentcars)

```json
[
  {
    "vehicle": "String (최대 100자, 차종)",
    "insurance": "String (최대 100자, 보험정보)",
    "booker": "String (최대 50자)"
  }
]
```

#### 골프 (golf)

```json
[
  {
    "course": "String (최대 100자, 골프장명)",
    "date": "YYYY-MM-DD",
    "teeTime": "HH:MM",
    "booker": "String (최대 50자)"
  }
]
```

#### 커스텀 섹션 (customSections)

```json
[
  {
    "id": "custom_1 (UUID 또는 timestamp)",
    "type": "tour | meal | admission | activity | transport | etc",
    "title": "String (최대 50자, 섹션 제목)",
    "items": [
      {
        "name": "String (최대 100자, 항목명)",
        "date": "YYYY-MM-DD (선택사항)",
        "memo": "String (최대 500자, 메모)",
        "booker": "String (최대 50자)"
      }
    ]
  }
]
```

**type 매핑** (아이콘 및 색상)
- `tour`: 투어 (패키지 아이콘)
- `meal`: 식사 (포크나이프 아이콘)
- `admission`: 입장권 (티켓 아이콘)
- `activity`: 액티비티 (카메라 아이콘)
- `transport`: 교통 (버스 아이콘)
- `etc`: 기타 (별 아이콘)

#### 결제정보 (payment)

```json
{
  "totalAmount": "String (콤마 포함, 1,234,567 형식)",
  "bank": "String (최대 50자, 국민은행 등)",
  "account": "String (최대 30자, 계좌번호)",
  "holder": "String (최대 50자, 예금주명)",
  "status": "String (최대 50자, 입금 완료 등)"
}
```

#### 회사정보 (company)

```json
{
  "name": "String (최대 100자, 회사명)",
  "ceo": "String (최대 50자, 대표명)",
  "address": "String (최대 200자)",
  "phone": "String (최대 20자, 010-0000-0000 형식)",
  "fax": "String (최대 20자)",
  "manager": {
    "name": "String (최대 50자, 담당자명)",
    "phone": "String (최대 20자)",
    "email": "String (이메일 형식)"
  },
  "stampImage": "String (Base64, PNG 이미지, 선택사항)"
}
```

---

## 3. localStorage 저장 구조

### freetravel_saves_v1 (배열)

```json
[
  {
    "id": "save_1_2026-02-18T10:30:00Z",
    "name": "이귀운 제주도 여행",
    "timestamp": "2026-02-18T10:30:00Z",
    "data": { ... TravelBooking ... }
  },
  {
    "id": "save_0_2026-02-18T09:15:00Z",
    "name": "김미진 홍콩 여행",
    "timestamp": "2026-02-18T09:15:00Z",
    "data": { ... TravelBooking ... }
  }
]
```

**주의**: 최대 10개까지만 유지 (11번째 저장 시 첫 번째 삭제)

### freetravel_company_default

```json
{
  "name": "주식회사 여행세상",
  "ceo": "김귀진",
  "address": "서울시 강남구 테헤란로 123",
  "phone": "02-123-4567",
  "fax": "02-123-4568",
  "manager": {
    "name": "이미진",
    "phone": "010-1234-5678",
    "email": "mj.lee@travel.co.kr"
  },
  "stampImage": "data:image/png;base64,..."
}
```

---

## 4. URL 파라미터 구조 (고객 공유)

### LZString 압축 흐름

```
원본 데이터 (JSON)
  ↓
JSON.stringify(data)
  ↓
LZString.compressToBase64(json)
  ↓
Encoded String
  ↓
URL: preview-free.html?data={Encoded String}&theme=light

예시:
preview-free.html?data=N4IgZglglgdgpgJwgQwOYEMBWA7BDsACgFhgCZQBfZAGQggJ4AHACQBEARhBAg0LQMhA4EhIAjIAkEACgEF1QZVHFiVajVqz...
```

### 쿼리 파라미터

| 파라미터 | 값 | 선택사항 |
|---------|-----|--------|
| `data` | LZString 압축 JSON | 필수 |
| `theme` | `light` \| `dark` | 선택 (기본: light) |

---

## 5. 인덱스 및 조회

### 주요 조회 패턴

```javascript
// 모든 저장 목록 조회
const saves = JSON.parse(localStorage.getItem('freetravel_saves_v1') || '[]')

// 특정 저장 조회
const save = saves[0]

// 마지막 저장 조회
const lastSave = saves[0]

// 회사정보 기본값 조회
const defaultCompany = JSON.parse(localStorage.getItem('freetravel_company_default') || '{}')

// URL 파라미터에서 데이터 조회
const urlParams = new URLSearchParams(location.search)
const data = JSON.parse(LZString.decompressFromBase64(urlParams.get('data')))
```

---

## 6. 데이터 유효성 검증

### 필드별 검증 규칙

| 필드 | 타입 | 길이 | 형식 | 필수 |
|------|------|------|------|------|
| recipient | String | 1-50 | 한글/영문/숫자 | O |
| sender | String | 1-50 | 한글/영문/숫자 | O |
| createdDate | String | 10 | YYYY-MM-DD | O |
| destination | String | 1-100 | 한글/영문/숫자 | O |
| travelPeriod.start | String | 10 | YYYY-MM-DD | O |
| travelPeriod.end | String | 10 | YYYY-MM-DD | O |
| flights[].passengers[].name | String | 1-50 | 한글/영문 | O |
| flights[].passengers[].color | String | 7 | #RRGGBB | O |
| flightNo | String | 2-10 | 영문+숫자 | O |
| depTime/arrTime | String | 5 | HH:MM | O |
| checkIn | String | 10 | YYYY-MM-DD | O |
| nights | Number | 1-30 | 숫자 | O |
| totalAmount | String | - | 숫자 또는 콤마 포함 | X |
| email | String | - | 이메일 형식 | X |
| phone | String | 10-20 | 010-0000-0000 | X |

### 검증 로직 (예시)

```javascript
function validateData(data) {
  const errors = []
  
  // 필수 필드 확인
  if (!data.recipient?.trim()) errors.push('수신인 필수')
  if (!data.sender?.trim()) errors.push('발신인 필수')
  if (!isValidDate(data.createdDate)) errors.push('작성일 형식 오류')
  
  // 날짜 범위 확인
  if (new Date(data.travelPeriod.start) > new Date(data.travelPeriod.end)) {
    errors.push('여행 기간 오류 (시작 > 종료)')
  }
  
  // 항공편 검증
  data.flights.passengerGroups.forEach((group, i) => {
    if (!group.passengers.length) errors.push(`항공편 ${i}: 탑승객 필수`)
    group.legs.forEach((leg, j) => {
      if (!isValidTime(leg.depTime)) errors.push(`항공편 ${i}-${j}: 출발 시간 형식 오류`)
    })
  })
  
  return { isValid: errors.length === 0, errors }
}
```

---

## 7. 마이그레이션 계획

### Phase 1 (현재)
- localStorage 기반 (클라이언트 전용)

### Phase 2
- 선택사항: REST API로 서버 동기화
- 기존 localStorage 데이터 유지

### Phase 3 (미정)
- 데이터베이스 마이그레이션 (선택사항)

---

## 8. 성능 고려사항

### 저장소 크기

```
평균 데이터 크기: 50-100KB (1건)
최대 저장: 10건
최대 총 크기: 1MB (여유 있음)

LZString 압축:
- 압축 전: 100KB
- 압축 후: 40KB (60% 감소)
- URL 길이: ~500자
```

### 접근 속도

```
localStorage 읽기: < 50ms
localStorage 쓰기: < 100ms
JSON 파싱: < 200ms
LZString 압축/해제: < 100ms
```

---

**버전**: v1.0 | **작성**: 2026-02-18
