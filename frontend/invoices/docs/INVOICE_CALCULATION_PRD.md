# PRD: 인보이스 고급 계산 기능
# Invoice Advanced Calculation Feature

**작성일**: 2026-01-02
**버전**: 1.0
**작성자**: Development Team
**참고 이미지**: `1-1.JPG`

---

## 1. 개요

### 1.1 배경
현재 인보이스 시스템은 단순한 "항목 × 수량 = 합계" 방식의 계산만 지원합니다.
실제 여행사 업무에서는 **계약금(선금), 취소수수료, 잔금 계산** 등 복잡한 금액 계산이 필요합니다.

### 1.2 목표
- 여행 총경비 자동 계산
- 계약금(선금) 관리
- 추가 비용 항목 (취소수수료, 수수료 등)
- 잔금 자동 계산
- 계산 과정 투명하게 표시

---

## 2. 현재 시스템 vs 요구 시스템

### 2.1 현재 시스템 (Simple Mode)

```
항목         단가        수량    합계
─────────────────────────────────
항공료      500,000원    10명    5,000,000원
─────────────────────────────────
TOTAL: 5,000,000원
```

### 2.2 요구 시스템 (Advanced Mode) - 참고: 1-1.JPG

```
여행경비용   1,770,000원 × 16명    = 28,320,000원
계약금       출입원 17명 아시아나 항공 구입 비용  = 10,000,000원
취소수수료   200,000(송금식대표님)    = 200,000원
─────────────────────────────────────────────────
잔금        (28,032,000 + 200,000) - 10,000,000 = 18,520,000원
```

---

## 3. 기능 요구사항

### 3.1 계산 모드 선택

#### 요구사항
- **Simple Mode** (기본): 기존 방식 (항목 × 수량)
- **Advanced Mode** (고급): 계약금/잔금 계산 방식

#### UI
```html
<div class="calculation-mode-selector">
  <label>
    <input type="radio" name="calc-mode" value="simple" checked>
    간편 계산
  </label>
  <label>
    <input type="radio" name="calc-mode" value="advanced">
    고급 계산 (계약금/잔금)
  </label>
</div>
```

---

### 3.2 Advanced Mode 입력 필드

#### 3.2.1 여행 총경비

| 필드명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `base_price_per_person` | Number | 1인당 기본 요금 | 1,770,000원 |
| `total_participants` | Number | 총 인원 | 16명 |
| `total_travel_cost` | Number (계산) | 자동 계산: base × participants | 28,320,000원 |

**계산식**:
```javascript
total_travel_cost = base_price_per_person × total_participants
```

#### 3.2.2 계약금 (선금)

| 필드명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `deposit_amount` | Number | 계약금 금액 | 10,000,000원 |
| `deposit_description` | Text | 계약금 설명 | 출입원 17명 아시아나 항공 구입 비용 |

#### 3.2.3 추가 비용 항목 (동적 추가 가능)

| 필드명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `additional_items` | Array | 추가 비용 목록 | [{name: "취소수수료", ...}] |
| `additional_items[].name` | Text | 항목명 | 취소수수료 |
| `additional_items[].amount` | Number | 금액 | 200,000원 |
| `additional_items[].description` | Text | 설명 | 송금식대표님 |
| `additional_items[].type` | Enum | 추가(+) or 차감(-) | "add" or "subtract" |

**예시**:
```javascript
[
  {
    name: "취소수수료",
    amount: 200000,
    description: "송금식대표님",
    type: "add"
  },
  {
    name: "할인",
    amount: 500000,
    description: "단체 할인",
    type: "subtract"
  }
]
```

#### 3.2.4 잔금 (자동 계산)

| 필드명 | 타입 | 설명 | 계산식 |
|--------|------|------|--------|
| `balance_due` | Number (계산) | 잔금 | (총경비 + 추가비용) - 계약금 |

**계산식**:
```javascript
additional_total = sum(additional_items where type="add") - sum(additional_items where type="subtract")
balance_due = (total_travel_cost + additional_total) - deposit_amount
```

---

### 3.3 UI/UX 설계

#### 3.3.1 Advanced Mode 입력 폼

