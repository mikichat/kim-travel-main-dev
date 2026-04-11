# TRD: 자유여행 예약내역 - 기술 설계 문서

## 1. 시스템 아키텍처

```
[에디터 페이지]                    [미리보기 페이지]
hanatour/travel-free.html    →    hanatour/preview-free.html
       │                                │
       │ serializeForm()                │ deserialize(URL param)
       │ LZString compress              │ LZString decompress
       │ window.open(?d=...)            │ render cards
       │                                │
       ├─ localStorage                  ├─ localStorage (images)
       │   freetravel_saves_v1          │   __preview_images_free__
       │   __preview_images_free__      │
       │                                ├─ html2canvas (이미지 저장)
       └─ css/style.css (sidebar)       └─ standalone (no sidebar)
```

## 2. 파일 구조

```
hanatour/
├── travel-free.html          # 에디터 페이지 (NEW)
├── preview-free.html         # 모바일 미리보기 (NEW)
├── js/
│   └── (기존 auto-populate.js, excel-import.js)
├── travel-simple.html        # (기존 - 참고용)
├── preview-mobile.html       # (기존 - 참고용)
```

## 3. 기술 스택

| 구분 | 기술 | 버전/출처 |
|------|------|-----------|
| CSS | Tailwind CSS | CDN |
| 아이콘 | Material Symbols Outlined | Google Fonts CDN |
| 보조 아이콘 | Font Awesome | 6.4.0 CDN |
| 압축 | lz-string | 1.5.0 CDN |
| 이미지 캡처 | html2canvas | lazy load CDN |
| 폰트 | Noto Sans KR + Inter | Google Fonts CDN |
| 사이드바 | css/style.css | 로컬 |

## 4. 데이터 모델

### 4.1 에디터 → 미리보기 전달 데이터

```javascript
{
  // 기본 정보
  recipient: "이귀운 권사님",
  sender: "여행세상",
  createdDate: "2025-01-06",
  travelPeriod: { start: "2025-01-28", end: "2025-02-01" },
  destination: "제주도",

  // 섹션 표시 여부
  sections: {
    flights: true,
    hotels: true,
    rentcar: true,
    golf: false,
    custom: [],      // 커스텀 섹션 ID 배열
    payment: true,
    company: true
  },

  // 항공편
  flights: {
    passengerGroups: [
      {
        id: "pg1",
        passengers: [
          { name: "노", color: "blue" },
          { name: "이", color: "indigo" }
        ],
        label: "탑승객 01 & 03",
        legs: [
          {
            flightNo: "OZ8143",
            date: "2025-01-28",
            depAirport: "광주",
            depCode: "KWJ",
            depTime: "12:25",
            arrAirport: "제주",
            arrCode: "CJU",
            arrTime: "13:20"
          },
          {
            flightNo: "KE1622",
            date: "2025-02-01",
            depAirport: "제주",
            depCode: "CJU",
            depTime: "15:15",
            arrAirport: "광주",
            arrCode: "KWJ",
            arrTime: "16:10"
          }
        ]
      }
    ]
  },

  // 숙박
  hotels: [
    {
      name: "제주시리우스",
      checkIn: "2025-01-28",
      nights: 2,
      booker: "노기섭"
    }
  ],

  // 렌터카
  rentcars: [
    {
      vehicle: "더올뉴그랜져 (휘)",
      insurance: "완전자차보험 가입",
      booker: "이귀운"
    }
  ],

  // 골프
  golf: [
    {
      course: "제주CC",
      date: "2025-01-29",
      teeTime: "08:00",
      booker: "노기섭"
    }
  ],

  // 커스텀 섹션
  customSections: [
    {
      id: "cs1",
      type: "tour",         // tour|meal|ticket|activity|etc
      title: "투어",
      items: [
        { name: "성산일출봉 투어", date: "2025-01-29", memo: "", booker: "" }
      ]
    }
  ],

  // 결제
  payment: {
    totalAmount: 2542600,
    bank: "하나은행",
    account: "611-016420-721",
    holder: "(유) 여행세상",
    status: "unpaid"        // unpaid|partial|paid
  },

  // 회사 정보
  company: {
    name: "(유) 여행세상",
    ceo: "대표이사 김국진",
    address: "(560-170) 전주시 완산구 서신동 856-1번지",
    phone: "063) 271-9090",
    fax: "063) 271-9030",
    manager: { name: "", phone: "", email: "" }
  }

  // 이미지는 별도 localStorage
  // stamp → __preview_images_free__.stamp
}
```

