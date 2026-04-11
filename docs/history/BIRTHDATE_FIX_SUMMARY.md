# 생년월일 2자리 연도 처리 수정 완료

## ✅ 수정 완료 사항

### 1. formatDate 함수 개선

**파일:** `group-roster-manager-v2 (3).html`

**변경 사항:**
- `dateType` 파라미터 추가 (기본값: 'birth')
- 생년월일과 여권 만료일을 구분해서 처리
- 2자리 연도를 현재 연도 기준으로 올바르게 변환

---

## 📝 수정된 코드

### formatDate 함수 시그니처 변경

**Before:**
```javascript
const formatDate = (dateValue) => {
```

**After:**
```javascript
const formatDate = (dateValue, dateType = 'birth') => {
```

### 2자리 연도 처리 로직 개선

**Before (Line 880-892):**
```javascript
// ddMMMyy 형식
const ddMMMyyMatch = dateValue.match(/^(\d{1,2})[\s-]*([A-Za-z]{3})[\s-]*(\d{2})$/);
if (ddMMMyyMatch) {
    const day = String(ddMMMyyMatch[1]).padStart(2, '0');
    const monthStr = ddMMMyyMatch[2].toUpperCase();
    const yearShort = ddMMMyyMatch[3];
    const month = monthMap[monthStr];
    if (month) {
        // ❌ 문제: 무조건 2000년대로 처리
        const year = '20' + yearShort;
        return `${year}-${month}-${day}`;
    }
}
```

**After:**
```javascript
// ddMMMyy 형식
const ddMMMyyMatch = dateValue.match(/^(\d{1,2})[\s-]*([A-Za-z]{3})[\s-]*(\d{2})$/);
if (ddMMMyyMatch) {
    const day = String(ddMMMyyMatch[1]).padStart(2, '0');
    const monthStr = ddMMMyyMatch[2].toUpperCase();
    const yearShort = parseInt(ddMMMyyMatch[3]);
    const month = monthMap[monthStr];
    if (month) {
        let year;

        if (dateType === 'passport') {
            // ✅ 여권 만료일: 항상 미래 날짜 (2000년대)
            year = 2000 + yearShort;
        } else {
            // ✅ 생년월일: 현재 연도 기준으로 판단
            const currentYear = new Date().getFullYear();
            const currentYearShort = currentYear % 100;

            // 2자리 연도가 현재 연도의 2자리보다 크면 1900년대, 작거나 같으면 2000년대
            // 예: 현재 2025년
            //   '85' (85 > 25) → 1985년
            //   '24' (24 <= 25) → 2024년
            //   '00' (0 <= 25) → 2000년
            year = yearShort <= currentYearShort
                ? 2000 + yearShort
                : 1900 + yearShort;
        }

        return `${year}-${month}-${day}`;
    }
}
```

### 함수 호출 부분 수정

#### 엑셀 업로드 - 여권 만료일 (Line 1952)

**Before:**
```javascript
passportExpire = expireIdx !== -1 ? formatDate(row[expireIdx]) : '';
```

**After:**
```javascript
passportExpire = expireIdx !== -1 ? formatDate(row[expireIdx], 'passport') : '';
```

#### 고객 동기화 - 생년월일 및 여권 만료일 (Line 1475-1478)

**Before:**
```javascript
birthDate: formatDate(member.birthDate) || '',
생년월일: formatDate(member.birthDate) || '',
passportExpiry: formatDate(member.passportExpire) || '',
여권만료일: formatDate(member.passportExpire) || '',
```

**After:**
```javascript
birthDate: formatDate(member.birthDate, 'birth') || '',
생년월일: formatDate(member.birthDate, 'birth') || '',
passportExpiry: formatDate(member.passportExpire, 'passport') || '',
여권만료일: formatDate(member.passportExpire, 'passport') || '',
```

---

## 🧪 테스트 결과

### 생년월일 (dateType='birth') 테스트

| 입력 | 예상 출력 | 실제 출력 | 만 나이 (2025년 기준) | 결과 |
|------|-----------|-----------|---------------------|------|
| 15MAY85 | 1985-05-15 | 1985-05-15 | 40세 | ✅ PASS |
| 15MAY99 | 1999-05-15 | 1999-05-15 | 26세 | ✅ PASS |
| 15MAY00 | 2000-05-15 | 2000-05-15 | 25세 | ✅ PASS |
| 15MAY10 | 2010-05-15 | 2010-05-15 | 15세 | ✅ PASS |
| 15MAY24 | 2024-05-15 | 2024-05-15 | 1세 | ✅ PASS |
| 01JAN50 | 1950-01-01 | 1950-01-01 | 75세 | ✅ PASS |
| 20DEC70 | 1970-12-20 | 1970-12-20 | 55세 | ✅ PASS |

**결과:** 7/7 테스트 통과 ✅

### 여권 만료일 (dateType='passport') 테스트

| 입력 | 예상 출력 | 실제 출력 | 비고 | 결과 |
|------|-----------|-----------|------|------|
| 15MAY30 | 2030-05-15 | 2030-05-15 | 2030년 만료 (미래) | ✅ PASS |
| 15MAY32 | 2032-05-15 | 2032-05-15 | 2032년 만료 (미래) | ✅ PASS |
| 15MAY50 | 2050-05-15 | 2050-05-15 | 2050년 만료 (미래) | ✅ PASS |
| 01JAN28 | 2028-01-01 | 2028-01-01 | 2028년 만료 (미래) | ✅ PASS |
| 20DEC99 | 2099-12-20 | 2099-12-20 | 2099년 만료 (미래) | ✅ PASS |

