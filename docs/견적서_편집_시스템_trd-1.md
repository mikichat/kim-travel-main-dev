# TRD (Technical Requirements Document)
# 견적서 편집 시스템 - Phase 1

## 1. 문서 목적

본 TRD는 **견적서 편집 시스템 Phase 1**의 기술적 요구사항 및 구현 방법을 정의한다.

**핵심 원칙:**
- 25년11월중순광저우-1.html의 레이아웃 100% 재현
- 레이아웃과 데이터 완전 분리
- 기존 DB는 읽기 전용 (추후 연동 준비)
- 이미지/PDF 출력 품질 보장

---

## 2. 시스템 아키텍처

### 2.1 전체 구조

```
┌─────────────────────────────────────────────────────┐
│                   Browser (Client)                  │
├─────────────────────────────────────────────────────┤
│  ┌──────────────┐          ┌──────────────────┐    │
│  │  입력 폼 UI   │ ◄─────► │  미리보기 영역    │    │
│  │  (Edit Form) │          │  (Preview Pane)  │    │
│  └──────────────┘          └──────────────────┘    │
│         │                           │               │
│         └──────────┬────────────────┘               │
│                    │                                │
│         ┌──────────▼──────────┐                    │
│         │  Data Binding Layer │                    │
│         │  (JavaScript)       │                    │
│         └──────────┬──────────┘                    │
│                    │                                │
│         ┌──────────▼──────────┐                    │
│         │   Storage Layer     │                    │
│         │   (LocalStorage/    │                    │
│         │    Future: API)     │                    │
│         └─────────────────────┘                    │
└─────────────────────────────────────────────────────┘
```

### 2.2 레이어별 역할

**Presentation Layer (UI)**
- 데이터 입력 폼
- 실시간 미리보기
- PDF/이미지 출력 버튼

**Business Logic Layer**
- 데이터 검증
- 레이아웃 바인딩
- 포맷팅 로직

**Data Layer**
- 데이터 저장/조회
- Phase 1: LocalStorage
- Phase 2: API 연동 준비

---

## 3. 기술 스택

### 3.1 Frontend
| 기술 | 버전 | 용도 |
|------|------|------|
| HTML5 | - | 레이아웃 구조 |
| CSS3 | - | 스타일링 (원본 재현) |
| Vanilla JavaScript | ES6+ | 데이터 바인딩, 이벤트 처리 |
| Google Fonts (Pretendard) | - | 폰트 |

### 3.2 출력
| 기술 | 용도 |
|------|------|
| CSS Print Media Queries | 인쇄/PDF 스타일 |
| Browser Print API | PDF 생성 |
| html2canvas (Optional) | 이미지 생성 |

### 3.3 Storage (Phase 1)
- LocalStorage: JSON 데이터 저장
- Phase 2: REST API 준비

---

## 4. 레이아웃 재현 기술 명세

### 4.1 원본 분석 결과

**기준 HTML:** `itinerary/chain/can/25년11월중순 광저우 망산-1_tailwind.html`

**핵심 레이아웃 요소:**
```css
/* Page Container */
.page {
  width: 210mm;           /* A4 폭 */
  min-height: 297mm;      /* A4 높이 */
  background: white;
  border: 1px solid #d4d0cc;
}

/* Top Border */
.page-border-top {
  height: 8px;
  background: #f09641;    /* 주황색 */
}

/* Grid Layout for Price */
.price-grid {
  display: grid;
  grid-template-columns: 100px 1fr 80px 140px;
}
```

### 4.2 레이아웃 재현 전략

**전략 1: CSS 클래스 기반 구조**
- 원본 HTML의 CSS 클래스 그대로 유지
- Tailwind → Custom CSS 변환

**전략 2: CSS 변수 활용**
```css
:root {
  --color-primary: #f09641;
  --color-border: #d9d3cc;
  --spacing-unit: 4px;
}
```

**전략 3: 데이터 속성 활용**
```html
<td class="table-data" data-field="group_name">
  <!-- 데이터 바인딩 영역 -->
</td>
```

