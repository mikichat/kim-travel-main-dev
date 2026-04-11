# API/인터페이스 명세서: Air1 항공편 공유 시스템

## 1. 서버 API (기존 활용)

### 1.1 GET /api/auth/me

직원 모드 판별에 사용. 새로운 API 추가 없음.

**Request:**
```
GET /api/auth/me
Cookie: connect.sid=<session_id>
```

**Response (로그인 상태):**
```json
{
  "id": "uuid",
  "name": "김국진",
  "email": "kimgukjin1@gmail.com",
  "role": "admin",
  "profile_image": null,
  "provider": "local",
  "last_login_at": "2026-03-06T10:00:00.000Z",
  "created_at": "2026-02-16T00:00:00.000Z"
}
```

**Response (미로그인):**
```
HTTP 401
{ "error": "로그인이 필요합니다." }
```

> air1/index.html은 requireAuth 미들웨어 뒤에 있으므로,
> 비로그인 시 login.html로 리다이렉트됨.
> 따라서 이 페이지에서 /api/auth/me는 거의 항상 200.

---

## 2. 클라이언트 함수 인터페이스

### 2.1 copyImageToClipboard()

```typescript
/**
 * PNG Blob을 클립보드에 복사
 * 호환: Chrome 76+ (localhost = secure context)
 * 미지원 시: false 반환 → 호출부에서 downloadBlob() 폴백
 */
function copyImageToClipboard(blob: Blob): Promise<boolean>
```

### 2.2 downloadBlob()

```typescript
/**
 * Blob을 파일로 다운로드 (폴백용)
 */
function downloadBlob(blob: Blob, filename: string): void
```

### 2.3 captureOutputArea()

```typescript
/**
 * #captureArea를 PNG Blob으로 캡처
 * 캡처 시 숨김: #convertResultTitle, .border-t (고객정보 폼)
 * html2canvas 설정: scale 2, backgroundColor #ffffff
 */
function captureOutputArea(): Promise<Blob>
```

### 2.4 captureMobileCard()

```typescript
/**
 * reservation.html을 iframe에 렌더링 후 PNG Blob으로 캡처
 * iframe: 430px, position fixed, left -9999px
 * 폰트 로드 대기: 1.5초
 * 타임아웃: 15초
 */
function captureMobileCard(): Promise<Blob>
```

### 2.5 handleImageCopy()

```typescript
/**
 * [이미지 복사] 버튼 핸들러 — 단체/거래처용
 * captureOutputArea() → copyImageToClipboard() → 토스트
 * 폴백: downloadBlob()
 */
async function handleImageCopy(): Promise<void>
```

### 2.6 handleMobileCopy()

```typescript
/**
 * [모바일 복사] 버튼 핸들러 — 개인 고객용
 * captureMobileCard() → copyImageToClipboard() → 토스트
 * 전제: parsedFlights.length > 0
 */
async function handleMobileCopy(): Promise<void>
```

### 2.7 checkStaffMode()

```typescript
/**
 * /api/auth/me 호출하여 로그인 상태 확인
 */
function checkStaffMode(): Promise<{
  isStaff: boolean;
  name?: string;
  role?: 'admin' | 'user';
}>
```

### 2.8 applyStaffMode()

```typescript
/**
 * 직원 모드 UI 적용
 * - 거래처 항상 표시
 * - 공항코드 기본
 * - 직원 배지 표시
 * - PDF 숨김
 */
async function applyStaffMode(): Promise<void>
```

### 2.9 shareOrDownload() — Phase 2

```typescript
/**
 * Phase 2 (도메인 확보 후) 추가
 * 우선순위: Web Share → 클립보드 → 다운로드
 */
function shareOrDownload(
  blob: Blob,
  filename: string,
  title: string
): Promise<'shared' | 'clipboard' | 'downloaded' | 'cancelled'>
```

---

## 3. collectReservationData() 반환 형식

모바일 복사 시 reservation.html에 전달되는 데이터:

```typescript
interface ReservationData {
  clientName: string;       // "" | "평화관광"
  pnr: string;              // "NPIXXE" | "-"
  name: string;             // "KIM/GISUK" | "-"
  phone: string;            // "+82 10-1234-5678" | "-"
  totalPeople: string;      // "20명" | "-"

  flights: Array<{
    flightNo: string;       // "KE 411"
    departure: { airport: string; time: string; date: string; };
    arrival: { airport: string; time: string; date: string; nextDay: boolean; };
  }>;

  meetingTime: string;
  meetingPlace: string;
  departureMeal: string;    // "포함" | "불포함" | ""
  arrivalMeal: string;
  priceAdult: string;       // "1,250,000" | ""
  priceChild: string;
  priceInfant: string;
  remarks: string;

  showAllPassengers: boolean;
  passengers: Array<{
    index: number;
    name: string;           // "KIM/GISUK"
    title: string;          // "MS" | "MR" | "MISS" | "MSTR"
  }>;
}
```

---

## 4. HTML 요소 매핑

### 4.1 버튼

| ID | Phase 1 | 핸들러 | 비고 |
|----|---------|--------|------|
| `copyBtn` | 텍스트 복사 | `handleCopy()` | 유지 |
| `imageBtn` | 이미지 복사 | `handleImageCopy()` | 리네임 |
| `mobileImageBtn` | 모바일 복사 | `handleMobileCopy()` | 리네임 |
| `kakaoBtn` | **삭제** | - | - |
| `pdfBtn` | PDF | `handlePDF()` | 직원 모드 시 숨김 |

### 4.2 직원 모드 요소 (신규)

| ID | 용도 |
|----|------|
| `staffBadge` | 직원 이름 배지 (설정 바) |

### 4.3 캡처 영역

| ID | 용도 |
|----|------|
| `captureArea` | 이미지 복사 캡처 대상 |
| `outputText` | 변환 결과 영역 |
| `convertResultTitle` | "변환 결과" 제목 (캡처 시 숨김) |

---

## 5. localStorage 키

| 키 | 용도 | Phase |
|----|------|-------|
| `air1_airport_code_mode` | 공항코드/도시명 토글 | 기존 |
| `flight_saves_v2` | 저장된 항공편 | 기존 |
| `air1_kakao_app_key` | Kakao 앱 키 | Phase 3 |

---

## 6. 파일명 규칙

| 용도 | 패턴 | 예시 |
|------|------|------|
| 이미지 다운로드 (폴백) | `flight-schedule-{YYYY-MM-DD}.png` | `flight-schedule-2026-03-06.png` |
| 모바일 다운로드 (폴백) | `reservation-{고객명}-{YYYY-MM-DD}.png` | `reservation-KIM_GISUK-2026-03-06.png` |

> `/` → `_` 치환 (파일시스템 호환)

---

## 7. 토스트 메시지

| 상황 | 메시지 | 타입 | 지속시간 |
|------|--------|------|---------|
| 클립보드 복사 성공 | "이미지가 클립보드에 복사되었습니다.\n카톡에서 Ctrl+V로 붙여넣으세요." | success | 4초 |
| 클립보드 미지원 → 다운로드 | "이미지가 저장되었습니다." | success | 2초 |
| 이미지 생성 실패 | "이미지 생성에 실패했습니다." | error | 3초 |
| 변환 전 모바일 복사 | "먼저 항공편을 변환해주세요." | warning | 3초 |