**결과:** 5/5 테스트 통과 ✅

**총 테스트:** 12/12 통과 ✅

---

## 📊 수정 전/후 비교

### 예시: '85' 입력 시

| 구분 | 수정 전 | 수정 후 |
|------|---------|---------|
| **생년월일 (15MAY85)** | 2085-05-15 (만 -60세) ❌ | 1985-05-15 (만 40세) ✅ |
| **여권 만료일 (15MAY85)** | 2085-05-15 ✅ | 2085-05-15 ✅ |

### 예시: '99' 입력 시

| 구분 | 수정 전 | 수정 후 |
|------|---------|---------|
| **생년월일 (15MAY99)** | 2099-05-15 (만 -74세) ❌ | 1999-05-15 (만 26세) ✅ |
| **여권 만료일 (15MAY99)** | 2099-05-15 ✅ | 2099-05-15 ✅ |

---

## 💡 동작 원리

### 현재 연도 기준 판단 알고리즘 (생년월일)

```
현재 연도: 2025년 (2자리: 25)

입력 2자리 연도 판단:
- 00-25 → 2000-2025년 (2000년대)
- 26-99 → 1926-1999년 (1900년대)

예시:
'85' → 85 > 25 → 1985년 ✅
'24' → 24 <= 25 → 2024년 ✅
'00' → 0 <= 25 → 2000년 ✅
'99' → 99 > 25 → 1999년 ✅
```

### 여권 만료일 처리

```
항상 2000년대로 처리 (미래 날짜)

예시:
'30' → 2030년
'50' → 2050년
'99' → 2099년
```

---

## ✅ 확인된 사항

### 1. 기존 데이터는 정상

현재 데이터베이스에 저장된 모든 생년월일은 4자리 연도(YYYY-MM-DD) 형식으로 올바르게 저장되어 있습니다:

- JEONG/YOONSEO: 1979-05-15 (46세) ✅
- KANG/DONG WON: 1975-02-10 (50세) ✅
- YANG/SUNKYUNG: 1970-08-19 (55세) ✅
- 등등...

### 2. 새 데이터 입력 시 올바른 처리

이제 2자리 연도를 입력해도:
- **생년월일**: 현재 연도 기준으로 올바르게 1900년대/2000년대 판단 ✅
- **여권 만료일**: 미래 날짜(2000년대)로 처리 ✅

### 3. 엑셀 업로드 호환

엑셀에서 "15MAY85" 형식으로 입력해도:
- 생년월일 컬럼: 1985-05-15로 변환 ✅
- 여권 만료일 컬럼: 2085-05-15로 변환 ✅

---

## 📁 수정된 파일

| 파일 | 수정 내용 |
|------|-----------|
| `group-roster-manager-v2 (3).html` | formatDate 함수 및 호출 부분 수정 |

---

## 🎯 영향 범위

### 영향받는 기능

1. ✅ 단체명단 엑셀 업로드
2. ✅ 고객 동기화 (그룹 → 고객)
3. ✅ 생년월일 표시
4. ✅ 여권 만료일 표시
5. ✅ 나이 계산

### 영향받지 않는 기능

- ✅ 기존 4자리 연도 데이터 처리
- ✅ YYYY-MM-DD 형식 입력
- ✅ 한국어 날짜 형식 (YYYY년MM월DD일)
- ✅ 점/슬래시 구분자 형식

---

## 🧪 테스트 도구

### 생성된 테스트 파일

| 파일 | 목적 |
|------|------|
| `check-birthdate-format.js` | 데이터베이스 생년월일 확인 |
| `test-formatdate-fix.html` | formatDate 함수 테스트 페이지 |
| `BIRTHDATE_ISSUE_ANALYSIS.md` | 문제 분석 문서 |
| `BIRTHDATE_FIX_SUMMARY.md` | 수정 요약 문서 (이 파일) |

### 테스트 방법

```bash
# 1. 데이터베이스 확인
node check-birthdate-format.js

# 2. 함수 테스트 (브라우저)
start test-formatdate-fix.html
```

---

## 📋 체크리스트

- [x] formatDate 함수에 dateType 파라미터 추가
- [x] 2자리 연도 처리 로직 수정 (현재 연도 기준)
- [x] 생년월일 입력 부분에서 dateType='birth' 전달
- [x] 여권 만료일 입력 부분에서 dateType='passport' 전달
- [x] 테스트 케이스 작성 및 검증 (12/12 통과)
- [x] 문서화 완료

---

## 🎉 결론

**문제:**
- 2자리 연도를 무조건 2000년대(20xx)로 처리
- 생년월일이 1900년대인 경우 오류 발생 (예: '85' → 2085년 → -60세)

**해결:**
- dateType 파라미터 추가 ('birth' 또는 'passport')
- 생년월일: 현재 연도 기준 판단 (예: '85' → 1985년 → 40세)
- 여권 만료일: 무조건 2000년대 (예: '32' → 2032년)

**상태:** ✅ **완전히 수정됨**

**테스트:** ✅ 12/12 테스트 통과

**영향:** 생년월일과 여권 만료일이 올바르게 처리되어 나이 계산 정확도 향상

---

**수정일:** 2025-12-28
**수정자:** Claude Code
**우선순위:** 🔴 높음 (데이터 정확성 개선)
**상태:** ✅ 완료
