# TRD — 인보이스 생성 시스템

## 1. 문서 목적 (Technical Purpose)

본 문서는 PRD에서 정의된 요구사항을 기반으로 **실제 개발을 위한 기술 설계 기준**을 정의한다.

- 개발자 구현 기준 문서
- DB / API / 문서 출력 / 자동 계산 로직의 기술적 상세 명시
- 향후 유지보수 및 확장을 고려한 구조 제안

---

## 2. 시스템 아키텍처 개요

### 2.1 전체 구조

```
[Web Frontend]
   ↓ (REST API)
[Backend Application]
   ├── Node.js/Express
   └── Python/FastAPI
   ↓
[Database]
   ├── SQLite (Node.js)
   └── PostgreSQL (Python)
   ↓
[HTML Template Engine]
   ↓
[PDF Generator]
   ├── Puppeteer/html-pdf-node (Node.js)
   └── WeasyPrint/pdfkit (Python)
```

### 2.2 기술 스택

| 구분 | 기술 | 버전 | 비고 |
|---|---|---|---|
| Frontend | HTML5 + CSS3 + JavaScript | - | Vanilla JS |
| Backend (Node.js) | Node.js + Express | 18.x / 4.x | |
| Backend (Python) | Python + FastAPI | 3.10+ / Latest | |
| Database (Node.js) | SQLite | 3.x | |
| Database (Python) | PostgreSQL | 14+ | 또는 SQLite |
| PDF (Node.js) | puppeteer 또는 html-pdf-node | Latest | |
| PDF (Python) | WeasyPrint 또는 pdfkit | Latest | |
| Template | HTML Template | - | 동적 바인딩 |

---

## 3. 데이터베이스 기술 설계

### 3.1 핵심 테이블

- flight_schedules (항공 스케줄)
- bank_accounts (은행 계좌 정보)
- invoices (인보이스 메타데이터)

상세 스키마는 `Database-Design.md` 참조.

---

## 4. API 설계

### 4.1 항공 스케줄 관리 API

#### 4.1.1 항공 스케줄 목록 조회

```
GET /api/flight-schedules
Query Parameters:
  - group_id: string (optional) - 단체 ID 필터
  - departure_date_from: date (optional) - 출발일 시작 범위
  - departure_date_to: date (optional) - 출발일 종료 범위
  - page: integer (default: 1)
  - limit: integer (default: 20)

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "group_id": "uuid",
      "group_name": "라오스 여행",
      "airline": "아시아나항공",
      "flight_number": "OZ729",
      "departure_date": "2026-02-26",
      "departure_airport": "ICN",
      "departure_time": "20:35",
      "arrival_date": "2026-02-27",
      "arrival_airport": "VTE",
      "arrival_time": "00:25",
      "passengers": 5,
      "created_at": "2025-12-17T10:00:00"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

#### 4.1.2 항공 스케줄 상세 조회

```
GET /api/flight-schedules/:id

Response 200:
{
  "id": "uuid",
  "group_id": "uuid",
  "group_name": "라오스 여행",
  "airline": "아시아나항공",
  "flight_number": "OZ729",
  ...
}
```

#### 4.1.3 항공 스케줄 생성

```
POST /api/flight-schedules
Content-Type: application/json

Request Body:
{
  "group_id": "uuid",
  "group_name": "라오스 여행",
  "airline": "아시아나항공",
  "flight_number": "OZ729",
  "departure_date": "2026-02-26",
  "departure_airport": "ICN",
  "departure_time": "20:35",
  "arrival_date": "2026-02-27",
  "arrival_airport": "VTE",
  "arrival_time": "00:25",
  "passengers": 5
}

Response 201:
{
  "id": "uuid",
  ...
}
```

#### 4.1.4 항공 스케줄 수정

```
PUT /api/flight-schedules/:id
Content-Type: application/json

Request Body:
{
  "airline": "대한항공",
  ...
}

Response 200:
{
  "id": "uuid",
  ...
}
```

#### 4.1.5 항공 스케줄 삭제

```
DELETE /api/flight-schedules/:id

