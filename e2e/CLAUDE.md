# TourWorld E2E 테스트 (Playwright)

## 개요
Playwright 기반 E2E 테스트 스펙 및 결과물.

## 디렉토리 구조
```
e2e/
├── *.spec.cjs       # 테스트 스펙 파일
├── fixtures/       # 테스트 픽스처
├── pages/          # Page Object 모델
├── test-results/   # 테스트 결과
└── README.md       # 테스트 가이드
```

## 테스트 스펙
- `auth.spec.cjs` - 인증 테스트
- `customer.spec.cjs` - 고객 관리 테스트
- `flight-schedule.spec.cjs` - 항공 일정 테스트
- `invoice.spec.cjs` - 인보이스 테스트
- `navigation.spec.cjs` - 네비게이션 테스트
- `schedule.spec.cjs` - 일정 테스트
- `smoke.spec.cjs` - 스모크 테스트

## 실행 명령어
```bash
npx playwright test           # 전체 테스트
npx playwright test auth.spec.cjs  # 특정 테스트만
npx playwright test --headed  # 헤드 모드
```

## Git 워크플로우
1. 파일 수정 전: `git pull`
2. 파일 수정 후: `git push`
3. 커밋 메시지: **반드시 한국어**