```html
<!-- Advanced Mode 활성화 시 표시 -->
<div id="advanced-calculation-section" style="display: none;">

  <!-- 1. 여행 총경비 -->
  <div class="card">
    <div class="card-header">여행 총경비</div>
    <div class="form-row">
      <div class="form-group">
        <label>1인당 요금 *</label>
        <input type="number" id="base-price" placeholder="1,770,000">
      </div>
      <div class="form-group">
        <label>총 인원 *</label>
        <input type="number" id="total-participants" placeholder="16">
      </div>
      <div class="form-group">
        <label>총경비 (자동계산)</label>
        <input type="text" id="total-travel-cost" readonly value="28,320,000원">
      </div>
    </div>
  </div>

  <!-- 2. 계약금 -->
  <div class="card">
    <div class="card-header">계약금 (선금)</div>
    <div class="form-group">
      <label>계약금 금액</label>
      <input type="number" id="deposit-amount" placeholder="10,000,000">
    </div>
    <div class="form-group">
      <label>계약금 설명</label>
      <input type="text" id="deposit-description" placeholder="출입원 17명 아시아나 항공 구입 비용">
    </div>
  </div>

  <!-- 3. 추가 비용 -->
  <div class="card">
    <div class="card-header">
      추가 비용 항목
      <button type="button" id="add-extra-item-btn">+ 항목 추가</button>
    </div>
    <div id="extra-items-container">
      <!-- 동적으로 추가됨 -->
    </div>
  </div>

  <!-- 4. 잔금 (자동 계산) -->
  <div class="card balance-summary">
    <div class="calculation-breakdown">
      <div class="calc-row">
        <span>총 여행경비:</span>
        <span id="breakdown-travel-cost">28,320,000원</span>
      </div>
      <div class="calc-row">
        <span>추가 비용:</span>
        <span id="breakdown-extra-cost">+ 200,000원</span>
      </div>
      <div class="calc-row">
        <span>계약금 (차감):</span>
        <span id="breakdown-deposit">- 10,000,000원</span>
      </div>
      <div class="calc-row total-row">
        <span>잔금:</span>
        <span id="breakdown-balance" class="highlight">18,520,000원</span>
      </div>
    </div>
  </div>

</div>
```

#### 3.3.2 추가 비용 항목 템플릿

```html
<div class="extra-item-row">
  <input type="text" placeholder="항목명 (예: 취소수수료)" class="extra-item-name">
  <input type="number" placeholder="금액" class="extra-item-amount">
  <input type="text" placeholder="설명 (예: 송금식대표님)" class="extra-item-desc">
  <select class="extra-item-type">
    <option value="add">추가 (+)</option>
    <option value="subtract">차감 (-)</option>
  </select>
  <button type="button" class="btn-remove-item">삭제</button>
</div>
```

---

### 3.4 미리보기 및 PDF 표시

#### 3.4.1 Advanced Mode 미리보기 레이아웃

```
┌─────────────────────────────────────────────┐
│              INVOICE                         │
├─────────────────────────────────────────────┤
│ 수신: 오태완                                 │
│ 일자: 2025년 12월 17일                       │
├─────────────────────────────────────────────┤
│ 상품명: 2026년01월05일 태국 파타야 5일       │
│ 기간: 2026년 01월 05일 - 2026년 01월 09일    │
├─────────────────────────────────────────────┤
│ 항공스케줄                                   │
│ 출발: 2026.01.05(일) 11:05 2025.10.19(일)... │
├─────────────────────────────────────────────┤
│                                              │
│ 여행경비용    1,770,000원 × 16명 = 28,320,000원 │
│                                              │
│ 계약금        출입원 17명 아시아나 항공 구입 비용 │
│               = 10,000,000원                 │
│                                              │
│ 취소수수료    200,000원 (송금식대표님)       │
│               = 200,000원                    │
│                                              │
│ ───────────────────────────────────────      │
│ 잔금         (28,032,000 + 200,000)          │
│              - 10,000,000                    │
│              = 18,520,000원                  │
│                                              │
├─────────────────────────────────────────────┤
│ 농협 예금주 여행세상: 351-1076-0876-13       │
└─────────────────────────────────────────────┘
```

---

## 4. 데이터베이스 스키마 변경

### 4.1 기존 invoices 테이블 확장

