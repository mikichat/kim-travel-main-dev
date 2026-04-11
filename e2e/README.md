# E2E 테스트 - Page Object Model 구조

## 개요

이 디렉토리에는 Playwright를 사용한 End-to-End 테스트가 포함되어 있습니다.
Page Object Model(POM) 패턴을 적용하여 테스트 유지보수성을 높였습니다.

## 디렉토리 구조

```
e2e/
├── pages/                      # Page Object 클래스
│   ├── LoginPage.cjs          # 로그인 페이지
│   ├── DashboardPage.cjs      # 대시보드 (네비게이션)
│   ├── SchedulePage.cjs       # 일정 관리 페이지
│   ├── InvoicePage.cjs        # 인보이스 관리 페이지
│   └── FlightSchedulePage.cjs # 항공 스케줄 페이지
│
├── fixtures/                   # 테스트 데이터
│   └── test-data.cjs          # 테스트용 공통 데이터
│
├── auth.spec.cjs              # 인증 관련 테스트 (기존)
├── smoke.spec.cjs             # 스모크 테스트 (기존)
├── schedule.spec.cjs          # 일정 CRUD 테스트 (신규)
├── customer.spec.cjs          # 고객 관리 테스트 (신규)
├── invoice.spec.cjs           # 인보이스 CRUD 테스트 (신규)
├── flight-schedule.spec.cjs   # 항공 스케줄 CRUD 테스트 (신규)
├── navigation.spec.cjs        # 네비게이션 테스트 (신규)
│
└── test-results/              # 테스트 실행 결과 (생성됨)
    ├── index.html             # HTML 레포트
    └── ...
```

## Page Object 클래스

### LoginPage
- **위치**: `e2e/pages/LoginPage.cjs`
- **기능**:
  - 로그인 페이지 네비게이션
  - 로그인 폼 작성 및 제출
  - 에러 메시지 확인

**주요 메서드**:
```javascript
navigate()           // 로그인 페이지로 이동
login(email, pwd)    // 이메일과 비밀번호로 로그인
fillEmail(email)     // 이메일 입력
fillPassword(pwd)    // 비밀번호 입력
clickLogin()         // 로그인 버튼 클릭
getErrorMessage()    // 에러 메시지 조회
```

### DashboardPage
- **위치**: `e2e/pages/DashboardPage.cjs`
- **기능**:
  - 사이드바 네비게이션
  - 대시보드 페이지 접근
  - 로그아웃 처리

**주요 메서드**:
```javascript
waitForDashboard()           // 대시보드 로드 대기
navigateToSchedules()        // 일정 페이지로 이동
navigateToInvoices()         // 인보이스 페이지로 이동
navigateToFlightSchedules()  // 항공 스케줄 페이지로 이동
navigateToCustomers()        // 고객 페이지로 이동
navigateToBankAccounts()     // 은행계좌 페이지로 이동
logout()                     // 로그아웃
```

### SchedulePage
- **위치**: `e2e/pages/SchedulePage.cjs`
- **기능**:
  - 일정 목록 조회
  - 일정 CRUD 작업 (생성, 조회, 수정, 삭제)
  - 검색 기능

**주요 메서드**:
```javascript
navigate()                    // 일정 페이지로 이동
clickCreate()                 // 신규 일정 생성 모달 열기
fillScheduleForm(...)         // 일정 폼 작성
saveSchedule()                // 일정 저장
search(query)                 // 일정 검색
getScheduleCount()            // 일정 개수 조회
editFirstSchedule()           // 첫 번째 일정 수정
deleteFirstSchedule()         // 첫 번째 일정 삭제
```

### InvoicePage
- **위치**: `e2e/pages/InvoicePage.cjs`
- **기능**:
  - 인보이스 목록 조회
  - 인보이스 CRUD 작업
  - 검색 및 다운로드 기능

**주요 메서드**:
```javascript
navigate()                    // 인보이스 페이지로 이동
clickCreate()                 // 신규 인보이스 생성 모달 열기
fillInvoiceForm(...)          // 인보이스 폼 작성
saveInvoice()                 // 인보이스 저장
search(query)                 // 인보이스 검색
previewFirstInvoice()         // 첫 번째 인보이스 미리보기
editFirstInvoice()            // 첫 번째 인보이스 수정
deleteFirstInvoice()          // 첫 번째 인보이스 삭제
downloadFirstInvoice()        // 첫 번째 인보이스 다운로드
```

### FlightSchedulePage
- **위치**: `e2e/pages/FlightSchedulePage.cjs`
- **기능**:
  - 항공 스케줄 목록 조회
  - 항공 스케줄 CRUD 작업
  - 검색 및 유효성 검사

