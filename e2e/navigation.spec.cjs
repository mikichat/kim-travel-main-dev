// @ts-check
/**
 * E2E 테스트: 네비게이션 - 사이드바를 통한 페이지 전환
 * 모든 메뉴 항목에서 정상적으로 페이지 이동 확인
 */

const { test, expect } = require('@playwright/test');
const LoginPage = require('./pages/LoginPage.cjs');
const DashboardPage = require('./pages/DashboardPage.cjs');
const { testUser } = require('./fixtures/test-data.cjs');

test.describe('Navigation - Sidebar Menu', () => {
  let loginPage;
  let dashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);

    // 로그인
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    await page.waitForNavigation();
  });

  test('should display sidebar with all menu items', async ({ page }) => {
    const items = await dashboardPage.getSidebarItems();
    expect(items.length).toBeGreaterThan(0);
  });

  test('should navigate to Schedule page from sidebar', async ({ page }) => {
    await dashboardPage.navigateTo('schedule');
    const title = await dashboardPage.getPageTitle();
    expect(title).toContain('일정');
  });

  test('should navigate to Customer page from sidebar', async ({ page }) => {
    await dashboardPage.navigateTo('customer');
    const title = await dashboardPage.getPageTitle();
    expect(title).toContain('고객');
  });

  test('should navigate to Invoice page from sidebar', async ({ page }) => {
    await dashboardPage.navigateTo('invoice');
    const title = await dashboardPage.getPageTitle();
    expect(title).toContain('인보이스');
  });

  test('should navigate to Flight Schedule page from sidebar', async ({ page }) => {
    await dashboardPage.navigateTo('flight-schedule');
    const title = await dashboardPage.getPageTitle();
    expect(title).toContain('항공 스케줄');
  });

  test('should have working logout button', async ({ page }) => {
    await dashboardPage.logout();
    // 로그인 페이지로 리다이렉트 확인
    await page.waitForURL('**/login');
    expect(page.url()).toContain('login');
  });
});