```sql
ALTER TABLE invoices ADD COLUMN calculation_mode TEXT DEFAULT 'simple'; -- 'simple' or 'advanced'

-- Advanced Mode 필드
ALTER TABLE invoices ADD COLUMN base_price_per_person INTEGER;
ALTER TABLE invoices ADD COLUMN total_participants INTEGER;
ALTER TABLE invoices ADD COLUMN total_travel_cost INTEGER;
ALTER TABLE invoices ADD COLUMN deposit_amount INTEGER;
ALTER TABLE invoices ADD COLUMN deposit_description TEXT;
ALTER TABLE invoices ADD COLUMN additional_items TEXT; -- JSON 배열
ALTER TABLE invoices ADD COLUMN balance_due INTEGER;
```

### 4.2 additional_items JSON 구조

```json
[
  {
    "id": "extra-1",
    "name": "취소수수료",
    "amount": 200000,
    "description": "송금식대표님",
    "type": "add"
  },
  {
    "id": "extra-2",
    "name": "단체 할인",
    "amount": 500000,
    "description": "15명 이상 단체 할인",
    "type": "subtract"
  }
]
```

---

## 5. API 변경사항

### 5.1 POST /api/invoices (확장)

**요청 예시** (Advanced Mode):
```json
{
  "recipient": "오태완",
  "invoice_date": "2025-12-17",
  "description": "2026년01월05일 태국 파타야 5일",
  "calculation_mode": "advanced",

  "base_price_per_person": 1770000,
  "total_participants": 16,
  "total_travel_cost": 28320000,

  "deposit_amount": 10000000,
  "deposit_description": "출입원 17명 아시아나 항공 구입 비용",

  "additional_items": [
    {
      "name": "취소수수료",
      "amount": 200000,
      "description": "송금식대표님",
      "type": "add"
    }
  ],

  "balance_due": 18520000,

  "bank_account_id": "bank-1",
  "flight_schedule_id": "flight-1"
}
```

---

## 6. 프론트엔드 로직

### 6.1 실시간 계산

```javascript
// invoice-editor.js

function calculateAdvancedMode() {
  // 1. 총 여행경비 계산
  const basePrice = parseFloat(document.getElementById('base-price').value) || 0;
  const participants = parseInt(document.getElementById('total-participants').value) || 0;
  const totalTravelCost = basePrice * participants;

  // 2. 추가 비용 합계
  const extraItems = getExtraItems();
  const extraTotal = extraItems.reduce((sum, item) => {
    return item.type === 'add'
      ? sum + item.amount
      : sum - item.amount;
  }, 0);

  // 3. 계약금
  const deposit = parseFloat(document.getElementById('deposit-amount').value) || 0;

  // 4. 잔금 계산
  const balanceDue = (totalTravelCost + extraTotal) - deposit;

  // 5. UI 업데이트
  updateBreakdown({
    totalTravelCost,
    extraTotal,
    deposit,
    balanceDue
  });
}

function updateBreakdown(data) {
  document.getElementById('total-travel-cost').value = formatCurrency(data.totalTravelCost);
  document.getElementById('breakdown-travel-cost').textContent = formatCurrency(data.totalTravelCost);
  document.getElementById('breakdown-extra-cost').textContent =
    (data.extraTotal >= 0 ? '+ ' : '- ') + formatCurrency(Math.abs(data.extraTotal));
  document.getElementById('breakdown-deposit').textContent = '- ' + formatCurrency(data.deposit);
  document.getElementById('breakdown-balance').textContent = formatCurrency(data.balanceDue);
}

// 입력 필드 변경 시 자동 재계산
document.getElementById('base-price').addEventListener('input', calculateAdvancedMode);
document.getElementById('total-participants').addEventListener('input', calculateAdvancedMode);
document.getElementById('deposit-amount').addEventListener('input', calculateAdvancedMode);
```

### 6.2 추가 비용 항목 관리

