# 미완료 작업 목록 및 우선순위
# Pending Tasks and Priorities

**작성일**: 2026-01-02
**최종 수정일**: 2026-01-03
**작성자**: Development Team
**프로젝트**: 인보이스 시스템 - Advanced Mode 구현

---

## 📊 진행 상황 요약

### ✅ 완료된 작업 (2026-01-03) - 코드 품질 개선

| 항목 | 상태 | 설명 |
|------|------|------|
| `formatCurrency` 중복 함수 제거 | ✅ 완료 | `invoice-editor.js`에서 중복 정의된 함수 제거 (809-814줄 삭제) |
| 환경 변수 분리 (`config.js`) | ✅ 완료 | 하드코딩된 `API_BASE_URL`을 중앙 설정 파일로 분리 |
| PDF 생성 기능 확인 | ✅ 작동 중 | 클라이언트 측 PDF 생성 (jsPDF + html2canvas) 정상 작동 확인 |

#### 환경 변수 분리 상세

**새로 생성된 파일**: `in/js/config.js`

```javascript
const CONFIG = {
    API_BASE_URL: 'http://localhost:5000/api',
    ENV: 'development',
    COMPANY: { NAME: '(유)여행세상', CEO: '김국진', ... },
    IMAGES: { LOGO: '이미지/브랜드.jpg', SEAL: '이미지/사용인감2.jpg' },
    STORAGE_KEYS: { RECIPIENTS: 'invoice_recipients', ... },
    PAGINATION: { DEFAULT_LIMIT: 20, MAX_LIMIT: 100 }
};
```

**수정된 파일**:
- `in/js/invoice-editor.js` - CONFIG에서 API_BASE_URL 가져오도록 수정
- `in/invoice-editor.html` - config.js 스크립트 로드 추가
- `in/invoice-list.html` - config.js 스크립트 로드 + URL 분리

**운영 환경 배포 시**: `config.js`의 `API_BASE_URL`만 수정하면 됨

---

### ✅ 완료된 작업 (2026-01-03) - 작동하지 않는 기능 수정

| 항목 | 상태 | 설명 |
|------|------|------|
| `toggleCalculationMode` 함수 추가 | ✅ 완료 | 계산 모드 전환 함수 (프로그래매틱 호출용) 추가 |
| `addExtraItem` 함수 수정 | ✅ 완료 | 초기값 파라미터 지원하도록 수정 (인보이스 불러오기 시 필요) |
| 인보이스 목록 테이블 수정 | ✅ 완료 | 총액/잔금 컬럼을 단일 금액 컬럼으로 통합 (레이아웃 문제 해결) |

### ✅ 완료된 작업 (2026-01-03) - 잔금 표시 형식 개선

| 항목 | 상태 | 설명 |
|------|------|------|
| 잔금 라인 수식 표시 | ✅ 완료 | `잔금: (여행경비 + 추가항목 - 계약금) ₩금액` 형식으로 변경 |
| 편집 페이지 적용 | ✅ 완료 | `invoice-editor.html` 잔금 계산 섹션 |
| 미리보기/PDF 적용 | ✅ 완료 | `invoice-preview.html` Advanced Mode 섹션 |
| 목록 페이지 적용 | ✅ 완료 | `invoice-list.html` 금액 컬럼 |

**표시 형식:**
```
잔금: (여행경비 + 취소수수료 - 할인 - 계약금) ₩18,820,000
```

#### 수정된 파일 상세

**`in/js/invoice-editor.js`**:
```javascript
// 추가된 함수: toggleCalculationMode
function toggleCalculationMode(mode) {
    const simpleSection = document.getElementById('simple-mode-section');
    const advancedSection = document.getElementById('advanced-mode-section');
    
    if (mode === 'simple') {
        simpleSection.style.display = 'block';
        advancedSection.style.display = 'none';
    } else if (mode === 'advanced') {
        simpleSection.style.display = 'none';
        advancedSection.style.display = 'block';
    }
}

// 수정된 함수: addExtraItem (초기값 지원)
function addExtraItem(initialData) {
    const name = initialData?.name || '';
    const amount = initialData?.amount || '';
    const description = initialData?.description || '';
    const type = initialData?.type || 'add';
    // ... HTML 생성 시 초기값 적용
}
```

