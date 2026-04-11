# 🔴 localhost:5000 작동 안 되는 문제 해결 가이드

## 📋 문제 진단 결과

### 문제점
**`localhost:8000`과 `localhost:5000`은 서로 다른 origin으로 인식되어 localStorage가 격리됩니다.**

```
http://localhost:8000  →  별도의 localStorage
http://localhost:5000  →  별도의 localStorage (완전히 다른 저장소)
```

### 증상
- ✅ **8000 포트**: 항공편 저장 및 불러오기 정상 작동
- ❌ **5000 포트**: "저장된 항공편 정보가 없습니다" 오류 발생

### 원인
브라우저의 Same-Origin Policy로 인해 **포트가 다르면 localStorage를 공유할 수 없습니다**.

---

## ✅ 해결 방법 3가지

### 방법 1: 데이터 동기화 도구 사용 (즉시 해결) ⭐ 추천

#### 단계별 가이드:

**1단계: 8000 포트에서 데이터 내보내기**
```
1. http://localhost:8000/air1/sync-storage.html 열기 (이미 열림)
2. "📤 데이터 내보내기" 버튼 클릭
3. 나타난 JSON 텍스트 전체 복사 (또는 "📋 내보낸 데이터 복사" 클릭)
```

**2단계: 5000 포트로 데이터 가져오기**
```
1. http://localhost:5000/air1/sync-storage.html 열기 (이미 열림)
2. "데이터 가져오기 (Import)" 섹션의 입력란에 복사한 JSON 붙여넣기
3. "📥 데이터 가져오기" 버튼 클릭
4. 확인 대화상자에서 "확인" 클릭
```

**3단계: 확인**
```
1. http://localhost:5000/air1/index.html 열기
2. "안내문 작성" 탭 선택
3. "✈️ 항공편 정보 불러오기" 버튼 클릭
4. ✓ 정상 작동 확인!
```

---

### 방법 2: 하나의 포트로 통일 (영구 해결)

**8000 포트만 사용:**
```
앞으로 항상 http://localhost:8000/air1/index.html 사용
```

**5000 포트만 사용:**
```
1. 위 "방법 1"로 데이터 동기화
2. 앞으로 항상 http://localhost:5000/air1/index.html 사용
```

---

### 방법 3: 양쪽 포트에서 독립적으로 사용

각 포트에서 별도로 데이터를 관리:
- 8000 포트: 테스트용
- 5000 포트: 실제 업무용

필요시 sync-storage.html로 데이터 이동

---

## 🧪 테스트 방법

### 5000 포트에서 정상 작동 확인:

```bash
# 1. 동기화 도구로 데이터 이동 (위 방법 1 참조)

# 2. 5000 포트에서 테스트
http://localhost:5000/air1/auto-test.html
→ "전체 테스트 실행" 클릭
→ 모든 항목이 ✓ PASS면 성공

# 3. 실제 페이지에서 확인
http://localhost:5000/air1/index.html
→ 안내문 작성 탭
→ 항공편 정보 불러오기 클릭
→ 정상 작동 확인
```

---

## 📊 비교표

| 항목 | localhost:8000 | localhost:5000 |
|------|----------------|----------------|
| localStorage | ✓ 독립적 | ✓ 독립적 |
| 데이터 공유 | ❌ 불가능 | ❌ 불가능 |
| 코드/파일 | ✓ 동일 | ✓ 동일 |
| 기능 | ✓ 정상 | ✓ 정상 (데이터만 없음) |

---

## 🔧 기술적 상세 정보

### localStorage Origin 규칙

```javascript
// Origin = Protocol + Host + Port
'http://localhost:8000'  // Origin 1
'http://localhost:5000'  // Origin 2 (다름!)

// 결과: 각각 별도의 localStorage 사용
```

### 데이터 구조

```javascript
// localStorage 키:
- flight_saves_v2      // 항공편 데이터
- bus_reservations     // 버스 예약
- saved_notices        // 안내문
- quote_data          // 견적서
```

---

## ❓ FAQ

### Q: 왜 8000에서는 되는데 5000에서는 안 되나요?
**A:** 포트가 다르면 브라우저가 완전히 다른 웹사이트로 인식하여 localStorage를 공유하지 않습니다. 보안을 위한 브라우저의 정상적인 동작입니다.

### Q: 매번 동기화해야 하나요?
**A:** 아니요. 한 번 동기화한 후에는 해당 포트에서 계속 사용 가능합니다. 또는 하나의 포트만 사용하면 됩니다.

### Q: 자동으로 동기화할 수 없나요?
**A:** 브라우저 보안 정책상 자동 동기화는 불가능합니다. 대신 sync-storage.html 도구로 간편하게 수동 동기화 가능합니다.

### Q: 데이터가 손실될 위험은?
**A:** 없습니다. 내보내기는 복사본을 만드는 것이므로 원본은 그대로 유지됩니다.

---

## 📝 요약

### 문제:
- localhost:5000과 localhost:8000은 localStorage를 공유하지 않음
- 5000 포트에는 데이터가 없어서 "저장된 항공편 정보가 없습니다" 오류 발생

### 해결책:
- **즉시 해결**: sync-storage.html로 데이터 복사 (3분 소요)
- **영구 해결**: 하나의 포트만 사용

### 파일 위치:
- 동기화 도구: `C:\Users\kgj12\Root\main\air1\sync-storage.html`
- 테스트 도구: `C:\Users\kgj12\Root\main\air1\auto-test.html`
- 진단 도구: `C:\Users\kgj12\Root\main\air1\test-storage.html`

---

**✅ 지금 바로 해결하기:**
1. http://localhost:8000/air1/sync-storage.html (이미 열림)
2. 데이터 내보내기 → 복사
3. http://localhost:5000/air1/sync-storage.html (이미 열림)
4. 데이터 가져오기 → 붙여넣기 → 완료!