```javascript
let extraItemCounter = 0;

function addExtraItem() {
  const container = document.getElementById('extra-items-container');
  const itemId = `extra-${++extraItemCounter}`;

  const itemHTML = `
    <div class="extra-item-row" data-id="${itemId}">
      <input type="text" placeholder="항목명" class="extra-item-name">
      <input type="number" placeholder="금액" class="extra-item-amount">
      <input type="text" placeholder="설명" class="extra-item-desc">
      <select class="extra-item-type">
        <option value="add">추가 (+)</option>
        <option value="subtract">차감 (-)</option>
      </select>
      <button type="button" class="btn-remove-item" onclick="removeExtraItem('${itemId}')">삭제</button>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', itemHTML);

  // 입력 시 자동 재계산
  const row = container.querySelector(`[data-id="${itemId}"]`);
  row.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('input', calculateAdvancedMode);
  });
}

function removeExtraItem(itemId) {
  document.querySelector(`[data-id="${itemId}"]`).remove();
  calculateAdvancedMode();
}

function getExtraItems() {
  const rows = document.querySelectorAll('.extra-item-row');
  return Array.from(rows).map(row => ({
    name: row.querySelector('.extra-item-name').value,
    amount: parseFloat(row.querySelector('.extra-item-amount').value) || 0,
    description: row.querySelector('.extra-item-desc').value,
    type: row.querySelector('.extra-item-type').value
  })).filter(item => item.name && item.amount);
}
```

---

## 7. CSS 스타일

```css
/* Advanced Mode 섹션 */
#advanced-calculation-section {
  margin-top: 20px;
}

/* 계산 모드 선택 */
.calculation-mode-selector {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f9fafb;
  border-radius: 6px;
}

.calculation-mode-selector label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

/* 폼 행 (가로 배치) */
.form-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

/* 추가 비용 항목 */
.extra-item-row {
  display: grid;
  grid-template-columns: 2fr 1.5fr 2fr 1fr auto;
  gap: 10px;
  margin-bottom: 10px;
  padding: 10px;
  background-color: #f9fafb;
  border-radius: 4px;
}

.extra-item-row input,
.extra-item-row select {
  font-size: 14px;
}

.btn-remove-item {
  background-color: #ef4444;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.btn-remove-item:hover {
  background-color: #dc2626;
}

/* 잔금 계산 요약 */
.balance-summary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 25px;
  border-radius: 8px;
  margin-top: 20px;
}

.calculation-breakdown {
  max-width: 500px;
  margin: 0 auto;
}

.calc-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 15px;
}

.calc-row.total-row {
  margin-top: 10px;
  padding-top: 15px;
  border-top: 2px solid white;
  border-bottom: none;
  font-size: 18px;
  font-weight: 700;
}