### 4.2 localStorage 키

| 키 | 용도 | 포맷 |
|----|------|------|
| `freetravel_saves_v1` | 저장 목록 | `[{id, name, data, createdAt}]` |
| `__preview_images_free__` | 도장 등 이미지 | `{stamp: "base64..."}` |
| `freetravel_company_default` | 회사 정보 기본값 | `{name, ceo, ...}` |

## 5. 에디터 페이지 구조

### 5.1 HTML 레이아웃

```
<body>
  <aside class="sidebar"> ... </aside>      <!-- css/style.css -->
  <main class="main-content">
    <div class="max-w-4xl mx-auto">
      <div class="card p-8">
        <h1>자유여행 예약내역</h1>

        <!-- 저장/불러오기 버튼 -->
        <!-- 기본 정보 폼 -->
        <!-- 항공편 섹션 [✓ 미리보기 포함] -->
        <!-- 숙박 섹션 [✓ 미리보기 포함] -->
        <!-- 렌터카 섹션 [✓ 미리보기 포함] -->
        <!-- 골프 섹션 [✓ 미리보기 포함] -->
        <!-- 커스텀 섹션 추가 버튼 -->
        <!-- 결제 정보 [✓ 미리보기 포함] -->
        <!-- 회사 정보 [✓ 미리보기 포함] -->

        <button type="submit">미리보기 & 공유하기</button>
      </div>
    </div>
  </main>
</body>
```

### 5.2 동적 항목 추가/삭제 패턴

```javascript
// 각 섹션의 항목 추가
function addFlightLeg(groupId) {
  const container = document.querySelector(`#group-${groupId} .legs-container`);
  const template = getFlightLegTemplate();
  container.insertAdjacentHTML('beforeend', template);
}

// 항목 삭제
function removeItem(button) {
  button.closest('.dynamic-item').remove();
}

// 커스텀 섹션 추가
function addCustomSection() {
  const id = 'cs' + Date.now();
  const template = getCustomSectionTemplate(id);
  document.getElementById('customSectionsContainer').insertAdjacentHTML('beforeend', template);
}
```

## 6. 미리보기 페이지 구조

### 6.1 카드 컴포넌트 맵핑

| 섹션 | 아이콘 | 배경색 | 카드 스타일 |
|------|--------|--------|-------------|
| 항공편 | `flight` | slate-50 | 내부 white 카드 (출발↔도착) |
| 숙박 | `hotel` | slate-50 | 리스트형 |
| 렌터카 | `directions_car` | slate-50 | 배지 (보험) |
| 골프 | `golf_course` | green-50 | 리스트형 |
| 커스텀 | 타입별 자동 | slate-50 | 리스트형 |
| 결제 | `payments` | primary gradient | 대형 금액 + 계좌 |
| 회사 | - | white | 도장 + 문의처 |

### 6.2 아이콘 타입 매핑

```javascript
const SECTION_ICONS = {
  tour: 'tour',
  meal: 'restaurant',
  ticket: 'confirmation_number',
  activity: 'kayaking',
  etc: 'more_horiz'
};
```

## 7. URL 인코딩/디코딩

```javascript
// 에디터 → 미리보기
function generatePreviewURL(data) {
  const json = JSON.stringify(data);
  const compressed = LZString.compressToEncodedURIComponent(json);
  return `preview-free.html?d=${encodeURIComponent(compressed)}`;
}

// 미리보기에서 복원
function decodeData(param) {
  const decompressed = LZString.decompressFromEncodedURIComponent(
    decodeURIComponent(param)
  );
  return JSON.parse(decompressed || '{}');
}
```

## 8. 반응형 설계

| 화면 | 에디터 | 미리보기 |
|------|--------|----------|
| Desktop (>768px) | sidebar 260px + main content | max-w-md centered |
| Mobile (<=768px) | sidebar hidden + full width | full width |

## 9. 성능 고려사항

- 서버 API 호출 없음 (순수 클라이언트 사이드)
- 이미지는 URL 파라미터에서 제외 (localStorage 별도)
- html2canvas lazy load (필요 시에만)
- Tailwind CDN 캐싱