**주요 메서드**:
```javascript
navigate()                    // 항공 스케줄 페이지로 이동
clickCreate()                 // 신규 항공 스케줄 생성 모달 열기
fillFlightForm(...)           // 항공 스케줄 폼 작성
saveFlightSchedule()          // 항공 스케줄 저장
search(query)                 // 항공 스케줄 검색
getFlightCount()              // 항공 스케줄 개수 조회
editFirstFlight()             // 첫 번째 항공 스케줄 수정
deleteFirstFlight()           // 첫 번째 항공 스케줄 삭제
```

## 테스트 스펙 파일

### 1. auth.spec.cjs (기존)
- **목표**: 인증 기능 검증
- **테스트 케이스**:
  - 로그인 페이지 요소 확인
  - 잘못된 자격증명 로그인 실패
  - 빈 자격증명 로그인 실패
  - 보호된 API 401 반환

### 2. smoke.spec.cjs (기존)
- **목표**: 기본 기능 스모크 테스트
- **테스트 케이스**:
  - Swagger UI 접근성
  - 로그인 페이지 로드
  - 미인증 API 401 반환
  - 정적 파일 제공 확인
  - API 문서 JSON 가용성

### 3. schedule.spec.cjs (신규)
- **목표**: 일정 관리 기능 E2E 테스트
- **테스트 케이스** (8개):
  - 일정 페이지 로드
  - UI를 통한 일정 생성
  - API를 통한 일정 생성
  - 일정 검색
  - 일정 수정
  - 일정 삭제
  - 일정 목록 페이지네이션
  - 잘못된 날짜 범위 검증

### 4. customer.spec.cjs (신규)
- **목표**: 고객 관리 기능 E2E 테스트
- **테스트 케이스** (13개):
  - 고객 페이지 로드
  - API를 통한 고객 목록 조회
  - API를 통한 고객 생성
  - UI를 통한 고객 생성
  - 고객명으로 검색
  - 이메일로 검색
  - 고객 정보 수정
  - 고객 삭제
  - 이메일 검증
  - 중복 이메일 방지
  - 고객 목록 페이지네이션
  - 고객 일괄 작업
  - 고객 목록 내보내기

### 5. invoice.spec.cjs (신규)
- **목표**: 인보이스 관리 기능 E2E 테스트
- **테스트 케이스** (10개):
  - 인보이스 페이지 로드
  - UI를 통한 인보이스 생성
  - API를 통한 인보이스 생성
  - 인보이스 검색
  - 인보이스 미리보기
  - 인보이스 수정
  - PDF 다운로드
  - 인보이스 삭제
  - 필수 필드 검증
  - 금액 검증

### 6. flight-schedule.spec.cjs (신규)
- **목표**: 항공 스케줄 관리 기능 E2E 테스트
- **테스트 케이스** (8개):
  - 항공 스케줄 페이지 로드
  - UI를 통한 항공 스케줄 생성
  - API를 통한 항공 스케줄 생성
  - 항공 스케줄 검색
  - 항공 스케줄 수정
  - 항공 스케줄 삭제
  - 잘못된 시간 범위 검증
  - 항공사 필수 필드 검증

### 7. navigation.spec.cjs (신규)
- **목표**: 네비게이션 및 사이드바 기능 검증
- **테스트 케이스** (16개):
  - 로그인 후 대시보드 접근
  - 대시보드 사이드바 표시
  - 사이드바를 통한 각 페이지 이동
  - 직접 URL로 페이지 로드
  - 로그아웃 기능
  - 네비게이션 링크 접근성
  - 페이지 새로고침 시 상태 유지
  - 브레드크럼 네비게이션 (옵션)
  - 모바일 반응형 사이드바

## 테스트 데이터 (fixtures/test-data.cjs)

테스트에서 사용하는 공통 데이터:

```javascript
testData.testUser            // 테스트 사용자 자격증명
testData.schedule            // 일정 테스트 데이터
testData.invoice             // 인보이스 테스트 데이터
testData.flightSchedule      // 항공 스케줄 테스트 데이터
testData.customer            // 고객 테스트 데이터
testData.searchQueries       // 검색 쿼리 데이터
testData.apiSchedule         // API용 일정 데이터
testData.apiInvoice          // API용 인보이스 데이터
testData.apiFlightSchedule   // API용 항공 스케줄 데이터
```

## 테스트 실행

### 사전 요구사항
- Node.js 14+
- Playwright 설치: `npm install @playwright/test`
- 백엔드 서버 실행: `node backend/server.js` (또는 `npm start`)

### 모든 테스트 실행
```bash
npx playwright test
```