Response 204: No Content
```

---

### 4.2 은행 계좌 관리 API

#### 4.2.1 은행 계좌 목록 조회

```
GET /api/bank-accounts

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "bank_name": "하나은행",
      "account_number": "611-016420-721",
      "account_holder": "(유)여행세상",
      "is_default": true,
      "created_at": "2025-12-17T10:00:00"
    }
  ]
}
```

#### 4.2.2 은행 계좌 추가

```
POST /api/bank-accounts
Content-Type: application/json

Request Body:
{
  "bank_name": "하나은행",
  "account_number": "611-016420-721",
  "account_holder": "(유)여행세상",
  "is_default": false
}

Response 201:
{
  "id": "uuid",
  ...
}
```

#### 4.2.3 기본 계좌 설정

```
PUT /api/bank-accounts/:id/set-default

Response 200:
{
  "id": "uuid",
  "is_default": true,
  ...
}
```

---

### 4.3 인보이스 관리 API

#### 4.3.1 인보이스 목록 조회

```
GET /api/invoices
Query Parameters:
  - invoice_date_from: date (optional)
  - invoice_date_to: date (optional)
  - recipient: string (optional)
  - page: integer (default: 1)
  - limit: integer (default: 20)

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "invoice_number": "INV-2025-001",
      "recipient": "무주 성립관광",
      "invoice_date": "2025-12-17",
      "total_amount": 3710000,
      "created_at": "2025-12-17T10:00:00"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

#### 4.3.2 인보이스 상세 조회

```
GET /api/invoices/:id

Response 200:
{
  "id": "uuid",
  "invoice_number": "INV-2025-001",
  "recipient": "무주 성립관광",
  "invoice_date": "2025-12-17",
  "description": "라오스 - 비엔티엔 항공권",
  "flight_schedule": {
    "id": "uuid",
    "airline": "아시아나항공",
    ...
  },
  "airfare_unit_price": 650000,
  "airfare_quantity": 5,
  "airfare_total": 3250000,
  "seat_preference_unit_price": 92000,
  "seat_preference_quantity": 5,
  "seat_preference_total": 460000,
  "total_amount": 3710000,
  "bank_account": {
    "id": "uuid",
    "bank_name": "하나은행",
    ...
  },
  ...
}
```

#### 4.3.3 인보이스 생성

```
POST /api/invoices
Content-Type: application/json

Request Body:
{
  "recipient": "무주 성립관광",
  "invoice_date": "2025-12-17",
  "description": "라오스 - 비엔티엔 항공권",
  "flight_schedule_id": "uuid",
  "airfare_unit_price": 650000,
  "airfare_quantity": 5,
  "seat_preference_unit_price": 92000,
  "seat_preference_quantity": 5,
  "bank_account_id": "uuid"
}

Response 201:
{
  "id": "uuid",
  "invoice_number": "INV-2025-001",
  ...
}
```

#### 4.3.4 인보이스 수정

```
PUT /api/invoices/:id
Content-Type: application/json

Request Body:
{
  "recipient": "무주 성립관광 (수정)",
  ...
}

Response 200:
{
  "id": "uuid",
  ...
}
```

#### 4.3.5 PDF 생성

```
POST /api/invoices/:id/generate-pdf

Response 200:
{
  "id": "uuid",
  "pdf_file_path": "/path/to/invoice.pdf",
  "pdf_file_name": "인보이스_무주성립관광_20251217.pdf"
}
```

#### 4.3.6 PDF 다운로드

```
GET /api/invoices/:id/download

Response 200:
Content-Type: application/pdf
Content-Disposition: attachment; filename="인보이스_무주성립관광_20251217.pdf"

[PDF Binary Data]
```

---

## 5. 자동 계산 로직 구현

### 5.1 프론트엔드 계산 로직

