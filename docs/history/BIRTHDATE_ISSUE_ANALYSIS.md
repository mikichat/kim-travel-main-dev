# 생년월일 2자리 연도 처리 문제 분석

## 🚨 발견된 문제

### 현재 코드의 문제점 (group-roster-manager-v2 (3).html, Line 880-892)

```javascript
// ddMMMyy 형식 (예: "13JUN32", "13jun32", "13-JUN-32", "13 JUN 32" - 여권 날짜 형식)
const ddMMMyyMatch = dateValue.match(/^(\d{1,2})[\s-]*([A-Za-z]{3})[\s-]*(\d{2})$/);
if (ddMMMyyMatch) {
    const day = String(ddMMMyyMatch[1]).padStart(2, '0');
    const monthStr = ddMMMyyMatch[2].toUpperCase();
    const yearShort = ddMMMyyMatch[3];
    const month = monthMap[monthStr];
    if (month) {
        // ❌ 문제: 여권 만료일은 항상 2000년대 (20xx)
        const year = '20' + yearShort;
        return `${year}-${month}-${day}`;
    }
}
```

**문제점:**
- 2자리 연도를 **무조건 2000년대(20xx)로 변환**
- 주석에 "여권 만료일"이라고 명시되어 있지만, 같은 함수가 **생년월일에도 사용됨**
- **생년월일이 1900년대(19xx)인 경우를 처리하지 못함**

---

## 📊 테스트 결과

### 2자리 연도 '85' 입력 시:

| 방법 | 결과 | 만 나이 | 정확성 |
|------|------|---------|--------|
| **현재 코드 (무조건 20xx)** | **2085년** | **-60세** | ❌ |
| **권장 방법 (현재 연도 기준)** | **1985년** | **40세** | ✅ |

### 2자리 연도 '99' 입력 시:

| 방법 | 결과 | 만 나이 | 정확성 |
|------|------|---------|--------|
| **현재 코드 (무조건 20xx)** | **2099년** | **-74세** | ❌ |
| **권장 방법 (현재 연도 기준)** | **1999년** | **26세** | ✅ |

---

## 🔍 현재 데이터베이스 상태

### 고객 테이블 (10명)

모든 생년월일이 **4자리 연도(YYYY-MM-DD)**로 올바르게 저장됨:

| 이름 | 생년월일 | 연도 | 만 나이 |
|------|----------|------|---------|
| JEONG/YOONSEO | 1979-05-15 | 1979 (1900년대) | 46세 ✅ |
| KANG/DONG WON | 1975-02-10 | 1975 (1900년대) | 50세 ✅ |
| YANG/SUNKYUNG | 1970-08-19 | 1970 (1900년대) | 55세 ✅ |
| JUNG/JUNG SUK | 1975-05-05 | 1975 (1900년대) | 50세 ✅ |
| 테스트이영희 | 1985-07-10 | 1985 (1900년대) | 40세 ✅ |
| 테스트김철수 | 1975-03-20 | 1975 (1900년대) | 50세 ✅ |
| 테스트홍길동 | 1980-05-15 | 1980 (1900년대) | 45세 ✅ |
| 박민수 | 1988-11-30 | 1988 (1900년대) | 37세 ✅ |
| 김철수 | 1985-03-15 | 1985 (1900년대) | 40세 ✅ |
| 이영희 | 1990-07-22 | 1990 (1900년대) | 35세 ✅ |

**결론:** 기존 데이터는 정상 ✅

---

## ⚠️ 잠재적 문제 상황

### 케이스 1: 엑셀 업로드 시 2자리 연도 입력

엑셀에서 생년월일을 "85-05-15" (1985년 5월 15일) 형식으로 입력하면:
- **현재 코드**: 2085-05-15로 변환 ❌
- **예상 나이**: -60세 ❌
- **올바른 처리**: 1985-05-15로 변환되어야 함 ✅

### 케이스 2: ddMMMyy 형식 입력 (예: 15MAY85)

- **현재 코드**: 2085-05-15로 변환 ❌
- **올바른 처리**: 1985-05-15로 변환되어야 함 ✅

### 케이스 3: 여권 만료일 입력 (예: 15MAY32)

- **현재 코드**: 2032-05-15로 변환 ✅ (올바름)
- **이유**: 여권 만료일은 미래 날짜이므로 2000년대가 맞음

---

## 💡 해결 방안

### 방법 1: formatDate 함수에 타입 파라미터 추가 (권장)

```javascript
const formatDate = (dateValue, dateType = 'birth') => {
    // ... 기존 로직 ...

    // ddMMMyy 형식 처리
    const ddMMMyyMatch = dateValue.match(/^(\d{1,2})[\s-]*([A-Za-z]{3})[\s-]*(\d{2})$/);
    if (ddMMMyyMatch) {
        const day = String(ddMMMyyMatch[1]).padStart(2, '0');
        const monthStr = ddMMMyyMatch[2].toUpperCase();
        const yearShort = parseInt(ddMMMyyMatch[3]);
        const month = monthMap[monthStr];

        if (month) {
            let year;

            if (dateType === 'passport') {
                // 여권 만료일은 항상 미래 날짜 (2000년대)
                year = 2000 + yearShort;
            } else {
                // 생년월일: 현재 연도 기준으로 판단
                const currentYear = new Date().getFullYear();
                const currentYearShort = currentYear % 100;

                // 2자리 연도가 현재 연도보다 크면 1900년대, 작거나 같으면 2000년대
                year = yearShort <= currentYearShort
                    ? 2000 + yearShort
                    : 1900 + yearShort;
            }

            return `${year}-${month}-${day}`;
        }
    }

    // ... 나머지 로직 ...
}
```

