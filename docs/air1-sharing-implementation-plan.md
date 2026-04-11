# 구현 계획서: Air1 항공편 공유 시스템

## Phase 1: 클립보드 복사 + 직원 모드 (지금 구현)

### Step 1. 캡처 로직 분리

**파일**: `air1/js/main.js`

1-1. `captureOutputArea()` 함수 추출
- handleImage() 내부 html2canvas 코드 분리
- 숨김 처리 (#convertResultTitle, .border-t) 포함
- return: Promise<Blob>

1-2. `captureMobileCard()` 함수 추출
- handleMobileImage() 내부 iframe + html2canvas 코드 분리
- collectReservationData() 호출 포함
- return: Promise<Blob>

**검증**: 분리 후 기존 handleImage(), handleMobileImage()가 정상 동작하는지 확인

---

### Step 2. 클립보드 복사 함수

**파일**: `air1/js/main.js`

2-1. `copyImageToClipboard(blob)` 구현
```
navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
```

2-2. `downloadBlob(blob, filename)` 헬퍼 (폴백용)
```
URL.createObjectURL → link.click → revokeObjectURL
```

**검증**: Chrome에서 localhost:5000 접속 → 이미지 클립보드 복사 → 카톡 PC Ctrl+V 동작 확인

---

### Step 3. handleImage → handleImageCopy

**파일**: `air1/js/main.js`

3-1. handleImage() 리네임 → handleImageCopy()
- captureOutputArea()로 Blob 생성
- copyImageToClipboard()로 클립보드 복사
- 실패 시 downloadBlob() 폴백
- 토스트 메시지: "이미지가 클립보드에 복사되었습니다. 카톡에서 Ctrl+V로 붙여넣으세요."

3-2. 이벤트 리스너 변경
```
imageBtn → handleImageCopy
```

---

### Step 4. handleMobileImage → handleMobileCopy

**파일**: `air1/js/main.js`

4-1. handleMobileImage() 리네임 → handleMobileCopy()
- captureMobileCard()로 Blob 생성
- copyImageToClipboard()로 클립보드 복사
- 실패 시 downloadBlob() 폴백

4-2. 이벤트 리스너 변경
```
mobileImageBtn → handleMobileCopy
```

---

### Step 5. 카카오톡 관련 코드 제거

**파일**: `air1/js/main.js`, `air1/index.html`

5-1. main.js 삭제
- KAKAO_JS_KEY 상수 (line 12)
- Kakao 초기화 블록 (line 14~21)
- handleKakao() 함수 전체 (line 1259~1398)
- kakaoBtn 이벤트 리스너 (line 1780)

5-2. index.html 삭제
- kakaoBtn 요소 (line 650~658)
- Kakao SDK script 태그 (line 12)

**검증**: 페이지 로드 시 콘솔 에러 없음

---

### Step 6. 버튼 라벨 변경

**파일**: `air1/index.html`

6-1. 버튼 텍스트 변경
```
이미지 → 이미지 복사
모바일 → 모바일 복사
```

6-2. 그리드 조정
- 5버튼 → 4버튼 (grid-cols-2 sm:grid-cols-4 유지)

---

### Step 7. 직원 모드 구현

**파일**: `air1/js/main.js`, `air1/index.html`

7-1. `checkStaffMode()` 함수
```
GET /api/auth/me → 200이면 { isStaff: true, name, role }
```

7-2. `applyStaffMode()` 함수
- 거래처: 체크박스 숨기고 항상 표시
- 공항코드: 기본 ON
- 직원 배지: 이름 표시
- PDF 버튼: 숨김

7-3. index.html에 직원 배지 요소 추가
```html
<span id="staffBadge" class="hidden ..."></span>
```

7-4. DOMContentLoaded에서 applyStaffMode() 호출

**검증**:
- 로그인 상태에서 air1 접속 → 거래처 항상 표시, PDF 숨김
- 직원 이름 배지 표시

---

## Phase 2: Web Share API (도메인 확보 후)

### Step 8. shareOrDownload() 함수 추가

**파일**: `air1/js/main.js`

8-1. 공유 우선순위 함수
```
Web Share → 클립보드 복사 → 다운로드
```

8-2. handleImageCopy/handleMobileCopy 내부 변경
```
copyImageToClipboard() → shareOrDownload()
```

---

### Step 9. 버튼 라벨 변경

```
이미지 복사 → 이미지 공유
모바일 복사 → 모바일 공유
```

---

## Phase 3: Kakao SDK (선택적)

### Step 10. Kakao 앱 키 UI

- 설정 바에 Kakao 앱 키 입력 모달
- localStorage 저장
- SDK 동적 로드

### Step 11. Kakao 이미지 전송

- shareOrDownload()에 Kakao 분기 추가
- Kakao.Share.uploadImage → sendDefault(feed)

---

## 변경 파일 요약

| 파일 | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| `air1/js/main.js` | Step 1~7 | Step 8 | Step 10~11 |
| `air1/index.html` | Step 5~7 | Step 9 | Step 10 |
| `air1/reservation.html` | - | - | - |
| `backend/*` | - | - | - |

---

## 의존성 그래프

```
Phase 1:
  Step 1 (캡처 분리) ─┬─→ Step 3 (이미지 복사)
  Step 2 (클립보드)  ─┤
                      └─→ Step 4 (모바일 복사)
                            └─→ Step 5 (카톡 제거)
                                  └─→ Step 6 (라벨)
  Step 7 (직원 모드) ← 독립, 병렬 가능

Phase 2:
  Step 8 (shareOrDownload) → Step 9 (라벨)
  ※ 도메인 + HTTPS 확보 전제

Phase 3:
  Step 10 (Kakao UI) → Step 11 (Kakao 전송)
  ※ Kakao 앱 등록 전제
```