---

## 5. 데이터 구조 설계

### 5.1 JSON 스키마

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["quote_id", "group_info", "pricing"],
  "properties": {
    "quote_id": {
      "type": "string",
      "description": "견적서 고유 ID"
    },
    "created_at": {
      "type": "string",
      "format": "date-time"
    },
    "updated_at": {
      "type": "string",
      "format": "date-time"
    },
    "group_info": {
      "type": "object",
      "required": ["group_name", "travel_dates", "destination"],
      "properties": {
        "group_id": {
          "type": "string",
          "description": "단체 DB ID (추후 연동용)"
        },
        "group_name": {
          "type": "string",
          "maxLength": 100,
          "description": "단체명"
        },
        "travel_dates": {
          "type": "string",
          "pattern": "^\\d{4}년 \\d{1,2}월 \\d{1,2}일 ~ \\d{1,2}월 \\d{1,2}일$",
          "description": "여행 일자"
        },
        "destination": {
          "type": "string",
          "maxLength": 100,
          "description": "여행지"
        }
      }
    },
    "pricing": {
      "type": "object",
      "required": ["airline_name", "departure_flight", "return_flight", "option_type", "price_amount"],
      "properties": {
        "airline_name": {
          "type": "string",
          "maxLength": 50,
          "description": "항공사명"
        },
        "departure_flight": {
          "type": "string",
          "maxLength": 100,
          "description": "출발편 정보"
        },
        "return_flight": {
          "type": "string",
          "maxLength": 100,
          "description": "귀국편 정보"
        },
        "option_type": {
          "type": "string",
          "maxLength": 50,
          "description": "옵션 타입"
        },
        "price_amount": {
          "type": "string",
          "pattern": "^[0-9,]+원$",
          "description": "1인 요금"
        },
        "price_note": {
          "type": "string",
          "maxLength": 200,
          "description": "요금 안내"
        }
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "contact_info": {
          "type": "string",
          "default": "담당자: 김국진 010-2662-9009"
        },
        "logo_path": {
          "type": "string",
          "default": "../assets/images/25년11월중순 광저우 망산-1_hd1.png"
        },
        "template_version": {
          "type": "string",
          "default": "v1.0"
        }
      }
    }
  }
}
```

### 5.2 데이터 샘플

```javascript
const SAMPLE_QUOTE_DATA = {
  quote_id: "Q20251225001",
  created_at: "2025-12-25T11:30:00Z",
  updated_at: "2025-12-25T11:30:00Z",

  group_info: {
    group_id: null,  // 추후 단체 DB 연동 시 사용
    group_name: "중국 – 광저우 천저우 고의령 망산 PTY",
    travel_dates: "2025년 11월 14일 ~ 11월 18일",
    destination: "중국 – 광저우 천저우 고의령 망산"
  },

  pricing: {
    airline_name: "아시아나\n항공",
    departure_flight: "인천 (08:40) - 광저우 (11:15)",
    return_flight: "광저우 (12:20) - 인천 (17:00)",
    option_type: "노옵션",
    price_amount: "1,540,000원",
    price_note: "※ 상기 요금은 1인 기준이며 항공 및 세금 변동 시 재확인 필요"
  },

  metadata: {
    contact_info: "담당자: 김국진 010-2662-9009",
    logo_path: "../assets/images/25년11월중순 광저우 망산-1_hd1.png",
    template_version: "v1.0"
  }
};
```

---

## 6. 데이터 바인딩 구현

### 6.1 바인딩 메커니즘

**HTML 템플릿:**
```html
<td class="table-data" data-field="group_name"></td>
```

**JavaScript 바인딩:**
```javascript
function bindData(data) {
  // 단체 정보
  bindField('group_name', data.group_info.group_name);
  bindField('travel_dates', data.group_info.travel_dates);
  bindField('destination', data.group_info.destination);

  // 요금 정보
  bindField('airline_name', data.pricing.airline_name);
  bindField('departure_flight', data.pricing.departure_flight);
  // ...
}

