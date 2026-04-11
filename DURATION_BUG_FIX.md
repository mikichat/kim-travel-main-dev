# Duration 계산 오류 수정

## 문제 설명

단체 정보 수정에서 **출발일 - 귀국일 기간이 5일간**인데, 상품 관리에는 **여행기간이 4일**로 표시되는 오류가 발생했습니다.

### 예시:
- **그룹:** 정정숙 가족여행
- **출발일:** 2025-11-30
- **귀국일:** 2025-12-04
- **실제 여행 기간:** 5일 (11/30, 12/1, 12/2, 12/3, 12/4)
- **상품 duration:** 4일 ❌ → 5일 ✅

---

## 원인 분석

### 1. 잘못된 Duration 계산 로직

여행 기간 계산 시 **출발일을 포함하지 않은** 로직이 사용되었습니다:

```javascript
// ❌ 잘못된 코드 (출발일 미포함)
Math.ceil((new Date(returnDate) - new Date(departureDate)) / (1000 * 60 * 60 * 24))

// 예: 2025-11-30 ~ 2025-12-04
// 계산: (12/4 - 11/30) = 4일
// 결과: Math.ceil(4) = 4일 ❌
// 문제: 출발일(11/30)이 포함되지 않음
```

### 2. 영향받은 파일

| 파일 | 위치 | 상태 |
|------|------|------|
| `index.html` | Line 1438 | ✅ 수정 완료 |
| `contract/legacy-html/index.html` | Line 1303 | ✅ 수정 완료 |

---

## 수정 내용

### 수정된 코드

```javascript
// ✅ 올바른 코드 (출발일 포함)
Math.ceil((new Date(returnDate) - new Date(departureDate)) / (1000 * 60 * 60 * 24)) + 1

// 예: 2025-11-30 ~ 2025-12-04
// 계산: (12/4 - 11/30) = 4일
// 결과: Math.ceil(4) + 1 = 5일 ✅
// 설명: +1을 추가하여 출발일 포함
```

### 수정된 파일

#### 1. index.html (Line 1438)

**Before:**
```javascript
duration: groupData.departureDate && groupData.returnDate ?
    Math.ceil((new Date(groupData.returnDate) - new Date(groupData.departureDate)) / (1000 * 60 * 60 * 24)) : 1,
```

**After:**
```javascript
duration: groupData.departureDate && groupData.returnDate ?
    Math.ceil((new Date(groupData.returnDate) - new Date(groupData.departureDate)) / (1000 * 60 * 60 * 24)) + 1 : 1,
```

#### 2. contract/legacy-html/index.html (Line 1303)

**Before:**
```javascript
duration: groupData.departureDate && groupData.returnDate ?
    Math.ceil((new Date(groupData.returnDate) - new Date(groupData.departureDate)) / (1000 * 60 * 60 * 24)) : 1,
```

**After:**
```javascript
duration: groupData.departureDate && groupData.returnDate ?
    Math.ceil((new Date(groupData.returnDate) - new Date(groupData.departureDate)) / (1000 * 60 * 60 * 24)) + 1 : 1,
```

---

## 기존 데이터 수정

### fix-product-duration.js 스크립트 생성

잘못 생성된 기존 상품의 duration을 자동으로 수정하는 스크립트를 작성했습니다:

```bash
node fix-product-duration.js
```

**수정 결과:**
```
상품: 태국 치앙마이
  현재 duration: 4일
  올바른 duration: 5일
  ⚠️ duration 불일치! 4일 → 5일로 수정
  ✅ 수정 완료!
```

---

## 테스트 결과

### 수정 전

```
그룹: 정정숙 가족여행
  그룹 여행 기간: 5일 (2025-11-30 ~ 2025-12-04)
  매칭 상품:
    ❌ 태국 치앙마이 - 4일
```

### 수정 후

```
그룹: 정정숙 가족여행
  그룹 여행 기간: 5일 (2025-11-30 ~ 2025-12-04)
  매칭 상품:
    ✅ 태국 치앙마이 - 5일
```

---

## 올바른 Duration 계산 방법

### 권장 방법 1: Math.ceil + 1

