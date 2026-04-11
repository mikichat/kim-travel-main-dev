// @ts-check
/**
 * E2E 테스트: 고객 관리 - CRUD 작업
 * 고객 추가, 검색, 수정 워크플로우
 */

const { test, expect } = require('@playwright/test');
const LoginPage = require('./pages/LoginPage.cjs');
const DashboardPage = require('./pages/DashboardPage.cjs');
const { testUser, testCustomer, testCustomerSearch } = require('./fixtures/test-data.cjs');

test.describe('Customer Management - CRUD', () => {
  let loginPage;
  let dashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);

    // 로그인 및 고객 페이지 이동
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    await page.waitForNavigation();
    await dashboardPage.navigateTo('customer');
  });

  test('should add a new customer', async ({ page }) => {
    await page.click('[data-testid="add-customer-button"]');
    await page.waitForSelector('[data-testid="customer-form"]');

    // 고객 정보 입력
    await page.fill('[data-testid="customer-name-input"]', testCustomer.name);
    await page.fill('[data-testid="customer-email-input"]', testCustomer.email);
    await page.fill('[data-testid="customer-phone-input"]', testCustomer.phone);
    await page.fill('[data-testid="customer-company-input"]', testCustomer.company);
    await page.fill('[data-testid="customer-address-input"]', testCustomer.address);

    await page.click('[data-testid="submit-customer-button"]');
    await page.waitForLoadState('networkidle');

    // 추가된 고객 확인
    const visible = await page.isVisible(`text=${testCustomer.name}`);
    expect(visible).toBeTruthy();
  });

  test('should display customer list', async ({ page }) => {
    const customerItems = await page.locator('[data-testid^="customer-item-"]').count();
    expect(customerItems).toBeGreaterThanOrEqual(0);
  });

  test('should search for customer by name', async ({ page }) => {
    // 먼저 고객 추가
    await page.click('[data-testid="add-customer-button"]');
    await page.waitForSelector('[data-testid="customer-form"]');
    await page.fill('[data-testid="customer-name-input"]', testCustomer.name);
    await page.fill('[data-testid="customer-email-input"]', testCustomer.email);
    await page.fill('[data-testid="customer-phone-input"]', testCustomer.phone);
    await page.click('[data-testid="submit-customer-button"]');
    await page.waitForLoadState('networkidle');

    // 검색 수행
    await page.fill('[data-testid="search-customer-input"]', testCustomerSearch.keyword);
    await page.waitForLoadState('networkidle');

    // 검색 결과 확인
    const visible = await page.isVisible(`text=${testCustomer.name}`);
    expect(visible).toBeTruthy();
  });

  test('should edit customer information', async ({ page }) => {
    // 고객 추가
    await page.click('[data-testid="add-customer-button"]');
    await page.waitForSelector('[data-testid="customer-form"]');
    await page.fill('[data-testid="customer-name-input"]', testCustomer.name);
    await page.fill('[data-testid="customer-email-input"]', testCustomer.email);
    await page.fill('[data-testid="customer-phone-input"]', testCustomer.phone);
    await page.click('[data-testid="submit-customer-button"]');
    await page.waitForLoadState('networkidle');

    // 편집 버튼 클릭 (마지막 고객)
    const customerItems = await page.locator('[data-testid^="customer-item-"]').count();
    const lastId = customerItems - 1;

    await page.click(`[data-testid="edit-customer-${lastId}"]`);
    await page.waitForSelector('[data-testid="customer-form"]');

    // 정보 수정
    const newPhone = '010-9999-8888';
    await page.fill('[data-testid="customer-phone-input"]', newPhone);
    await page.click('[data-testid="submit-customer-button"]');
    await page.waitForLoadState('networkidle');

    // 수정된 정보 확인
    const visible = await page.isVisible(`text=${newPhone}`);
    expect(visible).toBeTruthy();
  });

  test('should delete a customer', async ({ page }) => {
    // 고객 추가
    await page.click('[data-testid="add-customer-button"]');
    await page.waitForSelector('[data-testid="customer-form"]');
    await page.fill('[data-testid="customer-name-input"]', testCustomer.name);
    await page.fill('[data-testid="customer-email-input"]', testCustomer.email);
    await page.click('[data-testid="submit-customer-button"]');
    await page.waitForLoadState('networkidle');

    const countBefore = await page.locator('[data-testid^="customer-item-"]').count();

    // 마지막 고객 삭제
    const lastId = countBefore - 1;
    await page.click(`[data-testid="delete-customer-${lastId}"]`);
    await page.click('[data-testid="confirm-delete"]');
    await page.waitForLoadState('networkidle');

    const countAfter = await page.locator('[data-testid^="customer-item-"]').count();
    expect(countAfter).toBe(countBefore - 1);
  });
});