**사용 예시:**
```javascript
// 생년월일
formatDate('15MAY85')             // → 1985-05-15 ✅
formatDate('15MAY85', 'birth')    // → 1985-05-15 ✅

// 여권 만료일
formatDate('15MAY32', 'passport') // → 2032-05-15 ✅
```

### 방법 2: 별도 함수 분리

```javascript
// 생년월일 전용
const formatBirthDate = (dateValue) => {
    // 2자리 연도는 현재 연도 기준으로 판단
    // ...
}

// 여권 만료일 전용
const formatPassportDate = (dateValue) => {
    // 2자리 연도는 무조건 2000년대
    // ...
}
```

### 방법 3: 나이 범위 검증 (안전장치)

```javascript
// 2자리 연도 변환 후 나이가 0-120세 범위를 벗어나면 경고
const year_20xx = 2000 + yearShort;
const year_19xx = 1900 + yearShort;

const age_20xx = new Date().getFullYear() - year_20xx;
const age_19xx = new Date().getFullYear() - year_19xx;

let year;
if (age_20xx >= 0 && age_20xx <= 120) {
    year = year_20xx;
} else if (age_19xx >= 0 && age_19xx <= 120) {
    year = year_19xx;
} else {
    console.warn(`⚠️ 비정상적인 연도: ${yearShort} → ${year_20xx} (${age_20xx}세) or ${year_19xx} (${age_19xx}세)`);
    year = year_19xx; // 기본값: 1900년대
}
```

---

## 📋 권장 수정 계획

### 1단계: formatDate 함수 개선 ✅

**파일:** `group-roster-manager-v2 (3).html` (Line 880-892)

**수정 내용:**
- dateType 파라미터 추가 (기본값: 'birth')
- 생년월일: 현재 연도 기준 판단
- 여권 만료일: 무조건 2000년대

### 2단계: 함수 호출 부분 수정

**생년월일 입력:**
```javascript
member.birthDate = formatDate(inputValue, 'birth');
```

**여권 만료일 입력:**
```javascript
member.passportExpire = formatDate(inputValue, 'passport');
```

### 3단계: 엑셀 업로드 로직 확인

엑셀에서 날짜를 읽을 때도 같은 로직 적용

### 4단계: 기존 데이터 검증

잘못 저장된 데이터가 있는지 확인:
```sql
SELECT * FROM customers WHERE birth_date > '2025-01-01'; -- 미래 생년월일 체크
SELECT * FROM customers WHERE birth_date < '1900-01-01'; -- 과거 생년월일 체크
```

---

## 🧪 테스트 케이스

### 생년월일 (dateType='birth')

| 입력 | 예상 출력 | 만 나이 (2025년 기준) |
|------|-----------|---------------------|
| 15MAY85 | 1985-05-15 | 40세 ✅ |
| 15MAY99 | 1999-05-15 | 26세 ✅ |
| 15MAY00 | 2000-05-15 | 25세 ✅ |
| 15MAY10 | 2010-05-15 | 15세 ✅ |
| 15MAY24 | 2024-05-15 | 1세 ✅ |
| 15MAY50 | 1950-05-15 | 75세 ✅ |

### 여권 만료일 (dateType='passport')

| 입력 | 예상 출력 | 비고 |
|------|-----------|------|
| 15MAY30 | 2030-05-15 | 미래 ✅ |
| 15MAY32 | 2032-05-15 | 미래 ✅ |
| 15MAY50 | 2050-05-15 | 미래 ✅ |

---

## ✅ 체크리스트

- [ ] formatDate 함수에 dateType 파라미터 추가
- [ ] 2자리 연도 처리 로직 수정 (현재 연도 기준)
- [ ] 생년월일 입력 부분에서 dateType='birth' 전달
- [ ] 여권 만료일 입력 부분에서 dateType='passport' 전달
- [ ] 엑셀 업로드 로직 확인 및 수정
- [ ] 기존 데이터 검증
- [ ] 테스트 케이스로 검증
- [ ] 문서화

---

## 📝 결론

**현재 상태:**
- ❌ 2자리 연도를 무조건 2000년대로 처리 → **생년월일 오류 발생 가능**
- ✅ 기존 데이터는 4자리 연도로 올바르게 저장됨

**문제 발생 시점:**
- 새 데이터 입력 시 2자리 연도 사용할 경우
- 엑셀 업로드 시 2자리 연도 형식 사용할 경우

**수정 필요:**
- formatDate 함수 개선 (dateType 파라미터 추가)
- 생년월일과 여권 만료일 구분 처리

**우선순위:** 🔴 **높음** (데이터 정확성 문제)

---

**작성일:** 2025-12-28
**분석자:** Claude Code
**영향도:** 높음 (나이 계산 오류, 데이터 무결성 문제)