function bindField(fieldName, value) {
  const elements = document.querySelectorAll(`[data-field="${fieldName}"]`);
  elements.forEach(el => {
    if (value.includes('\n')) {
      el.innerHTML = value.split('\n').join('<br>');
    } else {
      el.textContent = value;
    }
  });
}
```

### 6.2 실시간 업데이트

```javascript
// 입력 폼에서 데이터 변경 시
document.getElementById('input-group-name').addEventListener('input', (e) => {
  const value = e.target.value;
  bindField('group_name', value);

  // Auto-save (debounced)
  debouncedSave();
});
```

---

## 7. 편집 UI 구현

### 7.1 레이아웃 구조

```html
<div class="editor-container">
  <!-- 좌측: 입력 폼 -->
  <div class="editor-panel">
    <form id="quote-form">
      <!-- 단체 정보 섹션 -->
      <section class="form-section">
        <h3>단체 정보</h3>
        <div class="form-group">
          <label>단체명</label>
          <input type="text" id="input-group-name" />
        </div>
        <!-- ... -->
      </section>

      <!-- 요금 정보 섹션 -->
      <section class="form-section">
        <h3>여행 요금</h3>
        <!-- ... -->
      </section>

      <!-- 액션 버튼 -->
      <div class="form-actions">
        <button type="button" id="btn-save">저장</button>
        <button type="button" id="btn-export-pdf">PDF 다운로드</button>
        <button type="button" id="btn-print">인쇄</button>
      </div>
    </form>
  </div>

  <!-- 우측: 미리보기 -->
  <div class="preview-panel">
    <div class="preview-toolbar">
      <span>미리보기</span>
    </div>
    <div class="preview-content">
      <!-- 기존 견적서 HTML 삽입 -->
      <iframe id="preview-frame" src="document-template-1.html"></iframe>
    </div>
  </div>
</div>
```

### 7.2 스타일 가이드

```css
.editor-container {
  display: grid;
  grid-template-columns: 400px 1fr;
  height: 100vh;
  gap: 0;
}

.editor-panel {
  background: #f5f5f5;
  padding: 20px;
  overflow-y: auto;
}

.preview-panel {
  background: #e0e0e0;
  display: flex;
  flex-direction: column;
}

.preview-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 20px;
  overflow-y: auto;
}
```

---

## 8. 저장 및 불러오기

### 8.1 LocalStorage 구현 (Phase 1)

```javascript
class QuoteStorage {
  static STORAGE_KEY = 'quote_data';

  // 저장
  static save(quoteData) {
    const timestamp = new Date().toISOString();
    quoteData.updated_at = timestamp;

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(quoteData));
    return true;
  }

  // 불러오기
  static load() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  }

  // 삭제
  static clear() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
```

### 8.2 API 연동 준비 (Phase 2)

```javascript
class QuoteAPI {
  static BASE_URL = '/api/quotes';

