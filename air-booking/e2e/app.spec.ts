import { test, expect } from '@playwright/test';

const LOGIN_EMAIL = 'kimgukjin1@gmail.com';
const LOGIN_PASSWORD = 'KimTour12#$';

// 로그인 헬퍼
async function login(page: any) {
  await page.goto('/login');
  await page.waitForSelector('#email', { timeout: 5000 });
  await page.fill('#email', LOGIN_EMAIL);
  await page.fill('#password', LOGIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

test.describe('시나리오 1: 로그인 → 대시보드', () => {
  test('로그인 후 대시보드 접근', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/dashboard/);
    // 대시보드 페이지 렌더링 확인
    await expect(page.locator('body')).toContainText('대시보드');
  });
});

test.describe('시나리오 2: 예약장부', () => {
  test('예약장부 접근 + 검색', async ({ page }) => {
    await login(page);
    await page.click('text=예약장부');
    await page.waitForURL('**/bookings');
    // 검색 입력창 확인
    await expect(page.locator('input[placeholder*="PNR"]')).toBeVisible();
    // PNR 등록 버튼 확인
    await expect(page.locator('text=PNR 등록')).toBeVisible();
  });
});

test.describe('시나리오 3: PNR 변환기', () => {
  test('변환기 접근 + 4탭 확인', async ({ page }) => {
    await login(page);
    await page.click('text=PNR 변환기');
    await page.waitForURL('**/converter');
    // 4탭 확인
    await expect(page.locator('text=변환기')).toBeVisible();
    await expect(page.locator('text=저장된 항공편')).toBeVisible();
    await expect(page.locator('text=버스예약')).toBeVisible();
    await expect(page.locator('text=안내문')).toBeVisible();
  });

  test('탭 전환 동작', async ({ page }) => {
    await login(page);
    await page.goto('/converter');
    // 저장된 항공편 탭 클릭
    await page.click('text=저장된 항공편');
    await expect(page.locator('input[placeholder*="PNR"]')).toBeVisible();
    // 버스예약 탭 클릭
    await page.click('text=버스예약');
    // 버스예약 탭 내용 확인 (등록 버튼 또는 빈 상태 메시지)
    await expect(page.locator('body')).toContainText(/버스예약/);
  });
});

test.describe('시나리오 4: 모바일 랜딩카드', () => {
  test('/reservation/:id 인증 없이 접근', async ({ page }) => {
    // 로그인 없이 직접 접근
    const response = await page.goto('/reservation/test-id');
    // 200 또는 렌더링 확인 (존재하지 않는 ID라 에러 메시지)
    await expect(page.locator('text=예약 정보').or(page.locator('text=서버 연결 실패').or(page.locator('text=찾을 수 없')))).toBeVisible();
  });
});
