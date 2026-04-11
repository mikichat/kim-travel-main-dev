# 남은 개선 사항 (2026-02-23 기준)

Phase 60~76 품질 개선 완료 후 남은 작업 목록입니다.
여유 있을 때 하나씩 처리하면 됩니다.

---

## 현재 상태

| 항목 | 수치 |
|------|------|
| Backend 테스트 | 377개, Stmts 99.9% |
| Frontend 테스트 | 422개, Stmts 94.97% |
| E2E 테스트 | 10개 (smoke + 미인증만) |
| CI/CD | 7개 job |
| Docker | 완성 |

---

## 높음 (먼저 하면 좋은 것)

### H-1. E2E 로그인 성공 플로우 추가
- **현재**: 로그인 실패/미인증 테스트만 있음
- **필요**: 실제 로그인 → 세션 생성 → 인증 API 호출 성공 확인
- **파일**: `e2e/crud.spec.cjs` (신규)
- **예상**: 1시간

### H-2. CI에 npm audit 보안 스캔 step 추가
- **현재**: 보안 취약점 스캔 없음
- **필요**: `.github/workflows/ci.yml`에 `npm audit --audit-level=high` step
- **예상**: 15분

### H-3. .dockerignore에 data/ 디렉토리 추가
- **현재**: 로컬 DB 파일이 Docker 이미지에 포함될 수 있음
- **필요**: `backend/.dockerignore`에 `data/` 추가
- **예상**: 2분

### H-4. flight-sync-manager.js Branch 커버리지 (84.41%)
- **현재**: 전체 Branch threshold 85% 근접 위험
- **미커버**: L169, L184-194 (storage event listener), L265-266, L333-334
- **예상**: 1시간

### H-5. Playwright 인증 세션 재사용 (storageState)
- **현재**: 각 E2E 테스트가 독립적 비인증 요청만
- **필요**: `e2e/auth.setup.cjs`에서 로그인 → 쿠키 저장 → 다른 테스트에서 재사용
- **예상**: 2시간

---

## 중간 (시간 날 때 하면 좋은 것)

### M-1. fetch-utils.js Branch 76.92%
- L33: `window.fetchJSON` 할당 분기 미커버
- 예상: 30분

### M-2. auto-backup.js 오류 경로
- L83-86 (setTimeout/setInterval), L163-164, L597-600 (DOMContentLoaded)
- 예상: 1~2시간

### M-3. E2E CRUD 테스트 (인증 후)
- `/api/schedules`, `/api/products`, `/api/invoices` GET/POST/DELETE
- 예상: 2~3시간

### M-4. E2E 401 보호 엔드포인트 전수 확인
- `/api/bank-accounts`, `/api/cost-calculations`, `/tables/groups` 등
- 예상: 1시간

### M-5. CI E2E 환경변수 보완
- `NODE_ENV=test` 누락
- 예상: 5분

### M-6. Playwright retries 설정
- CI 환경에서 `retries: 1` 이상 권장 (flakiness 대응)
- 예상: 5분

### M-7. Playwright webServer timeout 상향
- 현재 15초 → 30초 권장 (DB 초기화 포함)
- 예상: 5분

### M-8. npm audit (devDependency)
- 27개 high severity — 모두 devDependency (jest, sqlite3, swagger-jsdoc)
- 프로덕션 런타임에는 영향 없음
- `npm audit fix --force` → 테스트 회귀 확인 필요
- 예상: 1~2시간

---

## 낮음 (나중에 해도 되는 것)

### L-1. Backend 도달불가 라인 `istanbul ignore` 주석
- invoices.js L862, flight-schedules.js L505, sync.js L14
- Branch 100% 달성 가능
- 예상: 15분

### L-2. airline-codes.js Stmts 86.2%
- L198-201: `window.AIRLINE_CODES` 할당 블록
- 예상: 30분

### L-3. CI Node.js 버전 핀
- `node-version: 20` → `20.x` 또는 정확한 버전
- 예상: 5분

### L-4. CI paths-ignore 확장
- `samples/**`, `coverage-phase*/` 등 불필요 트리거 경로 추가
- 예상: 10분

### L-5. CI Coverage HTML artifact 업로드
- `actions/upload-artifact`로 PR 리뷰 시 커버리지 확인 편의
- 예상: 15분

### L-6. .dockerignore 보완
- `Dockerfile`, `.github/`, `*.test.js` 추가
- 예상: 5분

### L-7. Playwright reporter 설정
- CI: `[['github'], ['html', { open: 'never' }]]`
- 예상: 5분

### L-8. 크로스 브라우저 E2E (Firefox/WebKit)
- 현재 Chromium만 — CI 시간 증가 감수 필요
- 예상: 30분

---

## 측정 대상에서 제외된 대형 파일 (참고용)

DOM 의존도가 높아 Jest 단위 테스트 불가. Playwright E2E로 간접 커버 권장.

| 파일 | 줄 수 | 이유 |
|------|------|------|
| `js/app.js` | 2645 | 메인 앱, DOM 전체 의존 |
| `js/modules/ui.js` | 2162 | UI 렌더링 |
| `js/cost-calculator.js` | 1447 | DOM 폼 계산 |
| `js/flight-schedule-app.js` | 1396 | 항공 스케줄 UI |
| `js/modules/eventHandlers.js` | 1398 | 이벤트 핸들러 |
| `js/modules/iframe-bridge.js` | 1194 | iframe 통신 |
| `js/modules/modals.js` | 542 | 모달 UI |
| `js/toast.js` | 300 | 토스트 알림 |
| `js/indexed-db.js` | 125 | IndexedDB 래퍼 |

---

## 기술 부채

코드 내 TODO/FIXME/HACK 주석: **없음** (건강한 상태)