  // 저장
  static async save(quoteData) {
    const response = await fetch(this.BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quoteData)
    });
    return response.json();
  }

  // 불러오기
  static async load(quoteId) {
    const response = await fetch(`${this.BASE_URL}/${quoteId}`);
    return response.json();
  }
}
```

---

## 9. PDF/이미지 출력

### 9.1 PDF 생성 (Browser Print API)

```javascript
function exportToPDF() {
  // 미리보기 영역의 iframe 또는 직접 출력
  const printWindow = document.getElementById('preview-frame').contentWindow;

  printWindow.print();
  // 브라우저의 "PDF로 저장" 기능 활용
}
```

### 9.2 Print CSS

```css
@media print {
  @page {
    size: A4;
    margin: 0;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0;
    border: none;
    box-shadow: none;
  }

  /* 색상 보존 */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
```

### 9.3 이미지 생성 (html2canvas - Optional)

```javascript
async function exportToImage() {
  const canvas = await html2canvas(document.querySelector('.page'));

  const link = document.createElement('a');
  link.download = 'quote.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}
```

---

## 10. 데이터 검증

### 10.1 Validation Rules

```javascript
const VALIDATION_RULES = {
  group_name: {
    required: true,
    maxLength: 100,
    pattern: null
  },
  travel_dates: {
    required: true,
    pattern: /^\d{4}년 \d{1,2}월 \d{1,2}일 ~ \d{1,2}월 \d{1,2}일$/
  },
  destination: {
    required: true,
    maxLength: 100
  },
  price_amount: {
    required: true,
    pattern: /^[0-9,]+원$/
  }
};

function validateField(fieldName, value) {
  const rules = VALIDATION_RULES[fieldName];
  if (!rules) return { valid: true };

  if (rules.required && !value) {
    return { valid: false, message: '필수 입력 항목입니다.' };
  }

  if (rules.maxLength && value.length > rules.maxLength) {
    return { valid: false, message: `최대 ${rules.maxLength}자까지 입력 가능합니다.` };
  }

  if (rules.pattern && !rules.pattern.test(value)) {
    return { valid: false, message: '형식이 올바르지 않습니다.' };
  }

  return { valid: true };
}
```

---

## 11. 성능 최적화

### 11.1 Debouncing

```javascript
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const debouncedSave = debounce(() => {
  const formData = collectFormData();
  QuoteStorage.save(formData);
}, 500);
```

### 11.2 Lazy Loading (이미지)

```javascript
// 일정표 이미지는 필요 시 로딩
document.addEventListener('DOMContentLoaded', () => {
  const images = document.querySelectorAll('img[data-src]');
  images.forEach(img => {
    img.src = img.dataset.src;
  });
});
```

---

## 12. 에러 처리

### 12.1 에러 타입

```javascript
class ValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

class StorageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StorageError';
  }
}
```

### 12.2 에러 핸들링

```javascript
try {
  validateAllFields();
  QuoteStorage.save(data);
  showSuccessMessage('저장되었습니다.');
} catch (error) {
  if (error instanceof ValidationError) {
    showFieldError(error.field, error.message);
  } else if (error instanceof StorageError) {
    showErrorMessage('저장에 실패했습니다.');
  } else {
    showErrorMessage('알 수 없는 오류가 발생했습니다.');
  }
}
```

---

## 13. 보안

### 13.1 XSS 방지

```javascript
function sanitizeInput(value) {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function bindField(fieldName, value) {
  const sanitized = sanitizeInput(value);
  // ...
}
```

### 13.2 데이터 검증

- 모든 입력값 검증
- 최대 길이 제한
- 특수문자 필터링 (필요 시)

---

## 14. 테스트 전략

### 14.1 단위 테스트
- 데이터 바인딩 함수
- 검증 로직
- 저장/불러오기 기능

### 14.2 통합 테스트
- 전체 플로우 테스트
- 브라우저별 호환성 테스트

### 14.3 시각적 테스트
- 원본 HTML과 픽셀 단위 비교
- 다양한 데이터 입력 시 레이아웃 유지 확인

---

## 15. 배포

### 15.1 파일 구조

```
quote-editor-v1/
├── index.html              # 편집기 메인
├── preview.html            # 미리보기 (견적서 템플릿)
├── css/
│   ├── editor.css          # 편집기 스타일
│   ├── document.css        # 견적서 스타일
│   └── print.css           # 출력용 스타일
├── js/
│   ├── editor.js           # 편집기 로직
│   ├── data-binding.js     # 데이터 바인딩
│   ├── storage.js          # 저장/불러오기
│   └── validation.js       # 검증 로직
└── assets/
    └── images/             # 로고 등
```

### 15.2 브라우저 요구사항
- Chrome 90+
- Edge 90+
- Safari 14+

---

## 16. 향후 확장 계획

### Phase 2
- 일정표 페이지 편집 기능
- 여러 견적서 관리
- 단체 DB 완전 연동

### Phase 3
- 버전 관리
- 템플릿 시스템
- 권한 관리

---

**Version**: 1.0
**Date**: 2025-12-25
**Author**: Travel Document System Team
