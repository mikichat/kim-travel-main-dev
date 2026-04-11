# 기술 설계서: Air1 항공편 공유 시스템

## 1. 아키텍처

### 1.1 현재 구조

```
localhost:5000 (backend/server.js)
├── requireAuth 미들웨어 → 세션 인증
├── express.static('../') → 전체 정적 파일 서빙
│   └── air1/
│       ├── index.html       ← 메인 페이지 (로그인 필요)
│       ├── reservation.html ← 모바일 카드 렌더링 (iframe용)
│       └── js/
│           ├── main.js          ← 핵심 로직
│           ├── storage-manager.js
│           ├── saved-flights.js
│           └── manual-flight.js
└── /api/auth/me → 현재 사용자 정보 반환
```

### 1.2 변경 후 구조

```
main.js 함수 변경:

[추가]
  checkStaffMode()                    ← /api/auth/me 호출, 직원 여부 판별
  applyStaffMode()                    ← 직원 UI 적용
  copyImageToClipboard(blob)          ← Clipboard API 이미지 복사
  captureOutputArea() → Promise<Blob> ← 캡처 로직 분리 (handleImage에서)
  captureMobileCard() → Promise<Blob> ← 캡처 로직 분리 (handleMobileImage에서)

[수정]
  handleImage()      → handleImageCopy()   ← 다운로드 → 클립보드 복사
  handleMobileImage() → handleMobileCopy()  ← 다운로드 → 클립보드 복사
  applyBookingTypeDefaults()               ← 직원 모드 버튼 강조 추가

[삭제]
  handleKakao()         ← 전체 삭제
  KAKAO_JS_KEY 상수      ← 삭제
  Kakao 초기화 코드      ← 삭제
```

---

## 2. Phase 1 함수 설계

### 2.1 copyImageToClipboard(blob)

```javascript
/**
 * PNG Blob을 클립보드에 복사
 * @param {Blob} blob - image/png Blob
 * @returns {Promise<boolean>} 성공 여부
 */
async function copyImageToClipboard(blob) {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
    return true;
  } catch {
    return false;
  }
}
```

**호환성:**
- Chrome 76+ (localhost = secure context) → 동작
- Firefox → 미지원 → 다운로드 폴백
- Safari → 부분 지원 → 다운로드 폴백

### 2.2 captureOutputArea()

기존 `handleImage()` 내부 html2canvas 로직 분리.

```javascript
/**
 * #captureArea 영역을 PNG Blob으로 캡처
 * 고객정보 폼(.border-t)과 제목(#convertResultTitle) 숨김 처리 포함
 * @returns {Promise<Blob>}
 */
async function captureOutputArea() {
  const captureArea = document.getElementById('captureArea');
  const hiddenElements = [];

  // 숨김 처리
  const title = document.getElementById('convertResultTitle');
  if (title) { title.style.display = 'none'; hiddenElements.push(title); }
  const form = captureArea.querySelector('.border-t');
  if (form) { form.style.display = 'none'; hiddenElements.push(form); }

  try {
    const canvas = await html2canvas(captureArea, {
      backgroundColor: '#ffffff', scale: 2, logging: false, useCORS: true,
    });
    return new Promise((resolve) => canvas.toBlob(resolve));
  } finally {
    hiddenElements.forEach(el => el.style.display = '');
  }
}
```

### 2.3 captureMobileCard()

기존 `handleMobileImage()` 내부 iframe + html2canvas 로직 분리.

```javascript
/**
 * reservation.html을 iframe에 렌더링 후 PNG Blob으로 캡처
 * @returns {Promise<Blob>}
 */
async function captureMobileCard() {
  const reservationData = collectReservationData();
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:430px;height:932px;border:none;';
  document.body.appendChild(iframe);

  const dataParam = encodeURIComponent(JSON.stringify(reservationData));
  iframe.src = `reservation.html?data=${dataParam}`;

  await new Promise((resolve, reject) => {
    iframe.onload = async () => {
      try {
        const doc = iframe.contentDocument;
        if (doc.fonts?.ready) await doc.fonts.ready;
        setTimeout(resolve, 1500);
      } catch { setTimeout(resolve, 2000); }
    };
    iframe.onerror = reject;
    setTimeout(() => reject(new Error('Timeout')), 15000);
  });

  const canvas = await html2canvas(iframe.contentDocument.body, {
    backgroundColor: '#F8FAFC', scale: 2, logging: false, useCORS: true,
    width: 430, height: iframe.contentDocument.body.scrollHeight, windowWidth: 430,
  });

  document.body.removeChild(iframe);
  return new Promise((resolve) => canvas.toBlob(resolve));
}
```

### 2.4 handleImageCopy() - 이미지 복사 (단체/거래처용)

```javascript
async function handleImageCopy() {
  const btn = document.getElementById('imageBtn');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '/* 로딩 스피너 */';

  try {
    const blob = await captureOutputArea();
    const copied = await copyImageToClipboard(blob);

    if (copied) {
      showToast('이미지가 클립보드에 복사되었습니다.\n카톡에서 Ctrl+V로 붙여넣으세요.', 'success', 4000);
    } else {
      // 폴백: 다운로드
      downloadBlob(blob, `flight-schedule-${dateStr()}.png`);
      showToast('이미지가 저장되었습니다.', 'success');
    }
  } catch {
    showToast('이미지 생성에 실패했습니다.', 'error');
  } finally {
    setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 2000);
  }
}
```