```javascript
const departure = new Date(departureDate);
const returnDay = new Date(returnDate);
const diffTime = Math.abs(returnDay - departure);
const duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1: 출발일 포함
```

### 권장 방법 2: Math.floor + 1 (더 안전)

```javascript
const departure = new Date(departureDate);
const returnDay = new Date(returnDate);

// 시간을 00:00:00으로 명시적으로 설정
departure.setHours(0, 0, 0, 0);
returnDay.setHours(0, 0, 0, 0);

const diffTime = returnDay - departure;
const duration = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1: 출발일 포함
```

**권장 이유:**
- `setHours(0, 0, 0, 0)`로 시간을 00:00:00으로 설정하여 타임존 이슈 방지
- `Math.floor` 사용으로 정확한 날짜 차이 계산
- `+ 1`로 출발일 명시적 포함

---

## 참고: 다른 Duration 계산 로직

### ProductMatcher.js (Line 151) - 이미 올바름 ✅

```javascript
static calculateDuration(departureDate, returnDate) {
    if (!departureDate || !returnDate) {
        return 0;
    }

    const departure = new Date(departureDate);
    const returnDay = new Date(returnDate);
    const diffTime = Math.abs(returnDay - departure);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1: 출발일 포함

    return diffDays;
}
```

**상태:** ✅ 이미 올바르게 구현됨 (+1 포함)

### frontend/static/js/group_form.js (Line 274) - 수정 불필요 ✅

```javascript
// 박수(숙박일수) 계산
const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
groupData.nights = Math.max(0, diffDays);
```

**상태:** ✅ 올바름 (숙박일수는 귀국일 미포함이 맞음)

**설명:**
- 여행 기간: 5일 (출발일 ~ 귀국일 포함)
- 숙박일수: 4박 (귀국일 전날까지)

---

## 테스트 케이스

### test-duration-calculation.js 결과

```
테스트 1: 5일 여행 (12/30 ~ 1/3)
출발일: 2025-12-30, 귀국일: 2026-01-03
예상 결과: 5일
현재 로직 결과: 5일 ✅
수정 로직 결과: 5일 ✅

테스트 2: 4일 여행 (12/30 ~ 1/2)
출발일: 2025-12-30, 귀국일: 2026-01-02
예상 결과: 4일
현재 로직 결과: 4일 ✅
수정 로직 결과: 4일 ✅

테스트 3: 3일 여행 (1/1 ~ 1/3)
출발일: 2026-01-01, 귀국일: 2026-01-03
예상 결과: 3일
현재 로직 결과: 3일 ✅
수정 로직 결과: 3일 ✅

테스트 4: 1일 여행 (같은 날)
출발일: 2026-01-01, 귀국일: 2026-01-01
예상 결과: 1일
현재 로직 결과: 1일 ✅
수정 로직 결과: 1일 ✅
```

---

## 생성된 테스트/수정 스크립트

| 파일 | 목적 |
|------|------|
| `test-duration-calculation.js` | Duration 계산 로직 테스트 |
| `check-duration-issue.js` | 실제 데이터에서 duration 불일치 확인 |
| `check-product-details.js` | 상품/그룹 상세 정보 확인 |
| `fix-product-duration.js` | 잘못된 상품 duration 자동 수정 |

---

## 수정 완료 체크리스트

- [x] index.html duration 계산 수정 (Line 1438)
- [x] contract/legacy-html/index.html duration 계산 수정 (Line 1303)
- [x] 기존 상품 데이터 수정 (태국 치앙마이: 4일 → 5일)
- [x] 수정 검증 완료 (check-duration-issue.js)
- [x] 테스트 케이스 작성 및 검증
- [x] 문서화 완료

---

## 결론

**문제:** 출발일-귀국일 기간 계산 시 출발일이 포함되지 않아 1일 부족하게 계산됨

**원인:** `Math.ceil(날짜차이 / 86400000)` 계산에서 `+1` 누락

**해결:** 모든 duration 계산 로직에 `+1` 추가 (출발일 포함)

**상태:** ✅ **완전히 수정됨**

---

**작성일:** 2025-12-28
**수정자:** Claude Code
**영향받은 파일:** 2개 (index.html, contract/legacy-html/index.html)
**수정된 데이터:** 1개 상품 (태국 치앙마이)