**`in/invoice-list.html`**:
- 테이블 헤더: `총액`, `잔금` 컬럼 → 단일 `금액` 컬럼으로 통합
- 행 렌더링: Advanced Mode는 잔금, Simple Mode는 총액 표시
- 금액 라벨 표시 (`잔금` 또는 `총액`)

---

### ✅ 완료된 작업 (2026-01-02)

| 항목 | 상태 | 완료율 |
|------|------|--------|
| PDF 생성 기능 | ✅ 완료 | 100% |
| UI/UX 개선 (레이블 간격, 인감 위치) | ✅ 완료 | 100% |
| Advanced Mode Phase 1 (프론트엔드) | ✅ 완료 | 100% |
| 미리보기/PDF에 Advanced Mode 표시 | ✅ 완료 | 100% |
| Advanced Mode Phase 2 (백엔드 API) | ✅ 완료 | 100% |
| Phase 2 API 엔드포인트 테스트 | ✅ 완료 | 100% |
| Phase 2 프론트엔드 저장 로직 | ✅ 완료 | 100% |
| Phase 3 인보이스 목록 페이지 | ✅ 완료 | 100% |
| Phase 3 편집 기능 | ✅ 완료 | 100% |
| Phase 4 템플릿 저장 기능 | ✅ 완료 | 100% |
| Phase 4 Excel/CSV 내보내기 | ✅ 완료 | 100% |
| Phase 4 잔금 알림 기능 | ✅ 완료 | 100% |

**총 진행률**: **Phase 1-4 완료 (약 90%)**

---

## 🚧 미완료 작업 (Phase 2-5)

### Phase 2: 데이터베이스 및 API 연동

#### ✅ 완료된 작업 (2026-01-02)

1. **데이터베이스 스키마 확장** ✅
   - ✅ 마이그레이션 스크립트 작성 (`add_advanced_mode_columns.js`)
   - ✅ 백업 생성 (`travel_agency.db.backup_20260102`)
   - ✅ 8개 컬럼 추가 성공:
     - `calculation_mode` - 계산 모드
     - `base_price_per_person` - 1인당 요금
     - `total_participants` - 총 인원
     - `total_travel_cost` - 총 여행경비
     - `deposit_amount` - 계약금 금액
     - `deposit_description` - 계약금 설명
     - `additional_items` - 추가 비용 항목 (JSON)
     - `balance_due` - 잔금
   - ✅ 테스트 스크립트 작성 및 실행 (`test_advanced_mode.js`)
   - ✅ 모든 CRUD 작업 테스트 통과

   **파일 위치**:
   - `backend/migrations/add_advanced_mode_columns.js`
   - `backend/migrations/test_advanced_mode.js`
   - `backend/migrations/MIGRATION_LOG.md`
   - `backend/migrations/README.md`

   **테스트 결과**:
   ```
   ✅ INSERT - Working
   ✅ SELECT - Working
   ✅ UPDATE - Working
   ✅ DELETE - Working
   ✅ JSON storage - Working
   ```

#### ✅ 완료된 작업 (2026-01-02)

2. **백엔드 API 수정** ✅
   - **파일**: `backend/routes/invoices.js`
   - **완료 내용**:
     - ✅ `POST /api/invoices` - Advanced Mode 데이터 저장
     - ✅ `GET /api/invoices/:id` - Advanced Mode 데이터 조회 및 JSON 파싱
     - ✅ `PUT /api/invoices/:id` - Advanced Mode 데이터 수정
   - **테스트**: `backend/test_api_advanced_mode.js` - 모든 테스트 통과 ✅

   **주요 변경사항**:
   - POST: calculation_mode 필드에 따라 Advanced/Simple 모드 분기 처리
   - GET: additional_items JSON 자동 파싱
   - PUT: additional_items 배열 자동 JSON 변환, balance_due → total_amount 동기화

#### ✅ 완료된 작업 (2026-01-02)

3. **프론트엔드 저장 로직 수정** ✅
   - **파일**: `in/js/invoice-editor.js:479-566`
   - **완료 내용**:
     - ✅ `handleSubmit()` 함수 전면 재작성
     - ✅ `collectFormData()` 함수 활용
     - ✅ Advanced/Simple Mode 유효성 검증
     - ✅ API 호출을 위한 데이터 변환 (평탄화)
     - ✅ flight_schedule_id, bank_account_id 추출

   **주요 변경사항**:
   - collectFormData()로 통합 데이터 수집
   - advanced_calculation 객체를 API 형식으로 평탄화
   - Simple Mode 항목을 airfare/seat_preference로 자동 매핑
   - 필수 필드 및 모드별 유효성 검증 추가