### 2.5 handleMobileCopy() - 모바일 복사 (개인 고객용)

```javascript
async function handleMobileCopy() {
  if (!parsedFlights?.length) {
    showToast('먼저 항공편을 변환해주세요.', 'warning');
    return;
  }
  const btn = document.getElementById('mobileImageBtn');
  // ... (handleImageCopy와 동일 패턴, captureMobileCard() 사용)
}
```

### 2.6 checkStaffMode() - 직원 모드 확인

```javascript
/**
 * /api/auth/me 호출하여 로그인 상태 확인
 * @returns {Promise<{isStaff: boolean, name?: string, role?: string}>}
 */
async function checkStaffMode() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const user = await res.json();
      return { isStaff: true, name: user.name, role: user.role };
    }
  } catch {}
  return { isStaff: false };
}
```

### 2.7 applyStaffMode() - 직원 UI 적용

```javascript
async function applyStaffMode() {
  const { isStaff, name } = await checkStaffMode();
  if (!isStaff) return;

  // 거래처: 체크박스 숨기고 항상 표시
  const showClient = document.getElementById('showClient');
  showClient.checked = true;
  showClient.closest('label').style.display = 'none';
  document.getElementById('clientInputWrapper').classList.remove('hidden');

  // 공항코드 모드 기본
  if (!localStorage.getItem('air1_airport_code_mode')) {
    localStorage.setItem('air1_airport_code_mode', 'true');
    // 토글 UI도 업데이트
    const toggle = document.getElementById('airportCodeToggle');
    if (toggle) toggle.checked = true;
  }

  // 직원 배지 표시
  const badge = document.getElementById('staffBadge');
  if (badge) {
    badge.textContent = name;
    badge.classList.remove('hidden');
  }

  // PDF 버튼 숨김
  const pdfBtn = document.getElementById('pdfBtn');
  if (pdfBtn) pdfBtn.style.display = 'none';

  // 직원 모드 플래그
  window._isStaffMode = true;
}
```

---

## 3. 직원 모드 UI 상세

### 3.1 판별 흐름

```
DOMContentLoaded
  └─ applyStaffMode()
      └─ GET /api/auth/me
          ├─ 200 { name, role } → 직원 모드 ON
          └─ 401 → 일반 모드 (변경 없음)
```

> air1/index.html은 requireAuth 미들웨어 뒤에 있으므로,
> 이 페이지에 접근했다면 이미 로그인 상태.
> 따라서 /api/auth/me는 거의 항상 200 반환.
> 비로그인 시에는 login.html로 리다이렉트되어 이 페이지에 도달 불가.

### 3.2 직원 모드 vs 일반 모드

실질적으로 이 페이지는 **항상 직원 모드**.
requireAuth로 인해 비로그인 사용자는 접근 불가.

따라서 직원 모드 로직은 사실상 **UI 최적화** 목적:
- API 호출로 직원 이름을 가져와 표시
- 기본값을 직원 업무에 맞게 설정

### 3.3 추가 HTML 요소

```html
<!-- 설정 바에 직원 배지 추가 -->
<span id="staffBadge" class="hidden text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium"></span>
```

---

## 4. 제거 대상

| 항목 | 파일 | 라인 |
|------|------|------|
| `KAKAO_JS_KEY` 상수 | main.js | 12 |
| Kakao 초기화 블록 | main.js | 14~21 |
| `handleKakao()` 함수 | main.js | 1259~1398 |
| kakaoBtn 이벤트 리스너 | main.js | 1780 |
| kakaoBtn HTML | index.html | 650~658 |
| Kakao SDK script 태그 | index.html | 12 |

---

## 5. Phase 2 확장 포인트 (도메인 확보 후)

Phase 1 코드에 Web Share 분기만 추가:

```javascript
// copyImageToClipboard() 대신 shareOrDownload() 사용
async function shareOrDownload(blob, filename, title) {
  const file = new File([blob], filename, { type: 'image/png' });

  // 1순위: Web Share API
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title, files: [file] });
      return 'shared';
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled';
    }
  }

  // 2순위: 클립보드 복사
  const copied = await copyImageToClipboard(blob);
  if (copied) return 'clipboard';

  // 3순위: 다운로드
  downloadBlob(blob, filename);
  return 'downloaded';
}
```

handleImageCopy / handleMobileCopy 내부의
`copyImageToClipboard()` 호출을 `shareOrDownload()`로 교체하면 끝.

---

## 6. 데이터 흐름 요약

### 6.1 이미지 복사 (단체/거래처)

```
outputText (항공편+거래처+PNR+승객명단)
  → captureOutputArea() → html2canvas → Blob
  → copyImageToClipboard(blob) → navigator.clipboard.write
  → 사용자: 카톡 PC Ctrl+V
```

### 6.2 모바일 복사 (개인 고객)

```
collectReservationData() → JSON
  → captureMobileCard() → iframe(reservation.html) → html2canvas → Blob
  → copyImageToClipboard(blob) → navigator.clipboard.write
  → 사용자: 카톡 PC Ctrl+V
```