```javascript
// 항공료 합계 계산
function calculateAirfareTotal() {
    const unitPrice = parseFloat(document.getElementById('airfare-unit').value) || 0;
    const quantity = parseInt(document.getElementById('airfare-quantity').value) || 0;
    const total = unitPrice * quantity;
    document.getElementById('airfare-total').textContent = formatCurrency(total);
    calculateTotalAmount();
}

// 선호좌석 합계 계산
function calculateSeatTotal() {
    const unitPrice = parseFloat(document.getElementById('seat-unit').value) || 0;
    const quantity = parseInt(document.getElementById('seat-quantity').value) || 0;
    const total = unitPrice * quantity;
    document.getElementById('seat-total').textContent = formatCurrency(total);
    calculateTotalAmount();
}

// 총액 계산
function calculateTotalAmount() {
    const airfareTotal = parseFloat(document.getElementById('airfare-total').textContent.replace(/[^0-9]/g, '')) || 0;
    const seatTotal = parseFloat(document.getElementById('seat-total').textContent.replace(/[^0-9]/g, '')) || 0;
    const total = airfareTotal + seatTotal;
    document.getElementById('total-amount').textContent = formatCurrency(total);
}

// 통화 포맷
function formatCurrency(amount) {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW'
    }).format(amount);
}
```

### 5.2 백엔드 계산 로직

#### Node.js/Express

```javascript
function calculateInvoiceTotals(invoice) {
    const airfareTotal = invoice.airfare_unit_price * invoice.airfare_quantity;
    const seatTotal = invoice.seat_preference_unit_price * invoice.seat_preference_quantity;
    const totalAmount = airfareTotal + seatTotal;
    
    return {
        ...invoice,
        airfare_total: airfareTotal,
        seat_preference_total: seatTotal,
        total_amount: totalAmount
    };
}
```

#### Python/FastAPI

```python
def calculate_invoice_totals(invoice: InvoiceCreate) -> dict:
    airfare_total = invoice.airfare_unit_price * invoice.airfare_quantity
    seat_total = invoice.seat_preference_unit_price * invoice.seat_preference_quantity
    total_amount = airfare_total + seat_total
    
    return {
        "airfare_total": airfare_total,
        "seat_preference_total": seat_total,
        "total_amount": total_amount
    }
```

---

## 6. PDF 생성 구현

### 6.1 HTML 템플릿 구조

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>인보이스</title>
    <style>
        /* 인보이스 스타일 */
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- 로고 -->
        <div class="logo">
            <img src="{{logo_path}}" alt="로고" />
        </div>
        
        <!-- 기본 정보 -->
        <div class="invoice-info">
            <div>수신: {{recipient}}</div>
            <div>일자: {{invoice_date}}</div>
        </div>
        
        <!-- 항공 스케줄 -->
        <div class="flight-schedule">
            <!-- 항공 정보 표 -->
        </div>
        
        <!-- 항목 테이블 -->
        <table class="items-table">
            <tr>
                <td>항공료</td>
                <td>{{airfare_unit_price}} × {{airfare_quantity}} = {{airfare_total}}</td>
            </tr>
            <tr>
                <td>선호좌석</td>
                <td>{{seat_preference_unit_price}} × {{seat_preference_quantity}} = {{seat_preference_total}}</td>
            </tr>
        </table>
        
        <!-- 총액 -->
        <div class="total">
            TOTAL: {{total_amount}}
        </div>
        
        <!-- 은행 정보 -->
        <div class="bank-info">
            <div>{{bank_name}}</div>
            <div>{{account_number}}</div>
            <div>{{account_holder}}</div>
        </div>
        
        <!-- 도장 -->
        <div class="seal">
            <img src="{{seal_path}}" alt="도장" />
        </div>
    </div>
</body>
</html>
```

### 6.2 PDF 변환

#### Node.js (puppeteer)

```javascript
const puppeteer = require('puppeteer');

async function generatePDF(htmlContent) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    const pdf = await page.pdf({
        format: 'A4',
        printBackground: true
    });
    await browser.close();
    return pdf;
}
```

#### Python (WeasyPrint)

```python
from weasyprint import HTML