**Phase 2 완료**: 이제 브라우저에서 Advanced Mode 인보이스를 생성하고 저장할 수 있습니다!

---

### Phase 3: 저장 및 불러오기 기능 ⚠️ **중간 우선순위**

#### 필요한 작업:

1. **인보이스 저장 기능**
   - 현재 "저장" 버튼 클릭 시 Advanced Mode 데이터 포함
   - 성공 메시지 및 리디렉션

2. **저장된 인보이스 불러오기**
   - 인보이스 목록 페이지에서 클릭 시 편집기 로드
   - Advanced Mode 데이터 복원
   - 계산 모드 자동 선택

3. **인보이스 목록 UI 개선**
   - Advanced Mode 인보이스는 "잔금" 컬럼 표시
   - Simple Mode 인보이스는 "총액" 컬럼 표시
   - 계산 모드 배지 표시 (간편/고급)

#### 예상 작업 시간: **2-3시간**

---

### Phase 4: 고급 기능 💡 **낮은 우선순위**

#### 선택적 기능 (추후 구현):

1. **템플릿 저장 기능**
   - 자주 사용하는 계약금 설명 저장
   - 추가 비용 항목 템플릿
   - localStorage 또는 DB에 저장

2. **Excel 내보내기**
   - Advanced Mode 계산 내역 포함
   - SheetJS (xlsx) 라이브러리 사용

3. **잔금 알림 기능**
   - 음수 잔금 시 경고 알림
   - 미수금 추적

4. **계산 이력 추적**
   - 인보이스 수정 이력 저장
   - 계산 변경 로그

#### 예상 작업 시간: **4-6시간**

---

### Phase 5: 테스트 및 문서화 📝 **중간 우선순위**

#### 필요한 작업:

1. **단위 테스트**
   - 계산 로직 테스트 (Jest 또는 Mocha)
   - 유효성 검증 테스트
   - 예상 입력/출력 시나리오

2. **통합 테스트**
   - 미리보기 생성 테스트
   - PDF 생성 테스트
   - 저장/불러오기 테스트

3. **사용자 매뉴얼**
   - Advanced Mode 사용법 작성
   - 스크린샷 포함
   - FAQ 추가

4. **API 문서 업데이트**
   - Swagger/OpenAPI 스펙 업데이트
   - 새 필드 설명 추가

#### 예상 작업 시간: **3-4시간**

---

## 🎯 우선순위별 로드맵

### 🔴 **긴급 (1주일 이내)**
1. ✅ ~~Phase 1: 프론트엔드 UI 및 계산 로직~~ (완료)
2. ✅ ~~Phase 2: DB 및 API 연동~~ (완료)
   - ✅ 데이터베이스 마이그레이션 완료
   - ✅ API 엔드포인트 업데이트 완료
   - ✅ API 테스트 통과

### 🟡 **중요 (2주일 이내)**
3. ⚠️ **Phase 3: 저장/불러오기 기능** (미완료)
4. ⚠️ **Phase 5: 기본 테스트** (미완료)

### 🟢 **선택 (추후 구현)**
5. 💡 Phase 4: 고급 기능 (템플릿, Excel 등)
6. 💡 Phase 5: 고급 테스트 및 문서

---

## 📋 즉시 시작 가능한 다음 단계

### 1️⃣ **데이터베이스 마이그레이션** (30분)

```bash
# SQLite 데이터베이스 백업
cp backend/database.db backend/database.db.backup

# 마이그레이션 스크립트 실행
node backend/migrations/add_advanced_mode_columns.js
```

**필요한 파일**: `backend/migrations/add_advanced_mode_columns.js` (생성 필요)

---

### 2️⃣ **API 엔드포인트 수정** (1-2시간)

**파일**: `backend/routes/invoices.js` 또는 `backend/server.js`

