# Audit Report — 2026-04-03

## 요약

| 모듈 | 결과 | Critical | High | Medium | Low |
|------|------|----------|------|--------|-----|
| **Security** | ⚠️ Issues | 4 | 5 | 8 | 3 |
| **License** | ✅ Pass | 0 | 0 | 0 | 1 |
| **Privacy** | ⚠️ Issues | 0 | 1 | 2 | 0 |
| **총계** | | **4** | **6** | **10** | **4** |

---

## Module 1: Security

### Phase 1: Infrastructure

| # | 심각도 | 이슈 | 파일 |
|---|--------|------|------|
| 1 | HIGH | 암호화 키 하드코딩 (`air-booking-dev-key`, salt: `salt`) | crypto.service.ts:14 |
| 2 | HIGH | SESSION_SECRET 기본값 (`air-booking-dev-secret`) | index.ts:64 |
| 3 | MEDIUM | CORS 기본 origins에 localhost 하드코딩 | index.ts:42-49 |
| 4 | LOW | 회사 이메일 하드코딩 (`pyo4seyo@naver.com`) | intranet.ts:386 |

### Phase 2: Dependencies (npm audit)

| 패키지 | 심각도 | 취약점 | 조치 |
|--------|--------|--------|------|
| **Server** | 1 Critical + 7 High + 3 Moderate = **12건** | tar path traversal, nodemailer SMTP injection | `npm audit fix --force` |
| **Client** | 7 Moderate | vite/vitest dev dependency | `npm audit fix` |

### Phase 3: OWASP Top 10

| OWASP | 심각도 | 이슈 | 비고 |
|-------|--------|------|------|
| **A01 Access Control** | CRITICAL | estimates, bus-reservations, saved-notices, group-rosters 인증 없음 | 내부망 전용이나 IP 제한 없음 |
| **A02 Crypto** | HIGH | 암호화 키 하드코딩 + 약한 salt, 복호화 실패 시 plaintext 반환 | 프로덕션 ENCRYPTION_KEY 필수 |
| **A03 Injection** | ✅ SAFE | 모든 SQL 파라미터화 확인, sortCol 화이트리스트 | - |
| **A04 Design** | MEDIUM | Rate limit 100req/min 너무 관대, Helmet 약화 설정 | - |
| **A05 Config** | MEDIUM | crossOriginResourcePolicy 약화, 에러 메시지 내부 정보 노출 | - |
| **A07 Auth** | MEDIUM | 로그인 실패 횟수 인메모리 (서버 재시작 시 리셋), 세션 고정 공격 미방어 | - |
| **A08 Integrity** | MEDIUM | CSV export 이스케이핑 없음, JSON 필드 미검증 | - |
| **A09 Logging** | HIGH | 보안 이벤트 미로깅, 에러에 민감 정보 포함 가능 | - |
| **A10 SSRF** | MEDIUM | TOPAS 크레덴셜 사용자 입력, SMTP 헤더 인젝션 가능 | - |

---

## Module 2: License

| 라이선스 | 건수 | 호환성 |
|---------|------|--------|
| MIT | 400 | ✅ |
| ISC | 63 | ✅ |
| BSD-3-Clause | 16 | ✅ |
| Apache-2.0 | 8 | ✅ |
| BSD-2-Clause | 3 | ✅ |
| UNKNOWN | 1 | ⚠️ 수동 확인 필요 |
| CC-BY-4.0 | 1 | ✅ (문서용) |

**결론**: GPL/AGPL 없음. 라이선스 충돌 없음. UNKNOWN 1건 수동 확인 필요.

---

## Module 3: Privacy (PII)

### 식별된 PII 필드

| 테이블 | 필드 | 보호 상태 |
|--------|------|----------|
| air_booking_passengers | passport_number | ✅ AES-256-GCM 암호화 |
| air_booking_passengers | name_en, name_kr | ❌ 평문 |
| air_bookings | name_kr, name_en | ❌ 평문 |
| air_users | email, password_hash | ✅ 이메일 평문, 비밀번호 bcrypt |
| air_company_settings | email, phone | ⚠️ 회사 정보 (PII 아님) |

### GDPR 체크리스트

| 항목 | 상태 | 비고 |
|------|------|------|
| 데이터 삭제 기능 | ⚠️ 부분 | booking DELETE 존재, 탑승객 CASCADE 미설정 |
| 데이터 이동성 | ❌ 없음 | 고객 데이터 export API 없음 |
| 동의 메커니즘 | ❌ 없음 | 내부 시스템이라 불필요할 수 있음 |
| 암호화 | ⚠️ 부분 | 여권만 암호화, 이름/연락처 평문 |

---

## 즉시 조치 권장 (Priority Order)

### 1. 프로덕션 환경 변수 필수화 (Critical)
```bash
# .env.production에 반드시 설정:
ENCRYPTION_KEY=<64자 hex>
SESSION_SECRET=<랜덤 문자열>
CORS_ORIGINS=http://192.168.0.15:5174
```

### 2. npm audit fix (High)
```bash
cd server && npm audit fix
cd client && npm audit fix
```

### 3. 인증 정책 명확화 (Critical)
내부망 전용 라우트에 IP 화이트리스트 또는 requireAuth 적용

### 4. CSV 이스케이핑 추가 (Medium)
flight-schedules CSV export에 쉼표/따옴표 이스케이핑

### 5. 세션 고정 공격 방어 (Medium)
로그인 성공 시 session.regenerate() 호출

---

## 도구 및 버전

| 도구 | 버전 | 용도 |
|------|------|------|
| npm audit | npm 10.x | 의존성 취약점 스캔 |
| license-checker | 25.0.1 | SPDX 라이선스 수집 |
| TypeScript tsc | 5.6.x | 타입 안전성 검증 |
| 수동 코드 리뷰 | Claude Opus 4.6 | OWASP Top 10 스캔 |