### 특정 테스트 파일 실행
```bash
npx playwright test e2e/schedule.spec.cjs
npx playwright test e2e/customer.spec.cjs
npx playwright test e2e/invoice.spec.cjs
```

### 특정 테스트 실행
```bash
npx playwright test -g "create new schedule"
npx playwright test -g "customer email validation"
```

### UI 모드로 실행 (디버깅)
```bash
npx playwright test --ui
```

### 비디오 및 스크린샷과 함께 실행
```bash
npx playwright test --headed
```

## 테스트 결과

테스트 실행 후 결과는 다음 위치에 저장됩니다:

- **HTML 레포트**: `e2e/test-results/index.html`
- **스크린샷**: `e2e/test-results/` (실패 시)
- **비디오**: `e2e/test-results/` (실패 시)
- **트레이스**: `e2e/test-results/trace/` (재시도 시)

## 설정 파일

### playwright.config.cjs
Playwright 설정:

```javascript
{
  testDir: './e2e',           // 테스트 디렉토리
  timeout: 30000,             // 테스트 타임아웃 (30초)
  retries: 1,                 // 실패 시 재시도 1회
  workers: 1,                 // 순차 실행
  screenshot: 'only-on-failure',  // 실패 시 스크린샷
  video: 'retain-on-failure',     // 실패 시 비디오
  trace: 'on-first-retry',        // 재시도 시 트레이스
  baseURL: 'http://localhost:5000',
}
```

## 테스트 태그

모든 테스트는 다음 형식의 주석으로 태깅되어 있습니다:

```javascript
// @TEST T6.4.XX - 테스트 설명
// @IMPL /api/endpoint/
// @SPEC 관련 명세서 링크
```

이를 통해:
- 테스트 추적성 향상
- 기능과 테스트의 매핑 용이
- 코드 리뷰 효율성 증대

## 모범 사례

### 1. Page Object 사용
```javascript
// ✅ Good
const loginPage = new LoginPage(page);
await loginPage.login('test@example.com', 'password');

// ❌ Bad
await page.fill('input[type="email"]', 'test@example.com');
await page.fill('input[type="password"]', 'password');
await page.click('button[type="submit"]');
```

### 2. 명확한 테스트 케이스
```javascript
// ✅ Good
test('should create schedule with valid data', async () => {
  // Arrange
  await page.goto('/schedule');

  // Act
  await schedulePage.clickCreate();
  await schedulePage.fillScheduleForm(...);

  // Assert
  expect(await schedulePage.isTableVisible()).toBe(true);
});
```

### 3. 에러 처리
```javascript
// ✅ Good - 선택적 기능에 대한 try-catch
try {
  await dashboardPage.navigateToSchedules();
} catch (error) {
  await page.goto('/schedule');
}

// ❌ Bad - 무조건적인 예외 무시
try {
  // 중요한 작업
} catch {
  // 아무것도 안함
}
```

### 4. 대기 메커니즘
```javascript
// ✅ Good
await modalSaveButton.waitFor({ state: 'hidden', timeout: 5000 });

// ✅ Good
await page.waitForNavigation();

// ❌ Bad
await page.waitForTimeout(5000);  // 고정 대기
```

## 트러블슈팅

### 테스트가 시간 초과되는 경우
1. `playwright.config.cjs`의 `timeout` 값 증가
2. 요소 선택자가 올바른지 확인
3. 서버 응답 시간 확인

### 요소를 찾을 수 없는 경우
1. 선택자를 `page.locator()`로 확인
2. UI 모드로 실행하여 디버깅: `npx playwright test --ui`
3. 페이지 로드 완료까지 대기

### API 테스트 실패
1. 백엔드 서버 실행 확인
2. API 엔드포인트 접근성 확인
3. 요청 데이터 형식 검증

## 추가 리소스

- [Playwright 공식 문서](https://playwright.dev/)
- [Page Object Model 가이드](https://playwright.dev/docs/pom)
- [Playwright API 레퍼런스](https://playwright.dev/docs/api/class-playwright)

## 테스트 커버리지

| 기능 | 테스트 수 | 커버리지 |
|------|----------|---------|
| 인증 | 4 | 기본 |
| 일정 관리 | 8 | 포괄적 |
| 고객 관리 | 13 | 포괄적 |
| 인보이스 관리 | 10 | 포괄적 |
| 항공 스케줄 | 8 | 포괄적 |
| 네비게이션 | 16 | 포괄적 |
| **총합** | **59** | **높음** |

---

**마지막 업데이트**: 2026-03-17
**버전**: 1.0.0 (T6.4 - E2E Playwright 확장)