**수정 예시**:
```javascript
// POST /api/invoices
app.post('/api/invoices', (req, res) => {
    const {
        recipient,
        invoice_date,
        description,
        calculation_mode,
        advanced_calculation, // 신규
        items,
        flight_schedule_id,
        bank_account_id
    } = req.body;

    // Advanced Mode 데이터 처리
    if (calculation_mode === 'advanced' && advanced_calculation) {
        const {
            base_price_per_person,
            total_participants,
            total_travel_cost,
            deposit_amount,
            deposit_description,
            additional_items,
            balance_due
        } = advanced_calculation;

        // DB에 저장
        const stmt = db.prepare(`
            INSERT INTO invoices (
                recipient, invoice_date, description,
                calculation_mode,
                base_price_per_person, total_participants, total_travel_cost,
                deposit_amount, deposit_description,
                additional_items, balance_due,
                flight_schedule_id, bank_account_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            recipient, invoice_date, description,
            calculation_mode,
            base_price_per_person, total_participants, total_travel_cost,
            deposit_amount, deposit_description,
            JSON.stringify(additional_items), balance_due,
            flight_schedule_id, bank_account_id
        );
    } else {
        // 기존 Simple Mode 로직
        // ...
    }
});
```

---

### 3️⃣ **프론트엔드 저장 로직 수정** (30분)

**파일**: `in/js/invoice-editor.js`

**수정 위치**: `handleSubmit()` 함수 또는 폼 제출 이벤트

```javascript
// 기존 코드 수정
document.getElementById('invoice-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    // collectFormData() 사용 (이미 구현됨!)
    const formData = collectFormData();

    // 유효성 검증
    if (formData.calculation_mode === 'advanced') {
        const errors = validateAdvancedMode();
        if (errors.length > 0) {
            alert('입력 오류:\n' + errors.join('\n'));
            return;
        }
    }

    // API 호출
    try {
        const response = await fetch(`${API_BASE_URL}/invoices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            const invoice = await response.json();
            alert('인보이스가 저장되었습니다.');
            // 목록 페이지로 이동
            window.location.href = '/invoices';
        } else {
            const error = await response.json();
            alert(`저장 실패: ${error.error}`);
        }
    } catch (error) {
        console.error('저장 오류:', error);
        alert('저장 중 오류가 발생했습니다.');
    }
});
```

---

## ⚠️ 현재 시스템 제약사항

### 작동하는 기능:
✅ Advanced Mode 입력 (프론트엔드)
✅ 실시간 계산
✅ 미리보기 표시
✅ PDF 생성 (jsPDF + html2canvas, 클라이언트 측)
✅ CSV 내보내기
✅ 환경 변수 중앙 관리 (`config.js`)

### 작동하는 기능 (2026-01-03 수정 완료):
✅ Advanced Mode 데이터 저장 (API + 프론트엔드)
✅ 저장된 인보이스 불러오기 (addExtraItem 수정)
✅ Advanced Mode 인보이스 수정 (PUT API)
✅ 인보이스 목록에서 잔금 표시 (테이블 레이아웃 수정)

### 코드 품질 개선 완료 (2026-01-03):
✅ 중복 함수 제거 (`formatCurrency`)
✅ 하드코딩된 URL 제거 → `config.js`로 분리
✅ 폴백 패턴 적용 (config 미로드 시 기본값 사용)

---

## 🔧 추천 구현 순서

### ✅ 완료된 작업 (2026-01-03)
1. ~~**코드 품질 개선**~~ ✅
   - ~~중복 함수 제거~~ ✅
   - ~~환경 변수 분리~~ ✅
   - ~~PDF 생성 확인~~ ✅

### 🔴 다음 우선순위 작업
1. **템플릿 관리 UI** (1-2시간) - 자주 쓰는 항목 저장/불러오기
2. **이미지 업로드** (1-2시간) - 로고/도장 동적 변경
3. **보안 강화 (JWT)** (3-4시간) - API 인증 추가
4. **단위 테스트** (2-3시간) - 계산 로직 테스트

**총 예상 시간**: **8-11시간**

---

## 📝 참고 문서

- **PRD**: `in/docs/INVOICE_CALCULATION_PRD.md` - 전체 요구사항
- **요약**: `in/docs/INVOICE_SYSTEM_SUMMARY.md` - 시스템 개요
- **샘플**: `in/1-1.JPG` - 실제 인보이스 예시

---

## 💬 문의 및 지원

Advanced Mode 구현 관련 질문:
1. 데이터베이스 스키마 변경 방법
2. API 엔드포인트 수정 위치
3. 기존 인보이스 데이터 마이그레이션 전략

---

**다음 작업 시작 시**: 이 문서의 "즉시 시작 가능한 다음 단계"부터 순서대로 진행하세요.