.calc-row .highlight {
  color: #fbbf24;
  font-size: 22px;
  font-weight: 800;
}
```

---

## 8. 유효성 검증

### 8.1 필수 필드 검증

```javascript
function validateAdvancedMode() {
  const errors = [];

  // 1. 기본 요금 및 인원
  const basePrice = parseFloat(document.getElementById('base-price').value);
  const participants = parseInt(document.getElementById('total-participants').value);

  if (!basePrice || basePrice <= 0) {
    errors.push('1인당 요금을 입력해주세요.');
  }

  if (!participants || participants <= 0) {
    errors.push('총 인원을 입력해주세요.');
  }

  // 2. 추가 비용 항목 검증
  const extraItems = getExtraItems();
  extraItems.forEach((item, index) => {
    if (!item.name) {
      errors.push(`추가 비용 항목 ${index + 1}: 항목명을 입력해주세요.`);
    }
    if (item.amount <= 0) {
      errors.push(`추가 비용 항목 ${index + 1}: 금액은 0보다 커야 합니다.`);
    }
  });

  // 3. 잔금이 음수인 경우 경고
  const balanceDue = parseFloat(document.getElementById('breakdown-balance').textContent.replace(/[^0-9.-]/g, ''));
  if (balanceDue < 0) {
    errors.push('잔금이 음수입니다. 계약금이 총액보다 큽니다.');
  }

  return errors;
}
```

---

## 9. 성공 기준

### 9.1 기능적 요구사항
- ✅ Advanced Mode 활성화 시 고급 계산 필드 표시
- ✅ 실시간 자동 계산 (입력 시 즉시 반영)
- ✅ 추가 비용 항목 동적 추가/삭제
- ✅ 잔금 계산 정확도 100%
- ✅ 미리보기 및 PDF에 계산 과정 표시

### 9.2 성능 요구사항
- 계산 응답 시간 < 100ms
- 10개 이상의 추가 비용 항목 지원
- PDF 생성 시간 < 5초

### 9.3 사용성 요구사항
- 모드 전환 시 데이터 손실 경고
- 계산 과정 투명하게 표시
- 통화 포맷팅 (1,770,000원)
- 음수 잔금 시 경고 표시

---

## 10. 개발 우선순위

### Phase 1 (High Priority)
- [ ] 계산 모드 선택 UI
- [ ] Advanced Mode 입력 폼
- [ ] 실시간 계산 로직
- [ ] 잔금 계산 표시

### Phase 2 (Medium Priority)
- [ ] 추가 비용 항목 동적 추가/삭제
- [ ] 데이터베이스 스키마 확장
- [ ] API 확장
- [ ] 미리보기 레이아웃 변경

### Phase 3 (Low Priority)
- [ ] PDF 생성 최적화
- [ ] 유효성 검증 강화
- [ ] 계산 이력 저장
- [ ] 템플릿 저장 기능

---

## 11. 위험 요소 및 대응

### 11.1 위험 요소

| 위험 요소 | 가능성 | 영향도 | 대응 방안 |
|-----------|--------|--------|-----------|
| 계산 오류 | 중간 | 높음 | 단위 테스트, 검증 로직 강화 |
| 모드 전환 시 데이터 손실 | 높음 | 중간 | 전환 전 확인 다이얼로그 |
| 음수 잔금 | 높음 | 중간 | 경고 표시, 저장 전 확인 |
| 복잡한 UI | 중간 | 중간 | 단계별 가이드, 툴팁 |

### 11.2 대응 전략
- **테스트 케이스 작성**: 모든 계산 시나리오 커버
- **사용자 피드백**: 베타 테스트를 통한 UX 개선
- **롤백 계획**: Simple Mode로 언제든 전환 가능

---

## 12. 테스트 시나리오

### 12.1 기본 계산 테스트

**입력**:
- 1인당 요금: 1,770,000원
- 총 인원: 16명
- 계약금: 10,000,000원
- 취소수수료: 200,000원 (추가)

**기대 결과**:
- 총 여행경비: 28,320,000원
- 잔금: 18,520,000원

### 12.2 복잡한 계산 테스트

**입력**:
- 1인당 요금: 2,000,000원
- 총 인원: 20명
- 계약금: 15,000,000원
- 추가 항목:
  - 취소수수료: 500,000원 (추가)
  - 단체 할인: 1,000,000원 (차감)

**기대 결과**:
- 총 여행경비: 40,000,000원
- 추가 비용: 500,000 - 1,000,000 = -500,000원
- 잔금: (40,000,000 - 500,000) - 15,000,000 = 24,500,000원

### 12.3 음수 잔금 테스트

**입력**:
- 총 여행경비: 10,000,000원
- 계약금: 15,000,000원

**기대 결과**:
- 잔금: -5,000,000원
- ⚠️ 경고 메시지 표시: "계약금이 총액보다 큽니다"

---

## 13. 문서화

### 13.1 사용자 가이드

**제목**: Advanced Mode 사용법

**내용**:
1. 계산 모드에서 "고급 계산" 선택
2. 1인당 요금과 총 인원 입력 → 자동으로 총경비 계산
3. 계약금 금액 및 설명 입력
4. 추가 비용이 있으면 "항목 추가" 버튼 클릭
5. 잔금이 자동으로 계산되어 하단에 표시
6. 미리보기 또는 PDF 생성

### 13.2 API 문서
- Swagger/OpenAPI 업데이트
- calculation_mode 필드 설명
- 예시 요청/응답 추가

---

## 14. 부록

### 14.1 참고 이미지
- **1-1.JPG**: 실제 인보이스 샘플

### 14.2 용어 정리
- **Simple Mode**: 기존 간편 계산 방식
- **Advanced Mode**: 계약금/잔금 고급 계산 방식
- **계약금**: 선금, 미리 받은 금액
- **잔금**: 총액에서 계약금을 뺀 나머지 금액
- **추가 비용**: 취소수수료, 할인 등 추가 항목

---

**문서 승인**
- 제품 관리자: _______________
- 개발 팀장: _______________
- 날짜: 2026-01-02