def generate_pdf(html_content: str) -> bytes:
    html = HTML(string=html_content)
    pdf_bytes = html.write_pdf()
    return pdf_bytes
```

---

## 7. 이미지 업로드 구현

### 7.1 파일 업로드 API

```
POST /api/invoices/:id/upload-logo
Content-Type: multipart/form-data

Request:
- file: File (image/jpeg, image/png, max 10MB)

Response 200:
{
  "logo_path": "/uploads/invoices/uuid/logo.jpg"
}
```

### 7.2 파일 검증

```javascript
function validateImageFile(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedTypes.includes(file.type)) {
        throw new Error('이미지 파일만 업로드 가능합니다.');
    }
    
    if (file.size > maxSize) {
        throw new Error('파일 크기는 10MB 이하여야 합니다.');
    }
    
    return true;
}
```

---

## 8. 에러 처리

### 8.1 에러 응답 형식

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "항공료 단가는 0 이상이어야 합니다.",
    "details": {
      "field": "airfare_unit_price",
      "value": -1000
    }
  }
}
```

### 8.2 에러 코드

- `INVALID_INPUT`: 잘못된 입력값
- `NOT_FOUND`: 리소스를 찾을 수 없음
- `DUPLICATE`: 중복된 값
- `CALCULATION_ERROR`: 계산 오류
- `PDF_GENERATION_ERROR`: PDF 생성 오류
- `FILE_UPLOAD_ERROR`: 파일 업로드 오류

---

## 9. 성능 고려사항

### 9.1 데이터베이스 쿼리 최적화
- 인덱스 활용
- 페이징 처리
- 필요한 필드만 조회

### 9.2 PDF 생성 최적화
- 비동기 처리
- 캐싱 (동일 인보이스 재생성 시)

---

## 10. 구현 완료 사항 (2026-01-01 업데이트)

### 10.1 동적 항목 관리 시스템

**구현 내용:**
- 항목을 배열로 관리하여 무제한 추가/삭제 가능
- 기본 항목: 항공료, 선호좌석
- 추가 가능 항목: 여행경비, 잔액, 기타 비용 등
- 각 항목: 이름, 단가, 수량, 합계 자동 계산

**기술 구현:**
```javascript
// 항목 데이터 구조
let invoiceItems = [
    { id: 'item-1', name: '항공료', unitPrice: 0, quantity: 0 },
    { id: 'item-2', name: '선호좌석', unitPrice: 0, quantity: 0 }
];

// 동적 렌더링
function renderItems() {
    // 항목 행 동적 생성
    // 이벤트 리스너 자동 연결
    // 실시간 계산
}
```

### 10.2 이미지 관리

**구현 내용:**
- 로고: `이미지/브랜드.jpg` 자동 로드
- 도장: `이미지/사용인감2.jpg` 자동 로드
- 이미지 로드 실패 시 플레이스홀더 표시

**기술 구현:**
```html
<img src="이미지/브랜드.jpg" alt="로고" 
     onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
```

### 10.3 회사 정보 추가

**구현 내용:**
- 하단에 (유)여행세상 대표이사 김국진 정보 표시
- 주소, 연락처 정보 포함

### 10.4 미리보기 기능

**구현 내용:**
- 현재 입력 데이터를 새 창에서 미리보기
- 인쇄 스타일 최적화
- 동적 항목 렌더링

**기술 구현:**
- URL 파라미터로 데이터 전달
- JSON 직렬화/역직렬화
- 동적 테이블 생성

### 10.5 파일 구조

```
in/
├── docs/                    # 문서
├── css/
│   └── invoice.css         # 스타일
├── js/
│   └── invoice-editor.js   # 편집 로직
├── 이미지/
│   ├── 브랜드.jpg          # 로고
│   └── 사용인감2.jpg       # 도장
├── invoice-editor.html     # 편집 페이지
└── invoice-preview.html    # 미리보기 페이지
```

---

**작성일**: 2026-01-01
**최종 업데이트**: 2026-01-01
**버전**: 1.1
**작성자**: Technical Team
