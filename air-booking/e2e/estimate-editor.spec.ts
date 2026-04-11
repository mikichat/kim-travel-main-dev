import { test, expect } from '@playwright/test';

async function login(page: any) {
  await page.goto('/login');
  await page.waitForSelector('#email', { timeout: 5000 });
  await page.fill('#email', 'kimgukjin1@gmail.com');
  await page.fill('#password', 'KimTour12#$');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

test.describe('EstimateEditor Harness Eval', () => {
  test('3탭 전환 동작', async ({ page }) => {
    await login(page);
    await page.goto('/estimate-editor');
    await expect(page.locator('text=국내견적서')).toBeVisible();
    await expect(page.locator('text=해외견적서')).toBeVisible();
    await expect(page.locator('text=정산/배송')).toBeVisible();
    // 탭 클릭
    await page.click('text=해외견적서');
    await page.waitForTimeout(500);
    await page.click('text=정산/배송');
    await page.waitForTimeout(500);
    await page.click('text=국내견적서');
  });

  test('사이드바 토글', async ({ page }) => {
    await login(page);
    await page.goto('/estimate-editor');
    // 사이드바 보이는지
    await expect(page.locator('input[placeholder*="수신처"]')).toBeVisible();
    // 사이드바 닫기
    await page.click('text=사이드바 닫기');
    await expect(page.locator('input[placeholder*="수신처"]')).not.toBeVisible();
    // 다시 열기
    await page.click('text=문서 목록');
    await expect(page.locator('input[placeholder*="수신처"]')).toBeVisible();
  });

  test('인쇄 버튼 존재', async ({ page }) => {
    await login(page);
    await page.goto('/estimate-editor');
    await expect(page.locator('text=인쇄')).toBeVisible();
  });

  test('iframe 에디터 로드', async ({ page }) => {
    await login(page);
    await page.goto('/estimate-editor');
    // iframe이 존재하는지
    const iframe = page.locator('iframe');
    await expect(iframe).toBeVisible();
    // iframe src 확인
    const src = await iframe.getAttribute('src');
    expect(src).toContain('domestic-editor.html');
  });

  test('인증 없이 접근 가능', async ({ page }) => {
    // 로그인 없이 직접 접근
    await page.goto('/estimate-editor');
    // 에디터가 표시되어야 함 (인증 불필요)
    await expect(page.locator('text=국내견적서')).toBeVisible();
  });
});
