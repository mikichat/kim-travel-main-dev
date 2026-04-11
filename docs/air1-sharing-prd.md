# PRD: Air1 항공편 공유 시스템

## 1. 사용 시나리오

### 1.1 두 가지 완전히 다른 용도

| 구분 | 이미지 (기본 캡처) | 모바일 (reservation.html) |
|------|-------------------|--------------------------|
| 대상 | 단체 / 거래처 (직원 간, B2B) | 개인 고객 (B2C) |
| 전달 채널 | 카톡 단체방, 거래처 담당자 | 고객 1:1 카톡 |
| 이미지 형식 | 화면 캡처 (정보 밀도 높음) | 카드형 UI (보기 좋음) |
| 포함 정보 | 항공편 + 거래처 + PNR + 승객명단 | 항공편 + PNR + 고객정보 + 가격 |
| 고객정보 | 없음 (단체는 불필요) | 있음 (이름/전화/미팅/식사 등) |

### 1.2 실제 업무 흐름

**단체/거래처 (이미지)**
```
PNR 붙여넣기 → 변환 → [이미지 클립보드 복사] → 카톡 PC Ctrl+V
```

**개인 고객 (모바일)**
```
PNR 붙여넣기 → 변환 → 고객정보 입력 → [모바일 이미지 클립보드 복사] → 카톡 PC Ctrl+V
```

---

## 2. 제약 조건

| 제약 | 영향 | 현재 상태 |
|------|------|----------|
| 도메인 없음 | Kakao SDK 사용 불가 (도메인 등록 필수) | localhost:5000 |
| HTTPS 없음 | Web Share API 모바일 불가 (HTTPS 필수) | HTTP |
| PC 전용 | 직원이 PC에서 작업 | Chrome 브라우저 |

> **결론**: 현재 환경에서 가능한 최선은 **이미지 클립보드 복사 → 카톡 PC 붙여넣기**

---

## 3. Phase 구분

| Phase | 조건 | 핵심 기능 |
|-------|------|----------|
| **Phase 1** | 지금 (localhost) | 이미지 클립보드 복사 + 직원 모드 UI |
| **Phase 2** | 도메인 + HTTPS 확보 후 | Web Share API (모바일 카톡 직접 전송) |
| **Phase 3** | Kakao 앱 등록 후 | Kakao 이미지 피드 메시지 |

---

## 4. Phase 1: 이미지 클립보드 복사 + 직원 모드

### 4.1 이미지 클립보드 복사

현재 3단계: 이미지 생성 → 다운로드 → 파일 찾아서 카톡 전송
변경 2단계: **이미지 클립보드 복사 → 카톡 PC에서 Ctrl+V**

```
[이미지 복사] 클릭
  → html2canvas → Blob
  → navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
  → 토스트: "이미지가 클립보드에 복사되었습니다. 카톡에서 Ctrl+V"
  → 카톡 PC 열고 Ctrl+V → 끝
```

> `navigator.clipboard.write()`는 localhost(secure context)에서 Chrome 동작 확인됨

**버튼 변경:**

| 현재 | 변경 |
|------|------|
| [이미지] (다운로드) | [이미지 복사] (클립보드) + 길게 누르면 다운로드 |
| [모바일] (다운로드) | [모바일 복사] (클립보드) + 길게 누르면 다운로드 |
| [카톡] | 삭제 (클립보드 복사에 통합) |

### 4.2 직원 모드: 로그인 기반 UI 단순화

기존 인증 시스템 활용 (`requireAuth` 미들웨어, 세션, role 필드).
로그인한 직원에게는 불필요한 옵션을 숨기고 업무에 최적화된 UI 제공.

#### 사용자 유형별 UI

| UI 요소 | 직원 (로그인) | 비로그인 |
|---------|-------------|---------|
| 거래처 입력 | **항상 표시** (체크박스 없이) | 체크박스로 토글 |
| 공항코드 토글 | **공항코드 기본** | 도시명 기본 |
| 고객정보 섹션 | 단체 시 자동 숨김 | 전체 표시 |
| 이미지 복사 버튼 | **강조 표시** | 일반 |
| PDF 버튼 | 숨김 (직원 불필요) | 표시 |
| 저장 버튼 | 표시 | 표시 |

#### 직원 모드 판별 방법

```
페이지 로드 시:
  GET /api/auth/me → 200이면 로그인 상태
    → response.role 확인
    → 'admin' 또는 'user' → 직원 모드 활성화
  GET /api/auth/me → 401이면 비로그인
    → 일반 모드 (현재와 동일)
```

#### 직원 모드 API 호출

새로운 API 없음. 기존 `/api/auth/me` 활용:

```javascript
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

#### 직원 모드 UI 적용

```javascript
async function applyStaffMode() {
  const { isStaff, name } = await checkStaffMode();
  if (!isStaff) return;

  // 1. 거래처 입력: 체크박스 제거, 항상 표시
  showClientCheckbox.checked = true;
  showClientCheckbox.parentElement.style.display = 'none';
  clientInputWrapper.classList.remove('hidden');

  // 2. 공항코드 기본
  localStorage.setItem('air1_airport_code_mode', 'true');

  // 3. 설정 바에 직원명 표시
  staffBadge.textContent = name;
  staffBadge.classList.remove('hidden');

  // 4. PDF 버튼 숨김
  pdfBtn.style.display = 'none';
}
```

---

## 5. Phase 2: Web Share API (도메인 + HTTPS 확보 후)

### 5.1 사전 조건

- 도메인 확보 (예: air1.yourdomain.com)
- HTTPS 인증서 (Let's Encrypt 등)
- 모바일에서 접속 가능

### 5.2 변경 사항

클립보드 복사 → Web Share API 우선, 클립보드 폴백:

```
[공유] 클릭
  ├─ navigator.canShare({ files }) 지원?
  │   ├─ YES → navigator.share({ files: [png] })
  │   │        → 네이티브 공유 시트 (카톡/문자/메일)
  │   └─ NO  → 클립보드 복사 (Phase 1 동작)
  └─ 에러 → 클립보드 복사 폴백
```

### 5.3 모바일 접속 시 UI

직원이 PC가 아닌 모바일에서 접속할 때:
- 이미지 공유 → Web Share (카톡 단체방으로 바로 전송)
- 모바일 공유 → Web Share (고객 1:1로 바로 전송)

---

## 6. Phase 3: Kakao 이미지 메시지 (선택적)

### 6.1 사전 조건

- Phase 2 완료 (도메인 + HTTPS)
- Kakao Developers 앱 등록 + 도메인 등록
- JavaScript 키 발급

### 6.2 추가 기능

Web Share 미지원 브라우저(PC Firefox 등)에서 Kakao SDK로 직접 전송:

```
Web Share 미지원
  ├─ Kakao 초기화됨?
  │   ├─ YES → Kakao.Share.uploadImage() → sendDefault(feed)
  │   └─ NO  → 클립보드 복사 (최종 폴백)
```

---

## 7. 버튼 레이아웃 변경

### Phase 1 (지금)

**Before:**
```
[복사] [이미지] [모바일] [카톡] [PDF]
```

**After:**
```
[텍스트 복사] [이미지 복사] [모바일 복사] [PDF]
                  ↑              ↑
             단체/거래처      개인 고객
             클립보드 복사    클립보드 복사
```

- [카톡] 제거
- [이미지] → [이미지 복사]: 클립보드 복사 (다운로드는 우클릭/길게 누르기)
- [모바일] → [모바일 복사]: 클립보드 복사

**직원 모드에서:**
```
[텍스트 복사] [이미지 복사] [모바일 복사]
                  ↑              ↑
             단체 시 강조      개인 시 강조
```
- PDF 숨김
- 단체/개인에 따라 해당 버튼 자동 강조

### Phase 2 (도메인 확보 후)

```
[텍스트 복사] [이미지 공유] [모바일 공유] [PDF]
```
- 복사 → 공유 (Web Share 우선, 클립보드 폴백)

---

## 8. 폴백 전략 (전체 Phase 통합)

```
Phase 2+3 완료 후 최종 폴백 체인:

[공유 버튼] 클릭
  │
  ├─ 1순위: Web Share API (HTTPS + 모바일/PC Chrome)
  │         → 네이티브 공유 시트
  │
  ├─ 2순위: Kakao SDK (도메인 등록 + 앱 키)
  │         → 카카오톡 이미지 피드
  │
  ├─ 3순위: Clipboard API (localhost/HTTPS, Chrome)
  │         → 클립보드 복사 → Ctrl+V
  │
  └─ 4순위: PNG 다운로드 (모든 환경)
            → 파일 저장 → 수동 전송
```

---

## 9. 리스크

| 리스크 | Phase | 대응 |
|--------|-------|------|
| Clipboard API 권한 거부 | 1 | 다운로드 폴백 |
| 도메인 확보 지연 | 2 | Phase 1 클립보드로 충분히 동작 |
| Kakao 앱 심사 지연 | 3 | Phase 2 Web Share로 충분 |
| html2canvas 렌더링 깨짐 | 전체 | 기존 검증된 로직 재사용 |
| 대용량 이미지 (50명+) | 전체 | canvas quality 0.85 압축 |
