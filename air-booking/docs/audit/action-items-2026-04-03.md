# 감사 조치 항목 — 2026-04-03

> audit-report-2026-04-03.md 기반 조치 목록
> 상태: [ ] 미완료 / [x] 완료

---

## Critical (즉시 조치)

### [ ] 1. 프로덕션 환경 변수 필수 설정
- **위험**: 암호화 키/세션 시크릿이 하드코딩 기본값 사용 시 여권번호 복호화 가능
- **파일**: `server/src/services/crypto.service.ts:14`, `server/src/index.ts:64`
- **조치**:
  1. `.env.production` 파일 생성 (git에 커밋하지 않음!)
  2. 아래 값 설정:
     ```bash
     # 64자 hex 암호화 키 생성
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     
     # 세션 시크릿 생성
     node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
     ```
  3. `.env.production`에 기입:
     ```
     ENCRYPTION_KEY=<위에서 생성한 64자 hex>
     SESSION_SECRET=<위에서 생성한 랜덤 문자열>
     CORS_ORIGINS=http://192.168.0.15:5174
     NODE_ENV=production
     ```
  4. `.gitignore`에 `.env.production` 추가 확인
- **담당**: 서버 관리자
- **기한**: 프로덕션 배포 전 필수

### [ ] 2. 인증 정책 결정
- **위험**: estimates, bus-reservations, saved-notices, group-rosters API에 인증 없음
- **파일**: `server/src/routes/estimates.ts`, `server/src/routes/bus-reservations.ts`, `server/src/routes/saved-notices.ts`, `server/src/routes/group-rosters.ts`
- **조치** (택 1):
  - **A. requireAuth 적용** (외부 접근 가능한 경우):
    ```typescript
    import { requireAuth } from '../middleware/auth';
    router.use(requireAuth);
    ```
  - **B. IP 화이트리스트** (내부망만 접근하는 경우):
    ```typescript
    const allowedIPs = ['192.168.0.0/24', '127.0.0.1'];
    router.use((req, res, next) => {
      const ip = req.ip || req.socket.remoteAddress;
      if (allowedIPs.some(allowed => ip?.includes(allowed.split('/')[0]))) next();
      else res.status(403).json({ success: false, error: 'Forbidden' });
    });
    ```
  - **C. 현행 유지** (완전 내부망, 외부 접근 불가 확인 시):
    - 네트워크 방화벽에서 5510 포트 외부 차단 확인 필요
- **담당**: 서버 관리자
- **기한**: 1주 이내

---

## High (1주 이내 조치)

### [ ] 3. npm 취약점 패치
- **위험**: 서버 12건 (tar path traversal, nodemailer SMTP injection 등)
- **조치**:
  ```bash
  cd server && npm audit fix
  cd client && npm audit fix
  ```
  - `npm audit fix`로 해결 안 되면:
    ```bash
    npm audit fix --force  # sqlite3 6.0.1로 업그레이드 (breaking change 가능)
    ```
  - 업그레이드 후 `npm run dev`로 서버 정상 동작 확인
- **담당**: 개발자
- **기한**: 1주 이내

### [ ] 4. 암호화 키 관리 강화
- **위험**: `crypto.service.ts`에서 salt가 `'salt'`로 하드코딩
- **파일**: `server/src/services/crypto.service.ts:14,20`
- **조치**:
  - ENCRYPTION_KEY 환경변수를 직접 64자 hex로 설정 (scryptSync 우회)
  - 프로덕션에서 기본값 사용 시 서버 시작 차단:
    ```typescript
    if (process.env.NODE_ENV === 'production' && !process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY must be set in production');
    }
    ```
- **담당**: 개발자
- **기한**: 1주 이내

### [ ] 5. 보안 이벤트 로깅 추가
- **위험**: 로그인 시도, 권한 거부, 데이터 접근 등 보안 이벤트 미기록
- **파일**: `server/src/routes/auth.ts`, `server/src/middleware/auth.ts`
- **조치**:
  - 로그인 성공/실패 로그 추가
  - 인증 거부 로그 추가
  - console.error에서 민감 정보(비밀번호, 토큰) 제거 확인
- **담당**: 개발자
- **기한**: 2주 이내

---

## Medium (2주 이내 조치)

### [ ] 6. 세션 고정 공격 방어
- **위험**: 로그인 성공 시 세션 ID 재생성 안 함
- **파일**: `server/src/routes/auth.ts` (로그인 핸들러)
- **조치**:
  ```typescript
  // 로그인 성공 시:
  req.session.regenerate((err) => {
    if (err) { res.status(500).json({ success: false, error: '세션 오류' }); return; }
    req.session.userId = result.user.id;
    res.json({ success: true, data: { user: result.user } });
  });
  ```
- **담당**: 개발자

### [ ] 7. CSV export 이스케이핑
- **위험**: 쉼표/줄바꿈 포함 데이터 시 CSV 깨짐, Excel 수식 인젝션 가능
- **파일**: `server/src/routes/flight-schedules.ts:36-50`
- **조치**:
  ```typescript
  function escapeCsv(val: unknown): string {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
  ```
- **담당**: 개발자

### [ ] 8. Rate Limit 강화
- **위험**: 전역 100req/min은 너무 관대
- **파일**: `server/src/index.ts:54-60`
- **조치**:
  - 전역: 60req/min으로 하향
  - 쓰기(POST/PATCH/DELETE): 30req/min 별도 적용
- **담당**: 개발자

### [ ] 9. Helmet 설정 원복
- **위험**: crossOriginResourcePolicy 약화, crossOriginOpenerPolicy 비활성화
- **파일**: `server/src/index.ts:36-39`
- **조치**:
  ```typescript
  app.use(helmet()); // 기본값 사용 (모든 보안 헤더 활성화)
  ```
  - CORS로 인한 리소스 로딩 문제 시 개별 조정
- **담당**: 개발자

### [ ] 10. JSON data 필드 검증
- **위험**: bus-reservations, saved-notices, group-rosters의 data 필드 미검증
- **파일**: `server/src/routes/bus-reservations.ts`, `saved-notices.ts`, `group-rosters.ts`
- **조치**:
  ```typescript
  import { z } from 'zod';
  const dataSchema = z.object({
    data: z.union([z.string(), z.record(z.unknown())]),
  });
  // POST/PATCH에서: const parsed = dataSchema.safeParse(req.body);
  ```
- **담당**: 개발자

---

## Low (향후 개선)

### [ ] 11. UNKNOWN 라이선스 패키지 확인
- 라이선스 미식별 의존성 1건 수동 확인
- `npx license-checker --unknown`으로 패키지명 확인

### [ ] 12. 탑승객 이름 암호화 검토
- name_en, name_kr이 평문 저장 중
- 내부 시스템이라 불필요할 수 있으나, 외부 배포 시 검토

### [ ] 13. 고객 데이터 export API
- GDPR 데이터 이동성 요건 충족용
- 내부 시스템이라 현재는 불필요

### [ ] 14. 탑승객 CASCADE 삭제 설정
- air_booking_passengers에 FOREIGN KEY ON DELETE CASCADE 추가
- booking 삭제 시 탑승객 자동 삭제

---

## 참고

- 감사 리포트: `docs/audit/audit-report-2026-04-03.md`
- 이 시스템은 **내부망(192.168.0.x) 전용**으로 운영 중
- 외부 인터넷에 노출하는 경우 Critical/High 항목 **반드시** 조치 필요
